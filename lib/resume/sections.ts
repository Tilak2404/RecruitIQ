import type { SectionName } from "@/types/app";
import { sanitizeMultilineText } from "@/lib/utils/safety";

export type ResumeSection = {
  name: SectionName;
  content: string[];
  originalLines: string[];
};

const sectionMatchers: Array<{ name: SectionName; pattern: RegExp }> = [
  { name: "Summary", pattern: /\b(summary|professional summary|profile)\b/i },
  { name: "Skills", pattern: /\b(skills|technical skills|core skills|technologies)\b/i },
  { name: "Experience", pattern: /\b(experience|work experience|employment|professional experience)\b/i },
  { name: "Projects", pattern: /\b(projects|academic projects|personal projects)\b/i },
  { name: "Education", pattern: /\b(education|academic background|qualification)\b/i }
];

export function detectResumeSections(text: string): ResumeSection[] {
  const normalized = sanitizeMultilineText(text);
  if (!normalized) {
    return [];
  }

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const sections: ResumeSection[] = [];
  let current: ResumeSection | null = null;

  for (const line of lines) {
    const nextName = matchSectionName(line);

    if (nextName) {
      if (current) {
        sections.push(current);
      }

      current = {
        name: nextName,
        content: [],
        originalLines: []
      };
      continue;
    }

    if (!current) {
      current = {
        name: "Summary",
        content: [],
        originalLines: []
      };
    }

    current.content.push(line);
    current.originalLines.push(line);
  }

  if (current) {
    sections.push(current);
  }

  return sections;
}

export function flattenResumeSections(sections: ResumeSection[]) {
  return sections
    .flatMap((section) => section.content)
    .join("\n")
    .trim();
}

export function hasValidResumeStructure(text: string, sections: ResumeSection[]) {
  const normalized = sanitizeMultilineText(text);
  if (!normalized || sections.length === 0) {
    return false;
  }

  const originalLines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  const flattenedLines = sections.flatMap((section) => section.content).map((line) => line.trim()).filter(Boolean);
  const headingCount = originalLines.filter((line) => matchSectionName(line)).length;

  if (flattenedLines.length === 0) {
    return false;
  }

  if (headingCount >= 2 && sections.length < Math.min(headingCount, 2)) {
    return false;
  }

  if (originalLines.length >= 8 && flattenedLines.length < Math.max(3, Math.floor(originalLines.length / 3))) {
    return false;
  }

  return true;
}

export function getSectionText(sections: ResumeSection[], name: SectionName) {
  return sections
    .filter((section) => section.name === name)
    .flatMap((section) => section.content)
    .join("\n")
    .trim();
}

export function getResumeBullets(sections: ResumeSection[], names: SectionName[] = ["Experience", "Projects"]) {
  return sections
    .filter((section) => names.includes(section.name))
    .flatMap((section) => section.content)
    .filter((line) => line.length >= 18);
}

export function getExportSectionsFromText(text: string) {
  const normalized = sanitizeMultilineText(text);
  const detectedSections = detectResumeSections(normalized);

  if (hasValidResumeStructure(normalized, detectedSections)) {
    return detectedSections.map((section) => ({
      name: section.name,
      content: section.content
    }));
  }

  return normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, index) => {
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      const heading = lines[0] ?? `Section ${index + 1}`;
      const name = matchSectionName(heading) ?? `Section ${index + 1}`;
      const content = lines.slice(matchSectionName(heading) ? 1 : 0);

      return {
        name,
        content: content.length > 0 ? content : [heading]
      };
    });
}

function matchSectionName(line: string): SectionName | null {
  const compact = line.replace(/[:\-\u2013]+$/, "").trim();
  if (compact.length > 40) {
    return null;
  }

  const matched = sectionMatchers.find((candidate) => candidate.pattern.test(compact));
  return matched?.name ?? null;
}
