import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export type ResumeSection = {
  name: SectionName;
  content: string[];
  originalLines: string[];
};

export async function extractResumeText(buffer: Buffer): Promise<{text: string, sections?: ResumeSection[]}> {
  const uint8Array = new Uint8Array(buffer);
  const docType = mammoth.detectFileType(uint8Array);
  
  if (docType === "docx") {
    const result = await mammoth.extractRawText({arrayBuffer: buffer});
    const sections = parseSections(result.value);
    return {text: sections ? sections.map(s => s.content.join('\n')).join('\n\n') : result.value, sections};
  }

  const pdfResult = await pdfParse(buffer);
  const sections = parseSections(pdfResult.text);
  return {text: pdfResult.text.replace(/\s+/g, " ").trim(), sections};
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
    sections = sections.filter(s => s.name !== 'Other').concat([mainOther]);
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

