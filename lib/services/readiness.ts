import { prisma } from "@/lib/prisma";
import { getRecentAtsAnalyses } from "@/lib/services/ats";
import { scoreOutreachEmail } from "@/lib/services/job-intelligence";
import { getJobOsSettings } from "@/lib/services/job-os";
import { getOutreachOverview } from "@/lib/services/strategy";
import { clampNumber } from "@/lib/utils/safety";
import type { ApplyReadinessResult, ImprovementLoopSnapshot } from "@/types/app";

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildDeltaLabel(previous: number | null, current: number | null, unit = "score") {
  if (current === null) {
    return `No ${unit} yet`;
  }

  if (previous === null) {
    return `${unit[0].toUpperCase()}${unit.slice(1)} is now ${Math.round(current)}`;
  }

  const roundedPrevious = Math.round(previous);
  const roundedCurrent = Math.round(current);

  if (roundedCurrent === roundedPrevious) {
    return `${unit[0].toUpperCase()}${unit.slice(1)} is holding at ${roundedCurrent}`;
  }

  return `${unit[0].toUpperCase()}${unit.slice(1)} ${roundedCurrent > roundedPrevious ? "improved" : "moved"} from ${roundedPrevious} -> ${roundedCurrent}`;
}

export async function getApplyReadinessSnapshot(): Promise<ApplyReadinessResult> {
  const [resume, recruitersCount, activeAccounts, activeAtsAnalysis, overview] = await Promise.all([
    prisma.resume.findFirst({
      where: { isPrimary: true },
      orderBy: { createdAt: "desc" },
      select: {
        extractedText: true
      }
    }),
    prisma.recruiter.count(),
    prisma.sendingAccount.count({ where: { isActive: true } }),
    getRecentAtsAnalyses(1).then((items) => items[0] ?? null),
    getOutreachOverview()
  ]);

  const blockers: string[] = [];
  const improvements: string[] = [];
  const signals: string[] = [];

  if (!resume?.extractedText?.trim()) {
    blockers.push("Upload a resume so the system can analyze fit and generate grounded outreach.");
  } else {
    signals.push("Resume is available for ATS and outreach generation.");
  }

  if (!activeAtsAnalysis) {
    blockers.push("Run ATS analysis for your target role so the system can prioritize the right evidence.");
  } else {
    signals.push(`ATS baseline is ${activeAtsAnalysis.atsScore}/100 for the current target role.`);

    if (activeAtsAnalysis.atsScore < 70) {
      blockers.push("Resume-role alignment is still weak enough to hurt first-pass screening.");
      improvements.push(...(activeAtsAnalysis.improvements?.slice(0, 2) ?? []));
    } else if (activeAtsAnalysis.missing_skills?.critical?.length) {
      improvements.push(
        `Tighten proof for ${activeAtsAnalysis.missing_skills.critical.slice(0, 2).join(" and ")} if that experience is already real.`
      );
    }
  }

  if (recruitersCount === 0) {
    blockers.push("Add recruiter targets before trying to scale outreach.");
  } else {
    signals.push(`${recruitersCount} recruiter target${recruitersCount === 1 ? "" : "s"} available for outreach.`);
  }

  if (activeAccounts === 0) {
    blockers.push("Connect at least one active sending account before launching a campaign.");
  } else {
    signals.push(`${activeAccounts} active sending account${activeAccounts === 1 ? "" : "s"} connected.`);
  }

  if (overview.totalSent === 0) {
    improvements.push("Generate and send a small batch so the system can learn from actual reply data.");
  } else {
    signals.push(`Current response rate is ${overview.responseRate.toFixed(1)}% across ${overview.totalSent} sent emails.`);
    if (overview.responseRate < 8) {
      improvements.push("Your messaging likely needs stronger company context or a clearer CTA before adding more volume.");
    }
  }

  if (overview.followUpsDue > 0) {
    improvements.push(`You have ${overview.followUpsDue} follow-up${overview.followUpsDue === 1 ? "" : "s"} due that may unlock warmer threads first.`);
  }

  const readinessScore = clampNumber(
    (resume?.extractedText?.trim() ? 20 : 0) +
      (recruitersCount > 0 ? 15 : 0) +
      (activeAccounts > 0 ? 15 : 0) +
      Math.min(activeAtsAnalysis?.atsScore ?? 0, 35) +
      Math.min(Math.round(overview.responseRate * 1.5), 15),
    0,
    100
  );

  const ready = blockers.length === 0 && readinessScore >= 72;
  const summary = ready
    ? "You are ready to apply. The core pieces are in place, so the next gains come from tighter personalization and steady follow-up."
    : blockers.length > 0
      ? `You are not ready yet. Fix ${blockers[0].toLowerCase()}`
      : "You are close, but the system still sees a few gaps before your outreach is fully ready.";

  return {
    ready,
    score: readinessScore,
    blockers: [...new Set(blockers)].slice(0, 5),
    improvements: [...new Set(improvements)].slice(0, 6),
    summary,
    signals: [...new Set(signals)].slice(0, 5)
  };
}

