import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/api";
import { updateEmailLogSchema } from "@/lib/validators";

export async function PUT(request: Request) {
  try {
    const payload = updateEmailLogSchema.parse(await request.json());
    const log = await prisma.emailLog.update({
      where: { id: payload.emailLogId },
      data: {
        subject: payload.subject,
        body: payload.body,
        status: payload.status,
        repliedAt: payload.status === "REPLIED" ? new Date() : undefined,
        openedAt: payload.status === "OPENED" ? new Date() : undefined
      }
    });

    return apiSuccess(log);
  } catch (error) {
    return apiError(error);
  }
}
