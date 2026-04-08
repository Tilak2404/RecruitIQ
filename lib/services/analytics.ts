import { prisma } from "@/lib/prisma";
import { analyzeReplyInsights, scoreOutreachEmail } from "@/lib/services/job-intelligence";
import { getCampaignAbTestSummary, getJobOsSettings } from "@/lib/services/job-os";
import { getBestSendTimeSuggestion } from "@/lib/services/strategy";
import type { AnalyticsSnapshot } from "@/types/app";

export async function getAnalyticsSnapshot(): Promise<AnalyticsSnapshot> {
  const [recruiters, campaigns, accounts, sent, opened, replied, failed, pending, campaignRows, recentLogs, bestMessageCandidate] =
    await prisma.$transaction([
      prisma.recruiter.count(),
      prisma.campaign.count(),
      prisma.sendingAccount.count(),
      prisma.emailLog.count({ where: { sentAt: { not: null } } }),
      prisma.emailLog.count({ where: { openedAt: { not: null } } }),
      prisma.emailLog.count({ where: { repliedAt: { not: null } } }),
      prisma.emailLog.count({ where: { status: "FAILED" } }),
      prisma.emailLog.count({ where: { status: { in: ["DRAFT", "NOT_SENT"] } } }),
      prisma.campaign.findMany({
        include: {
          emailLogs: {
            select: {
              status: true,
              sentAt: true,
              repliedAt: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 8
      }),
      prisma.emailLog.findMany({
        orderBy: {
          updatedAt: "desc"
        },
        take: 12,
        include: {
          recruiter: {
            select: {
              name: true,
              company: true,
              email: true
            }
          }
        }
      }),
      prisma.emailLog.findFirst({
        where: {
          OR: [{ repliedAt: { not: null } }, { opensCount: { gt: 0 } }]
        },
        orderBy: [{ repliedAt: "desc" }, { opensCount: "desc" }],
        select: {
          subject: true
        }
      })
    ]);

  const settings = await getJobOsSettings();
  const timeSuggestion = await getBestSendTimeSuggestion();
  const activeAbTest = await getCampaignAbTestSummary();
  const replyInsights = await analyzeReplyInsights({
    persona: settings.persona,
    fastMode: true,
    emails: recentLogs.map((log) => ({
      recruiterName: log.recruiter.name,
      company: log.recruiter.company,
      subject: log.subject,
      body: log.body,
      replied: Boolean(log.repliedAt)
    }))
  });

  const emailScores = await Promise.all(
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

  const averageReplyProbability =
    emailScores.length > 0 ? emailScores.reduce((sum, score) => sum + score.score, 0) / emailScores.length : 0;

  return {
    totals: {
      recruiters,
      campaigns,
      accounts,
      sent,
      opened,
      replied,
      failed,
      pending
    },
    responseRate: sent ? (replied / sent) * 100 : 0,
    openRate: sent ? (opened / sent) * 100 : 0,
    personalInsights: {
      totalEmailsSent: sent,
      responseRate: sent ? (replied / sent) * 100 : 0,
      bestPerformingMessage: bestMessageCandidate?.subject ?? null,
      bestTimeToSend: `${timeSuggestion.recommendedDay}, ${timeSuggestion.recommendedWindow}`,
      averageReplyProbability
    },
    replyInsights,
    activeAbTest,
    campaignHealth: campaignRows.map((campaign) => {
      const sentCount = campaign.emailLogs.filter((log) => Boolean(log.sentAt)).length;
      const replyCount = campaign.emailLogs.filter((log) => Boolean(log.repliedAt)).length;
      const failedCount = campaign.emailLogs.filter((log) => log.status === "FAILED").length;

      return {
        id: campaign.id,
        name: campaign.name,
        sendProgress: campaign.sendProgress,
        sentCount,
        replyRate: sentCount ? (replyCount / sentCount) * 100 : 0,
        failedCount,
        createdAt: campaign.createdAt
      };
    })
  };
}

