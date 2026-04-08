import { apiError, apiSuccess } from "@/lib/api";
import { clearSentEmailLogs } from "@/lib/services/campaigns";

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const result = await clearSentEmailLogs(id);
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
