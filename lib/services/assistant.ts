import { prisma } from "@/lib/prisma";
import { detectAgentIntent, selectAgentTools } from "@/lib/ai/agent";
import { analyzeConsistency } from "@/lib/consistency/engine";
import { getActiveAtsAnalysis } from "@/lib/services/ats";
import {
  analyzeRecruiterReply,
  analyzeResumeAgainstJobDescription,
  generateAssistantResponse,
  generateRecruiterEmail,
  type AssistantContextKey,
  type AssistantIntent,
  type AssistantReasoningPlan,
  type AssistantReplyDraft
} from "@/lib/services/gemini";
import { extractJobDescriptionFromUrl } from "@/lib/services/job-extract";
import { analyzeReplyInsights, researchCompany, scoreOutreachEmail } from "@/lib/services/job-intelligence";
import { getJobOsSettings } from "@/lib/services/job-os";
import { getApplyReadinessSnapshot } from "@/lib/services/readiness";
import { trimResumeForPrompt } from "@/lib/services/resume";
import { getBestSendTimeSuggestion, getOutreachOverview } from "@/lib/services/strategy";
import { stripHtml } from "@/lib/utils";
import type { CompanyResearchResult, StoredAtsAnalysis } from "@/types/app";

const ASSISTANT_HISTORY_LIMIT = 12;

type StoredAssistantMessage = {
  role: string;
  content: string;
  metadata?: unknown;
};

type RecentEmailLogContext = {
  subject: string;
  body: string;
  status: string;
  followUpStage: number;
  recruiter: {
    name: string;
    company: string;
    email: string;
  };
};

type AssistantScopedContext = {
  intent: AssistantIntent;
  userMessage: string;
  resume: string;
  recruiter: string;
  company: string;
  persona: import("@/types/app").JobTargetPersona;
  emailDraft: string;
  chatHistory: Array<{ role: string; content: string }>;
  candidateName: string;
  strategyContext?: string;
  atsContext: StoredAtsAnalysis | null;
  recentLogs: RecentEmailLogContext[];
  matchedLog: RecentEmailLogContext | null;
  emailHistorySummary: string;
  jobDescription: string;
  jobSourceTitle: string;
  jobUrl: string;
  recentCompanyResearch: CompanyResearchResult | null;
  reasoningPlan: AssistantReasoningPlan;
};

type AssistantToolName =
  | "resume_context"
  | "ats_context"
  | "email_history"
  | "memory_context"
  | "outreach_overview"
  | "company_research"
  | "job_extract"
  | "ats_analysis"
  | "apply_readiness"
  | "consistency_check"
  | "reply_insights"
  | "email_score"
  | "reply_analysis"
  | "email_generation";

type AssistantToolRun = {
  tool: AssistantToolName;
  summary: string;
};

type AssistantAgentResult = {
  reply: AssistantReplyDraft;
  toolRuns: AssistantToolRun[];
};

type IntentScoreMap = Record<Exclude<AssistantIntent, "general_question">, number>;

type ExplicitMessageContext = {
  recruiter: string;
  company: string;
  emailDraft: string;
};

type CompanyResearchMemoryMetadata = CompanyResearchResult & {
  kind: "company_research_memory";
};

const resumeAnalysisPatterns = [
  "summarize my resume",
  "summarise my resume",
  "analyze my resume",
  "analyse my resume",
  "review my resume",
  "review my cv",
  "summarize my cv",
  "summarise my cv",
  "what is my experience",
  "what experience do i have",
  "what are my skills",
  "list my skills",
  "resume summary",
  "my background",
  "my qualifications",
  "experience summary"
];

const emailGenerationPatterns = [
  "write email",
  "write an email",
  "draft email",
  "generate email",
  "turn this into an email",
  "convert this into an email",
  "make this an email",
  "cold email",
  "cold outreach",
  "outreach email",
  "email for recruiter",
  "mail recruiter",
  "compose email"
];

const linkedinMessagePatterns = [
  "linkedin",
  "linkedin dm",
  "linkedin message",
  "turn this into a linkedin message",
  "convert this into a linkedin message",
  "inmail",
  "reach out on linkedin"
];

const replyAnalysisPatterns = [
  "analyze this reply",
  "analyse this reply",
  "analyze reply",
  "analyse reply",
  "analyze a recruiter reply",
  "analyse a recruiter reply",
  "analyze recruiter reply",
  "analyse recruiter reply",
  "reply analysis",
  "how should i respond",
  "how do i respond",
  "what should i reply",
  "respond to this reply",
  "check the sentiment",
  "detect intent",
  "recruiter replied"
];

const strategyAdvicePatterns = [
  "strategy",
  "best time",
  "send time",
  "when should i send",
  "improve my outreach",
  "outreach plan",
  "follow-up plan",
  "follow up plan",
  "how should i improve",
  "what should i do next",
  "campaign advice",
  "outreach advice"
];

const careerCoachPatterns = [
  "improve my chances",
  "am i ready",
  "ready to apply",
  "what should i fix first",
  "get hired",
  "why no replies",
  "why am i not getting replies",
  "what is blocking me",
  "how can i improve my chances"
];

const continuationPatterns = [
  "make it shorter",
  "make this shorter",
  "make it longer",
  "make this longer",
  "rewrite it",
  "rewrite this",
  "improve it",
  "improve this",
  "make it better",
  "make it more personalized",
  "make this more personalized",
  "personalize it",
  "personalize this",
  "be more concise",
  "be more formal",
  "be more casual",
  "make it warmer",
  "make this warmer",
  "adjust the tone",
  "try again",
  "another version",
  "shorter version",
  "longer version",
  "polish this",
  "refine this"
];

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function includesAny(text: string, patterns: string[]) {
  return patterns.some((pattern) => text.includes(pattern));
}

function countRegexMatches(text: string, patterns: RegExp[]) {
  return patterns.reduce((score, pattern) => score + (pattern.test(text) ? 1 : 0), 0);
}

