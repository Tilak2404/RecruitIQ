import { NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { z } from 'zod';

const exportSchema = z.object({
  sections: z.array(z.object({
    name: z.string(),
    content: z.array(z.string())
  })),
  filename: z.string().optional()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sections, filename = 'optimized-resume.docx' } = exportSchema.parse(body);

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 720,
              bottom: 720,
              left: 720,
              right: 720
            }
          }
        },
        children: sections.flatMap(section => [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({
              text: section.name,
              bold: true,
              size: 28
            })]
          }),
          ...section.content.map(line => new Paragraph({
            children: [new TextRun(line)]
          }))
        ])
      }]
    });

    const blob = await Packer.toBlob(doc);
    
    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (error) {
    console.error('[RESUME EXPORT]', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}


