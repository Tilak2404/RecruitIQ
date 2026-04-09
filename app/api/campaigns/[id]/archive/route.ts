import { apiError, apiSuccess } from "@/lib/api";
import { archiveDeliveredEmailLogs } from "@/lib/services/campaigns";

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const result = await archiveDeliveredEmailLogs(id);
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
