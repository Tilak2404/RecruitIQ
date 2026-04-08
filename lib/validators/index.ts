import { z } from "zod";

const personaSchema = z.enum(["STARTUP", "BIG_TECH", "HR_RECRUITER", "HIRING_MANAGER"]);

export const recruiterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  company: z.string().min(2)
});

export const createCampaignSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  recruiterIds: z.array(z.string().min(1)).min(1),
  delayMs: z.coerce.number().int().min(0).max(120000).default(3500),
  batchSize: z.coerce.number().int().min(1).max(200).default(20),
  rotationSize: z.coerce.number().int().min(1).max(200).default(20),
  retryLimit: z.coerce.number().int().min(0).max(5).default(2),
  defaultSubject: z.string().min(4).max(140).optional().nullable()
});

export const generateEmailSchema = z.object({
  campaignId: z.string().min(1),
  recruiterId: z.string().optional(),
  regenerateAll: z.boolean().optional().default(false),
  persona: personaSchema.optional(),
  mode: z.enum(["STANDARD", "AB_TEST"]).optional().default("STANDARD")
});

export const updateEmailLogSchema = z.object({
  emailLogId: z.string().min(1),
  subject: z.string().min(3).max(160),
  body: z.string().min(20),
  status: z.enum(["DRAFT", "NOT_SENT", "SENT", "OPENED", "REPLIED", "FAILED"]).optional()
});

export const sendingAccountSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["GMAIL", "CUSTOM"]),
  fromName: z.string().optional().nullable(),
  email: z.string().email(),
  smtpHost: z.string().min(3),
  smtpPort: z.coerce.number().int().min(1).max(65535),
  smtpSecure: z.coerce.boolean().default(false),
  password: z.string().min(4),
  dailyLimit: z.coerce.number().int().min(1).max(5000).default(75),
  hourlyLimit: z.coerce.number().int().min(1).max(500).default(20),
  isActive: z.coerce.boolean().default(true)
});

export const sendCampaignSchema = z.object({
  campaignId: z.string().min(1),
  delayMs: z.coerce.number().int().min(0).max(120000).optional(),
  batchSize: z.coerce.number().int().min(1).max(500).optional(),
  rotationSize: z.coerce.number().int().min(1).max(200).optional(),
  retryLimit: z.coerce.number().int().min(0).max(5).optional(),
  scheduledOnly: z.boolean().optional()
});

export const assistantMessageSchema = z.object({
  content: z.string().min(2).max(4000)
});

export const atsAnalyzeSchema = z.object({
  resume: z.string().min(20).max(20000),
  jobDescription: z.string().min(20).max(20000),
  persona: personaSchema.optional().default("STARTUP")
});

export const atsUseSchema = z.object({
  analysisId: z.string().min(1)
});

export const emailScoreSchema = z.object({
  drafts: z
    .array(
      z.object({
        emailLogId: z.string().min(1).optional(),
        recruiterName: z.string().min(1),
        recruiterEmail: z.string().email().optional(),
        company: z.string().min(1),
        subject: z.string().min(3),
        body: z.string().min(20)
      })
    )
    .min(1)
    .max(100),
  persona: personaSchema.optional()
});

export const replyInsightsSchema = z.object({
  campaignId: z.string().optional(),
  draftIds: z.array(z.string().min(1)).optional(),
  persona: personaSchema.optional()
});

export const jobExtractSchema = z.object({
  url: z.string().url().max(2000)
});

export const portfolioGenerateSchema = z.object({
  resume: z.string().min(20).max(20000).optional(),
  persona: personaSchema.optional()
});

export const resumeUpdateSchema = z.object({
  candidateName: z.string().min(1).max(200),
  extractedText: z.string().min(20).max(20000)
});

export const jobOsSettingsSchema = z.object({
  persona: personaSchema
});

export const companyResearchSchema = z.object({
  company: z.string().min(2).max(200),
  jobDescription: z.string().max(20000).optional()
});

export const analyzeReplySchema = z.object({
  content: z.string().min(10).max(12000),
  emailLogId: z.string().optional(),
  recruiterId: z.string().optional()
});

export const scheduleEmailSchema = z.object({
  campaignId: z.string().min(1),
  scheduledAt: z.coerce.date(),
  emailLogIds: z.array(z.string().min(1)).optional()
});

export const followUpSchema = z.object({
  campaignId: z.string().optional(),
  emailLogId: z.string().optional()
});

