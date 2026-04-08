import { getPersonaGuidance, inferRecruiterPersonality } from "@/lib/services/job-intelligence";
import type { AtsAnalysisResult, JobTargetPersona, StoredAtsAnalysis } from "@/types/app";

interface GeneratedEmail {
  subject: string;
  body: string;
}

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

export interface AtsAnalysisDraft extends AtsAnalysisResult {}

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
  | "emailDraft"
  | "chatHistory"
  | "strategyContext"
  | "atsContext"
  | "persona";

export type AssistantReasoningPlan = {
  intent: AssistantIntent;
  relevantContext: AssistantContextKey[];
  ignoredContext: AssistantContextKey[];
  answerStructure: string[];
  responseGoal: string;
  selfCheck: string[];
};

export interface FollowUpDraft {
  subject: string;
  body: string;
}

const SUBJECT_PATTERNS = [
  "Fresher Opportunities at {company}",
  "Entry-Level Software Opportunities at {company}",
  "Interest in Software Development Opportunities at {company}"
] as const;

const ATS_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "any",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "their",
  "this",
  "to",
  "with",
  "you",
  "your",
  "will",
  "have",
  "has",
  "our",
  "we",
  "they",
  "them",
  "who",
  "what",
  "when",
  "where",
  "why",
  "how",
  "about",
  "using",
  "use",
  "used",
  "role",
  "job",
  "candidate",
  "hiring",
  "responsibilities",
  "requirements",
  "preferred",
  "plus"
]);

const STRATEGIST_SYSTEM_PROMPT = `You are an elite job outreach strategist.

Your goal:
Maximize interview chances.

You:
- analyze responses
- improve outreach strategy
- generate high-converting messages
- adapt tone to company type
- suggest optimal timing
- avoid generic templates

Think like a recruiter and a candidate.`;

const REFERENCE_TEMPLATE = `Dear {Recruiter Name},

I hope you are doing well.

I am reaching out to express my interest in fresher, entry-level, and software development opportunities at {Company}. I am a 2024 graduate in Computer Science (AI & ML) with internship experience in software development, where I worked on backend systems and solved real-world problems using Python.

Through my internships, I gained hands-on exposure to understanding user needs, working on product-focused features, and collaborating in fast-paced environments. I enjoy breaking down problems, understanding user perspectives, and contributing to meaningful products.

I would truly appreciate it if you could consider my profile for any suitable opportunities at {Company}. Please let me know if any additional information is required from my side.

Thank you for your time and consideration.

Best regards,
Chekkala Tilak`;

function getGeminiModel() {
  return process.env.GEMINI_MODEL ?? "gemini-1.5-flash";
}