export async function getImprovementLoopSnapshot(): Promise<ImprovementLoopSnapshot> {
  const [recentAtsAnalyses, settings, recentLogs] = await Promise.all([
    getRecentAtsAnalyses(4),
    getJobOsSettings(),
    prisma.emailLog.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: {
        recruiter: {
          select: {
            name: true,
            email: true,
            company: true
          }
        }
      }
    })
  ]);

  const atsCurrent = recentAtsAnalyses[0]?.atsScore ?? null;
  const atsPrevious = recentAtsAnalyses[1]?.atsScore ?? null;
  const emailWindows = await Promise.all(
    recentLogs.slice(0, 6).map((log) =>
      scoreOutreachEmail({
        recruiterName: log.recruiter.name,
        recruiterEmail: log.recruiter.email,
        company: log.recruiter.company,
        subject: log.subject,
        body: log.body,
        persona: settings.persona,
        fastMode: true
      })
    )
  );

  const currentEmailAverage = average(emailWindows.slice(0, 3).map((item) => item.replyScore));
  const previousEmailAverage = average(emailWindows.slice(3, 6).map((item) => item.replyScore));
  const highlights: string[] = [];

  if (atsCurrent !== null && atsPrevious !== null && atsCurrent > atsPrevious) {
    highlights.push(`ATS score improved from ${atsPrevious} -> ${atsCurrent}.`);
  } else if (atsCurrent !== null) {
    highlights.push(`Latest ATS score is ${atsCurrent}/100.`);
  }

  if (currentEmailAverage !== null && previousEmailAverage !== null && currentEmailAverage > previousEmailAverage) {
    highlights.push(
      `Recent email reply score improved from ${Math.round(previousEmailAverage)} -> ${Math.round(currentEmailAverage)}.`
    );
  } else if (currentEmailAverage !== null) {
    highlights.push(`Recent email reply score is averaging ${Math.round(currentEmailAverage)}/100.`);
  }

  return {
    atsScorePrevious: atsPrevious,
    atsScoreCurrent: atsCurrent,
    atsScoreDelta: atsCurrent !== null && atsPrevious !== null ? Math.round(atsCurrent - atsPrevious) : 0,
    atsScoreLabel: buildDeltaLabel(atsPrevious, atsCurrent, "ATS score"),
    emailScorePrevious: previousEmailAverage !== null ? Math.round(previousEmailAverage) : null,
    emailScoreCurrent: currentEmailAverage !== null ? Math.round(currentEmailAverage) : null,
    emailScoreDelta:
      currentEmailAverage !== null && previousEmailAverage !== null ? Math.round(currentEmailAverage - previousEmailAverage) : 0,
    emailScoreLabel: buildDeltaLabel(previousEmailAverage, currentEmailAverage, "email score"),
    highlights: highlights.slice(0, 4)
  };
}