function isResumeRelevantQuestion(text: string) {
  return ["resume", "cv", "experience", "skills", "background", "qualification", "qualified", "fit for"]
    .some((term) => text.includes(term));
}

function extractIntentFromMetadata(metadata: unknown): AssistantIntent | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const intent = (metadata as { intent?: unknown }).intent;
  if (
    intent === "resume_analysis" ||
    intent === "email_generation" ||
    intent === "linkedin_message" ||
    intent === "reply_analysis" ||
    intent === "strategy_advice" ||
    intent === "general_question"
  ) {
    return intent;
  }

  return null;
}

function isCompanyResearchMemory(metadata: unknown): metadata is CompanyResearchMemoryMetadata {
  return Boolean(
    metadata &&
      typeof metadata === "object" &&
      !Array.isArray(metadata) &&
      (metadata as { kind?: unknown }).kind === "company_research_memory"
  );
}

function isCareerCoachRequest(message: string) {
  const normalized = normalizeText(message);
  return (
    includesAny(normalized, careerCoachPatterns) ||
    /\b(improve.*chances|ready.*apply|fix.*first|get hired|no replies|not getting replies)\b/.test(normalized)
  );
}

function detectIntentFromMessage(message: string): AssistantIntent | null {
  const normalized = normalizeText(message);

  const scores: IntentScoreMap = {
    resume_analysis: 0,
    email_generation: 0,
    linkedin_message: 0,
    reply_analysis: 0,
    strategy_advice: 0
  };

  if (includesAny(normalized, resumeAnalysisPatterns)) {
    scores.resume_analysis += 6;
  }
  scores.resume_analysis +=
    countRegexMatches(normalized, [
      /\b(summar(?:ize|ise)|analy[sz]e|review|highlight|list|extract)\b.*\b(resume|cv)\b/,
      /\b(resume|cv)\b.*\b(summary|skills?|experience|background|qualifications?)\b/,
      /\bwhat(?:'s| is)? my (experience|background)\b/,
      /\bwhat are my skills\b/,
      /\blist my skills\b/,
      /\bsummar(?:ize|ise) my (experience|background)\b/
    ]) * 3;

  if (includesAny(normalized, emailGenerationPatterns)) {
    scores.email_generation += 6;
  }
  scores.email_generation +=
    countRegexMatches(normalized, [
      /\b(write|draft|generate|compose|create|rewrite)\b.*\b(email|mail)\b/,
      /\b(email|mail)\b.*\b(write|draft|generate|compose|create|rewrite)\b/,
      /\b(turn|convert|make)\b.*\b(email|mail)\b/,
      /\b(cold|outreach|follow[- ]?up)\b.*\b(email|mail)\b/,
      /\bsubject\b.*\b(email|mail)\b/,
      /\brecruiter email\b/
    ]) * 3;
  if (/\b(email|mail)\b/.test(normalized)) {
    scores.email_generation += 2;
  }

  if (includesAny(normalized, linkedinMessagePatterns)) {
    scores.linkedin_message += 6;
  }
  scores.linkedin_message +=
    countRegexMatches(normalized, [
      /\b(linkedin|inmail)\b/,
      /\b(turn|convert|make)\b.*\blinkedin\b.*\b(message|dm|note)\b/,
      /\b(linkedin|inmail)\b.*\b(dm|message|note)\b/,
      /\breach out on linkedin\b/
    ]) * 3;

  if (includesAny(normalized, replyAnalysisPatterns)) {
    scores.reply_analysis += 6;
  }
  scores.reply_analysis +=
    countRegexMatches(normalized, [
      /\b(analy[sz]e|review|check|understand|classify)\b.*\b(reply|response)\b/,
      /\b(reply|response)\b.*\b(sentiment|intent|tone)\b/,
      /\b(how|what) should i (reply|respond)\b/,
      /\brecruiter replied\b/,
      /\bdraft a response\b/
    ]) * 3;

  if (includesAny(normalized, strategyAdvicePatterns)) {
    scores.strategy_advice += 6;
  }
  scores.strategy_advice +=
    countRegexMatches(normalized, [
      /\b(strategy|plan|tactic|approach)\b/,
      /\b(best time|send time|when should i send)\b/,
      /\b(improve|optimi[sz]e)\b.*\boutreach\b/,
      /\bfollow[- ]?up plan\b/,
      /\bcampaign advice\b/
    ]) * 3;

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]) as Array<[AssistantIntent, number]>;
  const [topIntent, topScore] = ranked[0] ?? ["general_question", 0];
  const secondScore = ranked[1]?.[1] ?? 0;

  if (topScore >= 4 && topScore >= secondScore + 1) {
    return topIntent;
  }

  return null;
}

function inferIntentFromHistory(previousMessages: StoredAssistantMessage[]) {
  for (const message of [...previousMessages].reverse()) {
    const storedIntent = extractIntentFromMetadata(message.metadata);
    if (storedIntent) return storedIntent;

    const detected = detectIntentFromMessage(message.content);
    if (detected) return detected;
  }

  return null;
}

function detectAssistantIntent(message: string, previousMessages: StoredAssistantMessage[]): AssistantIntent {
  if (isCareerCoachRequest(message)) {
    return "strategy_advice";
  }

  const directIntent = detectIntentFromMessage(message);
  if (directIntent) return directIntent;

  const normalized = normalizeText(message);
  if (includesAny(normalized, continuationPatterns)) {
    return inferIntentFromHistory(previousMessages) ?? "general_question";
  }

  if (isResumeRelevantQuestion(normalized)) {
    return "resume_analysis";
  }

  return "general_question";
}

function getRecentChatHistory(messages: Array<{ role: string; content: string }>) {
  return messages.slice(-ASSISTANT_HISTORY_LIMIT);
}

function scoreMatch(source: string, candidate: string) {
  const normalizedCandidate = normalizeText(candidate);
  if (!normalizedCandidate) return 0;
  if (source.includes(normalizedCandidate)) return 10;

  return normalizedCandidate
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4)
    .reduce((score, token) => (source.includes(token) ? score + 2 : score), 0);
}

