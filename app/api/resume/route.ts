import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/api";
import { extractResumeText } from "@/lib/services/resume";
import { resumeUpdateSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const candidateName = String(formData.get("candidateName") || process.env.CANDIDATE_NAME || "Chekkala Tilak");

    if (!(file instanceof File)) {
      throw new Error("Attach a PDF resume file before uploading");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extractedText = await extractResumeText(buffer);

    const resume = await prisma.$transaction(async (tx) => {
      await tx.resume.updateMany({
        data: {
          isPrimary: false
        }
      });

      return tx.resume.create({
        data: {
          candidateName,
          fileName: file.name,
          extractedText,
          isPrimary: true
        }
      });
    });

    return apiSuccess(resume);
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const payload = resumeUpdateSchema.parse(await request.json());

    const existing = await prisma.resume.findFirst({
      where: { isPrimary: true },
      orderBy: { createdAt: "desc" }
    });

    if (!existing) {
      throw new Error("Upload a resume before saving edits.");
    }

    const resume = await prisma.resume.update({
      where: { id: existing.id },
      data: {
        candidateName: payload.candidateName,
        extractedText: payload.extractedText
      }
    });

    return apiSuccess(resume);
  } catch (error) {
    return apiError(error);
  }
}
