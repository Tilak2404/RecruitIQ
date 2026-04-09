import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildResumeDocxBuffer } from "@/lib/resume/docx";

const exportSchema = z.object({
  sections: z.array(
    z.object({
      name: z.string(),
      content: z.array(z.string())
    })
  ),
  filename: z.string().optional()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sections, filename = "optimized-resume.docx" } = exportSchema.parse(body);
    const buffer = await buildResumeDocxBuffer(sections);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error("[RESUME EXPORT]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid export payload" }, { status: 400 });
    }
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
