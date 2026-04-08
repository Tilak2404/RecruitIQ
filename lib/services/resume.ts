import pdfParse from "pdf-parse";

export async function extractResumeText(buffer: Buffer) {
  const parsed = await pdfParse(buffer);
  return parsed.text.replace(/\s+/g, " ").trim();
}

export function trimResumeForPrompt(text: string) {
  return text.slice(0, 7000);
}
