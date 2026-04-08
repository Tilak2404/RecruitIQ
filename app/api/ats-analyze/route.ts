import { apiError, apiSuccess } from "@/lib/api";
import { storeAtsAnalysis } from "@/lib/services/ats";
import { analyzeResumeAgainstJobDescription } from "@/lib/services/gemini";
import { atsAnalyzeSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = atsAnalyzeSchema.parse(await request.json());
    const analysis = await analyzeResumeAgainstJobDescription({
      resumeText: payload.resume,
      jobDescription: payload.jobDescription,
      persona: payload.persona
    });
    const stored = await storeAtsAnalysis({
      resumeText: payload.resume,
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
