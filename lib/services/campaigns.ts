import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getActiveAtsAnalysis } from "@/lib/services/ats";
import { getAnalyticsSnapshot } from "@/lib/services/analytics";
import { getAssistantMessages } from "@/lib/services/assistant";
import { getCampaignAbTestSummary, getJobOsSettings } from "@/lib/services/job-os";
import { getRecentReplyAnalyses } from "@/lib/services/replies";
import { getBestSendTimeSuggestion, getOutreachOverview } from "@/lib/services/strategy";
import type { CampaignDetail, CampaignListItem, DashboardSnapshot } from "@/types/app";

const WORKFLOW_CAMPAIGN_NAME = "Quick Outreach";

export async function getCampaignDetail(campaignId: string): Promise<CampaignDetail | null> {
  return prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      emailLogs: {
        include: {
          recruiter: true,
          sendingAccount: {
            select: {
              id: true,
              name: true,
              email: true,
              type: true,
              isActive: true
            }
          }
        },
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });
}

export async function getCampaignSummaries(): Promise<CampaignListItem[]> {
  const campaigns = await prisma.campaign.findMany({
    include: {
      emailLogs: {
        select: {
          status: true,
          sentAt: true,
          repliedAt: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return campaigns.map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    status: campaign.status,
    sendState: campaign.sendState,
    sendProgress: campaign.sendProgress,
    createdAt: campaign.createdAt,
    draftCount: campaign.emailLogs.filter((log) => ["DRAFT", "NOT_SENT"].includes(log.status)).length,
    sentCount: campaign.emailLogs.filter((log) => Boolean(log.sentAt)).length,
    replyCount: campaign.emailLogs.filter((log) => Boolean(log.repliedAt)).length,
    failedCount: campaign.emailLogs.filter((log) => log.status === "FAILED").length
  }));
}

async function getOrCreateWorkflowCampaignId() {
  let campaign = await prisma.campaign.findFirst({
    where: {
      name: WORKFLOW_CAMPAIGN_NAME
    },
    select: {
      id: true
    }
  });

  if (!campaign) {
    campaign = await prisma.campaign.create({
      data: {
        name: WORKFLOW_CAMPAIGN_NAME,
        description: "Personal outreach workflow",
        defaultSubject: "Exploring a potential fit with your team",
        delayMs: 3500,
        batchSize: 20,
        rotationSize: 20,
        retryLimit: 2
      },
      select: {
        id: true
      }
    });
  }

  return campaign.id;
}

export async function ensureWorkflowEmailLogs(recruiterIds: string[]) {
  const uniqueRecruiterIds = [...new Set(recruiterIds.filter(Boolean))];
  const campaignId = await getOrCreateWorkflowCampaignId();

  if (uniqueRecruiterIds.length === 0) {
    return campaignId;
  }

  const existingLogs = await prisma.emailLog.findMany({
    where: {
      campaignId,
      recruiterId: {
        in: uniqueRecruiterIds
      }
    },
    select: {
      recruiterId: true
    }
  });

  const existingRecruiterIds = new Set(existingLogs.map((log) => log.recruiterId));
  const missingRecruiterIds = uniqueRecruiterIds.filter((recruiterId) => !existingRecruiterIds.has(recruiterId));

  if (missingRecruiterIds.length > 0) {
    await prisma.emailLog.createMany({
      data: missingRecruiterIds.map((recruiterId) => ({
        recruiterId,
        campaignId,
        subject: "Exploring a potential fit with your team",
        body: "<p>Draft pending AI generation.</p>",
        trackingToken: randomUUID(),
        status: "NOT_SENT"
      }))
    });
  }

  return campaignId;
}

export async function clearSentEmailLogs(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true }
  });

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  const result = await prisma.emailLog.deleteMany({
    where: {
      campaignId,
      status: "SENT"
    }
  });

  return {
    deleted: result.count
  };
}

async function ensureWorkflowCampaign() {
  const campaignId = await getOrCreateWorkflowCampaignId();
  return getCampaignDetail(campaignId);
}

export async function getOutreachWorkspaceSnapshot(selectedCampaignId?: string) {
  const resume = await prisma.resume.findFirst({
    where: { isPrimary: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      candidateName: true,
      fileName: true,
      extractedText: true,
      createdAt: true
    }
  });

  const recruiters = await prisma.recruiter.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      company: true,
      createdAt: true
    }
  });

  const accounts = await prisma.sendingAccount.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      type: true,
      fromName: true,
      email: true,
      smtpHost: true,
      smtpPort: true,
      smtpSecure: true,
      dailyLimit: true,
      hourlyLimit: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });

  const overview = await getOutreachOverview();
  const timeSuggestion = await getBestSendTimeSuggestion();
  const jobOsSettings = await getJobOsSettings();
  const activeAtsAnalysis = await getActiveAtsAnalysis();
  const selectedCampaign = selectedCampaignId
    ? await getCampaignDetail(selectedCampaignId)
    : await ensureWorkflowCampaign();

  return {
    resume,
    recruiters,
    accounts,
    overview,
    timeSuggestion,
    jobOsSettings,
    activeAtsAnalysis,
    selectedCampaign
  };
}

export async function getDashboardSnapshot(selectedCampaignId?: string): Promise<DashboardSnapshot> {
  const resume = await prisma.resume.findFirst({
    where: { isPrimary: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      candidateName: true,
      fileName: true,
      extractedText: true,
      createdAt: true
    }
  });

  const recruiters = await prisma.recruiter.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      company: true,
      createdAt: true
    }
  });

  const campaigns = await getCampaignSummaries();

  const accounts = await prisma.sendingAccount.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      type: true,
      fromName: true,
      email: true,
      smtpHost: true,
      smtpPort: true,
      smtpSecure: true,
      dailyLimit: true,
      hourlyLimit: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });

  const analytics = await getAnalyticsSnapshot();
  const overview = await getOutreachOverview();
  const timeSuggestion = await getBestSendTimeSuggestion();
  const jobOsSettings = await getJobOsSettings();
  const activeAtsAnalysis = await getActiveAtsAnalysis();
  const activeAbTest = await getCampaignAbTestSummary(selectedCampaignId);
  const assistantMessages = await getAssistantMessages(12);
  const recentReplyAnalyses = await getRecentReplyAnalyses(5);

  const selectedCampaign = selectedCampaignId
    ? await getCampaignDetail(selectedCampaignId)
    : await ensureWorkflowCampaign();

  return {
    resume,
    recruiters,
    campaigns,
    accounts,
    analytics,
    overview,
    timeSuggestion,
    jobOsSettings,
    activeAtsAnalysis,
    replyInsights: analytics.replyInsights,
    activeAbTest,
    assistantMessages,
    recentReplyAnalyses,
    selectedCampaign
  };
}

export async function createCampaignWithDrafts(input: {
  name: string;
  description?: string | null;
  recruiterIds: string[];
  delayMs: number;
  batchSize: number;
  rotationSize: number;
  retryLimit: number;
  defaultSubject?: string | null;
}) {
  const campaign = await prisma.campaign.create({
    data: {
      name: input.name,
      description: input.description,
      defaultSubject: input.defaultSubject,
      delayMs: input.delayMs,
      batchSize: input.batchSize,
      rotationSize: input.rotationSize,
      retryLimit: input.retryLimit,
      emailLogs: {
        create: input.recruiterIds.map((recruiterId) => ({
          recruiterId,
          subject: input.defaultSubject ?? "Exploring a potential fit with your team",
          body: "<p>Draft pending AI generation.</p>",
          trackingToken: randomUUID()
        }))
      }
    }
  });

  return campaign;
}

