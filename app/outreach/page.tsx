import { OutreachClient } from "@/components/outreach/outreach-client";
import { LimitedDataBanner } from "@/components/layout/limited-data-banner";
import {
  fallbackJobOsSettings,
  fallbackOutreachOverview,
  fallbackSendTimeSuggestion,
  withPageDataFallback
} from "@/lib/page-data";
import { getOutreachWorkspaceSnapshot } from "@/lib/services/campaigns";

export const dynamic = "force-dynamic";

export default async function OutreachPage({
  searchParams
}: {
  searchParams: Promise<{ campaign?: string }>;
}) {
  const { campaign } = await searchParams;
  type OutreachPageData = Awaited<ReturnType<typeof getOutreachWorkspaceSnapshot>>;

  const outreachFallback: OutreachPageData = {
    resume: null,
    recruiters: [],
    accounts: [],
    overview: fallbackOutreachOverview,
    timeSuggestion: fallbackSendTimeSuggestion,
    jobOsSettings: fallbackJobOsSettings,
    activeAtsAnalysis: null,
    selectedCampaign: null
  };

  const data = await withPageDataFallback(
    getOutreachWorkspaceSnapshot(campaign).catch(() => outreachFallback),
    outreachFallback
  );

  const degraded = data === outreachFallback;

  return (
    <div className="space-y-6">
      {degraded ? (
        <LimitedDataBanner description="Outreach loaded with fallback data because the workspace queue is responding slowly. You can still navigate here immediately and retry to pull the latest recruiters and drafts." />
      ) : null}
      <OutreachClient
        initialRecruiters={data.recruiters}
        initialCampaign={data.selectedCampaign}
        initialResume={data.resume}
        initialTimeSuggestion={data.timeSuggestion}
        initialPersona={data.jobOsSettings.persona}
        hasActiveAccount={data.accounts.some((account) => account.isActive)}
        activeAtsAnalysis={data.activeAtsAnalysis}
      />
    </div>
  );
}
