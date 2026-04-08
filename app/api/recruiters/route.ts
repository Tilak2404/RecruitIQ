import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/api";
import { ensureWorkflowEmailLogs } from "@/lib/services/campaigns";
import { recruiterSchema } from "@/lib/validators";

export async function GET() {
  try {
    const recruiters = await prisma.recruiter.findMany({
      orderBy: {
        createdAt: "desc"
      }
    });

    return apiSuccess(recruiters);
  } catch (error) {
    return apiError(error, 500);
  }
}

export async function POST(request: Request) {
  try {
    const payload = recruiterSchema.parse(await request.json());
    const recruiter = await prisma.recruiter.upsert({
      where: { email: payload.email },
      update: payload,
      create: payload
    });

    await ensureWorkflowEmailLogs([recruiter.id]);

    return apiSuccess(recruiter, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