function parseJsonResponse<T>(text: string): T | null {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

async function requestGeminiJson<T>(prompt: string, fallback: T, temperature = 0.55): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return fallback;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${getGeminiModel()}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature,
            maxOutputTokens: 900,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini request failed with ${response.status}`);
    }

    const json = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const text = json.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    const parsed = parseJsonResponse<T>(text);

    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function clampPercentage(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function sanitizeStringList(value: unknown, fallback: string[], limit = 8) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const sanitized = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);

  return sanitized.length > 0 ? sanitized : fallback;
}

function extractAtsKeywords(text: string, limit = 20) {
  const counts = new Map<string, number>();
  const matches = text.toLowerCase().match(/[a-z][a-z0-9+.#/-]*/g) ?? [];

  for (const token of matches) {
    const normalized = token
      .replace(/^[^a-z0-9]+|[^a-z0-9+#./-]+$/g, "")
      .replace(/[./-]+$/g, "");
    if (normalized.length < 3 || ATS_STOP_WORDS.has(normalized)) {
      continue;
    }

    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .map(([token]) => token)
    .slice(0, limit);
}

function hasKeyword(text: string, keyword: string) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text);
}

function getResumeBulletCandidates(resumeText: string) {
  const normalized = resumeText
    .replace(/([.!?])\s+(?=[A-Z])/g, "$1\n")
    .replace(/\s*[-\u2022]\s+/g, "\n- ")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 28);

  const preferred = normalized.filter((line) =>
    ["built", "developed", "implemented", "designed", "created", "led", "optimized", "worked", "engineer", "intern"].some((term) =>
      line.toLowerCase().includes(term)
    )
  );

  return (preferred.length > 0 ? preferred : normalized).slice(0, 5);
}

function rewriteBulletForAts(line: string, missingKeywords: string[]) {
  const cleaned = line.replace(/^[-\u2022]\s*/, "").replace(/\s+/g, " ").trim().replace(/\.$/, "");
  const emphasis = missingKeywords.slice(0, 2);

  if (emphasis.length === 0) {
    return `${cleaned}, with clearer emphasis on scope, execution, and measurable impact.`;
  }

  return `${cleaned}, with stronger emphasis on ${emphasis.join(" and ")} where it accurately reflects your work.`;
}

function buildFallbackAtsAnalysis(resumeText: string, jobDescription: string, personaTarget: JobTargetPersona): AtsAnalysisDraft {
  const resumeLower = resumeText.toLowerCase();
  const jobKeywords = extractAtsKeywords(jobDescription, 24);
  const matchedKeywords = jobKeywords.filter((keyword) => hasKeyword(resumeLower, keyword)).slice(0, 12);
  const missingKeywords = jobKeywords.filter((keyword) => !hasKeyword(resumeLower, keyword)).slice(0, 12);
  const skillGaps = missingKeywords.filter((keyword) => /^[a-z][a-z0-9+.#/-]{2,}$/i.test(keyword)).slice(0, 6);
  const suggestedSkillAdditions = skillGaps.map((keyword) => `Add credible evidence for ${keyword} through experience bullets, projects, or a skills section.`);
  const keywordMatchPercentage = clampPercentage(jobKeywords.length ? (matchedKeywords.length / jobKeywords.length) * 100 : 0);

  const sectionScore =
    ["experience", "skills", "education", "projects", "summary"].filter((section) => resumeLower.includes(section)).length * 4;
  const metricsScore = /\b\d+[%+x]?\b/.test(resumeText) ? 12 : 0;
  const atsScore = clampPercentage(keywordMatchPercentage * 0.68 + sectionScore + metricsScore);

  const bulletCandidates = getResumeBulletCandidates(resumeText);
  const improvedBulletPoints = (bulletCandidates.length > 0 ? bulletCandidates : [resumeText.slice(0, 180)])
    .filter(Boolean)
    .slice(0, 4)
    .map((line) => rewriteBulletForAts(line, missingKeywords));

  return {
    personaTarget,
    atsScore,
    keywordMatchPercentage,
    matchSummary:
      matchedKeywords.length > 0
        ? `Your resume shows partial alignment with the job description and already reflects keywords such as ${matchedKeywords.slice(0, 5).join(", ")}. The biggest gap is the lack of stronger coverage for ${missingKeywords.slice(0, 4).join(", ") || "a few role-specific terms"}, which may reduce ATS visibility.`
        : "Your resume does not yet mirror enough of the language in the job description, so an ATS may struggle to rank it strongly for this role.",
    matchedKeywords,
    missingKeywords,
    skillGaps,
    suggestedSkillAdditions,
    strengths: [
      matchedKeywords.length > 0
        ? `Relevant overlap exists around ${matchedKeywords.slice(0, 4).join(", ")}.`
        : "The resume appears readable and can be tailored further for this role.",
      sectionScore >= 8 ? "The resume includes recognizable ATS-friendly sections." : "The resume can benefit from clearer section labeling.",
      metricsScore > 0 ? "There is at least some evidence of quantified impact." : "Adding quantified outcomes would make the resume stronger for ATS and recruiters."
    ],
    weaknesses: [
      missingKeywords.length > 0
        ? `Important missing or underrepresented keywords include ${missingKeywords.slice(0, 5).join(", ")}.`
        : "Keyword coverage looks reasonably complete but phrasing may still need refinement.",
      "Several resume points can be rewritten to sound more role-specific and outcome-focused.",
      metricsScore > 0 ? "Some bullets may still need stronger business or technical context." : "The current resume does not emphasize measurable outcomes enough."
    ],
    suggestions: [
      "Mirror the exact language of the job description where it accurately matches your experience.",
      "Add missing high-value keywords naturally into the summary, skills, and experience sections.",
      "Rewrite experience bullets to emphasize tools, responsibilities, and outcomes that match the target role.",
      "Quantify results wherever possible so both ATS systems and recruiters see stronger evidence of impact."
    ],
    improvedBulletPoints
  };
}

function sanitizeAtsAnalysis(parsed: AtsAnalysisDraft, fallback: AtsAnalysisDraft): AtsAnalysisDraft {
  return {
    personaTarget:
      parsed.personaTarget === "STARTUP" ||
      parsed.personaTarget === "BIG_TECH" ||
      parsed.personaTarget === "HR_RECRUITER" ||
      parsed.personaTarget === "HIRING_MANAGER"
        ? parsed.personaTarget
        : fallback.personaTarget,
    atsScore: clampPercentage(parsed.atsScore),
    keywordMatchPercentage: clampPercentage(parsed.keywordMatchPercentage),
    matchSummary: parsed.matchSummary?.trim() ? parsed.matchSummary.trim() : fallback.matchSummary,
    matchedKeywords: sanitizeStringList(parsed.matchedKeywords, fallback.matchedKeywords, 12),
    missingKeywords: sanitizeStringList(parsed.missingKeywords, fallback.missingKeywords, 12),
    skillGaps: sanitizeStringList(parsed.skillGaps, fallback.skillGaps, 8),
    suggestedSkillAdditions: sanitizeStringList(parsed.suggestedSkillAdditions, fallback.suggestedSkillAdditions, 8),
    strengths: sanitizeStringList(parsed.strengths, fallback.strengths, 6),
    weaknesses: sanitizeStringList(parsed.weaknesses, fallback.weaknesses, 6),
    suggestions: sanitizeStringList(parsed.suggestions, fallback.suggestions, 6),
    improvedBulletPoints: sanitizeStringList(parsed.improvedBulletPoints, fallback.improvedBulletPoints, 6)
  };
}

function buildAllowedSubjects(company: string) {
  return SUBJECT_PATTERNS.map((pattern) => pattern.replace("{company}", company));
}

function buildAtsPromptBlock(atsContext?: StoredAtsAnalysis | null) {
  if (!atsContext) {
    return "ATS insights: Not provided.";
  }

  return [
    "ATS insights:",
    `- Persona target: ${atsContext.personaTarget}`,
    `- ATS score: ${atsContext.atsScore}/100`,
    `- Job description: ${atsContext.jobDescription.slice(0, 3200)}`,
    `- Missing keywords: ${atsContext.missingKeywords.join(", ") || "None noted"}`,
    `- Skill gaps: ${atsContext.skillGaps.join(", ") || "None noted"}`,
    `- Strengths: ${atsContext.strengths.join(" | ") || "None noted"}`,
    `- Improved resume lines: ${atsContext.improvedBulletPoints.slice(0, 4).join(" | ") || "None provided"}`
  ].join("\n");
}

function buildFallbackEmail({
  recruiterName,
  recruiterEmail,
  company,
  candidateName,
  resumeText,
  atsContext,
  persona,
  variationHint
}: {
  recruiterName: string;
  recruiterEmail?: string;
  company: string;
  candidateName: string;
  resumeText: string;
  atsContext?: StoredAtsAnalysis | null;
  persona: JobTargetPersona;
  variationHint?: string;
}): GeneratedEmail {
  const subject = `Entry-Level Software Opportunities at ${company}`;
  const snippet = resumeText.slice(0, 260).replace(/\s+/g, " ").trim();
  const recruiterStyle = inferRecruiterPersonality({
    recruiterName,
    recruiterEmail,
    company,
    jobDescription: atsContext?.jobDescription
  });
  const alignmentLine = atsContext?.jobDescription
    ? `<p>I have been aligning my resume closely with roles that emphasize ${atsContext.missingKeywords.slice(0, 3).join(", ") || "strong backend execution"}, and I believe that positioning fits well with the kind of opportunity your team may be hiring for.</p>`
    : "";
  const personaLine =
    persona === "STARTUP"
      ? "<p>I enjoy shipping quickly, taking ownership, and contributing wherever the team needs momentum.</p>"
      : persona === "BIG_TECH"
        ? "<p>I enjoy building reliable systems, collaborating across functions, and delivering work with strong execution discipline.</p>"
        : persona === "HR_RECRUITER"
          ? "<p>I believe my background aligns well with the kind of role fit and communication clarity recruiters value early in the process.</p>"
          : "<p>I enjoy solving practical engineering problems and contributing in ways that make the team more effective.</p>";
  const variationLine = variationHint ? `<p>${variationHint}</p>` : "";

  return {
    subject,
    body: `<p>Dear ${recruiterName},</p><p>I hope you are doing well.</p><p>I am ${candidateName}, a 2024 Computer Science graduate with internship experience in software development. I am reaching out to express my interest in fresher, entry-level, and software development opportunities at ${company}.</p><p>Through my internships and projects, I have worked on backend systems, practical problem-solving, and product-focused features in fast-paced environments. ${snippet}</p>${alignmentLine}${personaLine}${variationLine}<p>I would truly appreciate it if you could consider my profile for any suitable opportunities at ${company}. ${recruiterStyle.audience === "HR" ? "I would be happy to share any additional details that would help with the process." : "I would be glad to share any further details if helpful."}</p><p>Thank you for your time and consideration.</p><p>Best regards,<br />${candidateName}</p>`
  };
}

function buildFallbackReplyAnalysis(content: string): ReplyAnalysisDraft {
  const lower = content.toLowerCase();
  let sentiment: ReplyAnalysisDraft["sentiment"] = "NEUTRAL";
  let intent: ReplyAnalysisDraft["intent"] = "GENERAL_REPLY";

  if (["interview", "schedule", "available", "next round", "discussion"].some((term) => lower.includes(term))) {
    sentiment = "POSITIVE";
    intent = "INTERVIEW_REQUEST";
  } else if (["resume", "share", "details", "portfolio", "availability", "ctc"].some((term) => lower.includes(term))) {
    sentiment = "NEUTRAL";
    intent = "NEED_MORE_INFO";
  } else if (["unfortunately", "regret", "not moving forward", "not a fit", "decline", "rejected"].some((term) => lower.includes(term))) {
    sentiment = "NEGATIVE";
    intent = "REJECTION";
  }

  const summary = content.replace(/\s+/g, " ").trim().slice(0, 220);

  if (intent === "INTERVIEW_REQUEST") {
    return {
      sentiment,
      intent,
      summary,
      suggestedReply:
        "<p>Dear Recruiter,</p><p>Thank you for your response and for considering my profile. I would be glad to take the discussion forward and I am available at your convenience for the next steps. Please let me know the preferred time and any details I should prepare.</p><p>Best regards,<br />Chekkala Tilak</p>",
      suggestedNextStep: "Reply promptly, confirm availability, and prepare for the interview round."
    };
  }

  if (intent === "NEED_MORE_INFO") {
    return {
      sentiment,
      intent,
      summary,
      suggestedReply:
        "<p>Dear Recruiter,</p><p>Thank you for your response. I am happy to share the additional information you requested. Please let me know if there is anything specific you would like me to provide, and I will send it right away.</p><p>Best regards,<br />Chekkala Tilak</p>",
      suggestedNextStep: "Send the requested information quickly and keep the response crisp."
    };
  }

  if (intent === "REJECTION") {
    return {
      sentiment,
      intent,
      summary,
      suggestedReply:
        "<p>Dear Recruiter,</p><p>Thank you for letting me know and for taking the time to review my profile. I appreciate your consideration. Please keep me in mind for any relevant entry-level software opportunities in the future.</p><p>Best regards,<br />Chekkala Tilak</p>",
      suggestedNextStep: "Send a gracious reply, keep the door open, and move this company to a lower-priority follow-up list."
    };
  }

  return {
    sentiment,
    intent,
    summary,
    suggestedReply:
      "<p>Dear Recruiter,</p><p>Thank you for your response. I appreciate your time and would be happy to continue the conversation. Please let me know the best next step from here.</p><p>Best regards,<br />Chekkala Tilak</p>",
    suggestedNextStep: "Reply politely, clarify what the recruiter needs, and keep the conversation moving."
  };
}

function buildFallbackFollowUp({
  recruiterName,
  company,
  candidateName,
  stage
}: {
  recruiterName: string;
  company: string;
  candidateName: string;
  stage: number;
}): FollowUpDraft {
  if (stage >= 2) {
    return {
      subject: `Final Follow-Up Regarding Opportunities at ${company}`,
      body: `<p>Dear ${recruiterName},</p><p>I hope you are doing well.</p><p>I wanted to make one final follow-up regarding entry-level and software development opportunities at ${company}. I remain very interested in contributing and would be grateful if you could keep my profile in mind for any suitable openings.</p><p>Thank you again for your time and consideration.</p><p>Best regards,<br />${candidateName}</p>`
    };
  }

  return {
    subject: `Following Up on Opportunities at ${company}`,
    body: `<p>Dear ${recruiterName},</p><p>I hope you are doing well.</p><p>I wanted to follow up regarding my interest in fresher and entry-level software development opportunities at ${company}. I remain very interested in the possibility of contributing and would appreciate any update when convenient.</p><p>Thank you for your time and consideration.</p><p>Best regards,<br />${candidateName}</p>`
  };
}

type AssistantPromptInput = {
  intent: AssistantIntent;
  userMessage: string;
  resume: string;
  recruiter: string;
  company: string;
  persona: JobTargetPersona;
  emailDraft: string;
  chatHistory: Array<{ role: string; content: string }>;
  candidateName?: string;
  strategyContext?: string;
  reasoningPlan: AssistantReasoningPlan;
  atsContext?: StoredAtsAnalysis | null;
};

const RESUME_SKILL_KEYWORDS = [
  "next.js",
  "react",
  "typescript",
  "javascript",
  "node.js",
  "node",
  "postgresql",
  "python",
  "sql",
  "tailwind",
  "prisma",
  "api",
  "backend",
  "frontend",
  "full-stack",
  "product engineering",
  "email automation",
  "saas",
  "automation"
];

function toPlainText(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function getResumeSkillHighlights(resumeText: string) {
  const lower = resumeText.toLowerCase();
  return RESUME_SKILL_KEYWORDS.filter((skill) => lower.includes(skill.toLowerCase())).slice(0, 8);
}

function getResumeExperienceHighlights(resumeText: string) {
  return resumeText
    .split(/(?<=[.!?])\s+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .filter((chunk) =>
      ["intern", "engineer", "developer", "experience", "worked", "built", "developed", "implemented", "designed", "project"].some(
        (term) => chunk.toLowerCase().includes(term)
      )
    )
    .slice(0, 4);
}

function buildResumeSummary(resumeText: string, candidateName: string) {
  const skills = getResumeSkillHighlights(resumeText);
  const experienceHighlights = getResumeExperienceHighlights(resumeText);

  if (!resumeText.trim()) {
    return {
      summary: `I do not have resume content available for ${candidateName} yet.`,
      experience: ["No resume experience details are available."],
      skills: ["No explicit skills could be extracted yet."]
    };
  }

  const summary =
    experienceHighlights[0] && skills.length > 0
      ? `${candidateName} has experience in ${skills.slice(0, 4).join(", ")} and a background that includes ${experienceHighlights[0]}`
      : resumeText.slice(0, 260).trim();

  return {
    summary,
    experience: experienceHighlights.length > 0 ? experienceHighlights : [resumeText.slice(0, 220).trim()],
    skills: skills.length > 0 ? skills : ["Skills were not clearly labeled, but the resume should be reviewed directly for specifics."]
  };
}

function buildResumeBlurb(resumeText: string, candidateName: string) {
  const skills = getResumeSkillHighlights(resumeText);
  if (skills.length > 0) {
    return `${candidateName}, with experience in ${skills.slice(0, 3).join(", ")}`;
  }

  const firstSentence = resumeText.split(/(?<=[.!?])\s+/)[0]?.trim();
  return firstSentence || `${candidateName}, with relevant software development experience`;
}

function getAssistantTemperature(intent: AssistantIntent) {
  if (intent === "resume_analysis") return 0.2;
  if (intent === "reply_analysis") return 0.25;
  if (intent === "strategy_advice") return 0.35;
  if (intent === "general_question") return 0.35;
  if (intent === "linkedin_message") return 0.45;
  return 0.5;
}

function getIntentSpecificInstructions(intent: AssistantIntent) {
  if (intent === "resume_analysis") {
    return [
      "- Use the resume as the primary and authoritative source.",
      "- Output clear sections named Summary, Experience, and Skills.",
      "- Do not include outreach advice, recruiter strategy, or message-writing tips."
    ].join("\n");
  }

  if (intent === "email_generation") {
    return [
      "- Generate a polished, personalized outreach email.",
      "- Use the resume, recruiter, company, ATS context, target persona, and draft context when available.",
      "- If a draft is already provided, revise and improve that draft instead of starting over.",
      "- Align naturally with job requirements and incorporate relevant ATS keywords without sounding forced.",
      "- Match the selected persona in wording, emphasis, and tone.",
      "- Return a copy-ready response with Subject and Body sections.",
      "- If recruiter or company context is missing, say that briefly and provide the best possible draft without inventing details."
    ].join("\n");
  }

  if (intent === "linkedin_message") {
    return [
      "- Write a concise LinkedIn message.",
      "- Use the resume lightly and keep it under 4 short sentences.",
      "- If ATS context is available, reflect the strongest alignment and role-specific keywords naturally.",
      "- Match the selected persona in tone and emphasis.",
      "- If a prior draft is provided, refine that draft rather than replacing it with a different format.",
      "- Do not turn it into a full email unless the user explicitly asks."
    ].join("\n");
  }

  if (intent === "reply_analysis") {
    return [
      "- Focus on the reply content first.",
      "- Identify sentiment and intent clearly.",
      "- Provide a suggested reply and a concise next step.",
      "- If the actual recruiter reply text is missing, ask the user to paste it instead of guessing.",
      "- Do not pivot into generic outreach strategy unless the user asks for it."
    ].join("\n");
  }

  if (intent === "strategy_advice") {
    return [
      "- Give practical outreach improvement advice.",
      "- Use resume context and ATS context if they affect positioning, readiness, or fit.",
      "- Keep the answer focused on tactics, prioritization, and next steps."
    ].join("\n");
  }

  return [
    "- Answer the user directly and normally.",
    "- Use the resume only when it is relevant to the question.",
    "- Keep the answer precise and avoid unrelated advice."
  ].join("\n");
}

function getFallbackActions(intent: AssistantIntent) {
  if (intent === "resume_analysis") {
    return ["Summarize my resume", "List my core skills", "Highlight my strongest experience"];
  }

  if (intent === "email_generation") {
    return ["Make this email shorter", "Make it more personalized", "Write a follow-up version"];
  }

  if (intent === "linkedin_message") {
    return ["Shorten this DM", "Make it warmer", "Turn this into an email"];
  }

  if (intent === "reply_analysis") {
    return ["Make the reply shorter", "Adjust the tone", "Suggest the next step"];
  }

  if (intent === "strategy_advice") {
    return ["Improve my outreach strategy", "Suggest a follow-up plan", "Recommend the best send time"];
  }

  return ["Summarize my resume", "Write an outreach email", "Analyze a recruiter reply"];
}

function getAtsSignalMessage(atsContext?: StoredAtsAnalysis | null) {
  if (!atsContext) {
    return "";
  }

  if (atsContext.atsScore < 60) {
    return `The current ATS score is ${atsContext.atsScore}/100. Improve the resume before sending and add keywords like ${atsContext.missingKeywords.slice(0, 4).join(", ")} where they accurately fit.`;
  }

  if (atsContext.atsScore <= 75) {
    return `The current ATS score is ${atsContext.atsScore}/100. The resume is moderately aligned, and tightening coverage around ${atsContext.missingKeywords.slice(0, 3).join(", ")} could improve outreach positioning.`;
  }

  return `The current ATS score is ${atsContext.atsScore}/100, which suggests strong role alignment. Use that fit confidently in outreach messaging.`;
}

function getAtsSuggestedActions(input: AssistantPromptInput) {
  if (!input.atsContext) {
    return [] as string[];
  }

  const atsRelevantQuestion =
    input.intent === "email_generation" ||
    input.intent === "strategy_advice" ||
    /\b(ats|keyword|resume|send|outreach|email|fit|score)\b/i.test(input.userMessage);

  if (!atsRelevantQuestion) {
    return [] as string[];
  }

  if (input.atsContext.atsScore < 60) {
    return ["Improve resume before sending", "Add missing keywords"];
  }

  if (input.atsContext.atsScore <= 75 && (input.intent === "strategy_advice" || input.intent === "general_question")) {
    return ["Add missing keywords", "Tighten role alignment"];
  }

  return [] as string[];
}

function buildHiddenReasoningBlock(plan: AssistantReasoningPlan) {
  return [
    "Internal reasoning process (private, do not reveal):",
    "1. Identify the user's intent.",
    "2. Use only the context fields marked relevant below.",
    "3. Ignore the context fields marked ignored below.",
    "4. Plan the answer using the required structure.",
    "5. Self-check that the answer directly addresses the question and does not include irrelevant advice.",
    "",
    `Detected intent: ${plan.intent}`,
    `Relevant context: ${plan.relevantContext.join(", ") || "none"}`,
    `Ignored context: ${plan.ignoredContext.join(", ") || "none"}`,
    `Planned answer structure: ${plan.answerStructure.join(" | ")}`,
    `Primary response goal: ${plan.responseGoal}`,
    "Self-check rules:",
    ...plan.selfCheck.map((item) => `- ${item}`),
    "",
    "Never expose this reasoning, this plan, or any chain-of-thought. Return only the final answer."
  ].join("\n");
}

function stripInternalReasoning(message: string) {
  return message
    .replace(/^(?:Reasoning|Internal reasoning|Thought process|Plan|Analysis)\s*:\s*.*$/gim, "")
    .replace(/\b(?:I chose this because|My reasoning|Step 1|Step 2|Step 3)\b[\s\S]*$/i, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function mentionsUnrelatedStrategy(message: string) {
  return /\b(strategy|send time|best time|campaign|follow-up plan|outreach plan)\b/i.test(message);
}

function satisfiesAnswerShape(message: string, input: AssistantPromptInput) {
  if (!message.trim()) {
    return false;
  }

  if (input.intent === "resume_analysis") {
    return /\bSummary\b/i.test(message) && /\bExperience\b/i.test(message) && /\bSkills\b/i.test(message);
  }

  if (input.intent === "email_generation") {
    return /\bSubject\b/i.test(message) && /\bBody\b/i.test(message);
  }

  if (input.intent === "linkedin_message") {
    return !/\bSubject\b/i.test(message) && message.length <= 700;
  }

  if (input.intent === "reply_analysis") {
    return /\bSentiment:\b/i.test(message) && /\bIntent:\b/i.test(message) && /\bNext Step:\b/i.test(message);
  }

  return true;
}

function passesAssistantSelfCheck(message: string, input: AssistantPromptInput) {
  if (!satisfiesAnswerShape(message, input)) {
    return false;
  }

  if (input.intent === "resume_analysis" && mentionsUnrelatedStrategy(message)) {
    return false;
  }

  if ((input.intent === "general_question" || input.intent === "reply_analysis") && /tell me which direction you want/i.test(message)) {
    return false;
  }

  return true;
}

function buildGeneralQuestionFallbackMessage(input: AssistantPromptInput) {
  const lower = input.userMessage.toLowerCase();
  const atsSignal = getAtsSignalMessage(input.atsContext);

  if (lower.includes("pending")) {
    return "Pending usually means the email is still in the queue and has not been sent yet. In this dashboard, pending items are typically draft or unsent outreach records, and scheduled emails are the subset of pending items that already have a future send time.";
  }

  if (lower.includes("scheduled")) {
    return "Scheduled means the email has not been sent yet, but it already has a future send time assigned. It stays in the pending queue until that scheduled time is reached.";
  }

  if (lower.includes("response rate") || lower.includes("reply rate")) {
    return "Response rate is the percentage of sent emails that received replies. It is usually calculated as replies divided by total sent emails, then multiplied by 100.";
  }

  if (lower.includes("follow up") || lower.includes("follow-up")) {
    return "Follow-ups are reminder emails sent after an earlier outreach message if there is no reply. They work best when they are brief, spaced out, and clearly tied to the earlier conversation.";
  }

  if (input.resume && /(experience|skills?|background|fit)/.test(lower)) {
    return `${input.candidateName ?? "The candidate"} has relevant software and product-oriented experience in the resume context already loaded here. If you want, I can break that down into a summary, skills list, or role-fit analysis.`;
  }

  if (atsSignal) {
    return atsSignal;
  }

  return "I can help with resume analysis, recruiter emails, LinkedIn messages, reply analysis, or outreach strategy. Tell me which direction you want.";
}

function buildFallbackAssistantResponse(input: AssistantPromptInput): AssistantReplyDraft {
  const candidateName = input.candidateName ?? process.env.CANDIDATE_NAME ?? "Chekkala Tilak";
  const personaFlavor =
    input.persona === "STARTUP"
      ? "with an emphasis on ownership and fast execution"
      : input.persona === "BIG_TECH"
        ? "with an emphasis on scale, reliability, and cross-functional execution"
        : input.persona === "HR_RECRUITER"
          ? "with an emphasis on clear role fit and recruiter-friendly communication"
          : "with an emphasis on practical execution and team impact";

  if (input.intent === "resume_analysis") {
    const resumeSummary = buildResumeSummary(input.resume, candidateName);
    return {
      message: [
        "Summary",
        resumeSummary.summary,
        "",
        "Experience",
        ...resumeSummary.experience.map((item) => `- ${item}`),
        "",
        "Skills",
        ...resumeSummary.skills.map((item) => `- ${item}`)
      ].join("\n"),
      suggestedActions: getFallbackActions(input.intent)
    };
  }

  if (input.intent === "email_generation") {
    if (input.emailDraft) {
      return {
        message: [
          "Subject",
          `Exploring Opportunities at ${input.company || "Your Team"}`,
          "",
          "Body",
          `Dear ${input.recruiter || "Recruiter"},\n\nI hope you are doing well. I wanted to reach out because opportunities at ${input.company || "your company"} are especially interesting to me, and my background feels closely aligned. I am ${buildResumeBlurb(input.resume, candidateName)}${input.atsContext?.missingKeywords.length ? `, with relevant alignment around ${input.atsContext.missingKeywords.slice(0, 2).join(" and ")}` : ""}, and I approach my work ${personaFlavor}.\n\nIf your team is hiring for relevant software roles, I would be grateful to be considered. I would also be happy to share any additional information that would be useful.\n\nBest regards,\n${candidateName}`
        ].join("\n"),
        suggestedActions: getFallbackActions(input.intent)
      };
    }

    if (!input.company && !input.recruiter) {
      return {
        message: [
          "I can draft this more precisely if you share the recruiter or company.",
          "",
          "Subject",
          "Entry-Level Software Opportunity",
          "",
          "Body",
          `Dear Recruiter,\n\nI hope you are doing well. I am ${buildResumeBlurb(input.resume, candidateName)} and I am reaching out to express interest in relevant entry-level software opportunities. I would appreciate the chance to be considered if there is a fit.\n\nBest regards,\n${candidateName}`
        ].join("\n"),
        suggestedActions: getFallbackActions(input.intent)
      };
    }

    return {
      message: [
        "Subject",
        `Exploring Opportunities at ${input.company || "Your Team"}`,
        "",
        "Body",
        `Dear ${input.recruiter || "Recruiter"},\n\nI hope you are doing well. I am ${buildResumeBlurb(input.resume, candidateName)}. I am reaching out to express interest in relevant software opportunities at ${input.company || "your company"}. ${input.atsContext?.jobDescription ? "My background aligns well with the role requirements I have been targeting, especially around the strongest matching technical areas." : "Based on my background, I believe I could contribute well and would appreciate your consideration."} I approach my work ${personaFlavor}.\n\nBest regards,\n${candidateName}`
      ].join("\n"),
      suggestedActions: getFallbackActions(input.intent)
    };
  }

  if (input.intent === "linkedin_message") {
    return {
      message: `Hi ${input.recruiter || ""}${input.recruiter ? ", " : ""}I came across opportunities at ${input.company || "your team"} and wanted to reach out. I'm ${buildResumeBlurb(input.resume, candidateName)}${input.atsContext?.jobDescription ? " and my background aligns well with the role requirements I have been targeting" : ""}. I approach my work ${personaFlavor}, and I'd love to be considered for relevant software roles if there's a fit.`,
      suggestedActions: getFallbackActions(input.intent)
    };
  }

  if (input.intent === "reply_analysis") {
    const hasReplyBody =
      input.userMessage.length > 80 || /\n/.test(input.userMessage) || /reply\s*:/i.test(input.userMessage) || Boolean(input.emailDraft);

    if (!hasReplyBody) {
      return {
        message:
          "Paste the recruiter's reply and I will break down the sentiment, likely intent, and a suggested response you can send next.",
        suggestedActions: getFallbackActions(input.intent)
      };
    }

    const analysis = buildFallbackReplyAnalysis(input.userMessage);
    return {
      message: [
        `Sentiment: ${analysis.sentiment}`,
        `Intent: ${analysis.intent}`,
        "",
        `Summary: ${analysis.summary}`,
        "",
        "Suggested Reply",
        toPlainText(analysis.suggestedReply),
        "",
        `Next Step: ${analysis.suggestedNextStep}`
      ].join("\n"),
      suggestedActions: getFallbackActions(input.intent)
    };
  }

  if (input.intent === "strategy_advice") {
    return {
      message: [
        "Focus on tighter targeting, clear role fit, and disciplined follow-ups.",
        input.atsContext ? getAtsSignalMessage(input.atsContext) : "",
        input.strategyContext ? `\n${input.strategyContext}` : "",
        "",
        "Recommended next moves:",
        "- Personalize the opening line around the recruiter or company.",
        "- Keep initial outreach concise and role-specific.",
        "- Follow up only after a short gap with a lighter message."
      ]
        .filter(Boolean)
        .join("\n"),
      suggestedActions: getFallbackActions(input.intent)
    };
  }

  return {
    message: buildGeneralQuestionFallbackMessage(input),
    suggestedActions: getFallbackActions(input.intent)
  };
}

