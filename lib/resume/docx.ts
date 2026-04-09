import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import type { SectionName } from "@/types/app";

export type ExportableResumeSection = {
  name: SectionName | string;
  content: string[];
};

function createContentParagraph(line: string) {
  const trimmed = line.trim();
  const bulletText = trimmed.replace(/^[-*\u2022]\s*/, "");

  if (/^[-*\u2022]\s+/.test(trimmed)) {
    return new Paragraph({
      bullet: { level: 0 },
      spacing: { after: 120 },
      children: [new TextRun({ text: bulletText })]
    });
  }

  return new Paragraph({
    spacing: { after: 140 },
    children: [new TextRun({ text: trimmed })]
  });
}

export async function buildResumeDocxBuffer(sections: ExportableResumeSection[]) {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906,
              height: 16838
            },
            margin: {
              top: 720,
              bottom: 720,
              left: 720,
              right: 720
            }
          }
        },
        children: sections.flatMap((section) => [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 220, after: 120 },
            keepNext: true,
            children: [
              new TextRun({
                text: section.name,
                bold: true,
                size: 28
              })
            ]
          }),
          ...section.content.map((line) => createContentParagraph(line))
        ])
      }
    ]
  });

  return Packer.toBuffer(doc);
}
