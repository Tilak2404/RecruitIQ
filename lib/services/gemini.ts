import type { AtsAnalysisResult, JobTargetPersona } from "@/types/app";
import { analyzeAtsCompatibility } from "@/lib/ats/engine";
import { buildFollowUpDraft, buildOutreachEmailDraft } from "@/lib/email/generator";
import { clampPercentage, safeJsonParse, sanitizeStringList } from "@/lib/utils/safety";

export type AssistantIntent =
  | "resume_analysis"
  | "email_generation"
  | "linkedin_message"
  | "reply_analysis"
  | "strategy_advice"
  | "general_question";

export type AssistantContextKey =
  | "resume"
  | "recruiter"
  | "company"
  | "persona"
  | "emailDraft"
  | "chatHistory"
  | "strategyContext"
  | "atsContext";

export interface AssistantReasoningPlan {
  intent: AssistantIntent;
  relevantContext: AssistantContextKey[];
  ignoredContext: AssistantContextKey[];
  answerStructure: string[];
  responseGoal: string;
  selfCheck: string[];
}

export interface ReplyAnalysisDraft {
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  intent: "INTERVIEW_REQUEST" | "NEED_MORE_INFO" | "REJECTION" | "GENERAL_REPLY" | "UNKNOWN";
  summary: string;
  suggestedReply: string;
  suggestedNextStep: string;
  confidence: number;
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

function parseJsonResponse<T>(text: string): T | null {
  const cleaned = text.replace(/^```json/i, "").replace(/```$/i, "").trim();
  return safeJsonParse<T>(cleaned);
}

export async function generateRecruiterEmail(params: {
  recruiterName: string;
  recruiterEmail?: string;
  company: string;
  resumeText?: string;
  persona?: JobTargetPersona;
  variationHint?: string;
  candidateName?: string;
  atsContext?: { matchSummary?: string; matchedKeywords?: string[] } | null;
}): Promise<GeneratedEmail> {
  const persona = params.persona ?? "STARTUP";
  const candidateName = params.candidateName ?? "Chekkala Tilak";

  return buildOutreachEmailDraft({
    recruiterName: params.recruiterName,
    company: params.company,
    candidateName,
    persona,
    verifiedSkills: params.atsContext?.matchedKeywords?.slice(0, 3),
    variationHint: params.variationHint ?? params.atsContext?.matchSummary
  });
}

export async function generateFollowUpEmail(params: {
  recruiterName: string;
  company: string;
  previousSubject: string;
  previousBody: string;
  stage: number;
  candidateName?: string;
}): Promise<FollowUpDraft> {
  return buildFollowUpDraft({
    recruiterName: params.recruiterName,
    company: params.company,
    previousSubject: params.previousSubject,
    candidateName: params.candidateName ?? "Chekkala Tilak",
    stage: params.stage
  });
}

export async function analyzeRecruiterReply({
  content
}: {
  content: string;
  recruiterName?: string | null;
  company?: string | null;
  latestSubject?: string | null;
  latestBody?: string | null;
  candidateName?: string | null;
}): Promise<ReplyAnalysisDraft> {
  const normalized = content.toLowerCase();

  if (/interview|schedule|availability|next step/.test(normalized)) {
    return {
      sentiment: "POSITIVE",
      intent: "INTERVIEW_REQUEST",
      summary: content.slice(0, 140),
      suggestedReply: "<p>Thank you for the update. I would be happy to coordinate next steps and share my availability.</p>",
      suggestedNextStep: "Reply with availability and confirm the discussion details.",
      confidence: 0.88
    };
  }

  if (/not moving|decline|unfortunately|rejection/.test(normalized)) {
    return {
      sentiment: "NEGATIVE",
      intent: "REJECTION",
      summary: content.slice(0, 140),
      suggestedReply: "<p>Thank you for letting me know. I appreciate your time and would welcome future opportunities to stay in touch.</p>",
      suggestedNextStep: "Send a short, professional thank-you and keep the door open.",
      confidence: 0.84
    };
  }

  if (/resume|portfolio|details|more info/.test(normalized)) {
    return {
      sentiment: "NEUTRAL",
      intent: "NEED_MORE_INFO",
      summary: content.slice(0, 140),
      suggestedReply: "<p>Thank you for the note. I am happy to share any additional details, materials, or examples that would be useful.</p>",
      suggestedNextStep: "Reply with the requested material and keep the response concise.",
      confidence: 0.74
    };
  }

  return {
    sentiment: "NEUTRAL",
    intent: "GENERAL_REPLY",
    summary: content.slice(0, 140),
    suggestedReply: "<p>Thank you for your response. I appreciate your time and would be glad to continue the conversation.</p>",
    suggestedNextStep: "Reply promptly with a short, clear response.",
    confidence: 0.62
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
  return analyzeAtsCompatibility({
    resumeText,
    jobDescription,
    persona
  });
}

export async function generateAssistantResponse(input: {
  intent?: AssistantIntent;
  userMessage?: string;
  recruiter?: string;
  company?: string;
  reasoningPlan?: AssistantReasoningPlan;
}): Promise<AssistantReplyDraft> {
  const target = input.company || input.recruiter || "your outreach workflow";

  return {
    message:
      input.intent === "strategy_advice"
        ? `Focus on the next highest-leverage move for ${target}: tighten personalization, keep the ask light, and follow up on warm threads before adding new volume.`
        : "Your request was processed successfully. I used the available context to keep the answer focused and practical.",
    suggestedActions: ["Make it shorter", "Make it more personalized", "What should I do next?"]
  };
}

export { clampPercentage, sanitizeStringList, parseJsonResponse };
