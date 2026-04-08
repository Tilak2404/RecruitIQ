import type { CampaignDetail, EmailQualityScore, JobTargetPersona, ReplyAnalysisSummary } from "@/types/app";

export interface EditableDraft {
  id: string;
  recruiterId: string;
  recruiterName: string;
  recruiterEmail: string;
  company: string;
  subject: string;
  body: string;
  status: CampaignDetail["emailLogs"][number]["status"];
  lastError: string | null;
  scheduledAt: Date | string | null;
  followUpStage: number;
  lastSentAt: Date | string | null;
}

export type StatusFilter = "ALL" | "PENDING" | "SENT" | "FAILED";
export type EmailScoreMap = Record<string, EmailQualityScore>;

export function mapDrafts(campaign: CampaignDetail | null): EditableDraft[] {
  if (!campaign) return [];

  return campaign.emailLogs.map((log) => ({
    id: log.id,
    recruiterId: log.recruiterId,
    recruiterName: log.recruiter.name,
    recruiterEmail: log.recruiter.email,
    company: log.recruiter.company,
    subject: log.subject,
    body: log.body,
    status: log.status,
    lastError: log.lastError,
    scheduledAt: log.scheduledAt,
    followUpStage: log.followUpStage,
    lastSentAt: log.lastSentAt
  }));
}

export function isSentStatus(status: EditableDraft["status"]) {
  return ["SENT", "OPENED", "REPLIED"].includes(status);
}

export function matchesStatusFilter(status: EditableDraft["status"], filter: StatusFilter) {
  if (filter === "PENDING") return status === "NOT_SENT";
  if (filter === "SENT") return isSentStatus(status);
  if (filter === "FAILED") return status === "FAILED";
  return true;
}

function toDateTimeLocalValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function getDefaultScheduleValue() {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(9, 0, 0, 0);
  return toDateTimeLocalValue(next);
}

export function getMessageActions(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [] as string[];

  const suggestedActions = (metadata as { suggestedActions?: unknown }).suggestedActions;

  return Array.isArray(suggestedActions)
    ? suggestedActions.filter((value): value is string => typeof value === "string")
    : [];
}

export function getSentimentTone(sentiment: ReplyAnalysisSummary["sentiment"]) {
  if (sentiment === "POSITIVE") return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300";
  if (sentiment === "NEGATIVE") return "border-red-400/25 bg-red-400/10 text-red-300";
  return "border-zinc-400/20 bg-zinc-400/10 text-zinc-200";
}

export function formatAssistantMessageTime(value: Date | string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function getEmailScoreTone(score: number) {
  if (score < 50) {
    return {
      badge: "Low reply probability",
      className: "border-red-400/20 bg-red-400/10 text-red-200"
    };
  }

  if (score <= 75) {
    return {
      badge: "Moderate reply probability",
      className: "border-yellow-400/20 bg-yellow-400/10 text-yellow-100"
    };
  }

  return {
    badge: "Strong reply probability",
    className: "border-primary/20 bg-primary/10 text-primary"
  };
}

export function formatResumeForEditor(text: string) {
  if (!text.trim()) {
    return "";
  }

  return text
    .replace(/\b(PROFESSIONAL SUMMARY|SUMMARY|EXPERIENCE|EDUCATION|PROJECTS|SKILLS|CERTIFICATIONS|ACHIEVEMENTS)\b/g, "\n\n$1")
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildResumeDiffPreview(resumeText: string, improvedLines: string[]) {
  const sourceLines = resumeText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 30)
    .slice(0, improvedLines.length);

  return improvedLines.map((line, index) => ({
    removed: sourceLines[index] ?? "Original line not available.",
    added: line
  }));
}

export function createEmailScorePayload(drafts: EditableDraft[], persona: JobTargetPersona) {
  return {
    persona,
    drafts: drafts.slice(0, 10).map((draft) => ({
      emailLogId: draft.id,
      recruiterName: draft.recruiterName,
      recruiterEmail: draft.recruiterEmail,
      company: draft.company,
      subject: draft.subject,
      body: draft.body
    }))
  };
}
