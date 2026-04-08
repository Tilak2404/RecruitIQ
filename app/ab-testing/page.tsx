import { AbTestingClient } from "@/components/ab-testing/ab-testing-client";
import { LimitedDataBanner } from "@/components/layout/limited-data-banner";
import { fallbackJobOsSettings, withPageDataFallback } from "@/lib/page-data";
import { prisma } from "@/lib/prisma";
import { getCampaignAbTestSummary, getJobOsSettings } from "@/lib/services/job-os";
import { getCampaignDetail } from "@/lib/services/campaigns";

export const dynamic = "force-dynamic";

export default async function AbTestingPage({
  searchParams
}: {
  searchParams: Promise<{ campaign?: string }>;
}) {
  const { campaign } = await searchParams;
  const abTestingFallback = {
    initialAbTest: null,
    campaignId: null,
    persona: fallbackJobOsSettings.persona,
    hasResume: false,
    recruiterCount: 0
  };

  const data = await withPageDataFallback(
    (async () => {
      const settings = await getJobOsSettings();
      const selectedCampaign = campaign ? await getCampaignDetail(campaign) : null;
      const activeAbTest = await getCampaignAbTestSummary(campaign ?? selectedCampaign?.id);
      const resume = await prisma.resume.findFirst({
        where: { isPrimary: true },
        select: { id: true }
      });
      const recruiterCount = await prisma.recruiter.count();

      return {
        initialAbTest: activeAbTest,
        campaignId: selectedCampaign?.id ?? activeAbTest?.campaignId ?? null,
        persona: settings.persona,
        hasResume: Boolean(resume),
        recruiterCount
      };
    })().catch(() => abTestingFallback),
    abTestingFallback
  );

  const degraded = data === abTestingFallback;

  return (
    <div className="space-y-6">
      {degraded ? (
        <LimitedDataBanner description="A/B Testing loaded with fallback setup data because the live campaign workspace is responding slowly. You can still open the page and retry generation once the data source settles." />
      ) : null}
      <AbTestingClient
        initialAbTest={data.initialAbTest}
        campaignId={data.campaignId}
        persona={data.persona}
        hasResume={data.hasResume}
        recruiterCount={data.recruiterCount}
      />
    </div>
  );
}
