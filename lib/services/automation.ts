import { prisma } from "@/lib/prisma";
import { generateFollowUpEmail } from "@/lib/services/gemini";
import { sendDueScheduledEmails } from "@/lib/services/mailer";
import { getDueFollowUpStage } from "@/lib/services/strategy";

export async function schedulePendingEmails(input: {
  campaignId: string;
  scheduledAt: Date;
  emailLogIds?: string[];
}) {
  const result = await prisma.emailLog.updateMany({
    where: {
      campaignId: input.campaignId,
      status: "NOT_SENT",
      ...(input.emailLogIds?.length
        ? {
            id: {
              in: input.emailLogIds
            }
          }
        : {})
    },
    data: {
      scheduledAt: input.scheduledAt,
      lastError: null
    }
  });

  return {
    scheduled: result.count,
    scheduledAt: input.scheduledAt
  };
}

export async function queueAutomaticFollowUps(input?: {
  campaignId?: string;
  emailLogId?: string;
}) {
  const candidates = await prisma.emailLog.findMany({
    where: {
      sentAt: { not: null },
      repliedAt: null,
      followUpStage: { lt: 2 },
      status: { in: ["SENT", "OPENED"] },
      ...(input?.campaignId ? { campaignId: input.campaignId } : {}),
      ...(input?.emailLogId ? { id: input.emailLogId } : {})
    },
    include: {
      recruiter: true
    }
  });

  let queued = 0;

  for (const log of candidates) {
    const nextStage = getDueFollowUpStage({
      sentAt: log.sentAt,
      lastSentAt: log.lastSentAt,
      repliedAt: log.repliedAt,
      followUpStage: log.followUpStage,
      status: log.status
    });

    if (!nextStage) {
      continue;
    }

    const draft = await generateFollowUpEmail({
      recruiterName: log.recruiter.name,
      company: log.recruiter.company,
      previousSubject: log.subject,
      previousBody: log.body,
      stage: nextStage,
      candidateName: process.env.CANDIDATE_NAME ?? "Chekkala Tilak"
    });

    await prisma.emailLog.update({
      where: { id: log.id },
      data: {
        subject: draft.subject,
        body: draft.body,
        status: "NOT_SENT",
        scheduledAt: new Date(),
        followUpStage: nextStage,
        lastFollowUpAt: new Date(),
        lastError: null
      }
    });

    queued += 1;
  }

  return {
    queued
  };
}

export async function runAutomationCycle() {
  const followUps = await queueAutomaticFollowUps();
  const scheduledSends = await sendDueScheduledEmails();

  return {
    queuedFollowUps: followUps.queued,
    scheduledRuns: scheduledSends,
    processedCampaigns: scheduledSends.length,
    sent: scheduledSends.reduce((total, entry) => total + entry.sent, 0),
    failed: scheduledSends.reduce((total, entry) => total + entry.failed, 0)
  };
}

