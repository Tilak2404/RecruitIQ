import pdfParse from "pdf-parse";
import mammoth from "mammoth";

import type { SectionName } from '@/types/app';

export type ResumeSection = {
  name: SectionName;
  content: string[];
  originalLines: string[];
};

export async function extractResumeText(buffer: Buffer): Promise<{text: string, sections?: ResumeSection[]}> {
  // Try DOCX first
  try {
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    const result = await mammoth.extractRawText({arrayBuffer});
    const sections = parseSections(result.value);
    
    if (sections && sections.length > 0) {
      const fullText = sections.map(s => s.content.join('\n')).join('\n\n');
      return {text: fullText, sections};
    }
  } catch (docxError) {
    console.warn('DOCX parsing failed:', docxError);
  }

  // Fallback to PDF
  const pdfResult = await pdfParse(buffer);
  const sections = parseSections(pdfResult.text) || undefined;
  const pdfText = pdfResult.text.replace(/\s+/g, " ").trim();
  return {text: pdfText, sections};
}

function parseSections(text: string): ResumeSection[] | null {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  const sections: ResumeSection[] = [];
  let currentSection: ResumeSection | null = null;

  for (const line of lines) {
    if (isSectionHeading(line)) {
      if (currentSection) sections.push(currentSection);
      currentSection = {name: mapSectionName(line), content: [], originalLines: []};
    } else if (currentSection) {
      currentSection.content.push(line);
      currentSection.originalLines.push(line);
    }
  }

  if (currentSection) sections.push(currentSection);

  if (sections.length === 0) return null;

  // Merge small/Other
  const other = sections.filter(s => s.name === 'Other');
  if (other.length > 0) {
    const mainOther = other[0];
    sections.splice(sections.findIndex(s => s.name === 'Other'), 1);
    sections.push(mainOther);
  }

  return sections;
}

function isSectionHeading(line: string): boolean {
  const upper = line.toUpperCase();
  return upper.includes('EXPERIENCE') || upper.includes('SKILLS') || upper.includes('PROJECT') || upper.includes('EDUCATION') || upper.includes('SUMMARY') || upper.includes('PROFESSIONAL');
}

function mapSectionName(line: string): SectionName {
  const upper = line.toUpperCase();
  if (upper.includes('SUMMARY') || upper.includes('PROFESSIONAL')) return 'Summary';
  if (upper.includes('SKILLS')) return 'Skills';
  if (upper.includes('EXPERIENCE') || upper.includes('WORK')) return 'Experience';
  if (upper.includes('PROJECT')) return 'Projects';
  if (upper.includes('EDUCATION') || upper.includes('ACADEMIC')) return 'Education';
  return 'Other';
}

export function trimResumeForPrompt(text: string): string {
  return text.slice(0, 7000);
}

