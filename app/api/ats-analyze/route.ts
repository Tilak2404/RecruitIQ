import { apiError, apiSuccess } from "@/lib/api";
import { storeAtsAnalysis } from "@/lib/services/ats";
import { analyzeAtsCompatibility } from "@/lib/ats/engine";
import { atsAnalyzeSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = atsAnalyzeSchema.parse(await request.json());
    const resumeText = payload.resumeText ?? payload.resume ?? "";
    const persona = payload.persona ?? "STARTUP";
    const analysis = analyzeAtsCompatibility({
      resumeText,
      jobDescription: payload.jobDescription,
      persona
    });
    const stored = await storeAtsAnalysis({
      resumeText,
      jobDescription: payload.jobDescription,
      analysis
    });

    return apiSuccess({
      analysis,
      storageId: stored.id
    });
  } catch (error) {
    return apiError(error);
  }
}
