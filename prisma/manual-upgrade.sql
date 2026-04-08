DO $$ BEGIN
  CREATE TYPE "ReplySentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReplyIntent" AS ENUM ('INTERVIEW_REQUEST', 'NEED_MORE_INFO', 'REJECTION', 'GENERAL_REPLY', 'UNKNOWN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AssistantRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3);
ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "lastSentAt" TIMESTAMP(3);
ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "lastFollowUpAt" TIMESTAMP(3);
ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "followUpStage" INTEGER NOT NULL DEFAULT 0;

UPDATE "EmailLog"
SET "lastSentAt" = "sentAt"
WHERE "sentAt" IS NOT NULL AND "lastSentAt" IS NULL;

CREATE TABLE IF NOT EXISTS "AssistantConversation" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL DEFAULT 'Job Outreach Copilot',
  "isPrimary" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssistantConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AssistantMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "role" "AssistantRole" NOT NULL,
  "content" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssistantMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AssistantMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AssistantConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ReplyAnalysis" (
  "id" TEXT NOT NULL,
  "recruiterId" TEXT,
  "emailLogId" TEXT,
  "content" TEXT NOT NULL,
  "sentiment" "ReplySentiment" NOT NULL,
  "intent" "ReplyIntent" NOT NULL,
  "summary" TEXT NOT NULL,
  "suggestedReply" TEXT NOT NULL,
  "suggestedNextStep" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReplyAnalysis_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReplyAnalysis_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "Recruiter"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ReplyAnalysis_emailLogId_fkey" FOREIGN KEY ("emailLogId") REFERENCES "EmailLog"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "EmailLog_scheduledAt_status_idx" ON "EmailLog"("scheduledAt", "status");
CREATE INDEX IF NOT EXISTS "EmailLog_followUpStage_lastSentAt_idx" ON "EmailLog"("followUpStage", "lastSentAt");
CREATE INDEX IF NOT EXISTS "AssistantConversation_isPrimary_idx" ON "AssistantConversation"("isPrimary");
CREATE INDEX IF NOT EXISTS "AssistantMessage_conversationId_createdAt_idx" ON "AssistantMessage"("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "ReplyAnalysis_recruiterId_createdAt_idx" ON "ReplyAnalysis"("recruiterId", "createdAt");
CREATE INDEX IF NOT EXISTS "ReplyAnalysis_emailLogId_createdAt_idx" ON "ReplyAnalysis"("emailLogId", "createdAt");

