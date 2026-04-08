import { apiError, apiSuccess } from "@/lib/api";
import { queueAutomaticFollowUps, runAutomationCycle } from "@/lib/services/automation";
import { followUpSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = followUpSchema.parse(await request.json());

    if (payload.campaignId || payload.emailLogId) {
      const result = await queueAutomaticFollowUps(payload);
      return apiSuccess(result);
    }

    const result = await runAutomationCycle();
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}

