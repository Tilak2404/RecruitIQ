"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  BarChart3,
  BrainCircuit,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Copy,
  FileUp,
  FlaskConical,
  LineChart,
  MessageSquareText,
  Search,
  Send,
  Sparkles,
  Target,
  Trash2,
  Upload,
  UserPlus,
  WandSparkles,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { VoiceInputButton } from "@/components/shared/voice-input-button";
import { Textarea } from "@/components/ui/textarea";
import { statusTone } from "@/lib/constants";
import { apiFetch } from "@/lib/http";
import { cn, formatDateTime, formatPercent, stripHtml } from "@/lib/utils";
import type {
  CampaignDetail,
  CompanyResearchResult,
  DashboardSnapshot,
  EmailQualityScore,
  JobTargetPersona,
  PortfolioGenerationResult,
  ReplyAnalysisSummary
} from "@/types/app";

interface EditableDraft {
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

type StatusFilter = "ALL" | "PENDING" | "SENT" | "FAILED";
type AssistantMessage = DashboardSnapshot["assistantMessages"][number];
type AssistantResponsePayload = { reply: AssistantMessage; messages: AssistantMessage[] };
type EmailScoreMap = Record<string, EmailQualityScore>;

const cardMotion = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28 }
};

const assistantQuickPrompts = [
  "Write a LinkedIn DM for a Google recruiter",
  "How should I improve my outreach strategy this week?",
  "What follow-up plan should I use for non-responsive recruiters?"
];

