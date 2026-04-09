import { apiError, apiSuccess } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { createCampaignWithDrafts, getCampaignSummaries } from "@/lib/services/campaigns";
import { createCampaignSchema } from "@/lib/validators";

export async function GET() {
  try {
    const campaigns = await getCampaignSummaries();
    return apiSuccess(campaigns);
  } catch (error) {
    return apiError(error, 500);
  }
}

export async function POST(request: Request) {
  try {
    const payload = createCampaignSchema.parse(await request.json());
    const recruiters = await Promise.all(
      payload.recruiters.map((recruiter) =>
        prisma.recruiter.upsert({
          where: { email: recruiter.email },
          update: recruiter,
          create: recruiter,
          select: { id: true }
        })
      )
    );

    const campaign = await createCampaignWithDrafts({
      name: payload.name,
      description: payload.description,
      recruiterIds: recruiters.map((recruiter) => recruiter.id),
      delayMs: payload.delayMs,
      batchSize: payload.batchSize,
      rotationSize: payload.batchSize,
      retryLimit: 2,
      defaultSubject: payload.subject
    });
    return apiSuccess(campaign, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
