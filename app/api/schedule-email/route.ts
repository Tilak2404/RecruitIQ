import { apiError, apiSuccess } from "@/lib/api";
import { schedulePendingEmails } from "@/lib/services/automation";
import { scheduleEmailSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = scheduleEmailSchema.parse(await request.json());
    const result = await schedulePendingEmails(payload);
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}

