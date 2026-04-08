import { stripHtml } from "@/lib/utils";
import type {
  CompanyResearchResult,
  EmailQualityScore,
  JobTargetPersona,
  PortfolioGenerationResult,
  RecruiterPersonalityProfile,
  ReplyInsightsSnapshot
} from "@/types/app";

type JsonPromptOptions = {
  temperature?: number;
  maxOutputTokens?: number;
};

type ReplyInsightEmailInput = {
  recruiterName: string;
  company: string;
  subject: string;
  body: string;
  replied: boolean;
};

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

async function requestGeminiJson<T>(prompt: string, fallback: T, options: JsonPromptOptions = {}): Promise<T> {
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
            temperature: options.temperature ?? 0.35,
            maxOutputTokens: options.maxOutputTokens ?? 900,
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
    return parseJsonResponse<T>(text) ?? fallback;
  } catch {
    return fallback;
  }
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function sanitizeStringList(value: unknown, fallback: string[], limit = 6) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const next = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);

  return next.length > 0 ? next : fallback;
}

function getWordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function getPersonaGuidance(persona: JobTargetPersona) {
  if (persona === "STARTUP") {
    return "Use impact-driven, fast-moving language. Highlight ownership, speed, experimentation, and building from zero to one.";
  }

  if (persona === "BIG_TECH") {
    return "Use structured, polished language. Highlight scale, systems thinking, cross-functional execution, reliability, and measurable outcomes.";
  }

  if (persona === "HR_RECRUITER") {
    return "Use clear, recruiter-friendly wording. Emphasize role fit, transferable skills, clean communication, and why the candidate matches the job quickly.";
  }

  return "Use a practical hiring-manager tone. Emphasize execution, technical judgment, tradeoffs, and the strongest role-relevant accomplishments.";
}

export function inferRecruiterPersonality(input: {
  recruiterName?: string;
  recruiterEmail?: string;
  company?: string;
  jobDescription?: string;
}): RecruiterPersonalityProfile {
  const email = (input.recruiterEmail ?? "").toLowerCase();
  const jobDescription = (input.jobDescription ?? "").toLowerCase();
  const company = (input.company ?? "").toLowerCase();

  const hrSignals = ["talent", "recruit", "hr", "people", "acquisition", "careers", "hiring"];
  const technicalSignals = ["api", "backend", "frontend", "typescript", "node", "system", "architecture", "platform", "infra"];
  const formalSignals = ["enterprise", "bank", "consulting", "global", "corporation"];

  const hrScore =
    hrSignals.reduce((score, signal) => (email.includes(signal) || jobDescription.includes(signal) ? score + 1 : score), 0) +
    (company.includes("consulting") ? 1 : 0);
  const technicalScore = technicalSignals.reduce((score, signal) => (jobDescription.includes(signal) ? score + 1 : score), 0);
  const formalScore = formalSignals.reduce((score, signal) => (company.includes(signal) ? score + 1 : score), 0);

  if (hrScore >= technicalScore + 1) {
    return {
      tone: formalScore > 0 ? "FORMAL" : "BALANCED",
      audience: "HR",
      rationale: "Signals suggest a recruiter or talent-facing audience, so concise clarity and fit-focused language will land better."
    };
  }

  if (technicalScore >= hrScore + 1) {
    return {
      tone: "BALANCED",
      audience: "TECHNICAL",
      rationale: "The role language looks technical, so stronger specificity around systems, tools, and outcomes will resonate more."
    };
  }

  return {
    tone: formalScore > 0 ? "FORMAL" : "BALANCED",
    audience: "HIRING_MANAGER",
    rationale: "The audience is likely evaluating execution and team fit, so a practical and focused tone is safest."
  };
}

