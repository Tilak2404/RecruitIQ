"use client";

import { BrainCircuit, Copy, RefreshCw, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { VoiceInputButton } from "@/components/shared/voice-input-button";
import { apiFetch } from "@/lib/http";
import { formatPercent, stripHtml } from "@/lib/utils";
import { getSentimentTone } from "@/lib/workspace-ui";
import type { JobTargetPersona } from "@/types/app";

interface AnalyticsSnapshot {
  responseRate: number;
  openRate: number;
  personalInsights: {
    averageReplyProbability: number;
  };
}

interface CampaignDetail {
  id: string;
  emailLogs: Array<{
    id: string;
    recruiterId: string;
    recruiter: { name: string; company: string };
  }>;
}

interface ReplyAnalysisSummary {
  id: string;
  sentiment: string;
  intent?: string;
  summary: string;
  suggestedReply: string;
  suggestedNextStep: string;
  recruiter?: { name: string; company: string };
}

interface ReplyInsightsSnapshot {
  summary: string;
  weakPatterns: string[];
  recommendations: string[];
}

export function InsightsClient({
  analytics,
  initialReplyInsights,
  initialRecentAnalyses,
  selectedCampaign,
  persona
}: {
  analytics: AnalyticsSnapshot;
  initialReplyInsights: ReplyInsightsSnapshot;
  initialRecentAnalyses: ReplyAnalysisSummary[];
  selectedCampaign: CampaignDetail | null;
  persona: JobTargetPersona;
}) {
  const [replyInsights, setReplyInsights] = useState(initialReplyInsights);
  const [recentAnalyses, setRecentAnalyses] = useState(initialRecentAnalyses);
  const [analysisResult, setAnalysisResult] = useState<ReplyAnalysisSummary | null>(initialRecentAnalyses[0] ?? null);
  const [selectedReplyLogId, setSelectedReplyLogId] = useState(selectedCampaign?.emailLogs[0]?.id ?? "");
  const [replyText, setReplyText] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const replyOptions = selectedCampaign?.emailLogs ?? [];
  const selectedReplyLog = replyOptions.find((log: any) => log.id === selectedReplyLogId) ?? replyOptions[0] ?? null;

  async function copyToClipboard(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}.`);
    }
  }

  async function refreshReplyInsights() {
    setRefreshing(true);

    try {
      const result = await apiFetch<{ insight: ReplyInsightsSnapshot }>("/api/reply-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: selectedCampaign?.id,
          persona
        })
      });
      setReplyInsights(result.insight);
      toast.success("Insights refreshed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not refresh insights.");
    } finally {
      setRefreshing(false);
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
        body: JSON.stringify({
          content: replyText,
          emailLogId: selectedReplyLog?.id,
          recruiterId: selectedReplyLog?.recruiterId
        })
      });
      setAnalysisResult(result);
      setRecentAnalyses((current) => [result, ...current.filter((analysis) => analysis.id !== result.id)].slice(0, 5));
      await refreshReplyInsights();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not analyze the reply.");
    } finally {
      setAnalysisLoading(false);
    }
  }

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        badge="Insights"
        title="Read reply patterns and tighten the next move."
        description="Analyze recruiter replies, track funnel signals, and turn weak-message patterns into concrete strategy adjustments."
        actions={
          <Button variant="secondary" onClick={() => void refreshReplyInsights()} disabled={refreshing}>
            <RefreshCw className="h-4 w-4" />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Response rate</CardDescription>
            <CardTitle className="text-3xl">{formatPercent(analytics.responseRate)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Open rate</CardDescription>
            <CardTitle className="text-3xl">{formatPercent(analytics.openRate)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Average reply probability</CardDescription>
            <CardTitle className="text-3xl">{Math.round(analytics.personalInsights.averageReplyProbability)}/100</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.56fr_0.44fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-primary" />
              Reply Analyzer
            </CardTitle>
            <CardDescription>Paste a recruiter reply, detect intent, and get a suggested response instantly.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <select
              value={selectedReplyLogId}
              onChange={(event) => setSelectedReplyLogId(event.target.value)}
              className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white outline-none transition focus:border-primary/40"
            >
              {replyOptions.length > 0 ? (
                replyOptions.map((log: any) => (
                  <option key={log.id} value={log.id} className="bg-[#111111] text-white">
                    {log.recruiter?.name || 'Unknown'} | {log.recruiter?.company || 'Unknown'}
                  </option>
                ))
              ) : (
                <option value="" className="bg-[#111111] text-white">No reply context available</option>
              )}
            </select>

            <div className="flex items-start gap-2">
              <Textarea
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                className="min-h-[200px]"
                placeholder="Paste the recruiter reply here..."
              />
              <VoiceInputButton
                className="h-11 w-11 rounded-full border border-white/10 bg-white/[0.04] text-white/70"
                disabled={analysisLoading}
                onTranscript={(value) => setReplyText((current) => current + (current ? " " : "") + value)}
              />
            </div>

            <Button className="w-full" onClick={() => void handleAnalyzeReply()} disabled={analysisLoading}>
              <BrainCircuit className="h-4 w-4" />
              {analysisLoading ? "Analyzing..." : "Analyze Reply"}
            </Button>

            {analysisResult ? (
              <div className="space-y-4 rounded-[24px] border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={getSentimentTone(analysisResult.sentiment)}>{analysisResult.sentiment}</Badge>
                  <Badge className="border-white/10 bg-white/5 text-white">
                    {analysisResult.intent?.replace(/_/g, " ") || "Unknown"}
                  </Badge>
                  {analysisResult.recruiter ? (
                    <Badge className="border-white/10 bg-white/5 text-white/75">
                      {analysisResult.recruiter.name} | {analysisResult.recruiter.company}
                    </Badge>
                  ) : null}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Summary</p>
                  <p className="mt-2 text-sm leading-7 text-white/65">{analysisResult.summary}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Suggested next step</p>
                  <p className="mt-2 text-sm leading-7 text-white/65">{analysisResult.suggestedNextStep || "No next step available"}</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-white">Suggested reply</p>
                    <Button variant="secondary" size="sm" onClick={() => void copyToClipboard(stripHtml(analysisResult.suggestedReply), "Suggested reply")}>
                      <Copy className="h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm leading-7 text-white/70">
                    {stripHtml(analysisResult.suggestedReply)}
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Strategy Suggestions
            </CardTitle>
            <CardDescription>AI-detected patterns across the current outreach mix.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/70">
              {replyInsights.summary}
            </div>
            {replyInsights.weakPatterns.map((item: string) => (
              <div key={item} className="rounded-2xl border border-red-400/15 bg-red-400/10 px-4 py-3 text-sm text-red-100/85">
                {item}
              </div>
            ))}
            {replyInsights.recommendations.map((item: string) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-7 text-white/65">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Recent Analyses</CardTitle>
          <CardDescription>Keep the latest reply reads visible as you refine your follow-up strategy.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {recentAnalyses.length > 0 ? (
            recentAnalyses.map((analysis: ReplyAnalysisSummary) => (
              <div key={analysis.id} className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={getSentimentTone(analysis.sentiment)}>{analysis.sentiment}</Badge>
                  <Badge className="border-white/10 bg-white/5 text-white">
                    {analysis.intent?.replace(/_/g, " ") || "Unknown"}
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-7 text-white/65">{analysis.summary}</p>
              </div>
            ))
          ) : (
            <p className="text-white/50">No reply analyses yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

