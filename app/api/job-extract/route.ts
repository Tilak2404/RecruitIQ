import { apiError, apiSuccess } from "@/lib/api";
import { extractJobDescriptionFromUrl } from "@/lib/services/job-extract";
import { jobExtractSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = jobExtractSchema.parse(await request.json());
    const extracted = await extractJobDescriptionFromUrl(payload.url);
    return apiSuccess(extracted);
  } catch (error) {
    return apiError(error);
  }
}
