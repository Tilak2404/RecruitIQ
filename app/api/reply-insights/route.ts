import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/api";
import { getJobOsSettings } from "@/lib/services/job-os";
import { analyzeReplyInsights } from "@/lib/services/job-intelligence";
import { replyInsightsSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = replyInsightsSchema.parse(await request.json());
    const settings = await getJobOsSettings();
    const persona = payload.persona ?? settings.persona;

    const logs = await prisma.emailLog.findMany({
      where: {
        ...(payload.campaignId ? { campaignId: payload.campaignId } : {}),
        ...(payload.draftIds?.length ? { id: { in: payload.draftIds } } : {})
      },
      include: {
        recruiter: {
          select: {
            name: true,
            company: true
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      },
      take: 30
    });

    const insight = await analyzeReplyInsights({
      persona,
      emails: logs.map((log) => ({
        recruiterName: log.recruiter.name,
        company: log.recruiter.company,
        subject: log.subject,
        body: log.body,
        replied: Boolean(log.repliedAt)
      }))
    });

    return apiSuccess({
      persona,
      insight
    });
  } catch (error) {
    return apiError(error);
  }
}
