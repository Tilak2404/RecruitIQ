import { prisma } from "@/lib/prisma";
import type { AbTestSummary, JobOsSettings, JobTargetPersona } from "@/types/app";

type JobOsSettingsMetadata = {
  kind: "job_os_settings";
  persona: JobTargetPersona;
};

type AbTestMetadata = {
  kind: "job_os_ab_test";
  campaignId: string;
  persona: JobTargetPersona;
  variants: Array<{
    label: "A" | "B";
    subject: string;
    body: string;
  }>;
  assignments: Array<{
    emailLogId: string;
    label: "A" | "B";
  }>;
};

const DEFAULT_SETTINGS: JobOsSettings = {
  persona: "STARTUP"
};

function isJobOsSettingsMetadata(metadata: unknown): metadata is JobOsSettingsMetadata {
  return Boolean(metadata && typeof metadata === "object" && !Array.isArray(metadata) && (metadata as { kind?: unknown }).kind === "job_os_settings");
}

function isAbTestMetadata(metadata: unknown): metadata is AbTestMetadata {
  return Boolean(metadata && typeof metadata === "object" && !Array.isArray(metadata) && (metadata as { kind?: unknown }).kind === "job_os_ab_test");
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
          content: "I can help with resume analysis, recruiter emails, LinkedIn messages, reply analysis, and outreach strategy.",
          metadata: {
            intent: "general_question",
            suggestedActions: ["Summarize my resume", "Write a recruiter email", "Analyze a recruiter reply"]
          }
        }
      }
    }
  });
}

async function getSystemMessages(limit = 40) {
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

export async function getJobOsSettings(): Promise<JobOsSettings> {
  const messages = await getSystemMessages(20);
  const stored = messages.find((message) => isJobOsSettingsMetadata(message.metadata));

  if (!stored || !isJobOsSettingsMetadata(stored.metadata)) {
    return DEFAULT_SETTINGS;
  }

  return {
    persona: stored.metadata.persona
  };
}

export async function updateJobOsSettings(settings: JobOsSettings) {
  const conversation = await getOrCreatePrimaryConversation();

  await prisma.assistantMessage.create({
    data: {
      conversationId: conversation.id,
      role: "SYSTEM",
      content: `Job OS settings updated. Persona ${settings.persona}.`,
      metadata: {
        kind: "job_os_settings",
        persona: settings.persona
      } satisfies JobOsSettingsMetadata
    }
  });

  return settings;
}

export async function storeCampaignAbTest(input: {
  campaignId: string;
  persona: JobTargetPersona;
  variants: Array<{
    label: "A" | "B";
    subject: string;
    body: string;
  }>;
  assignments: Array<{
    emailLogId: string;
    label: "A" | "B";
  }>;
}) {
  const conversation = await getOrCreatePrimaryConversation();

  await prisma.assistantMessage.create({
    data: {
      conversationId: conversation.id,
      role: "SYSTEM",
      content: `Stored A/B email test for campaign ${input.campaignId}.`,
      metadata: {
        kind: "job_os_ab_test",
        campaignId: input.campaignId,
        persona: input.persona,
        variants: input.variants,
        assignments: input.assignments
      } satisfies AbTestMetadata
    }
  });
}

export async function getCampaignAbTestSummary(campaignId?: string): Promise<AbTestSummary | null> {
  const messages = await getSystemMessages(50);
  const entry = messages.find((message) => {
    if (!isAbTestMetadata(message.metadata)) {
      return false;
    }

    return campaignId ? message.metadata.campaignId === campaignId : true;
  });

  if (!entry || !isAbTestMetadata(entry.metadata)) {
    return null;
  }

  const assignments = entry.metadata.assignments;
  const emailLogs = await prisma.emailLog.findMany({
    where: {
      id: {
        in: assignments.map((item) => item.emailLogId)
      }
    },
    select: {
      id: true,
      repliedAt: true
    }
  });

  const logMap = new Map(emailLogs.map((log) => [log.id, log]));
  const variants = entry.metadata.variants.map((variant) => {
    const variantAssignments = assignments.filter((assignment) => assignment.label === variant.label);
    const replies = variantAssignments.filter((assignment) => Boolean(logMap.get(assignment.emailLogId)?.repliedAt)).length;
    const assignedCount = variantAssignments.length;

    return {
      label: variant.label,
      subject: variant.subject,
      body: variant.body,
      assignedCount,
      replyCount: replies,
      responseRate: assignedCount > 0 ? (replies / assignedCount) * 100 : 0
    };
  }) as AbTestSummary["variants"];

  const winner =
    variants[0].responseRate === variants[1].responseRate
      ? "TIE"
      : variants[0].responseRate > variants[1].responseRate
        ? "A"
        : "B";

  return {
    campaignId: entry.metadata.campaignId,
    persona: entry.metadata.persona,
    createdAt: entry.createdAt,
    winner,
    variants
  };
}
