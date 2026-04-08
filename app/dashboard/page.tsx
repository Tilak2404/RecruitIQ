import { DashboardOverviewClient } from "@/components/dashboard/dashboard-overview-client";
import { prisma } from "@/lib/prisma";
import { fallbackOutreachOverview, withPageDataFallback } from "@/lib/page-data";
import { getAssistantMessages } from "@/lib/services/assistant";
import { getActiveAtsAnalysis } from "@/lib/services/ats";
import { getOutreachOverview } from "@/lib/services/strategy";
import type { AssistantMessageSummary } from "@/types/app";

export const dynamic = "force-dynamic";

const DASHBOARD_LOAD_TIMEOUT_MS = 12000;
const dashboardAssistantMessagesFallback: AssistantMessageSummary[] = [];

function DashboardUnavailableState({ message }: { message: string }) {
  return (
    <section className="mx-auto max-w-4xl rounded-[28px] border border-white/10 bg-[#111315] px-6 py-8 sm:px-8">
      <p className="text-sm font-medium text-white/55">Dashboard unavailable</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        The overview could not load right now.
      </h2>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-white/60 sm:text-base">
        The app is still running, but the workspace data source did not respond in time. Refresh the page after the
        database connection settles.
      </p>
      <div className="mt-6 rounded-[22px] border border-white/10 bg-white/[0.02] p-5">
        <p className="text-sm font-medium text-white">Latest error</p>
        <p className="mt-2 text-sm leading-7 text-white/60">{message}</p>
      </div>
      <a
        className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90"
        href="/dashboard"
      >
        Retry dashboard
      </a>
    </section>
  );
}

export default async function DashboardPage() {
  try {
    const [overview, assistantMessages, resume, activeAtsAnalysis] = await Promise.all([
      withPageDataFallback(
        getOutreachOverview().catch(() => fallbackOutreachOverview),
        fallbackOutreachOverview,
        DASHBOARD_LOAD_TIMEOUT_MS
      ),
      withPageDataFallback(
        getAssistantMessages(12).catch(() => dashboardAssistantMessagesFallback),
        dashboardAssistantMessagesFallback,
        DASHBOARD_LOAD_TIMEOUT_MS
      ),
      withPageDataFallback(
        prisma.resume
          .findFirst({
            where: { isPrimary: true },
            orderBy: { createdAt: "desc" },
            select: { candidateName: true }
          })
          .catch(() => null),
        null,
        DASHBOARD_LOAD_TIMEOUT_MS
      ),
      withPageDataFallback(getActiveAtsAnalysis().catch(() => null), null, DASHBOARD_LOAD_TIMEOUT_MS)
    ]);

    const degraded = overview === fallbackOutreachOverview || assistantMessages === dashboardAssistantMessagesFallback;

    return (
      <DashboardOverviewClient
        overview={overview}
        assistantMessages={assistantMessages}
        degraded={degraded}
        candidateName={resume?.candidateName ?? null}
        activeAtsAnalysis={activeAtsAnalysis}
      />
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown dashboard load error.";
    return <DashboardUnavailableState message={message} />;
  }
}
