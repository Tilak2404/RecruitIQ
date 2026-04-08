import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/api";
import { getJobOsSettings } from "@/lib/services/job-os";
import { generatePortfolioAssets } from "@/lib/services/job-intelligence";
import { portfolioGenerateSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = portfolioGenerateSchema.parse(await request.json());
    const settings = await getJobOsSettings();
    const persona = payload.persona ?? settings.persona;

    const resumeText =
      payload.resume ??
      (
        await prisma.resume.findFirst({
          where: { isPrimary: true },
          orderBy: { createdAt: "desc" },
          select: {
            extractedText: true
          }
        })
      )?.extractedText;

    if (!resumeText) {
      throw new Error("Upload a resume before generating portfolio copy.");
    }

    const portfolio = await generatePortfolioAssets({
      resumeText,
      persona
    });

    return apiSuccess({
      persona,
      portfolio
    });
  } catch (error) {
    return apiError(error);
  }
}
