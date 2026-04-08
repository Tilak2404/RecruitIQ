import { prisma } from "@/lib/prisma";
import { analyzeRecruiterReply } from "@/lib/services/gemini";
import { z } from "zod";

const ReplyAnalysisSchema = z.object({
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]),
  intent: z.enum(["INTERVIEW_REQUEST", "NEED_MORE_INFO", "REJECTION", "GENERAL_REPLY", "UNKNOWN"]),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  suggestedReply: z.string(),
  suggestedNextStep: z.string()
});

type ReplyAnalysisType = z.infer<typeof ReplyAnalysisSchema> & {
  reply_type: "interested" | "reject" | "ghosting" | "neutral";
  recruiter: { name: string; company: string } | null;
};

const DEFAULT_ANALYSIS: ReplyAnalysisType = {
  sentiment: "NEUTRAL",
  intent: "UNKNOWN",
  confidence: 0.5,
  summary: "No clear summary available",
  suggestedReply: "Thank you for your response. Best regards.",
  suggestedNextStep: "Reply promptly.",
  reply_type: "neutral",
  recruiter: null
};

export async function analyzeAndStoreReply(payload: {
  content: string;
  emailLogId?: string;
  recruiterId?: string;
}): Promise<ReplyAnalysisType> {
  try {
    const rawAnalysis = await analyzeRecruiterReply({
      content: payload.content,
    });

    let analysis: any = rawAnalysis;

    // SAFE cleaning
    if (typeof rawAnalysis === 'string') {
      const cleaned = rawAnalysis
        .replace(/```json|```/gi, "")
        .trim();
      try {
        analysis = JSON.parse(cleaned);
      } catch {
        analysis = { summary: rawAnalysis };
      }
    }

    // Enrich with reply_type
    const enriched = {
      ...analysis,
      reply_type: detectReplyType(analysis.intent || 'UNKNOWN', analysis.sentiment || 'NEUTRAL', payload.content),
      confidence: analysis.confidence || 0.7
    };

    const safeAnalysis = {
      ...DEFAULT_ANALYSIS,
      ...enriched
    };

    // Store (fixed Prisma schema)
    await prisma.replyAnalysis.create({
      data: {
        recruiterId: payload.recruiterId || null,
        emailLogId: payload.emailLogId || null,
        content: payload.content,
        sentiment: safeAnalysis.sentiment,
        intent: safeAnalysis.intent,
        summary: safeAnalysis.summary,
        suggestedReply: safeAnalysis.suggestedReply,
        suggestedNextStep: safeAnalysis.suggestedNextStep,
      }
    });

    return safeAnalysis;
  } catch (error) {
    console.error('[REPLIES] Failed:', error);
    return DEFAULT_ANALYSIS;
  }
}

export async function getRecentReplyAnalyses(limit = 5) {
  return prisma.replyAnalysis.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      recruiter: {
        select: {
          name: true,
          company: true
        }
      }
    },
    select: {
      id: true,
      sentiment: true,
      intent: true,
      summary: true,
      suggestedReply: true,
      suggestedNextStep: true,
      createdAt: true
    }
  }).then(analyses => analyses.map(analysis => ({
    ...analysis,
    reply_type: detectReplyType(analysis.intent, analysis.sentiment, analysis.summary),
    confidence: 0.7,
    recruiter: analysis.recruiter || null
  } as ReplyAnalysisType)));
}

function detectReplyType(intent: string, sentiment: string, content: string): ReplyAnalysisType['reply_type'] {
  const lower = content.toLowerCase();
  
  if (sentiment === "POSITIVE" || intent.includes("INTERVIEW") || 
      lower.includes("schedule") || lower.includes("next step")) {
    return "interested";
  }
  
  if (sentiment === "NEGATIVE" || intent.includes("REJECTION") || 
      lower.includes("not moving") || lower.includes("decline")) {
    return "reject";
  }
  
  if (content.trim().length < 100 || intent === "UNKNOWN") {
    return "ghosting";
  }
  
  return "neutral";
}

