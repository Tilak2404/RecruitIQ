import { sanitizeText } from "@/lib/utils/safety";

export type AgentIntent =
  | "ats"
  | "resume"
  | "email"
  | "research"
  | "consistency"
  | "coach"
  | "general";

export type AgentTool = "ats" | "resume" | "email" | "research" | "consistency" | "readiness";

export function detectAgentIntent(message: string): AgentIntent {
  const normalized = sanitizeText(message).toLowerCase();

  if (/\b(improve my chances|am i ready|ready to apply|what should i fix first|get hired|why no replies)\b/.test(normalized)) {
    return "coach";
  }
  if (/\b(ats|job description|keyword|match score|fit score)\b/.test(normalized)) return "ats";
  if (/\b(resume|cv|bullet|experience|docx)\b/.test(normalized)) return "resume";
  if (/\b(email|outreach|follow-up|follow up|cta|reply rate)\b/.test(normalized)) return "email";
  if (/\b(company|research|culture|signals|serper)\b/.test(normalized)) return "research";
  if (/\b(consistency|align|alignment|coherent)\b/.test(normalized)) return "consistency";
  return "general";
}

export function selectAgentTools(intent: AgentIntent, context: {
  hasResume?: boolean;
  hasJobDescription?: boolean;
  hasEmailDraft?: boolean;
  hasCompany?: boolean;
}) {
  const tools: AgentTool[] = [];

  if (intent === "ats") {
    if (context.hasResume && context.hasJobDescription) tools.push("ats");
    if (context.hasResume) tools.push("resume");
  } else if (intent === "resume") {
    tools.push("resume");
    if (context.hasJobDescription) tools.push("ats");
  } else if (intent === "email") {
    tools.push("email");
    if (context.hasJobDescription || context.hasResume) tools.push("ats");
    if (context.hasCompany) tools.push("research");
  } else if (intent === "research") {
    tools.push("research");
    if (context.hasResume || context.hasJobDescription) tools.push("email");
  } else if (intent === "consistency") {
    tools.push("consistency");
    if (context.hasResume && context.hasJobDescription) tools.push("ats");
    if (context.hasEmailDraft) tools.push("email");
  } else if (intent === "coach") {
    tools.push("readiness");
    if (context.hasResume && context.hasJobDescription) tools.push("ats");
    if (context.hasResume) tools.push("resume");
    if (context.hasCompany) tools.push("research");
    if (context.hasEmailDraft || context.hasResume) tools.push("email");
    if (context.hasResume && context.hasJobDescription && context.hasEmailDraft) tools.push("consistency");
  }

  return [...new Set(tools)];
}
