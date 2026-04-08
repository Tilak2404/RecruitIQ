import { apiError, apiSuccess } from "@/lib/api";
import { activateAtsAnalysis, applyAtsImprovementsToPrimaryResume } from "@/lib/services/ats";
import { atsUseSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = atsUseSchema.parse(await request.json());
    const activeAnalysis = await activateAtsAnalysis(payload.analysisId);
    return apiSuccess(activeAnalysis);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = atsUseSchema.parse(await request.json());
    const resume = await applyAtsImprovementsToPrimaryResume(payload.analysisId);
    return apiSuccess(resume);
  } catch (error) {
    return apiError(error);
  }
}