function buildStructuredAssistantInput(input: AssistantPromptInput) {
  return JSON.stringify(
    {
      intent: input.intent,
      userMessage: input.userMessage,
      resume: input.resume,
      recruiter: input.recruiter,
      company: input.company,
      persona: input.persona,
      emailDraft: input.emailDraft,
      chatHistory: input.chatHistory.slice(-10),
      atsContext: input.atsContext
        ? {
            atsScore: input.atsContext.atsScore,
            jobDescription: input.atsContext.jobDescription.slice(0, 2200),
            missingKeywords: input.atsContext.missingKeywords,
            strengths: input.atsContext.strengths,
            improvedResumeLines: input.atsContext.improvedBulletPoints.slice(0, 4)
          }
        : null
    },
    null,
    2
  );
}

function buildAssistantPrompt(input: AssistantPromptInput) {
  const structuredInput = buildStructuredAssistantInput(input);
  const hiddenReasoningBlock = buildHiddenReasoningBlock(input.reasoningPlan);
  const additionalSections = [
    input.strategyContext ? `Scoped strategy context:\n${input.strategyContext}` : "",
    `Intent-specific rules:\n${getIntentSpecificInstructions(input.intent)}`
  ]
    .filter(Boolean)
    .join("\n\n");

  return `You are an intelligent job assistant.

Structured input:
${structuredInput}

${hiddenReasoningBlock}

Instructions:
* Understand the intent first
* Use resume when relevant
* Ignore irrelevant context
* Do NOT give strategy advice unless asked
* Be precise and helpful
* Avoid generic responses
* If context is missing, say so briefly instead of inventing facts
* NEVER mix unrelated advice
* NEVER hallucinate random suggestions

${additionalSections}

Output rules:
* Return strict JSON with keys "message" and "suggestedActions"
* Keep suggestedActions aligned with the same intent
* suggestedActions must contain up to 3 short suggestions
* message must be structured, specific, and directly useful
* do not reveal internal reasoning, analysis, or planning`;
}

