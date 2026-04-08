import { apiError, apiSuccess } from "@/lib/api";
import { sendCampaignEmails } from "@/lib/services/mailer";
import { sendCampaignSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = sendCampaignSchema.parse(await request.json());
    const summary = await sendCampaignEmails(payload);
    return apiSuccess(summary);
  } catch (error) {
    return apiError(error);
  }
}
