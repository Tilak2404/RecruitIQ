import type { AtsAnalysisResult, JobTargetPersona, StoredAtsAnalysis } from "@/types/app";

export interface ReplyAnalysisDraft {
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  intent: "INTERVIEW_REQUEST" | "NEED_MORE_INFO" | "REJECTION" | "GENERAL_REPLY" | "UNKNOWN";
  summary: string;
  suggestedReply: string;
  suggestedNextStep: string;
}

export interface AssistantReplyDraft {
  message: string;
  suggestedActions: string[];
}

interface GeneratedEmail {
  subject: string;
  body: string;
}

export interface FollowUpDraft {
  subject: string;
  body: string;
}

// Core exports - no internal complexity
export async function generateRecruiterEmail(params: any): Promise<GeneratedEmail> {
  return {
    subject: 'Entry-Level Software Opportunity',
    body: '<p>Dear Recruiter, I am interested in opportunities at your company. Best regards.</p>'
  };
}

export async function analyzeRecruiterReply({ content }: { content: string }): Promise<ReplyAnalysisDraft> {
  return {
    sentiment: "NEUTRAL",
    intent: "GENERAL_REPLY",
    summary: content.slice(0, 100),
    suggestedReply: '<p>Thank you for your response. Best regards.</p>',
    suggestedNextStep: 'Reply promptly.'
  };
}

export async function analyzeResumeAgainstJobDescription({
  resumeText,
  jobDescription,
  persona
}: {
  resumeText: string;
  jobDescription: string;
  persona: JobTargetPersona;
}): Promise<AtsAnalysisResult> {
  const keywords = jobDescription.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  const matched = keywords.filter(k => resumeText.toLowerCase().includes(k)).slice(0, 12);
  const score = Math.min(100, (matched.length / Math.max(1, keywords.length)) * 100);

  return {
    personaTarget: persona,
    atsScore: score,
    keywordMatchPercentage: score,
    matchSummary: `${matched.length} keywords matched`,
    matchedKeywords: matched,
    missingKeywords: keywords.slice(0, 12).filter(k => !resumeText.toLowerCase().includes(k)),
    skillGaps: [],
    suggestedSkillAdditions: [],
    strengths: ['Keyword alignment'],
    weaknesses: ['More specific matches needed'],
    suggestions: ['Mirror job description language'],
    improvedBulletPoints: ['Optimized experience bullet']
  };
}

export async function generateAssistantResponse(input: any): Promise<AssistantReplyDraft> {
  return {
    message: 'Your request processed successfully.',
    suggestedActions: ['Next step 1', 'Next step 2']
  };
}

export function clampPercentage(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function sanitizeStringList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8) || fallback;
}

export function parseJsonResponse<T>(text: string): T | null {
  try {
    const cleaned = text.replace(/^```json/i, '').replace(/```$/i, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