function cleanExtractedValue(value: string) {
  return value.replace(/^[\s"'`]+|[\s"'`,.;:!?]+$/g, "").trim();
}

function extractExplicitMessageContext(message: string): ExplicitMessageContext {
  const recruiterCompanyMatch =
    message.match(
      /(?:email|mail|message|dm|note|reply|follow[- ]?up)?(?:\s+\w+){0,3}\s+(?:for|to)\s+([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,2})\s+at\s+([A-Z0-9][A-Za-z0-9&.' -]+?)(?=[,.!?]|\n|$)/m
    ) ??
    message.match(
      /(?:for|to)\s+([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,2})\s+at\s+([A-Z0-9][A-Za-z0-9&.' -]+?)(?=[,.!?]|\n|$)/m
    );

  const recruiterOnlyMatch = recruiterCompanyMatch
    ? null
    : message.match(
        /(?:for|to)\s+([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,2})(?=\s+at\b|[,.!?]|\n|$)/m
      );

  const companyOnlyMatch = recruiterCompanyMatch
    ? null
    : message.match(/\b(?:at|about|company)\s+([A-Z0-9][A-Za-z0-9&.' -]+?)(?=\s+(?:for|in|on|with)\b|[,.!?]|\n|$)/m);

  const labeledDraftMatch = message.match(/(?:draft|email|reply|message)\s*:\s*([\s\S]+)/i);
  const paragraphDraft = message
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.length >= 80 && /[.!?]/.test(chunk));

  return {
    recruiter: cleanExtractedValue(recruiterCompanyMatch?.[1] ?? recruiterOnlyMatch?.[1] ?? ""),
    company: cleanExtractedValue(recruiterCompanyMatch?.[2] ?? companyOnlyMatch?.[1] ?? ""),
    emailDraft: cleanExtractedValue((labeledDraftMatch?.[1] ?? paragraphDraft ?? "").slice(0, 1600))
  };
}

function findRelevantEmailLog({
  userMessage,
  chatHistory,
  recentLogs
}: {
  userMessage: string;
  chatHistory: Array<{ role: string; content: string }>;
  recentLogs: RecentEmailLogContext[];
}) {
  const matchSource = normalizeText([userMessage, ...chatHistory.slice(-4).map((message) => message.content)].join("\n"));

  const scored = recentLogs
    .map((log) => ({
      log,
      score:
        scoreMatch(matchSource, log.recruiter.name) +
        scoreMatch(matchSource, log.recruiter.company) +
        scoreMatch(matchSource, log.recruiter.email)
    }))
    .sort((a, b) => b.score - a.score);

  const topMatch = scored[0];
  if (!topMatch || topMatch.score < 4) {
    return null;
  }

  return topMatch.log;
}

function formatEmailDraft(log: RecentEmailLogContext | null) {
  if (!log) return "";

  const body = stripHtml(log.body).slice(0, 1200).trim();
  return [`Subject: ${log.subject}`, `Status: ${log.status}`, `Follow-up stage: ${log.followUpStage}`, `Body: ${body}`].join("\n");
}

function isRevisionStyleRequest(message: string) {
  const normalized = normalizeText(message);
  return (
    includesAny(normalized, continuationPatterns) ||
    /\b(turn|rewrite|make|shorter|longer|personaliz|refine|polish|adjust)\b/.test(normalized)
  );
}

function findDraftFromHistory(input: {
  intent: AssistantIntent;
  chatHistory: Array<{ role: string; content: string }>;
}) {
  const reversedHistory = [...input.chatHistory].reverse();

  if (input.intent === "email_generation") {
    const draftMessage = reversedHistory.find(
      (message) =>
        message.role === "ASSISTANT" && (/^subject\b/i.test(message.content) || /\nBody\b/i.test(message.content) || /\bDear\b/.test(message.content))
    );

    return draftMessage?.content.slice(0, 1600) ?? "";
  }

  if (input.intent === "linkedin_message") {
    const draftMessage = reversedHistory.find(
      (message) => message.role === "ASSISTANT" && message.content.length <= 500 && !/^subject\b/i.test(message.content)
    );

    return draftMessage?.content.slice(0, 600) ?? "";
  }

  if (input.intent === "reply_analysis") {
    const replyMessage = reversedHistory.find(
      (message) => message.role === "USER" && (message.content.length > 80 || /\n/.test(message.content) || /reply\s*:/i.test(message.content))
    );

    return replyMessage?.content.slice(0, 1600) ?? "";
  }

  return "";
}

function shouldAskForReplyContent(input: {
  intent: AssistantIntent;
  userMessage: string;
}) {
  return (
    input.intent === "reply_analysis" &&
    input.userMessage.length <= 80 &&
    !/\n/.test(input.userMessage) &&
    !/reply\s*:/i.test(input.userMessage)
  );
}

function buildReplyContentRequestResponse(): AssistantReplyDraft {
  return {
    message: "Paste the recruiter's reply and I will analyze the sentiment, intent, and the best response to send next.",
    suggestedActions: ["Paste recruiter reply", "Ask for tone guidance", "Draft a response"]
  };
}

function buildAssistantReasoningPlan(input: {
  intent: AssistantIntent;
  userMessage: string;
  resume: string;
  recruiter: string;
  company: string;
  persona: import("@/types/app").JobTargetPersona;
  emailDraft: string;
  chatHistory: Array<{ role: string; content: string }>;
  strategyContext?: string;
  atsContext: StoredAtsAnalysis | null;
}): AssistantReasoningPlan {
  const contextPresence: Record<AssistantContextKey, boolean> = {
    resume: Boolean(input.resume),
    recruiter: Boolean(input.recruiter),
    company: Boolean(input.company),
    persona: Boolean(input.persona),
    emailDraft: Boolean(input.emailDraft),
    chatHistory: input.chatHistory.length > 0,
    strategyContext: Boolean(input.strategyContext),
    atsContext: Boolean(input.atsContext)
  };

  const relevantContext = new Set<AssistantContextKey>();

  if (input.intent === "resume_analysis") {
    if (contextPresence.resume) relevantContext.add("resume");
  } else if (input.intent === "email_generation") {
    if (contextPresence.resume) relevantContext.add("resume");
    if (contextPresence.recruiter) relevantContext.add("recruiter");
    if (contextPresence.company) relevantContext.add("company");
    if (contextPresence.persona) relevantContext.add("persona");
    if (contextPresence.emailDraft) relevantContext.add("emailDraft");
    if (contextPresence.atsContext) relevantContext.add("atsContext");
    if (contextPresence.strategyContext) relevantContext.add("strategyContext");
    if (contextPresence.chatHistory && isRevisionStyleRequest(input.userMessage)) relevantContext.add("chatHistory");
  } else if (input.intent === "linkedin_message") {
    if (contextPresence.resume) relevantContext.add("resume");
    if (contextPresence.recruiter) relevantContext.add("recruiter");
    if (contextPresence.company) relevantContext.add("company");
    if (contextPresence.persona) relevantContext.add("persona");
    if (contextPresence.emailDraft) relevantContext.add("emailDraft");
    if (contextPresence.atsContext) relevantContext.add("atsContext");
    if (contextPresence.strategyContext) relevantContext.add("strategyContext");
    if (contextPresence.chatHistory && isRevisionStyleRequest(input.userMessage)) relevantContext.add("chatHistory");
  } else if (input.intent === "reply_analysis") {
    if (contextPresence.recruiter) relevantContext.add("recruiter");
    if (contextPresence.company) relevantContext.add("company");
    if (contextPresence.emailDraft) relevantContext.add("emailDraft");
    if (contextPresence.chatHistory) relevantContext.add("chatHistory");
  } else if (input.intent === "strategy_advice") {
    if (contextPresence.resume) relevantContext.add("resume");
    if (contextPresence.recruiter) relevantContext.add("recruiter");
    if (contextPresence.company) relevantContext.add("company");
    if (contextPresence.persona) relevantContext.add("persona");
    if (contextPresence.chatHistory) relevantContext.add("chatHistory");
    if (contextPresence.strategyContext) relevantContext.add("strategyContext");
    if (contextPresence.atsContext) relevantContext.add("atsContext");
  } else {
    if (contextPresence.resume && isResumeRelevantQuestion(normalizeText(input.userMessage))) relevantContext.add("resume");
    if (contextPresence.chatHistory) relevantContext.add("chatHistory");
    if (contextPresence.atsContext && /\b(ats|keyword|resume|send|outreach|fit|score)\b/.test(normalizeText(input.userMessage))) {
      relevantContext.add("atsContext");
    }
  }

  const answerStructure =
    input.intent === "resume_analysis"
      ? ["Summary", "Experience", "Skills"]
      : input.intent === "email_generation"
        ? ["Subject", "Body"]
        : input.intent === "linkedin_message"
          ? ["Short message"]
          : input.intent === "reply_analysis"
            ? ["Sentiment", "Intent", "Suggested Reply", "Next Step"]
            : input.intent === "strategy_advice"
              ? isCareerCoachRequest(input.userMessage)
                ? ["Readiness", "Biggest Blockers", "Best Fixes", "Next Step"]
                : ["Assessment", "Improvements", "Next Steps"]
              : ["Direct answer"];

  const responseGoal =
    input.intent === "resume_analysis"
      ? "Answer the resume question clearly using only resume facts."
      : input.intent === "email_generation"
        ? "Generate or refine a structured outreach email that matches the request."
        : input.intent === "linkedin_message"
          ? "Generate or refine a concise LinkedIn message."
          : input.intent === "reply_analysis"
            ? "Analyze the reply content and recommend the next best response."
          : input.intent === "strategy_advice"
            ? isCareerCoachRequest(input.userMessage)
              ? "Act like a career coach. Use the available ATS, outreach, and resume context to diagnose what is blocking progress and what to fix first."
              : "Provide practical outreach improvements without drifting into unrelated details."
            : "Answer the user's question directly with only relevant context.";

  const ignoredContext = (Object.keys(contextPresence) as AssistantContextKey[]).filter((key) => !relevantContext.has(key));

  return {
    intent: input.intent,
    relevantContext: [...relevantContext],
    ignoredContext,
    answerStructure,
    responseGoal,
    selfCheck: [
      "Does the answer directly match the user's question?",
      "Did I use only relevant context?",
      "Did I avoid unnecessary advice or unrelated suggestions?"
    ]
  };
}

async function getOrCreatePrimaryConversation() {
  const existing = await prisma.assistantConversation.findFirst({
    where: { isPrimary: true },
    orderBy: { createdAt: "asc" }
  });

  if (existing) {
    return existing;
  }

  return prisma.assistantConversation.create({
    data: {
      isPrimary: true,
      title: "Job Outreach Copilot",
      messages: {
        create: {
          role: "ASSISTANT",
          content:
            "I can help with resume analysis, recruiter emails, LinkedIn messages, reply analysis, and outreach strategy.",
          metadata: {
            intent: "general_question",
            suggestedActions: ["Summarize my resume", "Write a recruiter email", "Analyze a recruiter reply"]
          }
        }
      }
    }
  });
}

export async function getAssistantMessages(limit = 10) {
  const conversation = await getOrCreatePrimaryConversation();

  const messages = await prisma.assistantMessage.findMany({
    where: {
      conversationId: conversation.id,
      role: {
        in: ["USER", "ASSISTANT"]
      }
    },
    orderBy: { createdAt: "desc" },
    take: limit
  });

  return messages.reverse();
}

async function getRecentCompanyResearchMemories(limit = 6) {
  const conversation = await getOrCreatePrimaryConversation();

  const messages = await prisma.assistantMessage.findMany({
    where: {
      conversationId: conversation.id,
      role: "SYSTEM"
    },
    orderBy: { createdAt: "desc" },
    take: Math.max(limit, 1) * 3
  });

  return messages
    .map((message) => {
      if (!isCompanyResearchMemory(message.metadata)) {
        return null;
      }

      return message.metadata as CompanyResearchMemoryMetadata;
    })
    .filter((message): message is CompanyResearchMemoryMetadata => message !== null)
    .slice(0, limit);
}

async function storeCompanyResearchMemory(research: CompanyResearchResult) {
  const conversation = await getOrCreatePrimaryConversation();

  await prisma.assistantMessage.create({
    data: {
      conversationId: conversation.id,
      role: "SYSTEM",
      content: `Stored company research for ${research.company}.`,
      metadata: {
        kind: "company_research_memory",
        ...research
      } satisfies CompanyResearchMemoryMetadata
    }
  });
}

function extractFirstUrl(message: string) {
  return message.match(/https?:\/\/[^\s)]+/i)?.[0] ?? "";
}

function isAtsRequest(message: string) {
  return /\b(ats|keyword|keywords|resume fit|role fit|fit score|match score|job description|jd)\b/i.test(message);
}

function isCompanyResearchRequest(message: string) {
  return /\b(company|research|culture|product|industry|team|insights?|about|mention)\b/i.test(message);
}

function buildEmailHistorySummary(recentLogs: RecentEmailLogContext[]) {
  if (recentLogs.length === 0) {
    return "";
  }

  return [
    "Recent email history:",
    ...recentLogs.slice(0, 5).map(
      (log, index) =>
        `${index + 1}. ${log.recruiter.name} at ${log.recruiter.company} | status=${log.status} | followUpStage=${log.followUpStage} | subject=${log.subject}`
    )
  ].join("\n");
}

function buildCompanyResearchContext(research: CompanyResearchResult) {
  return [
    `Company research for ${research.company}:`,
    `- Culture notes: ${research.cultureNotes.join(" | ") || "No culture notes available."}`,
    `- Recent signals: ${research.recentSignals.join(" | ") || "No recent signals available."}`,
    `- Outreach angles: ${research.outreachAngles.join(" | ") || "No outreach angles available."}`,
    `- Tone recommendation: ${research.toneRecommendation}`
  ].join("\n");
}

function buildCompanyResearchMessage(research: CompanyResearchResult) {
  return [
    `Company: ${research.company}`,
    "",
    "Culture Notes",
    ...research.cultureNotes.map((item) => `- ${item}`),
    "",
    "Recent Signals",
    ...research.recentSignals.map((item) => `- ${item}`),
    "",
    "Outreach Angles",
    ...research.outreachAngles.map((item) => `- ${item}`),
    "",
    `Tone Recommendation: ${research.toneRecommendation}`
  ].join("\n");
}

function buildReplyAnalysisMessage(input: {
  sentiment: string;
  intent: string;
  summary: string;
  suggestedReply: string;
  suggestedNextStep: string;
}) {
  return [
    `Sentiment: ${input.sentiment}`,
    `Intent: ${input.intent}`,
    "",
    `Summary: ${input.summary}`,
    "",
    "Suggested Reply",
    stripHtml(input.suggestedReply),
    "",
    `Next Step: ${input.suggestedNextStep}`
  ].join("\n");
}

function buildAtsAnalysisMessage(input: {
  atsScore: number;
  keywordMatchPercentage: number;
  matchSummary: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
  improvedBulletPoints: string[];
}) {
  return [
    `ATS Score: ${input.atsScore}/100`,
    `Keyword Match: ${input.keywordMatchPercentage}%`,
    "",
    `Match Summary: ${input.matchSummary}`,
    "",
    "Matched Keywords",
    ...(input.matchedKeywords.length > 0 ? input.matchedKeywords.map((item) => `- ${item}`) : ["- None highlighted yet"]),
    "",
    "Missing Keywords",
    ...(input.missingKeywords.length > 0 ? input.missingKeywords.map((item) => `- ${item}`) : ["- No major gaps highlighted"]),
    "",
    "Best Fixes",
    ...(input.suggestions.length > 0 ? input.suggestions.map((item) => `- ${item}`) : ["- No suggestions available"]),
    "",
    "Improved Resume Lines",
    ...(input.improvedBulletPoints.length > 0 ? input.improvedBulletPoints.map((item) => `- ${item}`) : ["- No improved lines available"])
  ].join("\n");
}

function buildCareerCoachMessage(input: {
  readiness: Awaited<ReturnType<typeof getApplyReadinessSnapshot>>;
  atsAnalysis: Awaited<ReturnType<typeof analyzeResumeAgainstJobDescription>> | null;
  consistency:
    | ReturnType<typeof analyzeConsistency>
    | null;
  replyInsights: Awaited<ReturnType<typeof analyzeReplyInsights>> | null;
  emailScore: Awaited<ReturnType<typeof scoreOutreachEmail>> | null;
  toolPlan: string[];
}) {
  const readinessLine = input.readiness.ready
    ? `You are ready to apply. Current readiness score: ${input.readiness.score}/100.`
    : `You are not ready yet. Current readiness score: ${input.readiness.score}/100.`;
  const blockerLines = input.readiness.blockers.length > 0 ? input.readiness.blockers.map((item) => `- ${item}`) : ["- No major blockers detected."];
  const fixLines = [
    ...input.readiness.improvements,
    ...(input.atsAnalysis?.improvements?.slice(0, 2) ?? []),
    ...(input.consistency?.fixes.slice(0, 2) ?? []),
    ...(input.replyInsights?.recommendations.slice(0, 2) ?? [])
  ].filter((item, index, array) => Boolean(item) && array.indexOf(item) === index);

  const strongestInsight =
    input.replyInsights?.weakPatterns[0] ??
    input.emailScore?.issues[0] ??
    input.consistency?.issues[0]?.description ??
    input.atsAnalysis?.improvements?.[0] ??
    "Your system is in decent shape, so the next lift is tighter personalization and follow-through.";

  const nextStep =
    input.readiness.blockers[0] ??
    input.replyInsights?.recommendations[0] ??
    input.emailScore?.suggestions[0] ??
    input.atsAnalysis?.improvements?.[0] ??
    "Generate one targeted outreach draft and review it before sending.";

  return [
    "Readiness",
    readinessLine,
    "",
    "What is blocking you most",
    strongestInsight,
    "",
    "Fix these first",
    ...blockerLines,
    "",
    "Highest-leverage improvements",
    ...(fixLines.length > 0 ? fixLines.slice(0, 5).map((item) => `- ${item}`) : ["- Keep your current direction and focus on sharper company-specific opening lines."]),
    "",
    "Next move",
    nextStep,
    "",
    `Tool plan used: ${input.toolPlan.join(", ") || "general guidance"}`
  ].join("\n");
}

function extractReplyContentForAnalysis(context: AssistantScopedContext) {
  if (/reply\s*:/i.test(context.userMessage)) {
    return context.userMessage.replace(/^[\s\S]*?reply\s*:/i, "").trim();
  }

  if (context.userMessage.length > 80 || /\n/.test(context.userMessage)) {
    return context.userMessage.trim();
  }

  if (context.emailDraft && !/^Subject:/i.test(context.emailDraft)) {
    return context.emailDraft.trim();
  }

  return "";
}

function buildEmailVariationHint(research: CompanyResearchResult | null) {
  if (!research) {
    return undefined;
  }

  const angle = research.outreachAngles[0] ?? research.toneRecommendation;
  return angle.length > 160 ? `${angle.slice(0, 157).trimEnd()}...` : angle;
}

function shouldResearchCompany(context: AssistantScopedContext) {
  if (!context.company) {
    return false;
  }

  const message = normalizeText(context.userMessage);
  return (
    context.intent === "email_generation" ||
    context.intent === "linkedin_message" ||
    context.intent === "strategy_advice" ||
    isCompanyResearchRequest(message)
  );
}

function isDirectCompanyResearchQuestion(context: AssistantScopedContext) {
  const message = normalizeText(context.userMessage);
  return Boolean(context.company) && isCompanyResearchRequest(message) && context.intent !== "email_generation" && context.intent !== "linkedin_message";
}

function canUseDirectEmailGenerator(context: AssistantScopedContext) {
  return (
    context.intent === "email_generation" &&
    Boolean(context.resume) &&
    Boolean(context.company || context.recruiter) &&
    !isRevisionStyleRequest(context.userMessage)
  );
}

async function buildAssistantContext(input: {
  intent: AssistantIntent;
  userMessage: string;
  chatHistory: Array<{ role: string; content: string }>;
}) {
  const normalizedMessage = normalizeText(input.userMessage);
  const messageUrl = extractFirstUrl(input.userMessage);
  const needsResume =
    input.intent === "resume_analysis" ||
    input.intent === "email_generation" ||
    input.intent === "linkedin_message" ||
    input.intent === "strategy_advice" ||
    isAtsRequest(normalizedMessage) ||
    (input.intent === "general_question" && isResumeRelevantQuestion(normalizeText(input.userMessage)));

  const needsRecruiterContext =
    input.intent === "email_generation" ||
    input.intent === "linkedin_message" ||
    input.intent === "reply_analysis" ||
    input.intent === "strategy_advice" ||
    isCompanyResearchRequest(normalizedMessage);
  const needsMemory = needsRecruiterContext || isCareerCoachRequest(input.userMessage);

  const needsJobExtraction = Boolean(messageUrl) && (isAtsRequest(normalizedMessage) || input.intent === "strategy_advice" || input.intent === "email_generation");

  const resumePromise = needsResume
    ? prisma.resume.findFirst({
        where: { isPrimary: true },
        orderBy: { createdAt: "desc" },
        select: {
          candidateName: true,
          extractedText: true
        }
      })
    : Promise.resolve(null);

  const recentLogsPromise = needsRecruiterContext
    ? prisma.emailLog.findMany({
        orderBy: { updatedAt: "desc" },
        take: 12,
        select: {
          subject: true,
          body: true,
          status: true,
          followUpStage: true,
          recruiter: {
            select: {
              name: true,
              company: true,
              email: true
            }
          }
        }
      })
    : Promise.resolve([]);

  const atsContextPromise =
    input.intent === "email_generation" ||
    input.intent === "linkedin_message" ||
    input.intent === "strategy_advice" ||
    input.intent === "general_question" ||
    isAtsRequest(normalizedMessage)
      ? getActiveAtsAnalysis()
      : Promise.resolve(null);

  const settingsPromise =
    input.intent === "email_generation" || input.intent === "linkedin_message" || input.intent === "strategy_advice" || isAtsRequest(normalizedMessage)
      ? getJobOsSettings()
      : Promise.resolve({ persona: "STARTUP" as const });

  const overviewPromise = input.intent === "strategy_advice" ? getOutreachOverview() : Promise.resolve(null);
  const timingPromise = input.intent === "strategy_advice" ? getBestSendTimeSuggestion() : Promise.resolve(null);
  const jobExtractionPromise = needsJobExtraction ? extractJobDescriptionFromUrl(messageUrl).catch(() => null) : Promise.resolve(null);
  const companyResearchMemoryPromise: Promise<CompanyResearchMemoryMetadata[]> = needsMemory
    ? getRecentCompanyResearchMemories(6)
    : Promise.resolve([]);

  const [resume, recentLogs, atsContext, settings, overview, bestTimeSuggestion, extractedJob, companyResearchMemories] = await Promise.all([
    resumePromise,
    recentLogsPromise,
    atsContextPromise,
    settingsPromise,
    overviewPromise,
    timingPromise,
    jobExtractionPromise,
    companyResearchMemoryPromise
  ]);

  const explicitContext = extractExplicitMessageContext(input.userMessage);
  const historyDraft = isRevisionStyleRequest(input.userMessage)
    ? findDraftFromHistory({
        intent: input.intent,
        chatHistory: input.chatHistory
      })
    : "";
  const matchedLog = findRelevantEmailLog({
    userMessage: input.userMessage,
    chatHistory: input.chatHistory,
    recentLogs
  });
  const matchedCompany = explicitContext.company || matchedLog?.recruiter.company || "";
  const recentCompanyResearch =
    companyResearchMemories.find((entry) => normalizeText(entry.company) === normalizeText(matchedCompany)) ?? null;

  const strategyContext =
    overview && bestTimeSuggestion
      ? [
          `Outreach overview: totalSent=${overview.totalSent}, replies=${overview.replies}, responseRate=${overview.responseRate.toFixed(1)}%, pending=${overview.pending}, scheduled=${overview.scheduled}, followUpsDue=${overview.followUpsDue}.`,
          `Best send time: ${bestTimeSuggestion.recommendedDay}, ${bestTimeSuggestion.recommendedWindow}. ${bestTimeSuggestion.rationale}`
        ].join("\n")
      : "";

  const scopedContext = {
    intent: input.intent,
    userMessage: input.userMessage,
    resume: resume?.extractedText ? trimResumeForPrompt(resume.extractedText) : "",
    recruiter: explicitContext.recruiter || matchedLog?.recruiter.name || "",
    company: explicitContext.company || matchedLog?.recruiter.company || "",
    persona: settings.persona,
    emailDraft: explicitContext.emailDraft || historyDraft || formatEmailDraft(matchedLog),
    chatHistory: getRecentChatHistory(input.chatHistory),
    candidateName: process.env.CANDIDATE_NAME ?? resume?.candidateName ?? "Chekkala Tilak",
    strategyContext,
    atsContext,
    recentLogs,
    matchedLog,
    emailHistorySummary: buildEmailHistorySummary(recentLogs),
    jobDescription: extractedJob?.description ?? atsContext?.jobDescription ?? "",
    jobSourceTitle: extractedJob?.title ?? "",
    jobUrl: messageUrl,
    recentCompanyResearch
  };

  return {
    ...scopedContext,
    reasoningPlan: buildAssistantReasoningPlan(scopedContext)
  } satisfies AssistantScopedContext;
}

async function runAssistantAgent(context: AssistantScopedContext): Promise<AssistantAgentResult> {
  const toolRuns: AssistantToolRun[] = [];
  const strategySections = [context.strategyContext, context.emailHistorySummary].filter(Boolean);
  const agentIntent = detectAgentIntent(context.userMessage);
  const plannedTools = selectAgentTools(agentIntent, {
    hasResume: Boolean(context.resume),
    hasJobDescription: Boolean(context.jobDescription || context.atsContext?.jobDescription),
    hasEmailDraft: Boolean(context.emailDraft),
    hasCompany: Boolean(context.company)
  });
  let companyResearchResult: CompanyResearchResult | null = context.recentCompanyResearch;

  if (context.resume) {
    toolRuns.push({ tool: "resume_context", summary: "Loaded the active resume as grounding context." });
  }

  if (context.atsContext) {
    toolRuns.push({ tool: "ats_context", summary: `Loaded the active ATS analysis at ${context.atsContext.atsScore}/100.` });
  }

  if (context.recentLogs.length > 0) {
    toolRuns.push({ tool: "email_history", summary: `Loaded ${Math.min(context.recentLogs.length, 12)} recent outreach records for history and personalization.` });
  }

  if (context.recentCompanyResearch) {
    toolRuns.push({
      tool: "memory_context",
      summary: `Loaded saved company research memory for ${context.recentCompanyResearch.company}.`
    });
  }

  if (context.strategyContext) {
    toolRuns.push({ tool: "outreach_overview", summary: "Loaded current outreach metrics and send-time guidance." });
  }

  if (context.jobUrl && context.jobDescription) {
    toolRuns.push({
      tool: "job_extract",
      summary: `Extracted job details from ${context.jobSourceTitle || context.jobUrl}.`
    });
  }

  if (!companyResearchResult && shouldResearchCompany(context)) {
    companyResearchResult = await researchCompany({
      company: context.company,
      jobDescription: context.jobDescription || context.atsContext?.jobDescription
    });
    await storeCompanyResearchMemory(companyResearchResult);
    toolRuns.push({
      tool: "company_research",
      summary: `Researched ${companyResearchResult.company} for tone, outreach angles, and company context.`
    });
  }

  if (companyResearchResult) {
    strategySections.push(buildCompanyResearchContext(companyResearchResult));
  }

  if (shouldAskForReplyContent({ intent: context.intent, userMessage: context.userMessage })) {
    return {
      reply: buildReplyContentRequestResponse(),
      toolRuns
    };
  }

  const enrichedStrategyContext = strategySections.filter(Boolean).join("\n\n");
  const enrichedContext = {
    ...context,
    strategyContext: enrichedStrategyContext,
    reasoningPlan: buildAssistantReasoningPlan({
      ...context,
      strategyContext: enrichedStrategyContext
      })
    } satisfies AssistantScopedContext;

  if (isCareerCoachRequest(context.userMessage) || agentIntent === "coach") {
    const readiness = await getApplyReadinessSnapshot();
    toolRuns.push({
      tool: "apply_readiness",
      summary: `Checked overall apply readiness at ${readiness.score}/100.`
    });

    const atsAnalysis =
      context.resume && context.jobDescription
        ? await analyzeResumeAgainstJobDescription({
            resumeText: context.resume,
            jobDescription: context.jobDescription,
            persona: context.persona
          })
        : context.atsContext;

    if (atsAnalysis) {
      toolRuns.push({
        tool: "ats_analysis",
        summary: `Reviewed ATS alignment at ${atsAnalysis.atsScore}/100 for the current target role.`
      });
    }

    const consistency =
      context.resume && context.jobDescription && context.emailDraft
        ? analyzeConsistency({
            resumeText: context.resume,
            jobDescription: context.jobDescription,
            emailDraft: context.emailDraft
          })
        : null;

    if (consistency) {
      toolRuns.push({
        tool: "consistency_check",
        summary: `Checked messaging consistency at ${Math.round(consistency.consistencyScore)}/100.`
      });
    }

    const replyInsights =
      context.recentLogs.length > 0
        ? await analyzeReplyInsights({
            persona: context.persona,
            fastMode: true,
            emails: context.recentLogs.slice(0, 8).map((log) => ({
              recruiterName: log.recruiter.name,
              company: log.recruiter.company,
              subject: log.subject,
              body: log.body,
              replied: log.status === "REPLIED"
            }))
          })
        : null;

    if (replyInsights) {
      toolRuns.push({
        tool: "reply_insights",
        summary: "Reviewed recent outreach patterns to diagnose what is suppressing replies."
      });
    }

    const emailScore =
      context.matchedLog
        ? await scoreOutreachEmail({
            recruiterName: context.matchedLog.recruiter.name,
            recruiterEmail: context.matchedLog.recruiter.email,
            company: context.matchedLog.recruiter.company,
            subject: context.matchedLog.subject,
            body: context.matchedLog.body,
            persona: context.persona,
            fastMode: true
          })
        : null;

    if (emailScore) {
      toolRuns.push({
        tool: "email_score",
        summary: `Scored the most relevant outreach draft at ${emailScore.replyScore}/100 reply strength.`
      });
    }

    return {
      reply: {
        message: buildCareerCoachMessage({
          readiness,
          atsAnalysis,
          consistency,
          replyInsights,
          emailScore,
          toolPlan: plannedTools
        }),
        suggestedActions: [
          "What should I fix first?",
          "Write a stronger email for this role",
          "Show me the ATS gaps"
        ]
      },
      toolRuns
    };
  }

  if (context.intent === "reply_analysis") {
    const replyContent = extractReplyContentForAnalysis(context);

    if (replyContent) {
      const analysis = await analyzeRecruiterReply({
        content: replyContent,
        recruiterName: context.recruiter || context.matchedLog?.recruiter.name || null,
        company: context.company || context.matchedLog?.recruiter.company || null,
        latestSubject: context.matchedLog?.subject ?? null,
        latestBody: context.matchedLog?.body ?? null,
        candidateName: context.candidateName
      });

      toolRuns.push({
        tool: "reply_analysis",
        summary: "Analyzed the recruiter reply for sentiment, intent, and next-step guidance."
      });

      return {
        reply: {
          message: buildReplyAnalysisMessage(analysis),
          suggestedActions: ["Make the reply shorter", "Adjust the tone", "Write a more formal version"]
        },
        toolRuns
      };
    }
  }

  if (isAtsRequest(context.userMessage) && context.resume && context.jobDescription) {
    const analysis = await analyzeResumeAgainstJobDescription({
      resumeText: context.resume,
      jobDescription: context.jobDescription,
      persona: context.persona
    });

    toolRuns.push({
      tool: "ats_analysis",
      summary: `Compared the resume against ${context.jobSourceTitle || "the target job description"}.`
    });

    return {
      reply: {
        message: buildAtsAnalysisMessage(analysis),
        suggestedActions: ["Rewrite resume bullets", "Highlight missing keywords", "Write an outreach email"]
      },
      toolRuns
    };
  }

  if (canUseDirectEmailGenerator(context)) {
    const email = await generateRecruiterEmail({
      recruiterName: context.recruiter || "Recruiter",
      recruiterEmail: context.matchedLog?.recruiter.email,
      company: context.company || "Your Team",
      resumeText: context.resume,
      atsContext: context.atsContext,
      persona: context.persona,
      variationHint: buildEmailVariationHint(companyResearchResult),
      candidateName: context.candidateName
    });

    toolRuns.push({
      tool: "email_generation",
      summary: `Generated a personalized outreach email for ${context.company || context.recruiter || "the target contact"}.`
    });

    return {
      reply: {
        message: ["Subject", email.subject, "", "Body", stripHtml(email.body)].join("\n"),
        suggestedActions: ["Make this email shorter", "Make it more personalized", "Turn this into a LinkedIn message"]
      },
      toolRuns
    };
  }

  if (companyResearchResult && isDirectCompanyResearchQuestion(context)) {
    return {
      reply: {
        message: buildCompanyResearchMessage(companyResearchResult),
        suggestedActions: ["Write an email for this company", "Create a LinkedIn DM", "Analyze ATS fit for this role"]
      },
      toolRuns
    };
  }

  return {
    reply: await generateAssistantResponse(enrichedContext),
    toolRuns
  };
}
export async function chatWithAssistant(content: string) {
  const conversation = await getOrCreatePrimaryConversation();

  const previousMessages = await prisma.assistantMessage.findMany({
    where: {
      conversationId: conversation.id,
      role: {
        in: ["USER", "ASSISTANT"]
      }
    },
    orderBy: { createdAt: "desc" },
    take: ASSISTANT_HISTORY_LIMIT
  });

  const previousChronologicalMessages = previousMessages.reverse();
  const intent = detectAssistantIntent(content, previousChronologicalMessages);

  await prisma.assistantMessage.create({
    data: {
      conversationId: conversation.id,
      role: "USER",
      content,
      metadata: {
        intent
      }
    }
  });

  const recentMessages = await prisma.assistantMessage.findMany({
    where: {
      conversationId: conversation.id,
      role: {
        in: ["USER", "ASSISTANT"]
      }
    },
    orderBy: { createdAt: "desc" },
    take: ASSISTANT_HISTORY_LIMIT
  });

  const chatHistory = recentMessages.reverse().map((message) => ({
    role: message.role,
    content: message.content
  }));

  const context = await buildAssistantContext({
    intent,
    userMessage: content,
    chatHistory
  });

  const agentResult = await runAssistantAgent(context);
  const assistantReply = agentResult.reply;

  const savedReply = await prisma.assistantMessage.create({
    data: {
      conversationId: conversation.id,
      role: "ASSISTANT",
      content: assistantReply.message,
      metadata: {
        intent,
        suggestedActions: assistantReply.suggestedActions,
        toolRuns: agentResult.toolRuns
      }
    }
  });

  const messages = await prisma.assistantMessage.findMany({
    where: {
      conversationId: conversation.id,
      role: {
        in: ["USER", "ASSISTANT"]
      }
    },
    orderBy: { createdAt: "desc" },
    take: 12
  });

  return {
    reply: savedReply,
    messages: messages.reverse()
  };
}
