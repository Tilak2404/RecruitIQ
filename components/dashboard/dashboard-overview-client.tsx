"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, CircleAlert, FileText, ScanSearch, SendHorizontal, Sparkles } from "lucide-react";
import { AssistantDrawer } from "@/components/assistant/assistant-drawer";
import { formatDateTime, formatPercent } from "@/lib/utils";
import type { ApplyReadinessResult, AssistantMessageSummary, ImprovementLoopSnapshot, OutreachOverview, StoredAtsAnalysis } from "@/types/app";

const navigationCards = [
  {
    title: "Resume Lab",
    description: "Refine your resume and keep your core story sharp.",
    href: "/resume",
    icon: FileText
  },
  {
    title: "ATS Analyzer",
    description: "Check role fit and improve keyword alignment.",
    href: "/ats-analyzer",
    icon: ScanSearch
  },
  {
    title: "Outreach",
    description: "Generate drafts, review them, and send with focus.",
    href: "/outreach",
    icon: SendHorizontal
  },
  {
    title: "Insights",
    description: "Review trends and understand what is working.",
    href: "/insights",
    icon: BarChart3
  }
] as const;

function getGreetingLabel() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

function formatMetricValue(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function truncateActivity(content: string, maxLength = 110) {
  const normalized = content.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
}

export function DashboardOverviewClient({
  overview,
  assistantMessages,
  degraded,
  candidateName,
  activeAtsAnalysis,
  readiness,
  improvementLoop
}: {
  overview: OutreachOverview;
  assistantMessages: AssistantMessageSummary[];
  degraded: boolean;
  candidateName: string | null;
  activeAtsAnalysis: StoredAtsAnalysis | null;
  readiness: ApplyReadinessResult;
  improvementLoop: ImprovementLoopSnapshot;
}) {
  const displayName = candidateName?.trim() || "there";
  const recentActivity = [...assistantMessages].reverse().slice(0, 5);
  const readinessTone = readiness.ready
    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
    : "border-amber-300/20 bg-amber-300/10 text-amber-50";

  const metrics = [
    {
      label: "Emails Sent",
      value: formatMetricValue(overview.totalSent),
      note: "Total outreach delivered"
    },
    {
      label: "Replies",
      value: formatMetricValue(overview.replies),
      note: "Recruiter responses received"
    },
    {
      label: "Response Rate",
      value: formatPercent(overview.responseRate),
      note: "Replies divided by sent emails"
    },
    {
      label: "ATS Score",
      value: activeAtsAnalysis ? `${activeAtsAnalysis.atsScore}/100` : "Not scored",
      note: activeAtsAnalysis ? "From your latest active ATS analysis" : "Run an ATS analysis to see your score"
    }
  ];

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-6 pb-12">
        <section className="rounded-[28px] border border-white/10 bg-[#111315] px-6 py-7 sm:px-8">
          <p className="text-base font-medium text-white/72">
            {getGreetingLabel()}, {displayName}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Here&apos;s your job search overview
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/58 sm:text-base">
            A simple view of your outreach progress, readiness, and the next action that gives you the best chance of getting hired.
          </p>
          {degraded ? (
            <div className="mt-5 rounded-[20px] border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/58">
              Some data is loading from a fallback source right now, so a few numbers may be slightly behind.
            </div>
          ) : null}
          <div className={`mt-5 rounded-[22px] border px-4 py-4 ${readinessTone}`}>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-current/80">Apply readiness</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {readiness.ready ? "You are ready to apply" : "You are not ready yet"}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-white/70">{readiness.summary}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">Readiness score</p>
                <p className="mt-2 text-3xl font-semibold text-white">{readiness.score}/100</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <article key={metric.label} className="rounded-[24px] border border-white/10 bg-[#111315] px-5 py-5">
              <p className="text-sm font-medium text-white/55">{metric.label}</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{metric.value}</p>
              <p className="mt-2 text-sm leading-6 text-white/45">{metric.note}</p>
            </article>
          ))}
        </section>

        <section className="rounded-[28px] border border-white/10 bg-[#111315] px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-white/55">Primary action</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Work the next highest-leverage step</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/58">
                {readiness.blockers[0] ??
                  "Open the outreach workspace to generate personalized drafts, review them, and send them when you are ready."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-5 text-sm font-semibold text-white transition hover:bg-primary/15"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("jobos:assistant-prompt", {
                      detail: { prompt: "Improve my chances with the current setup.", openAssistant: true }
                    })
                  )
                }
              >
                <Sparkles className="h-4 w-4 text-primary" />
                Ask Assistant
              </button>
              <Link
                href="/outreach"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                Generate & Send Emails
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[28px] border border-white/10 bg-[#111315] px-6 py-6 sm:px-8">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-white/55">Improvement loop</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">Progress you can feel</h2>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-[22px] border border-white/10 bg-[#0d0f11] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-white/35">ATS</p>
                <p className="mt-2 text-lg font-semibold text-white">{improvementLoop.atsScoreLabel}</p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-[#0d0f11] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-white/35">Email quality</p>
                <p className="mt-2 text-lg font-semibold text-white">{improvementLoop.emailScoreLabel}</p>
              </div>
            </div>
            {improvementLoop.highlights.length > 0 ? (
              <div className="mt-4 space-y-2">
                {improvementLoop.highlights.map((item) => (
                  <p key={item} className="text-sm leading-7 text-white/58">
                    {item}
                  </p>
                ))}
              </div>
            ) : null}
          </article>

          <article className="rounded-[28px] border border-white/10 bg-[#111315] px-6 py-6 sm:px-8">
            <p className="text-sm font-medium text-white/55">Fix next</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Highest priority items</h2>
            <div className="mt-5 space-y-3">
              {(readiness.blockers.length > 0 ? readiness.blockers : readiness.improvements.slice(0, 3)).map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-[22px] border border-white/10 bg-[#0d0f11] px-4 py-4">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-sm leading-7 text-white/65">{item}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-4">
          {navigationCards.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-[24px] border border-white/10 bg-[#111315] px-5 py-5 transition hover:border-white/20 hover:bg-[#15181b]"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-white/72">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/50">{item.description}</p>
              </Link>
            );
          })}
        </section>

        <section className="rounded-[28px] border border-white/10 bg-[#111315] px-6 py-6 sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white/55">Recent activity</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Latest actions</h2>
            </div>
            <Link href="/insights" className="text-sm font-medium text-white/60 transition hover:text-white">
              View insights
            </Link>
          </div>

          {recentActivity.length > 0 ? (
            <div className="mt-6 divide-y divide-white/8 rounded-[22px] border border-white/10 bg-[#0d0f11]">
              {recentActivity.map((message) => (
                <article key={message.id} className="px-4 py-4 sm:px-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {message.role === "USER" ? "You updated the workflow" : "Assistant generated guidance"}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-white/58">{truncateActivity(message.content)}</p>
                    </div>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/35">
                      {formatDateTime(message.createdAt)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[22px] border border-dashed border-white/12 bg-[#0d0f11] px-4 py-6 text-sm leading-7 text-white/55">
              No recent activity yet. Start by generating your first batch of outreach emails.
            </div>
          )}
        </section>
      </div>

      <AssistantDrawer initialMessages={assistantMessages} />
    </>
  );
}
