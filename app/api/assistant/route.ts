import { apiError, apiSuccess } from "@/lib/api";
import { chatWithAssistant } from "@/lib/services/assistant";
import { assistantMessageSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = assistantMessageSchema.parse(await request.json());
    const result = await chatWithAssistant(payload.content);
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}