export async function generateRecruiterEmail({
  recruiterName,
  recruiterEmail,
  company,
  resumeText,
  atsContext,
  persona,
  variationHint,
  candidateName = process.env.CANDIDATE_NAME ?? "Chekkala Tilak"
}: {
  recruiterName: string;
  recruiterEmail?: string;
  company: string;
  resumeText: string;
  atsContext?: StoredAtsAnalysis | null;
  persona: JobTargetPersona;
  variationHint?: string;
  candidateName?: string;
}): Promise<GeneratedEmail> {
  const fallback = buildFallbackEmail({
    recruiterName,
    recruiterEmail,
    company,
    candidateName,
    resumeText,
    atsContext,
    persona,
    variationHint
  });
  const allowedSubjects = buildAllowedSubjects(company);
  const atsPromptBlock = buildAtsPromptBlock(atsContext);
  const recruiterPersonality = inferRecruiterPersonality({
    recruiterName,
    recruiterEmail,
    company,
    jobDescription: atsContext?.jobDescription
  });

  const prompt = `${STRATEGIST_SYSTEM_PROMPT}

Write a personalized outreach email that closely follows the structure, tone, and polish of this reference template.

Reference template:
${REFERENCE_TEMPLATE}

Candidate name: ${candidateName}
Candidate resume:
${resumeText}

Recruiter name: ${recruiterName}
Recruiter email: ${recruiterEmail ?? "Unknown"}
Company name: ${company}
Target persona:
- ${persona}
- ${getPersonaGuidance(persona)}

Recruiter personality guidance:
- Tone: ${recruiterPersonality.tone}
- Audience: ${recruiterPersonality.audience}
- Rationale: ${recruiterPersonality.rationale}
${atsPromptBlock}
Variation hint: ${variationHint ?? "Standard primary draft"}

Requirements:
- Use the same polished and human tone as the reference template.
- Start with "Dear ${recruiterName},".
- Mention ${company} naturally and positively.
- Adapt the wording, focus, and emphasis to the selected target persona.
- Match the recruiter personality guidance naturally in tone.
- Align the email with the job requirements when ATS context is available.
- Include relevant matching keywords naturally without sounding forced.
- Highlight the strongest matching experience from the resume.
- Address gaps subtly if needed, but do not sound defensive.
- Position the candidate as looking for fresher opportunities, entry-level software opportunities, or software development opportunities.
- Use only facts supported by the resume and ATS context. Do not invent achievements, companies, tools, or applications already submitted.
- Keep it under 200 words.
- End with "Best regards," followed by "${candidateName}".
- Return valid HTML using only <p> tags.
- Return strict JSON only with keys "subject" and "body".

Subject rules:
- Choose exactly one of these subjects:
${allowedSubjects.map((subject) => `  - ${subject}`).join("\n")}
- Do not create any other subject line.`;

  const parsed = await requestGeminiJson<GeneratedEmail>(prompt, fallback, 0.55);

  return {
    subject: allowedSubjects.includes(parsed.subject) ? parsed.subject : fallback.subject,
    body: parsed.body?.trim() ? parsed.body.trim() : fallback.body
  };
}

