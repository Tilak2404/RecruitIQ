import { InsightsClient } from "@/components/insights/insights-client";
import { LimitedDataBanner } from "@/components/layout/limited-data-banner";
import { fallbackAnalyticsSnapshot, fallbackJobOsSettings, fallbackReplyInsights, withPageDataFallback } from "@/lib/page-data";
import { getAnalyticsSnapshot } from "@/lib/services/analytics";
import { getCampaignDetail } from "@/lib/services/campaigns";
import { getJobOsSettings } from "@/lib/services/job-os";
import { getRecentReplyAnalyses } from "@/lib/services/replies";
import type { ReplyAnalysisSummary } from "@/types/app";

export const dynamic = "force-dynamic";

export default async function InsightsPage({
  searchParams
}: {
  searchParams: Promise<{ campaign?: string }>;
}) {
  const { campaign } = await searchParams;
  const insightsFallback = {
    analytics: fallbackAnalyticsSnapshot,
    initialReplyInsights: fallbackReplyInsights,
    initialRecentAnalyses: [] as ReplyAnalysisSummary[],
    selectedCampaign: null,
    persona: fallbackJobOsSettings.persona
  };

  const data = await withPageDataFallback(
    (async () => {
      const analytics = await getAnalyticsSnapshot();
      const initialRecentAnalyses = await getRecentReplyAnalyses(5);
      const selectedCampaign = campaign ? await getCampaignDetail(campaign) : null;
      const settings = await getJobOsSettings();

      return {
        analytics,
        initialReplyInsights: analytics.replyInsights,
        initialRecentAnalyses,
        selectedCampaign,
        persona: settings.persona
      };
    })().catch(() => insightsFallback),
    insightsFallback
  );

  const degraded = data === insightsFallback;

  return (
    <div className="space-y-6">
      {degraded ? (
        <LimitedDataBanner description="Insights opened with fallback analytics because the live reply dataset is responding slowly. You can still analyze a reply manually and refresh once the database catches up." />
      ) : null}
      <InsightsClient
        analytics={data.analytics}
        initialReplyInsights={data.initialReplyInsights}
        initialRecentAnalyses={data.initialRecentAnalyses}
        selectedCampaign={data.selectedCampaign}
        persona={data.persona}
      />
    </div>
  );
}
