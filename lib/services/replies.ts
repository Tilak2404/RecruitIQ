import { prisma } from "@/lib/prisma";
import { analyzeRecruiterReply } from "@/lib/services/gemini";
import type { ReplyAnalysisSummary } from "@/types/app";

const DEFAULT_ANALYSIS: ReplyAnalysisSummary = {
  id: "fallback-analysis",
  sentiment: "NEUTRAL",
  intent: "UNKNOWN",
  confidence: 0.5,
  summary: "No clear summary available",
  suggestedReply: "Thank you for your response. Best regards.",
  suggestedNextStep: "Reply promptly.",
  reply_type: "neutral",
  recruiter: null,
  createdAt: new Date()
};

export async function analyzeAndStoreReply(payload: {
  content: string;
  emailLogId?: string;
  recruiterId?: string;
}): Promise<ReplyAnalysisSummary> {
  try {
    const rawAnalysis = await analyzeRecruiterReply({
      content: payload.content
    });

    const safeAnalysis = {
      ...DEFAULT_ANALYSIS,
      ...rawAnalysis,
      reply_type: detectReplyType(rawAnalysis.intent, rawAnalysis.sentiment, payload.content),
      confidence: rawAnalysis.confidence ?? 0.7
    };

    const created = await prisma.replyAnalysis.create({
      data: {
        recruiterId: payload.recruiterId || null,
        emailLogId: payload.emailLogId || null,
        content: payload.content,
        sentiment: safeAnalysis.sentiment,
        intent: safeAnalysis.intent,
        summary: safeAnalysis.summary,
        suggestedReply: safeAnalysis.suggestedReply,
        suggestedNextStep: safeAnalysis.suggestedNextStep
      },
      select: {
        id: true,
        sentiment: true,
        intent: true,
        summary: true,
        suggestedReply: true,
        suggestedNextStep: true,
        createdAt: true,
        recruiter: {
          select: {
            name: true,
            company: true
          }
        }
      }
    });

    return {
      ...created,
      suggestedNextStep: created.suggestedNextStep ?? safeAnalysis.suggestedNextStep,
      reply_type: detectReplyType(created.intent, created.sentiment, payload.content),
      confidence: safeAnalysis.confidence,
      recruiter: created.recruiter || null
    };
  } catch (error) {
    console.error("[REPLIES] Failed:", error);
    return {
      ...DEFAULT_ANALYSIS,
      id: `fallback-${Date.now()}`,
      createdAt: new Date()
    };
  }
}

export async function getRecentReplyAnalyses(limit = 5): Promise<ReplyAnalysisSummary[]> {
  const analyses = await prisma.replyAnalysis.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      sentiment: true,
      intent: true,
      summary: true,
      suggestedReply: true,
      suggestedNextStep: true,
      createdAt: true,
      recruiter: {
        select: {
          name: true,
          company: true
        }
      }
    }
  });

  return analyses.map((analysis) => ({
    ...analysis,
    suggestedNextStep: analysis.suggestedNextStep ?? "Reply promptly.",
    reply_type: detectReplyType(analysis.intent, analysis.sentiment, analysis.summary),
    confidence: 0.7,
    recruiter: analysis.recruiter || null
  }));
}

function detectReplyType(
  intent: ReplyAnalysisSummary["intent"],
  sentiment: ReplyAnalysisSummary["sentiment"],
  content: string
): ReplyAnalysisSummary["reply_type"] {
  const lower = content.toLowerCase();
  
  if (sentiment === "POSITIVE" || intent.includes("INTERVIEW") || lower.includes("schedule") || lower.includes("next step")) {
    return "interested";
  }
  
  if (sentiment === "NEGATIVE" || intent.includes("REJECTION") || lower.includes("not moving") || lower.includes("decline")) {
    return "reject";
  }
  
  if (content.trim().length < 100 || intent === "UNKNOWN") {
    return "ghosting";
  }
  
  return "neutral";
}
