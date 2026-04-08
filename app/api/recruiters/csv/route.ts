import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/api";
import { parseRecruiterCsv } from "@/lib/services/csv";
import { ensureWorkflowEmailLogs } from "@/lib/services/campaigns";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new Error("Upload a CSV file with name,email,company columns");
    }

    const content = Buffer.from(await file.arrayBuffer()).toString("utf8");
    const recruiters = parseRecruiterCsv(content);

    const result = await prisma.$transaction(
      recruiters.map((recruiter) =>
        prisma.recruiter.upsert({
          where: { email: recruiter.email },
          update: recruiter,
          create: recruiter
        })
      )
    );

    await ensureWorkflowEmailLogs(result.map((recruiter) => recruiter.id));

    return apiSuccess({ imported: result.length });
  } catch (error) {
    return apiError(error);
  }
}
