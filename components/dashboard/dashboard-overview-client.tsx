"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, FileText, ScanSearch, SendHorizontal } from "lucide-react";
import { AssistantDrawer } from "@/components/assistant/assistant-drawer";
import { formatDateTime, formatPercent } from "@/lib/utils";
import type { AssistantMessageSummary, OutreachOverview, StoredAtsAnalysis } from "@/types/app";

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
  activeAtsAnalysis
}: {
  overview: OutreachOverview;
  assistantMessages: AssistantMessageSummary[];
  degraded: boolean;
  candidateName: string | null;
  activeAtsAnalysis: StoredAtsAnalysis | null;
}) {
  const displayName = candidateName?.trim() || "there";
  const recentActivity = [...assistantMessages].reverse().slice(0, 5);

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
            Here's your job search overview
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/58 sm:text-base">
            A simple view of your outreach progress, the next place to work, and the latest activity across the system.
          </p>
          {degraded ? (
            <div className="mt-5 rounded-[20px] border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/58">
              Some data is loading from a fallback source right now, so a few numbers may be slightly behind.
            </div>
          ) : null}
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
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Generate and send your next outreach batch</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/58">
                Open the outreach workspace to generate personalized drafts, review them, and send them when you are ready.
              </p>
            </div>
            <Link
              href="/outreach"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              Generate & Send Emails
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
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
