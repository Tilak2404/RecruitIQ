import { apiError, apiSuccess } from "@/lib/api";
import { analyzeAndStoreReply } from "@/lib/services/replies";
import { analyzeReplySchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = analyzeReplySchema.parse(await request.json());
    const analysis = await analyzeAndStoreReply(payload);
    return apiSuccess(analysis);
  } catch (error) {
    return apiError(error);
  }
}