function mapDrafts(campaign: CampaignDetail | null): EditableDraft[] {
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

function isSentStatus(status: EditableDraft["status"]) {
  return ["SENT", "OPENED", "REPLIED"].includes(status);
}

function matchesStatusFilter(status: EditableDraft["status"], filter: StatusFilter) {
  if (filter === "PENDING") return status === "NOT_SENT";
  if (filter === "SENT") return isSentStatus(status);
  if (filter === "FAILED") return status === "FAILED";
  return true;
}

function toDateTimeLocalValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function getDefaultScheduleValue() {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(9, 0, 0, 0);
  return toDateTimeLocalValue(next);
}

function getMessageActions(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [] as string[];
  const suggestedActions = (metadata as { suggestedActions?: unknown }).suggestedActions;
  return Array.isArray(suggestedActions)
    ? suggestedActions.filter((value): value is string => typeof value === "string")
    : [];
}

function getSentimentTone(sentiment: ReplyAnalysisSummary["sentiment"]) {
  if (sentiment === "POSITIVE") return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300";
  if (sentiment === "NEGATIVE") return "border-red-400/25 bg-red-400/10 text-red-300";
  return "border-zinc-400/20 bg-zinc-400/10 text-zinc-200";
}

function formatAssistantMessageTime(value: Date | string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function getEmailScoreTone(score: number) {
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

interface AssistantPanelProps {
  assistantLoading: boolean;
  assistantMessages: AssistantMessage[];
  assistantPrompt: string;
  chatScrollRef: RefObject<HTMLDivElement | null>;
  copiedMessageId: string | null;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onClose: () => void;
  onCopyMessage: (message: AssistantMessage) => Promise<void>;
  onPromptChange: (value: string) => void;
  onSubmit: (overridePrompt?: string) => Promise<void>;
}

function AssistantPanel({
  assistantLoading,
  assistantMessages,
  assistantPrompt,
  chatScrollRef,
  copiedMessageId,
  inputRef,
  onClose,
  onCopyMessage,
  onPromptChange,
  onSubmit
}: AssistantPanelProps) {
  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#0b0b0b]/98 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,255,159,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.05),transparent_32%),linear-gradient(180deg,rgba(15,15,15,0.98),rgba(11,11,11,0.98))]" />
      </div>

      <div className="relative flex items-start justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-6">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Live Copilot
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-white">AI Assistant</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-white/50">
            Memory-aware help for timing, messaging, LinkedIn outreach, and follow-ups.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-full border border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
          aria-label="Close assistant"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div ref={chatScrollRef} className="relative flex-1 min-h-0 overflow-y-auto px-5 py-5 sm:px-6">
        <div className="space-y-4 pb-2">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/40">Quick Start</p>
            <p className="mt-3 text-sm leading-7 text-white/70">
              Ask for recruiter strategy, a LinkedIn DM, reply guidance, or the best time to reach out.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {assistantQuickPrompts.map((prompt) => (
                <Button
                  key={prompt}
                  variant="secondary"
                  size="sm"
                  className="rounded-full border-white/10 bg-white/[0.06] px-4 text-white/80 hover:border-primary/25 hover:bg-primary/10 hover:text-white"
                  onClick={() => void onSubmit(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>

          {assistantMessages.length > 0 ? (
            assistantMessages.map((message) => {
              const isAssistant = message.role === "ASSISTANT";
              const actions = getMessageActions(message.metadata);
              const copied = copiedMessageId === message.id;

              return (
                <div key={message.id} className={cn("group flex", isAssistant ? "justify-start" : "justify-end")}>
                  <div
                    className={cn(
                      "max-w-[92%] rounded-[28px] border px-4 py-4 text-sm shadow-[0_18px_50px_rgba(0,0,0,0.24)] transition-transform duration-200 group-hover:-translate-y-0.5",
                      isAssistant
                        ? "border-primary/15 bg-[linear-gradient(145deg,rgba(0,255,159,0.12),rgba(255,255,255,0.03))] text-white shadow-[0_18px_50px_rgba(0,0,0,0.3),0_0_28px_rgba(0,255,159,0.08)]"
                        : "border-white/10 bg-white/[0.05] text-white/80"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">
                          {isAssistant ? "Assistant" : "You"}
                        </p>
                        <p className="mt-1 text-xs text-white/30">{formatAssistantMessageTime(message.createdAt)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-full px-3 text-white/55 hover:bg-white/5 hover:text-white"
                        onClick={() => void onCopyMessage(message)}
                      >
                        {copied ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                        {copied ? "Copied" : "Copy"}
                      </Button>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap leading-7 text-white/80">{message.content}</p>

                    {actions.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {actions.map((action) => (
                          <Button
                            key={action}
                            variant="secondary"
                            size="sm"
                            className="rounded-full border-white/10 bg-white/[0.06] px-4 text-white/80 hover:border-primary/25 hover:bg-primary/10 hover:text-white"
                            onClick={() => void onSubmit(action)}
                          >
                            {action}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-[28px] border border-dashed border-white/15 bg-black/20 px-5 py-6 text-sm leading-7 text-white/45">
              Your assistant keeps conversation memory, suggested next steps, and copyable replies in one focused overlay.
            </div>
          )}

          {assistantLoading ? (
            <div className="flex justify-start">
              <div className="max-w-[92%] rounded-[28px] border border-primary/15 bg-[linear-gradient(145deg,rgba(0,255,159,0.1),rgba(255,255,255,0.03))] px-4 py-4 shadow-[0_18px_50px_rgba(0,0,0,0.3),0_0_28px_rgba(0,255,159,0.08)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">Assistant</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="assistant-typing-dot h-2.5 w-2.5 rounded-full bg-primary" style={{ animationDelay: "0ms" }} />
                  <span className="assistant-typing-dot h-2.5 w-2.5 rounded-full bg-primary" style={{ animationDelay: "160ms" }} />
                  <span className="assistant-typing-dot h-2.5 w-2.5 rounded-full bg-primary" style={{ animationDelay: "320ms" }} />
                  <span className="ml-2 text-sm text-white/55">Thinking...</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="relative border-t border-white/10 bg-black/30 px-5 py-5 sm:px-6">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.24)]">
          <Textarea
            ref={inputRef}
            value={assistantPrompt}
            onChange={(event) => onPromptChange(event.target.value)}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                event.preventDefault();
                void onSubmit();
              }
            }}
            className="min-h-[120px] resize-none border-0 bg-transparent px-3 py-2 text-[15px] text-white shadow-none focus:border-transparent focus:ring-0"
            placeholder="Ask about reply strategy, follow-ups, best send times, or a LinkedIn message..."
          />
          <div className="mt-3 flex items-center justify-between gap-3 px-3 pb-1">
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">Ctrl + Enter to send</p>
            <div className="flex items-center gap-2">
              <VoiceInputButton
                className="h-11 w-11 rounded-full border border-white/10 bg-white/[0.04] text-white/70"
                disabled={assistantLoading}
                onTranscript={(value) => onPromptChange(`${assistantPrompt}${assistantPrompt ? " " : ""}${value}`)}
              />
              <Button className="h-11 rounded-full px-5 text-sm shadow-glow" disabled={assistantLoading} onClick={() => void onSubmit()}>
                <Send className="h-4 w-4" />
                {assistantLoading ? "Thinking..." : "Send"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardClient({ initialData }: { initialData: DashboardSnapshot }) {
  const router = useRouter();
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignDetail | null>(initialData.selectedCampaign);
  const [drafts, setDrafts] = useState<EditableDraft[]>(mapDrafts(initialData.selectedCampaign));
  const [persona, setPersona] = useState<JobTargetPersona>(initialData.jobOsSettings.persona);
  const [emailScores, setEmailScores] = useState<EmailScoreMap>({});
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>(initialData.assistantMessages);
  const [recentReplyAnalyses, setRecentReplyAnalyses] = useState<ReplyAnalysisSummary[]>(initialData.recentReplyAnalyses);
  const [replyInsights, setReplyInsights] = useState(initialData.replyInsights);
  const [activeAbTest, setActiveAbTest] = useState(initialData.activeAbTest);
  const [companyResearch, setCompanyResearch] = useState<CompanyResearchResult | null>(null);
  const [companyResearchInput, setCompanyResearchInput] = useState("");
  const [portfolio, setPortfolio] = useState<PortfolioGenerationResult | null>(null);
  const [manualRecruiter, setManualRecruiter] = useState({ name: "", email: "", company: "" });
  const [resumeUploading, setResumeUploading] = useState(false);
  const [manualRecruiterLoading, setManualRecruiterLoading] = useState(false);
  const [csvUploading, setCsvUploading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [abTestLoading, setAbTestLoading] = useState(false);
  const [applyAiLoading, setApplyAiLoading] = useState(false);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [replyInsightsLoading, setReplyInsightsLoading] = useState(false);
  const [companyResearchLoading, setCompanyResearchLoading] = useState(false);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [clearSentLoading, setClearSentLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [scheduleAt, setScheduleAt] = useState(getDefaultScheduleValue());
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [selectedReplyLogId, setSelectedReplyLogId] = useState(initialData.selectedCampaign?.emailLogs[0]?.id ?? "");
  const [analysisResult, setAnalysisResult] = useState<ReplyAnalysisSummary | null>(initialData.recentReplyAnalyses[0] ?? null);
  const [sendSummary, setSendSummary] = useState<{ sent: number; failed: number; processed: number } | null>(null);
  const [progressNote, setProgressNote] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const assistantFeedRef = useRef<HTMLDivElement>(null);
  const assistantInputRef = useRef<HTMLTextAreaElement>(null);
  const copyResetTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setSelectedCampaign(initialData.selectedCampaign);
    setDrafts(mapDrafts(initialData.selectedCampaign));
    setPersona(initialData.jobOsSettings.persona);
    setAssistantMessages(initialData.assistantMessages);
    setRecentReplyAnalyses(initialData.recentReplyAnalyses);
    setReplyInsights(initialData.replyInsights);
    setActiveAbTest(initialData.activeAbTest);
    setAnalysisResult((current) => current ?? initialData.recentReplyAnalyses[0] ?? null);
    setSelectedReplyLogId((current) => {
      const nextId = initialData.selectedCampaign?.emailLogs[0]?.id ?? "";
      if (!current) return nextId;
      const exists = initialData.selectedCampaign?.emailLogs.some((log) => log.id === current);
      return exists ? current : nextId;
    });
  }, [initialData]);

  useEffect(() => {
    if (!assistantOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setAssistantOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [assistantOpen]);

  useEffect(() => {
    function consumeQueuedPrompt() {
      const queuedPrompt = window.sessionStorage.getItem("job-os-command-prompt");
      if (!queuedPrompt) {
        return;
      }

      window.sessionStorage.removeItem("job-os-command-prompt");
      setAssistantOpen(true);
      setAssistantPrompt(queuedPrompt);
    }

    function handleAssistantPrompt(event: Event) {
      const detail = (event as CustomEvent<{ prompt?: string; openAssistant?: boolean }>).detail;
      if (!detail?.prompt) {
        return;
      }

      if (detail.openAssistant) {
        setAssistantOpen(true);
      }
      setAssistantPrompt(detail.prompt);
    }

    consumeQueuedPrompt();
    window.addEventListener("jobos:assistant-prompt", handleAssistantPrompt);
    return () => window.removeEventListener("jobos:assistant-prompt", handleAssistantPrompt);
  }, []);

  useEffect(() => {
    return () => {
      if (copyResetTimeoutRef.current) {
        window.clearTimeout(copyResetTimeoutRef.current);
      }
    };
  }, []);

  const latestAssistantMessageId = assistantMessages[assistantMessages.length - 1]?.id;

  useEffect(() => {
    if (!assistantOpen) return;

    const frame = window.requestAnimationFrame(() => {
      assistantInputRef.current?.focus();
      const container = assistantFeedRef.current;
      if (!container) return;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth"
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [assistantLoading, assistantOpen, latestAssistantMessageId]);

  const recruiters = initialData.recruiters;
  const hasActiveAccount = initialData.accounts.some((account) => account.isActive);
  const canGenerate = Boolean(initialData.resume && recruiters.length > 0 && selectedCampaign);
  const pendingDrafts = useMemo(() => drafts.filter((draft) => draft.status === "NOT_SENT"), [drafts]);
  const sendableDrafts = useMemo(
    () => drafts.filter((draft) => draft.status === "NOT_SENT" && (!draft.scheduledAt || new Date(draft.scheduledAt).getTime() <= Date.now())),
    [drafts]
  );
  const scheduledDrafts = useMemo(
    () => drafts.filter((draft) => draft.status === "NOT_SENT" && draft.scheduledAt && new Date(draft.scheduledAt).getTime() > Date.now()),
    [drafts]
  );
  const sentDrafts = useMemo(() => drafts.filter((draft) => isSentStatus(draft.status)), [drafts]);
  const failedDrafts = useMemo(() => drafts.filter((draft) => draft.status === "FAILED"), [drafts]);
  const clearableSentDrafts = useMemo(() => drafts.filter((draft) => draft.status === "SENT"), [drafts]);
  const visibleDrafts = useMemo(() => drafts.filter((draft) => matchesStatusFilter(draft.status, statusFilter)), [drafts, statusFilter]);
  const changedDrafts = useMemo(() => {
    const original = new Map(selectedCampaign?.emailLogs.map((log) => [log.id, { subject: log.subject, body: log.body }]) ?? []);
    return drafts.filter((draft) => {
      const existing = original.get(draft.id);
      return existing ? existing.subject !== draft.subject || existing.body !== draft.body : true;
    });
  }, [drafts, selectedCampaign]);

  const canSend = Boolean(selectedCampaign && hasActiveAccount && sendableDrafts.length > 0);
  const selectedReplyLog = drafts.find((draft) => draft.id === selectedReplyLogId) ?? drafts[0] ?? null;

  useEffect(() => {
    let cancelled = false;

    async function scoreDrafts() {
      if (drafts.length === 0) {
        setEmailScores({});
        return;
      }

      setScoreLoading(true);
      try {
        const result = await apiFetch<{
          scores: Array<{ emailLogId: string | null; score: EmailQualityScore }>;
        }>("/api/email-score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            persona,
            drafts: drafts.slice(0, 10).map((draft) => ({
              emailLogId: draft.id,
              recruiterName: draft.recruiterName,
              recruiterEmail: draft.recruiterEmail,
              company: draft.company,
              subject: draft.subject,
              body: draft.body
            }))
          })
        });

        if (cancelled) {
          return;
        }

        setEmailScores(
          result.scores.reduce<EmailScoreMap>((accumulator, item) => {
            if (item.emailLogId) {
              accumulator[item.emailLogId] = item.score;
            }
            return accumulator;
          }, {})
        );
      } catch {
        if (!cancelled) {
          setEmailScores({});
        }
      } finally {
        if (!cancelled) {
          setScoreLoading(false);
        }
      }
    }

    void scoreDrafts();

    return () => {
      cancelled = true;
    };
  }, [drafts, persona]);

  async function copyToClipboard(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
      return true;
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}.`);
      return false;
    }
  }

  async function handleAssistantMessageCopy(message: AssistantMessage) {
    const copied = await copyToClipboard(message.content, message.role === "ASSISTANT" ? "Assistant reply" : "Prompt");
    if (!copied) return;

    setCopiedMessageId(message.id);
    if (copyResetTimeoutRef.current) {
      window.clearTimeout(copyResetTimeoutRef.current);
    }
    copyResetTimeoutRef.current = window.setTimeout(() => setCopiedMessageId(null), 1800);
  }

  async function refreshWorkflow() {
    if (!selectedCampaign) {
      router.refresh();
      return;
    }
    const campaign = await apiFetch<CampaignDetail>(`/api/campaigns/${selectedCampaign.id}`);
    setSelectedCampaign(campaign);
    setDrafts(mapDrafts(campaign));
  }

  async function handlePersonaChange(nextPersona: JobTargetPersona) {
    setPersona(nextPersona);

    try {
      await apiFetch("/api/job-os/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona: nextPersona
        })
      });
      toast.success("Job OS persona updated.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save persona.");
    }
  }

  async function refreshReplyInsights() {
    setReplyInsightsLoading(true);
    try {
      const result = await apiFetch<{ insight: DashboardSnapshot["replyInsights"] }>("/api/reply-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: selectedCampaign?.id,
          persona
        })
      });
      setReplyInsights(result.insight);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not refresh reply insights.");
    } finally {
      setReplyInsightsLoading(false);
    }
  }

  async function handleCompanyResearch() {
    if (!companyResearchInput.trim()) {
      toast.error("Enter a company name first.");
      return;
    }

    setCompanyResearchLoading(true);
    try {
      const result = await apiFetch<CompanyResearchResult>("/api/company-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: companyResearchInput,
          jobDescription: initialData.activeAtsAnalysis?.jobDescription
        })
      });
      setCompanyResearch(result);
      toast.success("Company research ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not research that company.");
    } finally {
      setCompanyResearchLoading(false);
    }
  }

  async function handleGeneratePortfolio() {
    setPortfolioLoading(true);
    try {
      const result = await apiFetch<{ portfolio: PortfolioGenerationResult }>("/api/portfolio-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona
        })
      });
      setPortfolio(result.portfolio);
      toast.success("Portfolio copy generated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate portfolio copy.");
    } finally {
      setPortfolioLoading(false);
    }
  }

  async function handleResumeUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setResumeUploading(true);
    try {
      await apiFetch("/api/resume", { method: "POST", body: formData });
      toast.success("Resume uploaded.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Resume upload failed.");
    } finally {
      setResumeUploading(false);
      event.target.value = "";
    }
  }

  async function handleManualRecruiterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setManualRecruiterLoading(true);
    try {
      await apiFetch("/api/recruiters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manualRecruiter)
      });
      toast.success("Recruiter added.");
      setManualRecruiter({ name: "", email: "", company: "" });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add recruiter.");
    } finally {
      setManualRecruiterLoading(false);
    }
  }

  async function handleCsvUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setCsvUploading(true);
    try {
      const result = await apiFetch<{ imported: number }>("/api/recruiters/csv", { method: "POST", body: formData });
      toast.success(`Imported ${result.imported} recruiters.`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "CSV import failed.");
    } finally {
      setCsvUploading(false);
      event.target.value = "";
    }
  }

  async function handleGenerateEmails() {
    if (!selectedCampaign) {
      toast.error("No workflow is ready yet. Add at least one recruiter first.");
      return;
    }
    setGenerateLoading(true);
    setSendSummary(null);
    setProgressNote("Generating personalized outreach drafts...");
    try {
      await apiFetch("/api/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: selectedCampaign.id, regenerateAll: true, persona, mode: "STANDARD" })
      });
      await refreshWorkflow();
      router.refresh();
      toast.success("Emails generated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Email generation failed.");
    } finally {
      setGenerateLoading(false);
      setProgressNote(null);
    }
  }

  async function handleGenerateAbTest() {
    if (!selectedCampaign) {
      toast.error("No workflow is ready yet. Add at least one recruiter first.");
      return;
    }

    setAbTestLoading(true);
    setProgressNote("Generating A/B email variants and splitting recruiters...");
    try {
      await apiFetch("/api/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: selectedCampaign.id, regenerateAll: true, persona, mode: "AB_TEST" })
      });
      await refreshWorkflow();
      router.refresh();
      toast.success("A/B email test generated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate A/B test.");
    } finally {
      setAbTestLoading(false);
      setProgressNote(null);
    }
  }

  async function handleApplyWithAi() {
    if (!selectedCampaign) {
      toast.error("No workflow is ready yet.");
      return;
    }

    setApplyAiLoading(true);
    setProgressNote("Applying ATS intelligence and preparing outreach...");
    try {
      if (initialData.activeAtsAnalysis) {
        await apiFetch("/api/ats-analyze/use", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            analysisId: initialData.activeAtsAnalysis.id
          })
        });
      }

      await apiFetch("/api/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: selectedCampaign.id, regenerateAll: true, persona, mode: "STANDARD" })
      });
      await refreshWorkflow();
      router.refresh();
      toast.success("Apply with AI completed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Apply with AI failed.");
    } finally {
      setApplyAiLoading(false);
      setProgressNote(null);
    }
  }

  async function persistDraftChanges() {
    await Promise.all(
      changedDrafts.map((draft) =>
        apiFetch("/api/email-preview", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emailLogId: draft.id, subject: draft.subject, body: draft.body })
        })
      )
    );
  }

  async function handleSendAllEmails() {
    if (!selectedCampaign) {
      toast.error("No emails are ready to send yet.");
      return;
    }
    if (sendableDrafts.length === 0) {
      toast("No pending emails to send");
      return;
    }
    const confirmed = window.confirm(`Send ${sendableDrafts.length} pending email${sendableDrafts.length === 1 ? "" : "s"} now?`);
    if (!confirmed) return;
    setSendLoading(true);
    setProgressNote(`Sending ${sendableDrafts.length} pending emails...`);
    try {
      if (changedDrafts.length > 0) await persistDraftChanges();
      const summary = await apiFetch<{ sent: number; failed: number; processed: number }>("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: selectedCampaign.id })
      });
      setSendSummary(summary);
      await refreshWorkflow();
      router.refresh();
      toast.success(`Finished sending ${summary.processed} emails. ${summary.sent} sent, ${summary.failed} failed.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sending failed.");
    } finally {
      setSendLoading(false);
      setProgressNote(null);
    }
  }

  async function handleSchedulePending() {
    if (!selectedCampaign) {
      toast.error("No campaign is ready yet.");
      return;
    }
    if (pendingDrafts.length === 0) {
      toast("No pending emails to schedule");
      return;
    }
    const scheduledDate = new Date(scheduleAt);
    if (Number.isNaN(scheduledDate.getTime())) {
      toast.error("Choose a valid schedule time.");
      return;
    }
    const confirmed = window.confirm(`Schedule ${pendingDrafts.length} pending email${pendingDrafts.length === 1 ? "" : "s"} for ${formatDateTime(scheduledDate)}?`);
    if (!confirmed) return;
    setScheduleLoading(true);
    setProgressNote(`Scheduling ${pendingDrafts.length} pending emails...`);
    try {
      if (changedDrafts.length > 0) await persistDraftChanges();
      const result = await apiFetch<{ scheduled: number }>("/api/schedule-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: selectedCampaign.id, scheduledAt: scheduledDate.toISOString() })
      });
      await refreshWorkflow();
      router.refresh();
      toast.success(`Scheduled ${result.scheduled} emails.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Scheduling failed.");
    } finally {
      setScheduleLoading(false);
      setProgressNote(null);
    }
  }

  async function handleRunFollowUps() {
    setFollowUpLoading(true);
    setProgressNote("Checking for follow-ups and due scheduled emails...");
    try {
      const result = await apiFetch<{ queuedFollowUps: number; sent: number; failed: number }>("/api/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      await refreshWorkflow();
      router.refresh();
      if (result.queuedFollowUps === 0 && result.sent === 0 && result.failed === 0) {
        toast("No follow-ups are due right now");
      } else {
        toast.success(`Queued ${result.queuedFollowUps} follow-ups. Sent ${result.sent}. Failed ${result.failed}.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Follow-up run failed.");
    } finally {
      setFollowUpLoading(false);
      setProgressNote(null);
    }
  }

  async function handleClearSent() {
    if (!selectedCampaign) {
      toast.error("Nothing to clear yet.");
      return;
    }
    if (clearableSentDrafts.length === 0) {
      toast("No sent emails to clear");
      return;
    }
    const confirmed = window.confirm("Delete all emails with SENT status from this workflow?");
    if (!confirmed) return;
    setClearSentLoading(true);
    try {
      const result = await apiFetch<{ deleted: number }>(`/api/campaigns/${selectedCampaign.id}/sent`, { method: "DELETE" });
      setSendSummary(null);
      await refreshWorkflow();
      router.refresh();
      toast.success(`Cleared ${result.deleted} sent email${result.deleted === 1 ? "" : "s"}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not clear sent emails.");
    } finally {
      setClearSentLoading(false);
    }
  }

  async function handleAnalyzeReply() {
    if (!replyText.trim()) {
      toast.error("Paste a recruiter reply first.");
      return;
    }
    setAnalysisLoading(true);
    try {
      const result = await apiFetch<ReplyAnalysisSummary>("/api/analyze-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyText, emailLogId: selectedReplyLog?.id, recruiterId: selectedReplyLog?.recruiterId })
        });
        setAnalysisResult(result);
        setRecentReplyAnalyses((current) => [result, ...current.filter((analysis) => analysis.id !== result.id)].slice(0, 5));
        await refreshReplyInsights();
        await refreshWorkflow();
        router.refresh();
        toast.success("Reply analyzed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not analyze reply.");
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function handleAssistantSubmit(overridePrompt?: string) {
    const content = (overridePrompt ?? assistantPrompt).trim();
    if (!content) {
      toast.error("Ask the assistant something first.");
      return;
    }
    setAssistantLoading(true);
    try {
      const result = await apiFetch<AssistantResponsePayload>("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
      });
      setAssistantMessages(result.messages);
      setAssistantPrompt("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Assistant request failed.");
    } finally {
      setAssistantLoading(false);
    }
  }

  function updateDraft(draftId: string, field: "subject" | "body", value: string) {
    setDrafts((current) => current.map((draft) => (draft.id === draftId ? { ...draft, [field]: value } : draft)));
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="mx-auto max-w-6xl space-y-6 pb-8">
            <motion.section {...cardMotion} className="rounded-[30px] border border-white/10 bg-black/30 px-6 py-8 text-center backdrop-blur-xl sm:px-8">
        <p className="text-sm uppercase tracking-[0.3em] text-primary/75">AI Job Search OS</p>
        <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">Run your full job search with ATS intelligence, outreach scoring, and automation.</h2>
        <p className="mx-auto mt-3 max-w-3xl text-sm leading-7 text-white/55 sm:text-base">
          Optimize your resume, personalize recruiter emails, analyze replies, compare A/B variants, research companies, and ask your assistant for strategy in one connected workflow.
        </p>
      </motion.section>

      <motion.section {...cardMotion} className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-[28px]"><CardContent className="p-5"><p className="text-sm text-white/45">Total sent</p><p className="mt-3 text-3xl font-semibold text-white">{initialData.overview.totalSent}</p></CardContent></Card>
        <Card className="rounded-[28px]"><CardContent className="p-5"><p className="text-sm text-white/45">Replies</p><p className="mt-3 text-3xl font-semibold text-white">{initialData.overview.replies}</p></CardContent></Card>
        <Card className="rounded-[28px]"><CardContent className="p-5"><p className="text-sm text-white/45">Response rate</p><p className="mt-3 text-3xl font-semibold text-white">{formatPercent(initialData.overview.responseRate)}</p></CardContent></Card>
      </motion.section>

      <motion.section {...cardMotion} className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card className="rounded-[30px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><CalendarClock className="h-5 w-5 text-primary" />Best Time To Send</CardTitle>
            <CardDescription>Use data-backed timing before you send or schedule outreach.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-primary/20 bg-primary/10 text-primary">{initialData.timeSuggestion.recommendedDay}</Badge>
              <Badge className="border-white/10 bg-white/5 text-white">{initialData.timeSuggestion.recommendedWindow}</Badge>
              <Badge className="border-white/10 bg-white/5 text-white/70">{initialData.timeSuggestion.confidenceLabel}</Badge>
            </div>
            <p className="text-sm leading-7 text-white/65">{initialData.timeSuggestion.rationale}</p>
            <div className="flex flex-wrap gap-2 text-sm text-white/55">
              <span className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">Pending {initialData.overview.pending}</span>
              <span className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">Scheduled {initialData.overview.scheduled}</span>
              <span className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">Follow-ups due {initialData.overview.followUpsDue}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[30px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><Sparkles className="h-5 w-5 text-primary" />Live Workflow Status</CardTitle>
            <CardDescription>Keep the engine safe and track what will happen next.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-white/65">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3"><span>Ready to send now</span><span className="font-semibold text-white">{sendableDrafts.length}</span></div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3"><span>Scheduled for later</span><span className="font-semibold text-white">{scheduledDrafts.length}</span></div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3"><span>Failed / needs attention</span><span className="font-semibold text-white">{failedDrafts.length}</span></div>
            {progressNote ? <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-white">{progressNote}</div> : null}
          </CardContent>
        </Card>
      </motion.section>

      <motion.section {...cardMotion} className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-[30px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><Target className="h-5 w-5 text-primary" />Persona Optimization</CardTitle>
            <CardDescription>Guide resume analysis, email wording, and outreach style toward the audience that matters most.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <select
              value={persona}
              onChange={(event) => void handlePersonaChange(event.target.value as JobTargetPersona)}
              className="h-12 w-full rounded-[20px] border border-white/10 bg-white/5 px-4 text-sm font-medium text-white outline-none transition focus:border-primary/40"
            >
              <option value="STARTUP" className="bg-[#111111] text-white">Startup</option>
              <option value="BIG_TECH" className="bg-[#111111] text-white">Big Tech</option>
              <option value="HR_RECRUITER" className="bg-[#111111] text-white">HR Recruiter</option>
              <option value="HIRING_MANAGER" className="bg-[#111111] text-white">Hiring Manager</option>
            </select>
            <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-white/60">
              {persona === "STARTUP"
                ? "Startup mode sharpens ownership, speed, and impact-driven wording."
                : persona === "BIG_TECH"
                  ? "Big Tech mode sharpens systems thinking, reliability, and cross-functional execution."
                  : persona === "HR_RECRUITER"
                    ? "HR Recruiter mode sharpens readability, fit, and recruiter-friendly communication."
                    : "Hiring Manager mode sharpens technical judgment, execution depth, and strongest proof points."}
            </div>
            <div className="grid gap-3">
              <Button className="h-12 justify-between" disabled={!canGenerate || applyAiLoading} onClick={() => void handleApplyWithAi()}>
                <span className="flex items-center gap-2"><Sparkles className="h-4 w-4" />Apply with AI 🚀</span>
                <span>{applyAiLoading ? "Running..." : "Ready"}</span>
              </Button>
              <Button variant="secondary" className="h-12 justify-between" disabled={!canGenerate || abTestLoading} onClick={() => void handleGenerateAbTest()}>
                <span className="flex items-center gap-2"><FlaskConical className="h-4 w-4" />Generate A/B Test</span>
                <span>{abTestLoading ? "Building..." : "Split 50/50"}</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[30px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><LineChart className="h-5 w-5 text-primary" />Why You’re Not Getting Replies</CardTitle>
            <CardDescription>Pattern detection across your generated and sent outreach.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-white/70">
              {replyInsights.summary}
            </div>
            {replyInsights.weakPatterns.length > 0 ? (
              <div className="space-y-2">
                {replyInsights.weakPatterns.map((pattern) => (
                  <div key={pattern} className="rounded-2xl border border-red-400/15 bg-red-400/10 px-4 py-3 text-sm text-red-100/90">{pattern}</div>
                ))}
              </div>
            ) : null}
            <div className="space-y-2">
              {replyInsights.recommendations.map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">{item}</div>
              ))}
            </div>
            <Button variant="secondary" className="h-11 w-full" disabled={replyInsightsLoading} onClick={() => void refreshReplyInsights()}>
              <BarChart3 className="h-4 w-4" />
              {replyInsightsLoading ? "Refreshing..." : "Refresh Analyzer"}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-[30px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><Search className="h-5 w-5 text-primary" />Company Research Mode</CardTitle>
            <CardDescription>Get culture notes, recent signals, and outreach angles before you send.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter company"
                value={companyResearchInput}
                onChange={(event) => setCompanyResearchInput(event.target.value)}
              />
              <VoiceInputButton
                className="h-11 w-11 rounded-full border border-white/10 bg-white/[0.04] text-white/70"
                disabled={companyResearchLoading}
                onTranscript={(value) => setCompanyResearchInput((current) => `${current}${current ? " " : ""}${value}`)}
              />
            </div>
            <Button className="h-11 w-full" disabled={companyResearchLoading} onClick={() => void handleCompanyResearch()}>
              <Search className="h-4 w-4" />
              {companyResearchLoading ? "Researching..." : "Research Company"}
            </Button>
            {companyResearch ? (
              <div className="space-y-3 rounded-[24px] border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-semibold text-white">{companyResearch.company}</p>
                <div className="space-y-2">
                  {companyResearch.outreachAngles.slice(0, 2).map((angle) => (
                    <div key={angle} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">{angle}</div>
                  ))}
                </div>
                <p className="text-sm leading-7 text-white/60">{companyResearch.toneRecommendation}</p>
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-white/45">
                Research helps you mention the right themes instead of sending generic outreach.
              </div>
            )}
          </CardContent>
        </Card>
      </motion.section>

      <motion.div {...cardMotion}>
        <Card className="rounded-[30px]">
          <CardHeader>
            <CardTitle>1. Upload Resume</CardTitle>
            <CardDescription>Upload one PDF resume to power the assistant, email generation, and ATS analysis.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex cursor-pointer items-center justify-between rounded-[24px] border border-dashed border-white/15 bg-black/20 px-5 py-5 transition hover:border-primary/40 hover:bg-primary/5">
              <div className="text-left">
                <p className="text-base font-semibold text-white">Choose PDF resume</p>
                <p className="mt-1 text-sm text-white/45">Text extraction is automatic and used across the platform.</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Upload className="h-5 w-5" />
              </div>
              <input className="hidden" type="file" accept="application/pdf" onChange={handleResumeUpload} />
            </label>

            <div className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-4">
              <p className="text-sm text-white/45">Uploaded file</p>
              <div className="mt-2 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-white/70">
                    <FileUp className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{initialData.resume?.fileName ?? "No file uploaded yet"}</p>
                    <p className="mt-1 text-sm text-white/45">Candidate: {initialData.resume?.candidateName ?? "Not available"}</p>
                  </div>
                </div>
                {resumeUploading ? <Badge className="bg-primary/10 text-primary">Uploading...</Badge> : null}
              </div>
            </div>

            {initialData.activeAtsAnalysis ? (
              <div className="rounded-[24px] border border-primary/20 bg-primary/10 px-5 py-4 shadow-[0_18px_50px_rgba(0,255,159,0.08)]">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-primary/20 bg-primary/15 text-primary">ATS Context Active</Badge>
                  <Badge className="border-white/10 bg-black/20 text-white">Score {initialData.activeAtsAnalysis.atsScore}/100</Badge>
                </div>
                <p className="mt-3 text-sm leading-7 text-white/70">
                  Email generation and the assistant will now use this ATS analysis for stronger keyword alignment and
                  role-fit messaging.
                </p>
                {initialData.activeAtsAnalysis.missingKeywords.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {initialData.activeAtsAnalysis.missingKeywords.slice(0, 4).map((keyword) => (
                      <Badge key={keyword} className="border-white/10 bg-black/20 text-white/75">
                        Add {keyword}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-5 py-4 text-sm leading-7 text-white/50">
                Run the ATS Analyzer and choose <span className="font-semibold text-white">Use for Outreach</span> to align
                resume improvements, email drafts, and assistant suggestions around one target role.
              </div>
            )}

            <Button
              className="h-12 w-full justify-between rounded-[24px] border border-primary/20 bg-primary/10 text-white shadow-[0_18px_50px_rgba(0,255,159,0.14)] hover:bg-primary/15"
              onClick={() => router.push("/ats-analyzer")}
            >
              <span className="flex items-center gap-2">
                <BrainCircuit className="h-4 w-4" />
                🚀 ATS Analyzer
              </span>
              <span className="text-xs uppercase tracking-[0.22em] text-primary-foreground/75">Open</span>
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div {...cardMotion}><Card className="rounded-[30px]"><CardHeader><CardTitle>2. Add Recruiters</CardTitle><CardDescription>Add recruiters manually or import a CSV file.</CardDescription></CardHeader><CardContent className="space-y-5">
        <form className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]" onSubmit={handleManualRecruiterSubmit}>
          <Input placeholder="Name" value={manualRecruiter.name} onChange={(event) => setManualRecruiter((current) => ({ ...current, name: event.target.value }))} />
          <Input placeholder="Email" value={manualRecruiter.email} onChange={(event) => setManualRecruiter((current) => ({ ...current, email: event.target.value }))} />
          <Input placeholder="Company" value={manualRecruiter.company} onChange={(event) => setManualRecruiter((current) => ({ ...current, company: event.target.value }))} />
          <Button type="submit" className="md:min-w-[120px]" disabled={manualRecruiterLoading}><UserPlus className="h-4 w-4" />{manualRecruiterLoading ? "Adding..." : "Add"}</Button>
        </form>
        <label className="flex cursor-pointer items-center justify-between rounded-[24px] border border-dashed border-white/15 bg-black/20 px-5 py-4 transition hover:border-primary/40 hover:bg-primary/5"><div className="text-left"><p className="font-semibold text-white">Upload CSV</p><p className="mt-1 text-sm text-white/45">Format: name, email, company</p></div><span className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition"><Upload className="h-4 w-4" />{csvUploading ? "Importing..." : "Choose CSV"}</span><input className="hidden" type="file" accept=".csv,text/csv" onChange={handleCsvUpload} /></label>
        <div className="space-y-3 rounded-[24px] border border-white/10 bg-white/5 p-4"><div className="flex items-center justify-between gap-3"><p className="font-medium text-white">Recruiter list</p><Badge>{recruiters.length}</Badge></div>{recruiters.length > 0 ? <div className="space-y-3">{recruiters.map((recruiter) => (<div key={recruiter.id} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"><p className="font-medium text-white">{recruiter.name}</p><p className="mt-1 text-sm text-white/45">{recruiter.company}</p><p className="mt-1 text-sm text-white/55">{recruiter.email}</p></div>))}</div> : <p className="text-sm text-white/45">No recruiters added yet.</p>}</div>
      </CardContent></Card></motion.div>

      <motion.section {...cardMotion} className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-[30px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><FlaskConical className="h-5 w-5 text-primary" />A/B Email Testing</CardTitle>
            <CardDescription>Split recruiters across two email angles and compare which version gets more replies.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeAbTest ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-primary/20 bg-primary/10 text-primary">Persona {activeAbTest.persona.replace(/_/g, " ")}</Badge>
                  <Badge className="border-white/10 bg-white/5 text-white">
                    Winner {activeAbTest.winner === "TIE" ? "No clear winner yet" : `Variant ${activeAbTest.winner}`}
                  </Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {activeAbTest.variants.map((variant) => (
                    <div key={variant.label} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-white">Variant {variant.label}</p>
                        <Badge className={cn("border-white/10 bg-white/5 text-white", activeAbTest.winner === variant.label ? "border-primary/20 bg-primary/10 text-primary" : "")}>
                          {formatPercent(variant.responseRate)}
                        </Badge>
                      </div>
                      <p className="mt-3 text-sm font-medium text-white/80">{variant.subject}</p>
                      <p className="mt-2 text-sm leading-7 text-white/50">{stripHtml(variant.body).slice(0, 180)}...</p>
                      <div className="mt-4 flex items-center justify-between text-sm text-white/55">
                        <span>Assigned {variant.assignedCount}</span>
                        <span>Replies {variant.replyCount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-white/45">
                Generate an A/B test to compare two outreach styles and track which one wins on replies.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[30px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><BriefcaseBusiness className="h-5 w-5 text-primary" />Portfolio Builder</CardTitle>
            <CardDescription>Generate GitHub descriptions and portfolio-ready copy from the current resume.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="h-11 w-full" disabled={portfolioLoading} onClick={() => void handleGeneratePortfolio()}>
              <BriefcaseBusiness className="h-4 w-4" />
              {portfolioLoading ? "Generating..." : "Generate Portfolio Copy"}
            </Button>
            {portfolio ? (
              <div className="space-y-3 rounded-[24px] border border-white/10 bg-black/20 p-4">
                <p className="font-semibold text-white">{portfolio.headline}</p>
                <p className="text-sm leading-7 text-white/60">{portfolio.summary}</p>
                {portfolio.projectDescriptions.slice(0, 2).map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">{item}</div>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-white/45">
                Turn resume experience into portfolio summaries, GitHub profile copy, and project descriptions with one click.
              </div>
            )}
          </CardContent>
        </Card>
      </motion.section>

      <motion.div {...cardMotion}>
        <Card className="rounded-[30px]">
          <CardHeader>
            <CardTitle>3. Generate, Schedule &amp; Send</CardTitle>
            <CardDescription>Generate polished drafts, send them now, schedule them, or run follow-ups.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {initialData.activeAtsAnalysis ? (
              <div className="flex items-start gap-3 rounded-[24px] border border-primary/20 bg-primary/10 px-4 py-4 text-sm text-white/75">
                <BrainCircuit className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="font-semibold text-white">ATS-enhanced outreach is active</p>
                  <p className="mt-1 leading-7">
                    Generate Emails will now align drafts to the saved job description, emphasize the strongest matching
                    resume experience, and naturally prioritize missing keywords where they fit.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 lg:grid-cols-[1.3fr_1.3fr_1fr]">
              <Button className="h-12 text-base" disabled={!canGenerate || generateLoading} onClick={() => void handleGenerateEmails()}><WandSparkles className="h-4 w-4" />{generateLoading ? "Generating..." : "Generate Emails"}</Button>
              <Button className="h-12 text-base" disabled={!canSend || sendLoading} onClick={() => void handleSendAllEmails()}><Send className="h-4 w-4" />{sendLoading ? "Sending..." : "Send Now"}</Button>
              <Button variant="secondary" className="h-12 text-base" disabled={followUpLoading} onClick={() => void handleRunFollowUps()}><Sparkles className="h-4 w-4" />{followUpLoading ? "Running..." : "Run Follow-Ups"}</Button>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
              <Input type="datetime-local" value={scheduleAt} onChange={(event) => setScheduleAt(event.target.value)} />
              <Button variant="secondary" className="h-12 text-base" disabled={scheduleLoading} onClick={() => void handleSchedulePending()}><CalendarClock className="h-4 w-4" />{scheduleLoading ? "Scheduling..." : "Schedule Pending"}</Button>
              <Button variant="secondary" className="h-12 px-5 text-base" disabled={!selectedCampaign || clearSentLoading} onClick={() => void handleClearSent()}><Trash2 className="h-4 w-4" />{clearSentLoading ? "Clearing..." : "Clear Sent"}</Button>
            </div>

            <div className="flex flex-col gap-3 rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-zinc-400/20 bg-zinc-400/10 text-zinc-200">Pending {pendingDrafts.length}</Badge>
                <Badge className="border-white/10 bg-white/5 text-white">Scheduled {scheduledDrafts.length}</Badge>
                <Badge className="border-emerald-400/25 bg-emerald-400/10 text-emerald-300">Sent {sentDrafts.length}</Badge>
                <Badge className="border-red-400/25 bg-red-400/10 text-red-300">Failed {failedDrafts.length}</Badge>
              </div>
              <div className="flex items-center gap-3"><label htmlFor="status-filter" className="text-sm font-medium text-white/65">Filter</label><select id="status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white outline-none transition focus:border-primary/40"><option value="ALL" className="bg-[#111111] text-white">All</option><option value="PENDING" className="bg-[#111111] text-white">Pending</option><option value="SENT" className="bg-[#111111] text-white">Sent</option><option value="FAILED" className="bg-[#111111] text-white">Failed</option></select></div>
            </div>

            {!initialData.resume ? <div className="flex items-center gap-3 rounded-[24px] border border-yellow-400/20 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-100"><AlertCircle className="h-4 w-4" />Upload a resume before generating emails.</div> : null}
            {recruiters.length === 0 ? <div className="flex items-center gap-3 rounded-[24px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/60"><AlertCircle className="h-4 w-4" />Add at least one recruiter before generating emails.</div> : null}
            {!hasActiveAccount ? <div className="flex items-center gap-3 rounded-[24px] border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100"><AlertCircle className="h-4 w-4" />No active Gmail/SMTP account is configured, so sending and scheduling will fail until one is added in the backend.</div> : null}
            {scheduledDrafts.length > 0 ? <div className="flex items-center gap-3 rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70"><CalendarClock className="h-4 w-4 text-primary" />{scheduledDrafts.length} pending email{scheduledDrafts.length === 1 ? " is" : "s are"} scheduled for later and will be handled by the worker when due.</div> : null}
            {sendSummary ? <div className="flex items-center gap-3 rounded-[24px] border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-white"><CheckCircle2 className="h-4 w-4 text-primary" />Processed {sendSummary.processed} emails. Sent {sendSummary.sent}. Failed {sendSummary.failed}.</div> : null}

            <div className="space-y-4">
              {visibleDrafts.length > 0 ? visibleDrafts.map((draft) => {
                const isEditable = draft.status === "NOT_SENT" || draft.status === "FAILED";
                const scheduledFuture = draft.scheduledAt && new Date(draft.scheduledAt).getTime() > Date.now() ? formatDateTime(draft.scheduledAt) : null;
                const draftScore = emailScores[draft.id];
                const scoreTone = draftScore ? getEmailScoreTone(draftScore.score) : null;
                return (
                  <div key={draft.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-white">{draft.recruiterName}</p>
                        <p className="text-sm text-white/45">{draft.company} | {draft.recruiterEmail}</p>
                        {draft.lastSentAt ? <p className="mt-1 text-xs text-white/40">Last sent: {formatDateTime(draft.lastSentAt)}</p> : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={cn("capitalize", statusTone[draft.status].className)}>{statusTone[draft.status].label}</Badge>
                        {scheduledFuture ? <Badge className="border-white/10 bg-white/5 text-white">Scheduled {scheduledFuture}</Badge> : null}
                        {draft.followUpStage > 0 ? <Badge className="border-primary/20 bg-primary/10 text-primary">Follow-up {draft.followUpStage}</Badge> : null}
                        {draft.lastError ? <Badge className="border-red-400/20 bg-red-400/10 text-red-200">Needs attention</Badge> : null}
                      </div>
                      </div>

                      {draftScore && scoreTone ? (
                        <div className="mb-4 rounded-[22px] border border-white/10 bg-black/20 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-white">Reply Probability Score</p>
                              <p className="mt-1 text-sm text-white/45">{draftScore.recruiterPersonality.rationale}</p>
                            </div>
                            <div className="text-right">
                              <Badge className={scoreTone.className}>{scoreTone.badge}</Badge>
                              <p className="mt-2 text-2xl font-semibold text-white">{draftScore.score}/100</p>
                            </div>
                          </div>
                          <div className="mt-4 space-y-3">
                            <Progress value={draftScore.score} />
                            <div className="grid gap-2 md:grid-cols-2">
                              {draftScore.reasons.slice(0, 2).map((item) => (
                                <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/65">{item}</div>
                              ))}
                            </div>
                            {draftScore.suggestions.length > 0 ? (
                              <p className="text-sm leading-7 text-white/55">Improve next: {draftScore.suggestions[0]}</p>
                            ) : null}
                          </div>
                        </div>
                      ) : scoreLoading ? (
                        <div className="mb-4 rounded-[22px] border border-white/10 bg-black/20 px-4 py-4 text-sm text-white/45">
                          Scoring reply probability...
                        </div>
                      ) : null}

                      <div className="space-y-3">
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Input value={draft.subject} onChange={(event) => updateDraft(draft.id, "subject", event.target.value)} disabled={!isEditable} />
                        <Button variant="secondary" size="sm" onClick={() => void copyToClipboard(draft.subject, "Subject")}><Copy className="h-4 w-4" />Copy subject</Button>
                      </div>
                      <Textarea value={draft.body} onChange={(event) => updateDraft(draft.id, "body", event.target.value)} className="min-h-[180px]" disabled={!isEditable} />
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" onClick={() => void copyToClipboard(stripHtml(draft.body), "Email body")}><Copy className="h-4 w-4" />Copy email</Button>
                        {selectedReplyLogId !== draft.id ? <Button variant="ghost" size="sm" onClick={() => setSelectedReplyLogId(draft.id)}>Use in reply analyzer</Button> : null}
                      </div>
                      {draft.lastError ? <p className="text-sm text-red-300">{draft.lastError}</p> : null}
                    </div>
                  </div>
                );
              }) : drafts.length > 0 ? <div className="rounded-[24px] border border-dashed border-white/15 bg-black/20 px-5 py-8 text-center text-sm text-white/45">No emails match the current filter.</div> : <div className="rounded-[24px] border border-dashed border-white/15 bg-black/20 px-5 py-8 text-center text-sm text-white/45">Generated emails will appear here.</div>}
            </div>
          </CardContent>
        </Card>
      </motion.div>

            <motion.div {...cardMotion}>
              <Card className="rounded-[30px]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white"><MessageSquareText className="h-5 w-5 text-primary" />Analyze Recruiter Reply</CardTitle>
                  <CardDescription>Paste a reply, detect intent, and get a suggested response instantly.</CardDescription>
                </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <select value={selectedReplyLogId} onChange={(event) => setSelectedReplyLogId(event.target.value)} className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white outline-none transition focus:border-primary/40">
                        {drafts.map((draft) => (<option key={draft.id} value={draft.id} className="bg-[#111111] text-white">{draft.recruiterName} | {draft.company}</option>))}
                      </select>
                      <div className="flex items-start gap-2">
                        <Textarea value={replyText} onChange={(event) => setReplyText(event.target.value)} className="min-h-[160px]" placeholder="Paste the recruiter reply here..." />
                        <VoiceInputButton
                          className="h-11 w-11 rounded-full border border-white/10 bg-white/[0.04] text-white/70"
                          disabled={analysisLoading}
                          onTranscript={(value) => setReplyText((current) => `${current}${current ? " " : ""}${value}`)}
                        />
                      </div>
                      <Button className="h-12 w-full text-base" disabled={analysisLoading} onClick={() => void handleAnalyzeReply()}><BrainCircuit className="h-4 w-4" />{analysisLoading ? "Analyzing..." : "Analyze Reply"}</Button>
                    </div>

                  {analysisResult ? (
                    <div className="space-y-4 rounded-[24px] border border-white/10 bg-black/20 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={getSentimentTone(analysisResult.sentiment)}>{analysisResult.sentiment}</Badge>
                        <Badge className="border-white/10 bg-white/5 text-white">{analysisResult.intent.replace(/_/g, " ")}</Badge>
                        {analysisResult.recruiter ? <Badge className="border-white/10 bg-white/5 text-white/75">{analysisResult.recruiter.name} | {analysisResult.recruiter.company}</Badge> : null}
                      </div>
                      <div><p className="text-sm font-medium text-white">Summary</p><p className="mt-2 text-sm leading-7 text-white/65">{analysisResult.summary}</p></div>
                      <div><p className="text-sm font-medium text-white">Suggested next step</p><p className="mt-2 text-sm leading-7 text-white/65">{analysisResult.suggestedNextStep}</p></div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-white">Suggested reply</p><Button variant="secondary" size="sm" onClick={() => void copyToClipboard(stripHtml(analysisResult.suggestedReply), "Suggested reply")}><Copy className="h-4 w-4" />Copy</Button></div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm leading-7 text-white/70">{stripHtml(analysisResult.suggestedReply)}</div>
                      </div>
                    </div>
                  ) : null}

                  {recentReplyAnalyses.length > 0 ? <div className="space-y-3"><p className="text-sm font-medium text-white">Recent analyses</p>{recentReplyAnalyses.slice(0, 3).map((analysis) => (<div key={analysis.id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/65"><div className="flex flex-wrap items-center gap-2"><Badge className={getSentimentTone(analysis.sentiment)}>{analysis.sentiment}</Badge><Badge className="border-white/10 bg-white/5 text-white">{analysis.intent.replace(/_/g, " ")}</Badge></div><p className="mt-3 leading-7">{analysis.summary}</p></div>))}</div> : null}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {!assistantOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed bottom-6 right-6 z-40"
          >
            <button
              type="button"
              aria-label="Open assistant"
              className="group flex items-center gap-3 rounded-full border border-primary/20 bg-[#00ff9f] px-5 py-3 text-sm font-semibold text-black shadow-[0_18px_50px_rgba(0,255,159,0.24)] transition duration-200 hover:scale-[1.03] hover:shadow-[0_20px_60px_rgba(0,255,159,0.34)]"
              onClick={() => setAssistantOpen(true)}
            >
              <Sparkles className="h-4 w-4 transition duration-200 group-hover:rotate-6" />
              Ask Assistant
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {assistantOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
          >
            <button
              type="button"
              aria-label="Close assistant"
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setAssistantOpen(false)}
            />
            <motion.div
              initial={false}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="absolute inset-y-0 right-0 h-full w-full lg:w-[40vw]"
              aria-label="AI Assistant"
              aria-modal="true"
              role="dialog"
            >
              <div className="animate-slide-in h-full w-full bg-[#0f0f0f] shadow-[0_0_60px_rgba(0,0,0,0.52)] lg:border-l lg:border-neutral-800">
                <AssistantPanel
                  assistantLoading={assistantLoading}
                  assistantMessages={assistantMessages}
                  assistantPrompt={assistantPrompt}
                  chatScrollRef={assistantFeedRef}
                  copiedMessageId={copiedMessageId}
                  inputRef={assistantInputRef}
                  onClose={() => setAssistantOpen(false)}
                  onCopyMessage={handleAssistantMessageCopy}
                  onPromptChange={setAssistantPrompt}
                  onSubmit={handleAssistantSubmit}
                />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

