import { apiError, apiSuccess } from "@/lib/api";
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
    const campaign = await createCampaignWithDrafts(payload);
    return apiSuccess(campaign, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
