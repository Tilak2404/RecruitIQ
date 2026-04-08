import { z } from "zod";

export const analyzeReplySchema = z.object({
  content: z.string().min(1, "Reply content required"),
  emailLogId: z.string().optional(),
  recruiterId: z.string().optional()
});

export const replyInsightsSchema = z.object({
  campaignId: z.string().optional(),
  draftIds: z.array(z.string()).optional(),
  persona: z.enum(["STARTUP", "BIG_TECH", "HR_RECRUITER", "HIRING_MANAGER"]).optional()
});

