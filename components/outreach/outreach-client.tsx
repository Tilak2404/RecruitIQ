"use client";

import { AlertCircle, CalendarClock, Copy, FlaskConical, Send, Sparkles, Trash2, Upload, UserPlus, WandSparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { statusTone } from "@/lib/constants";
import { apiFetch } from "@/lib/http";
import { cn, formatDateTime, stripHtml } from "@/lib/utils";
import {
  createEmailScorePayload,
  getDefaultScheduleValue,
  getEmailScoreTone,
  mapDrafts,
  matchesStatusFilter,
  type EditableDraft,
  type EmailScoreMap,
  type StatusFilter
} from "@/lib/workspace-ui";
import type { CampaignDetail, DashboardSnapshot, EmailQualityScore, JobTargetPersona, OutreachOverview, SendTimeSuggestion, StoredAtsAnalysis } from "@/types/app";

type Recruiters = DashboardSnapshot["recruiters"];
type ResumeRecord = DashboardSnapshot["resume"];

export function OutreachClient({
  initialRecruiters,
  initialCampaign,
  initialResume,
  initialOverview,
  initialTimeSuggestion,
  initialPersona,
  hasActiveAccount,
  activeAtsAnalysis
}: {
  initialRecruiters: Recruiters;
  initialCampaign: CampaignDetail | null;
  initialResume: ResumeRecord;
  initialOverview: OutreachOverview;
  initialTimeSuggestion: SendTimeSuggestion;
  initialPersona: JobTargetPersona;
  hasActiveAccount: boolean;
  activeAtsAnalysis: StoredAtsAnalysis | null;
}) {
  const router = useRouter();
  const [recruiters, setRecruiters] = useState(initialRecruiters);
  const [selectedCampaign, setSelectedCampaign] = useState(initialCampaign);
  const [drafts, setDrafts] = useState<EditableDraft[]>(mapDrafts(initialCampaign));
  const [emailScores, setEmailScores] = useState<EmailScoreMap>({});
  const [manualRecruiter, setManualRecruiter] = useState({ name: "", email: "", company: "" });
  const [manualRecruiterLoading, setManualRecruiterLoading] = useState(false);
  const [csvUploading, setCsvUploading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [clearSentLoading, setClearSentLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [scheduleAt, setScheduleAt] = useState(getDefaultScheduleValue());
  const [sendSummary, setSendSummary] = useState<{ sent: number; failed: number; processed: number } | null>(null);
  const [progressNote, setProgressNote] = useState<string | null>(null);

  useEffect(() => {
    setRecruiters(initialRecruiters);
  }, [initialRecruiters]);

  useEffect(() => {
    setSelectedCampaign(initialCampaign);
    setDrafts(mapDrafts(initialCampaign));
  }, [initialCampaign]);

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
          body: JSON.stringify(createEmailScorePayload(drafts, initialPersona))
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
  }, [drafts, initialPersona]);

  const pendingDrafts = drafts.filter((draft) => draft.status === "NOT_SENT");
  const sendableDrafts = drafts.filter(
    (draft) => draft.status === "NOT_SENT" && (!draft.scheduledAt || new Date(draft.scheduledAt).getTime() <= Date.now())
  );
  const scheduledDrafts = drafts.filter(
    (draft) => draft.status === "NOT_SENT" && draft.scheduledAt && new Date(draft.scheduledAt).getTime() > Date.now()
  );
  const sentDrafts = drafts.filter((draft) => ["SENT", "OPENED", "REPLIED"].includes(draft.status));
  const failedDrafts = drafts.filter((draft) => draft.status === "FAILED");
  const clearableSentDrafts = drafts.filter((draft) => draft.status === "SENT");
  const visibleDrafts = drafts.filter((draft) => matchesStatusFilter(draft.status, statusFilter));
  const changedDrafts = drafts.filter((draft) => {
    const original = selectedCampaign?.emailLogs.find((log) => log.id === draft.id);
    return original ? original.subject !== draft.subject || original.body !== draft.body : true;
  });

  async function copyToClipboard(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}.`);
    }
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
      const result = await apiFetch<{ imported: number }>("/api/recruiters/csv", {
        method: "POST",
        body: formData
      });
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
      toast.error("No outreach workflow is ready yet.");
      return;
    }

    setGenerateLoading(true);
    setSendSummary(null);
    setProgressNote("Generating personalized outreach drafts...");

    try {
      await apiFetch("/api/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: selectedCampaign.id,
          regenerateAll: true,
          persona: initialPersona,
          mode: "STANDARD"
        })
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

  async function persistDraftChanges() {
    await Promise.all(
      changedDrafts.map((draft) =>
        apiFetch("/api/email-preview", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emailLogId: draft.id,
            subject: draft.subject,
            body: draft.body
          })
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
      if (changedDrafts.length > 0) {
        await persistDraftChanges();
      }

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

    const confirmed = window.confirm(
      `Schedule ${pendingDrafts.length} pending email${pendingDrafts.length === 1 ? "" : "s"} for ${formatDateTime(scheduledDate)}?`
    );
    if (!confirmed) return;

    setScheduleLoading(true);
    setProgressNote(`Scheduling ${pendingDrafts.length} pending emails...`);

    try {
      if (changedDrafts.length > 0) {
        await persistDraftChanges();
      }

      const result = await apiFetch<{ scheduled: number }>("/api/schedule-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: selectedCampaign.id,
          scheduledAt: scheduledDate.toISOString()
        })
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

  function updateDraft(draftId: string, field: "subject" | "body", value: string) {
    setDrafts((current) => current.map((draft) => (draft.id === draftId ? { ...draft, [field]: value } : draft)));
  }

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        badge="Outreach"
        title="Manage recruiter lists, drafts, and send timing in one workflow."
        description="This page is focused on execution: add recruiters, generate or edit emails, then send immediately or schedule the queue for later."
        actions={
          <>
            <Button variant="secondary" onClick={() => router.push("/ab-testing")}>
              <FlaskConical className="h-4 w-4" />
              Open A/B Testing
            </Button>
            <Button onClick={() => void handleGenerateEmails()} disabled={generateLoading || !initialResume || recruiters.length === 0 || !selectedCampaign}>
              <WandSparkles className="h-4 w-4" />
              {generateLoading ? "Generating..." : "Generate Emails"}
            </Button>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Recruiters</CardDescription>
            <CardTitle className="text-3xl">{recruiters.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Pending drafts</CardDescription>
            <CardTitle className="text-3xl">{pendingDrafts.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Scheduled drafts</CardDescription>
            <CardTitle className="text-3xl">{scheduledDrafts.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Best send window</CardDescription>
            <CardTitle className="text-xl">{initialTimeSuggestion.recommendedDay}</CardTitle>
            <CardDescription>{initialTimeSuggestion.recommendedWindow}</CardDescription>
          </CardHeader>
        </Card>
      </section>

      {progressNote ? (
        <div className="rounded-[24px] border border-primary/20 bg-primary/10 px-4 py-4 text-sm text-white">
          <span className="font-semibold text-primary">In progress:</span> {progressNote}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.4fr_0.6fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recruiter List</CardTitle>
            <CardDescription>Add recruiters manually or import a CSV file with `name,email,company` columns.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form className="space-y-3" onSubmit={handleManualRecruiterSubmit}>
              <Input placeholder="Recruiter name" value={manualRecruiter.name} onChange={(event) => setManualRecruiter((current) => ({ ...current, name: event.target.value }))} />
              <Input placeholder="Recruiter email" value={manualRecruiter.email} onChange={(event) => setManualRecruiter((current) => ({ ...current, email: event.target.value }))} />
              <Input placeholder="Company" value={manualRecruiter.company} onChange={(event) => setManualRecruiter((current) => ({ ...current, company: event.target.value }))} />
              <Button type="submit" className="w-full" disabled={manualRecruiterLoading}>
                <UserPlus className="h-4 w-4" />
                {manualRecruiterLoading ? "Adding..." : "Add Recruiter"}
              </Button>
            </form>

            <label className="flex cursor-pointer items-center justify-between rounded-[24px] border border-dashed border-white/15 bg-black/20 px-5 py-4 transition hover:border-primary/40 hover:bg-primary/5">
              <div className="text-left">
                <p className="font-semibold text-white">Upload CSV</p>
                <p className="mt-1 text-sm text-white/45">Bulk import recruiter targets from a spreadsheet export.</p>
              </div>
              <span className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white">
                <Upload className="h-4 w-4" />
                {csvUploading ? "Importing..." : "Choose CSV"}
              </span>
              <input className="hidden" type="file" accept=".csv,text/csv" onChange={handleCsvUpload} />
            </label>

            <div className="space-y-3 rounded-[24px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-white">Current list</p>
                <Badge>{recruiters.length}</Badge>
              </div>
              {recruiters.length > 0 ? (
                recruiters.map((recruiter) => (
                  <div key={recruiter.id} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <p className="font-medium text-white">{recruiter.name}</p>
                    <p className="mt-1 text-sm text-white/45">{recruiter.company}</p>
                    <p className="mt-1 text-sm text-white/55">{recruiter.email}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/45">No recruiters added yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Queue Controls</CardTitle>
            <CardDescription>Generate, send, schedule, and maintain the outreach queue without leaving this page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {activeAtsAnalysis ? (
              <div className="flex items-start gap-3 rounded-[24px] border border-primary/20 bg-primary/10 px-4 py-4 text-sm text-white/75">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="font-semibold text-white">ATS-enhanced outreach is active</p>
                  <p className="mt-1 leading-7">
                    Draft generation will align emails to the current ATS-linked role and prioritize stronger keyword-backed positioning.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-white/45">Pending</p>
                <p className="mt-2 text-3xl font-semibold text-white">{pendingDrafts.length}</p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-white/45">Sent</p>
                <p className="mt-2 text-3xl font-semibold text-white">{sentDrafts.length}</p>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr]">
              <Button className="text-base" disabled={!selectedCampaign || !initialResume || recruiters.length === 0 || generateLoading} onClick={() => void handleGenerateEmails()}>
                <WandSparkles className="h-4 w-4" />
                {generateLoading ? "Generating..." : "Generate"}
              </Button>
              <Button className="text-base" disabled={!selectedCampaign || !hasActiveAccount || sendableDrafts.length === 0 || sendLoading} onClick={() => void handleSendAllEmails()}>
                <Send className="h-4 w-4" />
                {sendLoading ? "Sending..." : "Send Now"}
              </Button>
              <Button variant="secondary" className="text-base" disabled={followUpLoading} onClick={() => void handleRunFollowUps()}>
                <Sparkles className="h-4 w-4" />
                {followUpLoading ? "Running..." : "Run Follow-Ups"}
              </Button>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
              <Input type="datetime-local" value={scheduleAt} onChange={(event) => setScheduleAt(event.target.value)} />
              <Button variant="secondary" disabled={scheduleLoading} onClick={() => void handleSchedulePending()}>
                <CalendarClock className="h-4 w-4" />
                {scheduleLoading ? "Scheduling..." : "Schedule"}
              </Button>
              <Button variant="secondary" disabled={!selectedCampaign || clearSentLoading} onClick={() => void handleClearSent()}>
                <Trash2 className="h-4 w-4" />
                {clearSentLoading ? "Clearing..." : "Clear Sent"}
              </Button>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-white/60">
              {initialTimeSuggestion.rationale}
            </div>

            {!initialResume ? (
              <div className="flex items-center gap-3 rounded-[24px] border border-yellow-400/20 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-100">
                <AlertCircle className="h-4 w-4" />
                Upload a resume before generating emails.
              </div>
            ) : null}
            {recruiters.length === 0 ? (
              <div className="flex items-center gap-3 rounded-[24px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/60">
                <AlertCircle className="h-4 w-4" />
                Add at least one recruiter before generating emails.
              </div>
            ) : null}
            {!hasActiveAccount ? (
              <div className="flex items-center gap-3 rounded-[24px] border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
                <AlertCircle className="h-4 w-4" />
                No active Gmail or SMTP account is configured, so sending will fail until one is added in Settings.
              </div>
            ) : null}
            {sendSummary ? (
              <div className="flex items-center gap-3 rounded-[24px] border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-white">
                <Sparkles className="h-4 w-4 text-primary" />
                Processed {sendSummary.processed} emails. Sent {sendSummary.sent}. Failed {sendSummary.failed}.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Draft Workspace</CardTitle>
            <CardDescription>Edit generated drafts, review reply probability, and copy polished content before sending.</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <label htmlFor="status-filter" className="text-sm font-medium text-white/65">
              Filter
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white outline-none transition focus:border-primary/40"
            >
              <option value="ALL" className="bg-[#111111] text-white">All</option>
              <option value="PENDING" className="bg-[#111111] text-white">Pending</option>
              <option value="SENT" className="bg-[#111111] text-white">Sent</option>
              <option value="FAILED" className="bg-[#111111] text-white">Failed</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge className="border-zinc-400/20 bg-zinc-400/10 text-zinc-200">Pending {pendingDrafts.length}</Badge>
            <Badge className="border-white/10 bg-white/5 text-white">Scheduled {scheduledDrafts.length}</Badge>
            <Badge className="border-emerald-400/25 bg-emerald-400/10 text-emerald-300">Sent {sentDrafts.length}</Badge>
            <Badge className="border-red-400/25 bg-red-400/10 text-red-300">Failed {failedDrafts.length}</Badge>
          </div>

          {visibleDrafts.length > 0 ? (
            visibleDrafts.map((draft) => {
              const isEditable = draft.status === "NOT_SENT" || draft.status === "FAILED";
              const scheduledFuture =
                draft.scheduledAt && new Date(draft.scheduledAt).getTime() > Date.now() ? formatDateTime(draft.scheduledAt) : null;
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
                            <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/65">
                              {item}
                            </div>
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
                      <Button variant="secondary" size="sm" onClick={() => void copyToClipboard(draft.subject, "Subject")}>
                        <Copy className="h-4 w-4" />
                        Copy subject
                      </Button>
                    </div>
                    <Textarea value={draft.body} onChange={(event) => updateDraft(draft.id, "body", event.target.value)} className="min-h-[180px]" disabled={!isEditable} />
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" size="sm" onClick={() => void copyToClipboard(stripHtml(draft.body), "Email body")}>
                        <Copy className="h-4 w-4" />
                        Copy email
                      </Button>
                    </div>
                    {draft.lastError ? <p className="text-sm text-red-300">{draft.lastError}</p> : null}
                  </div>
                </div>
              );
            })
          ) : drafts.length > 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/15 bg-black/20 px-5 py-8 text-center text-sm text-white/45">
              No emails match the current filter.
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-white/15 bg-black/20 px-5 py-8 text-center text-sm text-white/45">
              Generated emails will appear here.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
