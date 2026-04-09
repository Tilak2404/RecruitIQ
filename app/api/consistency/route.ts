import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyzeConsistency } from "@/lib/consistency/engine";

const consistencySchema = z.object({
  resumeText: z.string(),
  jobDescription: z.string(),
  emailDraft: z.string().optional(),
  sections: z.array(
    z.object({
      name: z.string(),
      content: z.array(z.string())
    })
  ).optional()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resumeText, jobDescription, emailDraft, sections } = consistencySchema.parse(body);
    const result = analyzeConsistency({
      resumeText,
      jobDescription,
      emailDraft,
      sections: sections?.map((section) => ({
        name: section.name as import("@/types/app").SectionName,
        content: section.content,
        originalLines: [...section.content]
      }))
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[CONSISTENCY]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", consistencyScore: 0 }, { status: 400 });
    }
    return NextResponse.json({ error: "Analysis failed", consistencyScore: 0 }, { status: 500 });
  }
}