export async function analyzeRecruiterReply(input: {
  content: string;
  recruiterName?: string | null;
  company?: string | null;
  latestSubject?: string | null;
  latestBody?: string | null;
  candidateName?: string;
}): Promise<ReplyAnalysisDraft> {
  const fallback = buildFallbackReplyAnalysis(input.content);
  const candidateName = input.candidateName ?? process.env.CANDIDATE_NAME ?? "Chekkala Tilak";

  const prompt = `${STRATEGIST_SYSTEM_PROMPT}

Analyze the recruiter reply below and return strict JSON with keys:
- sentiment: POSITIVE | NEUTRAL | NEGATIVE
- intent: INTERVIEW_REQUEST | NEED_MORE_INFO | REJECTION | GENERAL_REPLY | UNKNOWN
- summary
- suggestedReply
- suggestedNextStep

Context:
Recruiter: ${input.recruiterName ?? "Unknown recruiter"}
Company: ${input.company ?? "Unknown company"}
Candidate: ${candidateName}
Latest outbound subject: ${input.latestSubject ?? "Not available"}
Latest outbound body: ${input.latestBody ?? "Not available"}

Recruiter reply:
${input.content}

Rules:
- Be precise and conservative.
- suggestedReply must be valid HTML using only <p> tags.
- suggestedReply should sound polished, human, and concise.
- suggestedNextStep must be a single sentence.
- Do not invent any facts beyond the supplied context.`;

  const parsed = await requestGeminiJson<ReplyAnalysisDraft>(prompt, fallback, 0.35);

  return {
    sentiment: ["POSITIVE", "NEUTRAL", "NEGATIVE"].includes(parsed.sentiment) ? parsed.sentiment : fallback.sentiment,
    intent: ["INTERVIEW_REQUEST", "NEED_MORE_INFO", "REJECTION", "GENERAL_REPLY", "UNKNOWN"].includes(parsed.intent)
      ? parsed.intent
      : fallback.intent,
    summary: parsed.summary?.trim() ? parsed.summary.trim() : fallback.summary,
    suggestedReply: parsed.suggestedReply?.trim() ? parsed.suggestedReply.trim() : fallback.suggestedReply,
    suggestedNextStep: parsed.suggestedNextStep?.trim() ? parsed.suggestedNextStep.trim() : fallback.suggestedNextStep
  };
}

