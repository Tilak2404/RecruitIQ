import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { detectResumeSections, flattenResumeSections, hasValidResumeStructure, type ResumeSection } from "@/lib/resume/sections";
import { sanitizeMultilineText } from "@/lib/utils/safety";

export type { ResumeSection };

type ResumeExtractionOptions = {
  fileName?: string;
  mimeType?: string;
};

function detectResumeFileKind(buffer: Buffer, options: ResumeExtractionOptions) {
  const fileName = options.fileName?.toLowerCase() ?? "";
  const mimeType = options.mimeType?.toLowerCase() ?? "";
  const signature = buffer.subarray(0, 8).toString("utf8");

  if (fileName.endsWith(".docx") || mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return "docx" as const;
  }

  if (fileName.endsWith(".pdf") || mimeType === "application/pdf") {
    return "pdf" as const;
  }

  if (signature.startsWith("%PDF-")) {
    return "pdf" as const;
  }

  if (signature.startsWith("PK")) {
    return "docx" as const;
  }

  return "unknown" as const;
}

async function extractDocxResumeText(buffer: Buffer) {
  try {
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    const result = await mammoth.extractRawText({ arrayBuffer });
    const sections = detectResumeSections(result.value);
    const normalizedDocxText = sanitizeMultilineText(result.value);

    if (hasValidResumeStructure(normalizedDocxText, sections)) {
      return {
        text: flattenResumeSections(sections),
        sections
      };
    }

    if (normalizedDocxText) {
      return {
        text: normalizedDocxText
      };
    }
  } catch (docxError) {
    throw new Error(`DOCX parsing failed: ${docxError instanceof Error ? docxError.message : "Unsupported DOCX file."}`);
  }
  
  throw new Error("DOCX parsing failed: No extractable text was found in the uploaded file.");
}

async function extractPdfResumeText(buffer: Buffer) {
  const pdfResult = await pdfParse(buffer);
  const sections = detectResumeSections(pdfResult.text);
  const pdfText = sanitizeMultilineText(pdfResult.text);

  return {
    text: pdfText,
    sections: hasValidResumeStructure(pdfText, sections) ? sections : undefined
  };
}

export async function extractResumeText(
  buffer: Buffer,
  options: ResumeExtractionOptions = {}
): Promise<{ text: string; sections?: ResumeSection[] }> {
  const fileKind = detectResumeFileKind(buffer, options);

  if (fileKind === "docx") {
    return extractDocxResumeText(buffer);
  }

  if (fileKind === "pdf") {
    return extractPdfResumeText(buffer);
  }

  try {
    return await extractDocxResumeText(buffer);
  } catch {
    return extractPdfResumeText(buffer);
  }
}

export function trimResumeForPrompt(text: string): string {
  return text.slice(0, 7000);
}
