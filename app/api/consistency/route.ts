import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const consistencySchema = z.object({
  resumeText: z.string(),
  jobDescription: z.string(),
  emailDraft: z.string().optional(),
  sections: z.array(z.object({
    name: z.string(),
    content: z.array(z.string())
  })).optional()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resumeText, jobDescription, emailDraft, sections } = consistencySchema.parse(body);

    const prompt = `CRITICAL: Build consistency engine for resume → email → job alignment.

STRICT RULES:
- NO fabrication
- NO random skills
- ONLY strengthen existing alignment
- Preserve truth

ROLE IDENTITY (from JD):
Extract primary role, key skills, expectations

RESUME PROFILE:
Dominant role, strongest skills, experience focus

EMAIL ANALYSIS:
Role positioning, skills mentioned

CONSISTENCY CHECK:
1. Role alignment across all 3
2. Skill emphasis consistency
3. Experience reflection
4. Story coherence

Return STRICT JSON:

{
  "consistencyScore": 0-100,
  "roleDetected": "string",
  "issues": [
    {
      "type": "role_mismatch | skill_misalign | experience_gap | messaging_inconsistent",
      "description": "specific issue",
      "elements": ["resume", "email", "jd"]
    }
  ],
  "alignedElements": ["list strong matches"],
  "misalignedElements": ["list issues"],
  "emailFix": "corrected email body (HTML)",
  "resumeFixSuggestions": ["targeted improvements"],
  "reason": "why fixes work"
}

Resume:
${resumeText}

Job:
${jobDescription}

Email:
${emailDraft || 'No email provided'}

Sections:
${sections ? JSON.stringify(sections, null, 2) : 'No sections'}`;

    // Call Gemini with elite consistency prompt
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        consistencyScore: 50, 
        issues: ['No Gemini key - basic fallback'],
        emailFix: emailDraft || '',
        reason: 'API key needed for elite analysis'
      });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2000,
          responseMimeType: 'application/json'
        }
      })
    });

    const data = await response.json();
    const result = JSON.parse(data.candidates[0].content.parts[0].text);

    return NextResponse.json(result);

  } catch (error) {
    console.error('[CONSISTENCY]', error);
    return NextResponse.json({ error: 'Analysis failed', consistencyScore: 0 }, { status: 500 });
  }
}

