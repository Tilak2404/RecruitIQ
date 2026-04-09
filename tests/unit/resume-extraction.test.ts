import { describe, expect, it, vi } from "vitest";

const { extractRawText } = vi.hoisted(() => ({
  extractRawText: vi.fn()
}));

const pdfParseMock = vi.hoisted(() => vi.fn());

vi.mock("mammoth", () => ({
  default: {
    extractRawText
  }
}));

vi.mock("pdf-parse", () => ({
  default: pdfParseMock
}));

import { extractResumeText } from "@/lib/services/resume";

describe("resume extraction", () => {
  it("does not fall back to the PDF parser for DOCX uploads", async () => {
    extractRawText.mockRejectedValueOnce(new Error("corrupt docx"));

    await expect(
      extractResumeText(Buffer.from("PKDOCX"), {
        fileName: "resume.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      })
    ).rejects.toThrow("DOCX parsing failed");

    expect(pdfParseMock).not.toHaveBeenCalled();
  });

  it("uses the PDF parser for PDF uploads", async () => {
    pdfParseMock.mockResolvedValueOnce({ text: "SUMMARY\nBuilt APIs and dashboards." });

    const result = await extractResumeText(Buffer.from("%PDF-1.7"), {
      fileName: "resume.pdf",
      mimeType: "application/pdf"
    });

    expect(result.text).toContain("Built APIs and dashboards.");
    expect(pdfParseMock).toHaveBeenCalledTimes(1);
  });
});
