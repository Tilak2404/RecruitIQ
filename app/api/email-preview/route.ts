import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/api";
import { updateEmailLogSchema } from "@/lib/validators";

export async function PUT(request: Request) {
  try {
    const payload = updateEmailLogSchema.parse(await request.json());
    const emailLogId = payload.emailLogId ?? payload.id;
    if (!emailLogId) {
      throw new Error("Email log id is required");
    }

    const log = await prisma.emailLog.update({
      where: { id: emailLogId },
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
