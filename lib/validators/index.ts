import { z } from "zod";

export const analyzeReplySchema = z.object({
  content: z.string().min(1, "Reply content required"),
  emailLogId: z.string().optional(),
  recruiterId: z.string().optional()
});

export const resumeUpdateSchema = z.object({
  candidateName: z.string().min(1),
  extractedText: z.string().min(1)
});

export const replyInsightsSchema = z.object({
  campaignId: z.string().optional(),
  draftIds: z.array(z.string()).optional(),
  persona: z.enum(["STARTUP", "BIG_TECH", "HR_RECRUITER", "HIRING_MANAGER"]).optional()
});

export const sendingAccountSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["GMAIL", "CUSTOM"]),
  fromName: z.string().optional(),
  email: z.string().email(),
  smtpHost: z.string().min(1),
  smtpPort: z.coerce.number().int().positive(),
  smtpSecure: z.boolean(),
  password: z.string().min(1),
  dailyLimit: z.number().int().min(1).default(75),
  hourlyLimit: z.number().int().min(1).default(20),
  isActive: z.boolean().default(true)
});

export const atsAnalyzeSchema = z.object({
  resumeText: z.string().min(1),
  jobDescription: z.string().min(1),
  persona: z.enum(["STARTUP", "BIG_TECH", "HR_RECRUITER", "HIRING_MANAGER"]).optional()
});

export const createCampaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  recruiters: z.array(z.object({
    name: z.string(),
    email: z.string().email(),
    company: z.string()
  })).min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  batchSize: z.number().int().min(1).max(50).default(20),
  delayMs: z.number().int().min(1000).default(3500)
});

export const assistantMessageSchema = z.object({
  content: z.string().min(1)
});

export const atsUseSchema = z.object({
  analysisId: z.string(),
  useForOutreach: z.boolean()
});

export const updateEmailLogSchema = z.object({
  id: z.string(),
  subject: z.string().optional(),
  body: z.string().optional()
});

export const emailScoreSchema = z.object({
  subject: z.string(),
  body: z.string()
});

export const followUpSchema = z.object({
  emailLogId: z.string(),
  stage: z.number().int().min(1)
});

export const generateEmailSchema = z.object({
  recruiterName: z.string(),
  company: z.string(),
  atsAnalysisId: z.string().optional(),
  persona: z.enum(["STARTUP", "BIG_TECH", "HR_RECRUITER", "HIRING_MANAGER"]),
  variationHint: z.string().optional()
});

export const jobExtractSchema = z.object({
  jobUrl: z.string().url()
});

export const jobOsSettingsSchema = z.object({
  bestTimeToSend: z.string().optional()
});

export const portfolioGenerateSchema = z.object({
  persona: z.enum(["STARTUP", "BIG_TECH", "HR_RECRUITER", "HIRING_MANAGER"]),
  focusArea: z.string()
});

export const recruiterSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  company: z.string().optional()
});

export const scheduleEmailSchema = z.object({
  emailLogIds: z.array(z.string()).min(1),
  scheduledAt: z.string().datetime()
});

export const sendCampaignSchema = z.object({
  campaignId: z.string(),
  batchSize: z.number().int().optional()
});

