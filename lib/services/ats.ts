import { prisma } from "@/lib/prisma";
import type { AtsAnalysisResult, StoredAtsAnalysis } from "@/types/app";

type AtsAnalysisMetadata = AtsAnalysisResult & {
  kind: "ats_analysis";
  jobDescription: string;
  resumeText: string;
  useForOutreach: boolean;
};

function isAtsAnalysisMetadata(metadata: unknown): metadata is AtsAnalysisMetadata {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return false;
  }

  return (metadata as { kind?: unknown }).kind === "ats_analysis";
}

function toStoredAtsAnalysis(message: {
  id: string;
  createdAt: Date;
  metadata: unknown;
}): StoredAtsAnalysis | null {
  if (!isAtsAnalysisMetadata(message.metadata)) {
    return null;
  }

  return {
    id: message.id,
    personaTarget:
      message.metadata.personaTarget === "STARTUP" ||
      message.metadata.personaTarget === "BIG_TECH" ||
      message.metadata.personaTarget === "HR_RECRUITER" ||
      message.metadata.personaTarget === "HIRING_MANAGER"
        ? message.metadata.personaTarget
        : "STARTUP",
    atsScore: message.metadata.atsScore,
    keywordMatchPercentage: message.metadata.keywordMatchPercentage,
    matchSummary: message.metadata.matchSummary,
    matchedKeywords: message.metadata.matchedKeywords,
    missingKeywords: message.metadata.missingKeywords,
    skillGaps: Array.isArray(message.metadata.skillGaps) ? message.metadata.skillGaps : [],
    suggestedSkillAdditions: Array.isArray(message.metadata.suggestedSkillAdditions) ? message.metadata.suggestedSkillAdditions : [],
    strengths: message.metadata.strengths,
    weaknesses: message.metadata.weaknesses,
    suggestions: message.metadata.suggestions,
    improvedBulletPoints: message.metadata.improvedBulletPoints,
    jobDescription: message.metadata.jobDescription,
    resumeText: message.metadata.resumeText,
    useForOutreach: message.metadata.useForOutreach,
    createdAt: message.createdAt
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

async function getStoredAtsMessages(limit = 24) {
  const conversation = await getOrCreatePrimaryConversation();

  return prisma.assistantMessage.findMany({
    where: {
      conversationId: conversation.id,
      role: "SYSTEM"
    },
    orderBy: { createdAt: "desc" },
    take: limit
  });
}

export async function storeAtsAnalysis(input: {
  resumeText: string;
  jobDescription: string;
  analysis: AtsAnalysisResult;
}) {
  const conversation = await getOrCreatePrimaryConversation();

  const message = await prisma.assistantMessage.create({
    data: {
      conversationId: conversation.id,
      role: "SYSTEM",
      content: `ATS analysis saved. Score ${input.analysis.atsScore}/100.`,
      metadata: {
        kind: "ats_analysis",
        ...input.analysis,
        resumeText: input.resumeText,
        jobDescription: input.jobDescription,
        useForOutreach: false
      } satisfies AtsAnalysisMetadata
    }
  });

  const stored = toStoredAtsAnalysis(message);
  if (!stored) {
    throw new Error("Could not store ATS analysis");
  }

  return stored;
}

export async function activateAtsAnalysis(analysisId: string) {
  const messages = await getStoredAtsMessages(40);
  const atsMessages = messages
    .map((message) => ({
      message,
      stored: toStoredAtsAnalysis(message)
    }))
    .filter((entry): entry is { message: (typeof messages)[number]; stored: StoredAtsAnalysis } => Boolean(entry.stored));

  const target = atsMessages.find((entry) => entry.message.id === analysisId);
  if (!target) {
    throw new Error("ATS analysis not found");
  }

  await prisma.$transaction(
    atsMessages.map((entry) =>
      prisma.assistantMessage.update({
        where: { id: entry.message.id },
        data: {
          metadata: {
            ...(entry.message.metadata as unknown as AtsAnalysisMetadata),
            useForOutreach: entry.message.id === analysisId
          } satisfies AtsAnalysisMetadata
        }
      })
    )
  );

  return {
    ...target.stored,
    useForOutreach: true
  } satisfies StoredAtsAnalysis;
}

export async function getActiveAtsAnalysis() {
  const messages = await getStoredAtsMessages(24);

  const active = messages
    .map((message) => toStoredAtsAnalysis(message))
    .filter((message): message is StoredAtsAnalysis => Boolean(message))
    .find((message) => message.useForOutreach);

  return active ?? null;
}

export async function getRecentAtsAnalyses(limit = 5) {
  const messages = await getStoredAtsMessages(Math.max(limit, 1) * 3);

  return messages
    .map((message) => toStoredAtsAnalysis(message))
    .filter((message): message is StoredAtsAnalysis => Boolean(message))
    .slice(0, limit);
}

export async function applyAtsImprovementsToPrimaryResume(analysisId: string) {
  const messages = await getStoredAtsMessages(40);
  const target = messages.find((message) => message.id === analysisId);
  const stored = target ? toStoredAtsAnalysis(target) : null;

  if (!stored) {
    throw new Error("ATS analysis not found");
  }

  const resume = await prisma.resume.findFirst({
    where: { isPrimary: true },
    orderBy: { createdAt: "desc" }
  });

  if (!resume) {
    throw new Error("Upload a resume before applying improvements");
  }

  const addition = `\n\nImproved Resume Lines\n${stored.improvedBulletPoints.map((line) => `- ${line.replace(/^[-\u2022]\s*/, "")}`).join("\n")}`;
  const nextText = resume.extractedText.includes("Improved Resume Lines")
    ? `${resume.extractedText}\n${stored.improvedBulletPoints.map((line) => `- ${line.replace(/^[-\u2022]\s*/, "")}`).join("\n")}`
    : `${resume.extractedText.trim()}${addition}`;

  return prisma.resume.update({
    where: { id: resume.id },
    data: {
      extractedText: nextText
    }
  });
}