export async function generateFollowUpEmail(input: {
  recruiterName: string;
  company: string;
  candidateName?: string;
  previousSubject: string;
  previousBody: string;
  stage: number;
}): Promise<FollowUpDraft> {
  const candidateName = input.candidateName ?? process.env.CANDIDATE_NAME ?? "Chekkala Tilak";
  const fallback = buildFallbackFollowUp({
    recruiterName: input.recruiterName,
    company: input.company,
    candidateName,
    stage: input.stage
  });

  const stageLabel = input.stage >= 2 ? "final follow-up" : "gentle reminder";
  const prompt = `${STRATEGIST_SYSTEM_PROMPT}

Write a ${stageLabel} email for a recruiter outreach thread.

Candidate: ${candidateName}
Recruiter: ${input.recruiterName}
Company: ${input.company}
Previous subject: ${input.previousSubject}
Previous email body: ${input.previousBody}
Follow-up stage: ${input.stage}

Requirements:
- Keep it brief, polished, and non-pushy.
- Mention continued interest in suitable fresher, entry-level, or software development opportunities.
- Do not invent any new facts.
- Use only <p> tags in the body.
- Return strict JSON with keys "subject" and "body".`;

  const parsed = await requestGeminiJson<FollowUpDraft>(prompt, fallback, 0.4);

  return {
    subject: parsed.subject?.trim() ? parsed.subject.trim() : fallback.subject,
    body: parsed.body?.trim() ? parsed.body.trim() : fallback.body
  };
}

