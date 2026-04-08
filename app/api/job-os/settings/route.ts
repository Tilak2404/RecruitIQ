import { apiError, apiSuccess } from "@/lib/api";
import { getJobOsSettings, updateJobOsSettings } from "@/lib/services/job-os";
import { jobOsSettingsSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET() {
  try {
    const settings = await getJobOsSettings();
    return apiSuccess(settings);
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const payload = jobOsSettingsSchema.parse(await request.json());
    const settings = await updateJobOsSettings(payload);
    return apiSuccess(settings);
  } catch (error) {
    return apiError(error);
  }
}
