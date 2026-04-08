import { prisma } from "@/lib/prisma";
import { analyzeRecruiterReply } from "@/lib/services/gemini";

export async function getRecentReplyAnalyses(limit = 5) {
  return prisma.replyAnalysis.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      recruiter: {
        select: {
          id: true,
          name: true,
          company: true,
          email: true
        }
      },
      emailLog: {
        select: {
          id: true,
          subject: true,
          status: true,
          updatedAt: true
        }
      }
    }
  });
}

export async function analyzeAndStoreReply(input: {
  content: string;
  emailLogId?: string;
  recruiterId?: string;
}) {
  let emailLog:
    | {
        id: string;
        subject: string;
        body: string;
        recruiter: {
          id: string;
          name: string;
          company: string;
          email: string;
        };
      }
    | null = null;
  let recruiter:
    | {
        id: string;
        name: string;
        company: string;
        email: string;
      }
    | null = null;

  if (input.emailLogId) {
    const existingLog = await prisma.emailLog.findUnique({
      where: { id: input.emailLogId },
      select: {
        id: true,
        subject: true,
        body: true,
        recruiter: {
          select: {
            id: true,
            name: true,
            company: true,
            email: true
          }
        }
      }
    });

    emailLog = existingLog;
    recruiter = existingLog?.recruiter ?? null;
  } else if (input.recruiterId) {
    recruiter = await prisma.recruiter.findUnique({
      where: { id: input.recruiterId },
      select: {
        id: true,
        name: true,
        company: true,
        email: true
      }
    });
  }

  const analysis = await analyzeRecruiterReply({
    content: input.content,
    recruiterName: recruiter?.name,
    company: recruiter?.company,
    latestSubject: emailLog?.subject,
    latestBody: emailLog?.body,
    candidateName: process.env.CANDIDATE_NAME ?? "Chekkala Tilak"
  });

  const saved = await prisma.replyAnalysis.create({
    data: {
      content: input.content,
      sentiment: analysis.sentiment,
      intent: analysis.intent,
      summary: analysis.summary,
      suggestedReply: analysis.suggestedReply,
      suggestedNextStep: analysis.suggestedNextStep,
      recruiterId: recruiter?.id,
      emailLogId: emailLog?.id
    },
    include: {
      recruiter: {
        select: {
          id: true,
          name: true,
          company: true,
          email: true
        }
      },
      emailLog: {
        select: {
          id: true,
          subject: true,
          status: true,
          updatedAt: true
        }
      }
    }
  });

  if (emailLog) {
    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: "REPLIED",
        repliedAt: new Date(),
        scheduledAt: null,
        lastError: null
      }
    });
  }

  return saved;
}

