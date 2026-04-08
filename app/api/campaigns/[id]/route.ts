import { apiError, apiSuccess } from "@/lib/api";
import { getCampaignDetail } from "@/lib/services/campaigns";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const campaign = await getCampaignDetail(id);

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    return apiSuccess(campaign);
  } catch (error) {
    return apiError(error, 404);
  }
}
