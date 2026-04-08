import { apiError, apiSuccess } from "@/lib/api";
import { getJobOsSettings } from "@/lib/services/job-os";
import { scoreOutreachEmail } from "@/lib/services/job-intelligence";
import { emailScoreSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = emailScoreSchema.parse(await request.json());
    const settings = await getJobOsSettings();
    const persona = payload.persona ?? settings.persona;

    const scores = await Promise.all(
      payload.drafts.map(async (draft) => ({
        emailLogId: draft.emailLogId ?? null,
        subject: draft.subject,
        score: await scoreOutreachEmail({
          recruiterName: draft.recruiterName,
          recruiterEmail: draft.recruiterEmail,
          company: draft.company,
          subject: draft.subject,
          body: draft.body,
          persona
        })
      }))
    );

    return apiSuccess({
      persona,
      scores
    });
  } catch (error) {
    return apiError(error);
  }
}
