import { apiError, apiSuccess } from "@/lib/api";
import { getAnalyticsSnapshot } from "@/lib/services/analytics";

export async function GET() {
  try {
    const analytics = await getAnalyticsSnapshot();
    return apiSuccess(analytics);
  } catch (error) {
    return apiError(error, 500);
  }
}
