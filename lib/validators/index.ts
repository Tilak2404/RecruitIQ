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

export const atsAnalyzeSchema = z
  .object({
    resume: z.string().min(1).optional(),
    resumeText: z.string().min(1).optional(),
    jobDescription: z.string().min(1),
    persona: z.enum(["STARTUP", "BIG_TECH", "HR_RECRUITER", "HIRING_MANAGER"]).optional()
  })
  .refine((value) => Boolean(value.resume || value.resumeText), {
    message: "Resume text is required",
    path: ["resumeText"]
  });

export const createCampaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  recruiters: z.array(
    z.object({
      name: z.string().min(1),
      email: z.string().email(),
      company: z.string().min(1)
    })
  ).min(1),
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
  useForOutreach: z.boolean().optional()
});

export const updateEmailLogSchema = z
  .object({
    id: z.string().optional(),
    emailLogId: z.string().optional(),
    subject: z.string().optional(),
    body: z.string().optional(),
    status: z.enum(["DRAFT", "NOT_SENT", "SENT", "OPENED", "REPLIED", "FAILED"]).optional()
  })
  .refine((value) => Boolean(value.id || value.emailLogId), {
    message: "Email log id is required",
    path: ["emailLogId"]
  });

export const emailScoreSchema = z.object({
  persona: z.enum(["STARTUP", "BIG_TECH", "HR_RECRUITER", "HIRING_MANAGER"]).optional(),
  drafts: z.array(
    z.object({
      emailLogId: z.string().optional(),
      recruiterName: z.string().min(1),
      recruiterEmail: z.string().email().optional(),
      company: z.string().min(1),
      subject: z.string().min(1),
      body: z.string().min(1)
    })
  ).min(1)
});

export const followUpSchema = z.object({
  campaignId: z.string().optional(),
  emailLogId: z.string().optional()
});

export const generateEmailSchema = z.object({
  campaignId: z.string().min(1),
  recruiterId: z.string().optional(),
  persona: z.enum(["STARTUP", "BIG_TECH", "HR_RECRUITER", "HIRING_MANAGER"]).optional(),
  mode: z.enum(["STANDARD", "AB_TEST"]).optional(),
  regenerateAll: z.boolean().optional()
});

export const jobExtractSchema = z.object({
  url: z.string().url()
});

export const jobOsSettingsSchema = z.object({
  persona: z.enum(["STARTUP", "BIG_TECH", "HR_RECRUITER", "HIRING_MANAGER"])
});

export const portfolioGenerateSchema = z.object({
  persona: z.enum(["STARTUP", "BIG_TECH", "HR_RECRUITER", "HIRING_MANAGER"]).optional(),
  focusArea: z.string().optional(),
  resume: z.string().optional()
});

export const recruiterSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  company: z.string().min(1)
});

export const scheduleEmailSchema = z.object({
  campaignId: z.string().min(1),
  emailLogIds: z.array(z.string()).min(1).optional(),
  scheduledAt: z.string().datetime()
});

export const sendCampaignSchema = z.object({
  campaignId: z.string(),
  batchSize: z.number().int().optional()
});
