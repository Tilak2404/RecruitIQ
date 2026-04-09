import { NextRequest, NextResponse } from 'next/server';
import { analyzeAtsCompatibility } from '@/lib/ats/engine';
import { getJobOsSettings } from '@/lib/services/job-os';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const analyzeSchema = z.object({
  jobDescription: z.string().min(50),
  resumeText: z.string().optional(),
  persona: z.enum(['STARTUP', 'BIG_TECH', 'HR_RECRUITER', 'HIRING_MANAGER']).optional()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobDescription, resumeText, persona } = analyzeSchema.parse(body);

    const targetText = resumeText || (await prisma.resume.findFirst({
      where: { isPrimary: true },
      orderBy: { createdAt: 'desc' },
      select: { extractedText: true }
    }))?.extractedText || '';

    if (!targetText) {
      return NextResponse.json({ error: 'No resume uploaded. Please upload a resume first.' }, { status: 400 });
    }

    const settings = await getJobOsSettings();
    const analysis = analyzeAtsCompatibility({
      resumeText: targetText,
      jobDescription,
      persona: persona ?? settings.persona
    });

    return NextResponse.json({ analysis });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    console.error('[ATS ANALYZE]', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}