export async function analyzeResumeAgainstJobDescription(input: {
  resumeText: string;
  jobDescription: string;
  persona: JobTargetPersona;
}): Promise<AtsAnalysisDraft> {
  const fallback = buildFallbackAtsAnalysis(input.resumeText, input.jobDescription, input.persona);

  const prompt = `You are an expert ATS resume analyzer.

Analyze the following resume against the job description.

Persona optimization target:
- ${input.persona}
- ${getPersonaGuidance(input.persona)}

Return strict JSON with these keys only:
- personaTarget: STARTUP | BIG_TECH | HR_RECRUITER | HIRING_MANAGER
- atsScore: number from 0 to 100
- keywordMatchPercentage: number from 0 to 100
- matchSummary: short paragraph
- matchedKeywords: array of strings
- missingKeywords: array of strings
- skillGaps: array of strings
- suggestedSkillAdditions: array of strings
- strengths: array of strings
- weaknesses: array of strings
- suggestions: array of strings
- improvedBulletPoints: array of strings

Rules:
- Be specific, practical, and actionable.
- Base every point on the supplied resume and job description only.
- Do not invent experience, tools, or accomplishments not supported by the resume.
- Missing keywords should focus on important ATS terms absent or underrepresented in the resume.
- skillGaps should highlight important missing or underrepresented skills.
- suggestedSkillAdditions should explain what to add or strengthen in the resume.
- Improved bullet points should be resume-ready rewrites, concise, and aligned with the job description.
- Optimize the advice for the selected persona without changing the underlying facts.
- Keep arrays focused and high-signal, ideally 3 to 6 items each.

Resume:
${input.resumeText}

Job description:
${input.jobDescription}`;

  const parsed = await requestGeminiJson<AtsAnalysisDraft>(prompt, fallback, 0.3);
  return sanitizeAtsAnalysis(parsed, fallback);
}

export async function generateAssistantResponse(input: AssistantPromptInput): Promise<AssistantReplyDraft> {
  const fallback = buildFallbackAssistantResponse(input);
  const prompt = buildAssistantPrompt(input);
  const parsed = await requestGeminiJson<AssistantReplyDraft>(prompt, fallback, getAssistantTemperature(input.intent));
  const candidateMessage = stripInternalReasoning(parsed.message?.trim() ? parsed.message.trim() : fallback.message);
  const candidateActions = Array.isArray(parsed.suggestedActions)
    ? parsed.suggestedActions.filter((action) => typeof action === "string" && action.trim()).slice(0, 3)
    : fallback.suggestedActions;
  const atsSuggestedActions = getAtsSuggestedActions(input);
  const mergedActions = [...atsSuggestedActions, ...candidateActions].filter((action, index, array) => array.indexOf(action) === index).slice(0, 3);

  if (!passesAssistantSelfCheck(candidateMessage, input)) {
    return {
      ...fallback,
      suggestedActions: [...getAtsSuggestedActions(input), ...fallback.suggestedActions]
        .filter((action, index, array) => array.indexOf(action) === index)
        .slice(0, 3)
    };
  }

  return {
    message: candidateMessage,
    suggestedActions: mergedActions
  };
}

