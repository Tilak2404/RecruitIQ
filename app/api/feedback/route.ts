import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const feedbackSchema = z.object({
  feature: z.enum(['ats', 'email', 'consistency', 'credibility']),
  userInput: z.record(z.any()).optional(),
  aiOutput: z.record(z.any()),
  feedback: z.enum(['PERFECT', 'GOOD', 'OK', 'BAD', 'WRONG']),
  userComment: z.string().optional(),
  sessionId: z.string().optional()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = feedbackSchema.parse(body);

    const insertQuery = `
      INSERT INTO "FeedbackLog" (
        "feature", "userInput", "aiOutput", "feedback", "userComment", 
        "sessionId", "modelUsed", "createdAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, NOW()
      )
    `;

    await prisma.$executeRawUnsafe(insertQuery, [
      data.feature,
      JSON.stringify(data.userInput || {}),
      JSON.stringify(data.aiOutput),
      data.feedback,
      data.userComment || null,
      data.sessionId || null,
      process.env.GEMINI_MODEL || 'gemini-1.5-flash'
    ]);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[FEEDBACK]', error);
    return NextResponse.json({ error: 'Feedback failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const feature = req.nextUrl.searchParams.get('feature');
  const whereClause = feature ? 'WHERE "feature" = $1' : '';
  
  const selectQuery = `
    SELECT * FROM "FeedbackLog" 
    ${whereClause}
    ORDER BY "createdAt" DESC 
    LIMIT 50
  `;

  const params = feature ? [feature] : [];
  const feedback = await prisma.$queryRawUnsafe(selectQuery, ...params);

  return NextResponse.json(feedback);
}

