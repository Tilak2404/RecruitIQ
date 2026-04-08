import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/api";
import { getActiveAtsAnalysis } from "@/lib/services/ats";
import { getJobOsSettings, storeCampaignAbTest } from "@/lib/services/job-os";
import { generateRecruiterEmail } from "@/lib/services/gemini";
import { trimResumeForPrompt } from "@/lib/services/resume";
import { generateEmailSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const payload = generateEmailSchema.parse(await request.json());
    const resume = await prisma.resume.findFirst({
      where: { isPrimary: true },
      orderBy: { createdAt: "desc" }
    });

    if (!resume) {
      throw new Error("Upload a resume before generating outreach emails");
    }

    const activeAtsAnalysis = await getActiveAtsAnalysis();
    const jobOsSettings = await getJobOsSettings();
    const persona = payload.persona ?? jobOsSettings.persona;

    const logs = await prisma.emailLog.findMany({
      where: {
        campaignId: payload.campaignId,
        ...(payload.recruiterId ? { recruiterId: payload.recruiterId } : {})
      },
      include: {
        recruiter: true
      }
    });

    if (logs.length === 0) {
      throw new Error("No recruiters found for this campaign");
    }

    const generated = [];
    const variantAssignments: Array<{ emailLogId: string; label: "A" | "B" }> = [];
    let variantExamples: Array<{ label: "A" | "B"; subject: string; body: string }> = [];

    for (const [index, log] of logs.entries()) {
      const variantLabel = payload.mode === "AB_TEST" ? (index % 2 === 0 ? "A" : "B") : null;
      const variationHint =
        variantLabel === "A"
          ? "Use a sharper, more direct structure with a confident CTA and tighter phrasing."
          : variantLabel === "B"
            ? "Use a warmer tone, slightly more narrative flow, and a softer relationship-building CTA."
            : undefined;
      const draft = await generateRecruiterEmail({
        recruiterName: log.recruiter.name,
        recruiterEmail: log.recruiter.email,
        company: log.recruiter.company,
        resumeText: trimResumeForPrompt(resume.extractedText),
        atsContext: activeAtsAnalysis,
        persona,
        variationHint,
        candidateName: process.env.CANDIDATE_NAME ?? resume.candidateName
      });

      const updated = await prisma.emailLog.update({
        where: { id: log.id },
        data: {
          subject: draft.subject,
          body: draft.body,
          status: ["SENT", "OPENED", "REPLIED"].includes(log.status) ? log.status : "NOT_SENT"
        },
        include: {
          recruiter: true,
          sendingAccount: {
            select: {
              id: true,
              name: true,
              email: true,
              type: true,
              isActive: true
            }
          }
        }
      });

      generated.push(updated);

      if (variantLabel) {
        variantAssignments.push({ emailLogId: log.id, label: variantLabel });
        if (!variantExamples.some((item) => item.label === variantLabel)) {
          variantExamples = [...variantExamples, { label: variantLabel, subject: draft.subject, body: draft.body }];
        }
      }
    }

    if (payload.mode === "AB_TEST" && variantAssignments.length > 0 && variantExamples.length === 2) {
      await storeCampaignAbTest({
        campaignId: payload.campaignId,
        persona,
        variants: variantExamples as Array<{ label: "A" | "B"; subject: string; body: string }>,
        assignments: variantAssignments
      });
    }

    return apiSuccess({
      generated,
      mode: payload.mode,
      persona
    });
  } catch (error) {
    return apiError(error);
  }
}
