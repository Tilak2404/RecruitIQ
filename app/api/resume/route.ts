import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/api";
import { detectResumeSections, hasValidResumeStructure } from "@/lib/resume/sections";
import { extractResumeText } from "@/lib/services/resume";
import { sanitizeMultilineText } from "@/lib/utils/safety";
import { resumeUpdateSchema } from "@/lib/validators";

export const runtime = "nodejs";

function isSupportedResumeFile(file: File) {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  return (
    name.endsWith(".pdf") ||
    name.endsWith(".docx") ||
    type === "application/pdf" ||
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const candidateName = String(formData.get("candidateName") || process.env.CANDIDATE_NAME || "Chekkala Tilak");

    if (!(file instanceof File)) {
      throw new Error("Attach a PDF or DOCX resume file before uploading.");
    }

    if (!isSupportedResumeFile(file)) {
      throw new Error("Only PDF and DOCX resume uploads are supported.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extracted = await extractResumeText(buffer, {
      fileName: file.name,
      mimeType: file.type
    });

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
          extractedText: extracted.text,
          sections: extracted.sections,
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

    const normalizedText = sanitizeMultilineText(payload.extractedText);
    const sections = detectResumeSections(normalizedText);

    const resume = await prisma.resume.update({
      where: { id: existing.id },
      data: {
        candidateName: payload.candidateName,
        extractedText: normalizedText,
        sections: hasValidResumeStructure(normalizedText, sections)
          ? sections
          : existing.sections === null
            ? Prisma.JsonNull
            : (existing.sections as Prisma.InputJsonValue)
      }
    });

    return apiSuccess(resume);
  } catch (error) {
    return apiError(error);
  }
}