function buildFallbackEmailScore(input: {
  recruiterName: string;
  recruiterEmail?: string;
  company: string;
  subject: string;
  body: string;
  persona: JobTargetPersona;
}): EmailQualityScore {
  const plainBody = stripHtml(input.body);
  const wordCount = getWordCount(plainBody);
  const lowerBody = plainBody.toLowerCase();
  const lowerSubject = input.subject.toLowerCase();
  const personality = inferRecruiterPersonality({
    recruiterName: input.recruiterName,
    recruiterEmail: input.recruiterEmail,
    company: input.company
  });

  const personalizationScore = clampScore(
    40 +
      (lowerBody.includes(input.company.toLowerCase()) ? 20 : 0) +
      (lowerBody.includes(input.recruiterName.toLowerCase()) ? 15 : 0) +
      (lowerSubject.includes(input.company.toLowerCase()) ? 10 : 0)
  );

  const clarityScore = clampScore(
    50 +
      (plainBody.split(/\n+/).length <= 6 ? 10 : 0) +
      (/\b(i am|i'm|my background|my experience)\b/i.test(plainBody) ? 15 : 0) +
      (/\b(role|opportunit|team|fit)\b/i.test(plainBody) ? 10 : 0)
  );

  const lengthScore = clampScore(wordCount >= 80 && wordCount <= 190 ? 92 : wordCount < 65 ? 60 : wordCount <= 240 ? 78 : 48);
  const ctaStrengthScore = clampScore(
    35 +
      (/\bconsider my profile\b/i.test(plainBody) ? 18 : 0) +
      (/\b(let me know|happy to share|would appreciate|available)\b/i.test(plainBody) ? 24 : 0) +
      (/\?\s*$/.test(plainBody) ? 8 : 0)
  );

  const score = clampScore(personalizationScore * 0.28 + clarityScore * 0.26 + lengthScore * 0.18 + ctaStrengthScore * 0.28);

  const reasons = [
    personalizationScore >= 75
      ? `The email feels tailored to ${input.company} instead of sounding like a broadcast template.`
      : "The email needs stronger company-specific personalization.",
    clarityScore >= 75
      ? "The message explains candidate fit clearly and stays easy to scan."
      : "The value proposition could be clearer in the first half of the email.",
    ctaStrengthScore >= 75
      ? "The call to action is polite and gives the recruiter an easy next step."
      : "The CTA is a little soft and could ask for consideration more directly."
  ];

  const suggestions = [
    !lowerBody.includes(input.company.toLowerCase()) ? `Reference ${input.company} more specifically in the opening line.` : "",
    wordCount > 190 ? "Trim the body slightly so the strongest role-fit points land faster." : "",
    !/\b(impact|built|developed|implemented|launched|improved)\b/i.test(plainBody)
      ? "Add one stronger outcome-focused achievement instead of generic interest language."
      : "",
    input.persona === "STARTUP" ? "Lean more into speed, ownership, and hands-on execution." : "",
    input.persona === "BIG_TECH" ? "Lean more into scale, systems thinking, and cross-functional delivery." : ""
  ].filter(Boolean);

  return {
    score,
    personalizationScore,
    clarityScore,
    lengthScore,
    ctaStrengthScore,
    reasons: reasons.slice(0, 3),
    suggestions: suggestions.slice(0, 4),
    recruiterPersonality: personality
  };
}

export async function scoreOutreachEmail(input: {
  recruiterName: string;
  recruiterEmail?: string;
  company: string;
  subject: string;
  body: string;
  persona: JobTargetPersona;
  fastMode?: boolean;
}): Promise<EmailQualityScore> {
  const fallback = buildFallbackEmailScore(input);
  if (input.fastMode) {
    return fallback;
  }
  const prompt = `You are scoring a recruiter outreach email for reply probability.

Target persona guidance:
${getPersonaGuidance(input.persona)}

Recruiter:
- Name: ${input.recruiterName}
- Email: ${input.recruiterEmail ?? "Unknown"}
- Company: ${input.company}

Email subject:
${input.subject}

Email body:
${stripHtml(input.body)}

Return strict JSON with:
- score (0-100)
- personalizationScore (0-100)
- clarityScore (0-100)
- lengthScore (0-100)
- ctaStrengthScore (0-100)
- reasons: string[]
- suggestions: string[]
- recruiterPersonality: { tone, audience, rationale }

Rules:
- Score based on personalization, clarity, length, and CTA strength.
- Keep reasons and suggestions concrete and concise.
- recruiterPersonality.tone must be FORMAL | BALANCED | CASUAL.
- recruiterPersonality.audience must be TECHNICAL | HR | HIRING_MANAGER.
- Be conservative and do not invent unavailable context.`;

  const parsed = await requestGeminiJson<EmailQualityScore>(prompt, fallback, { temperature: 0.25, maxOutputTokens: 800 });

  return {
    score: clampScore(parsed.score),
    personalizationScore: clampScore(parsed.personalizationScore),
    clarityScore: clampScore(parsed.clarityScore),
    lengthScore: clampScore(parsed.lengthScore),
    ctaStrengthScore: clampScore(parsed.ctaStrengthScore),
    reasons: sanitizeStringList(parsed.reasons, fallback.reasons, 4),
    suggestions: sanitizeStringList(parsed.suggestions, fallback.suggestions, 4),
    recruiterPersonality:
      parsed.recruiterPersonality &&
      typeof parsed.recruiterPersonality === "object" &&
      !Array.isArray(parsed.recruiterPersonality) &&
      ["FORMAL", "BALANCED", "CASUAL"].includes((parsed.recruiterPersonality as { tone?: string }).tone ?? "") &&
      ["TECHNICAL", "HR", "HIRING_MANAGER"].includes((parsed.recruiterPersonality as { audience?: string }).audience ?? "")
        ? {
            tone: (parsed.recruiterPersonality as { tone: RecruiterPersonalityProfile["tone"] }).tone,
            audience: (parsed.recruiterPersonality as { audience: RecruiterPersonalityProfile["audience"] }).audience,
            rationale:
              (parsed.recruiterPersonality as { rationale?: string }).rationale?.trim() || fallback.recruiterPersonality.rationale
          }
        : fallback.recruiterPersonality
  };
}

function buildFallbackReplyInsights(input: {
  emails: ReplyInsightEmailInput[];
  persona: JobTargetPersona;
}): ReplyInsightsSnapshot {
  const total = input.emails.length;
  const replied = input.emails.filter((email) => email.replied).length;
  const responseRate = total > 0 ? (replied / total) * 100 : 0;
  const avgLength =
    total > 0 ? input.emails.reduce((sum, email) => sum + getWordCount(stripHtml(email.body)), 0) / total : 0;
  const personalizationRate =
    total > 0
      ? (input.emails.filter((email) => {
          const plain = stripHtml(email.body).toLowerCase();
          return plain.includes(email.company.toLowerCase()) || plain.includes(email.recruiterName.toLowerCase());
        }).length /
          total) *
        100
      : 0;
  const ctaRate =
    total > 0
      ? (input.emails.filter((email) => /\b(let me know|happy to share|would appreciate|available)\b/i.test(stripHtml(email.body))).length /
          total) *
        100
      : 0;

  const weakPatterns = [
    personalizationRate < 65 ? "Your emails are too generic and often miss company-specific context." : "",
    avgLength > 190 ? "Your emails are too long, so the strongest fit points may be buried." : "",
    ctaRate < 70 ? "Your CTA is weak or inconsistent across drafts." : ""
  ].filter(Boolean);

  const strengths = [
    personalizationRate >= 65 ? "A good share of drafts already mention recruiter or company context." : "",
    ctaRate >= 70 ? "Many of your emails already close with a usable next step." : "",
    responseRate > 0 ? "Some emails are getting traction, so optimization should focus on consistency." : ""
  ].filter(Boolean);

  const recommendations = [
    weakPatterns.some((item) => item.includes("generic")) ? "Open with one sentence tied to the company, role, or team context." : "",
    weakPatterns.some((item) => item.includes("long")) ? "Cut one paragraph and move the sharpest proof point into the first half of the email." : "",
    weakPatterns.some((item) => item.includes("CTA")) ? "Use a clearer CTA that asks for consideration, next steps, or a short conversation." : "",
    input.persona === "STARTUP" ? "For startup roles, emphasize ownership and speed of execution more directly." : "",
    input.persona === "BIG_TECH" ? "For big-tech roles, sharpen the language around scale, systems, and cross-functional delivery." : ""
  ].filter(Boolean);

  return {
    summary:
      weakPatterns.length > 0
        ? `Response rate is ${responseRate.toFixed(1)}%. The biggest drag right now is ${weakPatterns[0].toLowerCase()}`
        : `Response rate is ${responseRate.toFixed(1)}%. Messaging signals are reasonably healthy, so the next gains will come from tighter personalization and testing.`,
    weakPatterns: weakPatterns.slice(0, 4),
    strengths: strengths.slice(0, 4),
    recommendations: recommendations.slice(0, 4),
    responseRateDelta: clampScore(personalizationRate - ctaRate)
  };
}

export async function analyzeReplyInsights(input: {
  emails: ReplyInsightEmailInput[];
  persona: JobTargetPersona;
  fastMode?: boolean;
}): Promise<ReplyInsightsSnapshot> {
  const fallback = buildFallbackReplyInsights(input);
  if (input.fastMode) {
    return fallback;
  }
  const prompt = `You are diagnosing why recruiter outreach emails are not getting enough replies.

Target persona guidance:
${getPersonaGuidance(input.persona)}

Campaign sample:
${input.emails
  .slice(0, 12)
  .map(
    (email, index) =>
      `Email ${index + 1} | replied=${email.replied}\nRecruiter=${email.recruiterName}\nCompany=${email.company}\nSubject=${email.subject}\nBody=${stripHtml(email.body)}`
  )
  .join("\n\n")}

Return strict JSON with:
- summary
- weakPatterns: string[]
- strengths: string[]
- recommendations: string[]
- responseRateDelta: number

Rules:
- Diagnose weak patterns such as generic messaging, missing company context, weak CTA, unclear fit, or poor length.
- Keep recommendations specific and actionable.
- responseRateDelta should be a coarse 0-100 signal for how much performance could improve with messaging fixes.`;

  const parsed = await requestGeminiJson<ReplyInsightsSnapshot>(prompt, fallback, { temperature: 0.25, maxOutputTokens: 700 });

  return {
    summary: parsed.summary?.trim() || fallback.summary,
    weakPatterns: sanitizeStringList(parsed.weakPatterns, fallback.weakPatterns, 5),
    strengths: sanitizeStringList(parsed.strengths, fallback.strengths, 5),
    recommendations: sanitizeStringList(parsed.recommendations, fallback.recommendations, 5),
    responseRateDelta: clampScore(parsed.responseRateDelta)
  };
}

function extractResumeSentences(resumeText: string) {
  return resumeText
    .replace(/[\u2022•]/g, ". ")
    .replace(/\b(PROFESSIONAL SUMMARY|SUMMARY|EDUCATION|EXPERIENCE|SKILLS|ACADEMIC PROJECTS|PROJECTS|CERTIFICATIONS)\b/g, ". $1. ")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 40);
}

function buildFallbackPortfolio(resumeText: string, persona: JobTargetPersona): PortfolioGenerationResult {
  const sentences = extractResumeSentences(resumeText);
  const summarySentence =
    sentences.find((sentence) => /\b(engineer|developer|backend|product|software|build|automation|api)\b/i.test(sentence)) ?? sentences[0];
  const projectDescriptions = sentences
    .filter((sentence) => /\b(project|built|developed|implemented|designed|created|engineer)\b/i.test(sentence))
    .slice(0, 4);

  return {
    headline:
      persona === "STARTUP"
        ? "Builder focused on shipping practical software quickly"
        : "Software engineer focused on reliable product execution",
    summary: summarySentence ?? "Software engineer with hands-on experience building product features, backend workflows, and practical tools.",
    projectDescriptions:
      projectDescriptions.length > 0
        ? projectDescriptions
        : ["Built practical software features with a focus on usability, execution speed, and real-world outcomes."],
    githubAbout: "Building practical software systems, automation workflows, and product-focused engineering projects.",
    portfolioSections: [
      "Hero summary with role focus and strongest technical themes",
      "Selected projects with measurable outcomes",
      "Skills and tools grouped by engineering area",
      "Experience timeline with concise impact bullets"
    ]
  };
}

export async function generatePortfolioAssets(input: {
  resumeText: string;
  persona: JobTargetPersona;
}): Promise<PortfolioGenerationResult> {
  const fallback = buildFallbackPortfolio(input.resumeText, input.persona);
  const prompt = `You are generating portfolio copy from a resume.

Target persona guidance:
${getPersonaGuidance(input.persona)}

Resume:
${input.resumeText}

Return strict JSON with:
- headline
- summary
- projectDescriptions: string[]
- githubAbout
- portfolioSections: string[]

Rules:
- Use only resume-supported facts.
- Keep the headline and summary concise and polished.
- projectDescriptions should sound portfolio-ready and specific.
- portfolioSections should be practical sections the user can place on a portfolio site.`;

  const parsed = await requestGeminiJson<PortfolioGenerationResult>(prompt, fallback, {
    temperature: 0.4,
    maxOutputTokens: 850
  });

  return {
    headline: parsed.headline?.trim() || fallback.headline,
    summary: parsed.summary?.trim() || fallback.summary,
    projectDescriptions: sanitizeStringList(parsed.projectDescriptions, fallback.projectDescriptions, 6),
    githubAbout: parsed.githubAbout?.trim() || fallback.githubAbout,
    portfolioSections: sanitizeStringList(parsed.portfolioSections, fallback.portfolioSections, 6)
  };
}

function buildFallbackCompanyResearch(company: string): CompanyResearchResult {
  return {
    company,
    cultureNotes: [
      `${company} is likely looking for concise communication and a strong signal of role fit.`,
      "Recruiter-facing outreach should usually balance confidence with clarity instead of sounding overly broad."
    ],
    recentSignals: [
      "Use only verifiable public context when referencing recent company movement or priorities.",
      "If you do not have recent company specifics, anchor the outreach around the role and team impact instead."
    ],
    outreachAngles: [
      "Reference the role or product area you are targeting.",
      "Connect one resume highlight to the kind of problems the team is likely solving.",
      "Keep the first message short and tailored instead of over-explaining your full background."
    ],
    toneRecommendation: "Lead with relevance, keep the tone polished, and mention one company-specific angle if you can verify it."
  };
}

export async function researchCompany(input: {
  company: string;
  jobDescription?: string;
}): Promise<CompanyResearchResult> {
  const fallback = buildFallbackCompanyResearch(input.company);
  const prompt = `You are helping a job seeker prepare company-specific outreach.

Company: ${input.company}
Job description context:
${input.jobDescription ?? "Not provided"}

Return strict JSON with:
- company
- cultureNotes: string[]
- recentSignals: string[]
- outreachAngles: string[]
- toneRecommendation

Rules:
- If you are unsure about recent news, keep the point high-level and do not invent specifics.
- Focus on what the candidate should mention in outreach.
- Keep every point concise and actionable.`;

  const parsed = await requestGeminiJson<CompanyResearchResult>(prompt, fallback, {
    temperature: 0.35,
    maxOutputTokens: 750
  });

  return {
    company: parsed.company?.trim() || fallback.company,
    cultureNotes: sanitizeStringList(parsed.cultureNotes, fallback.cultureNotes, 5),
    recentSignals: sanitizeStringList(parsed.recentSignals, fallback.recentSignals, 5),
    outreachAngles: sanitizeStringList(parsed.outreachAngles, fallback.outreachAngles, 5),
    toneRecommendation: parsed.toneRecommendation?.trim() || fallback.toneRecommendation
  };
}
