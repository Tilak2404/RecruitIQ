import { PortfolioBuilderClient } from "@/components/portfolio/portfolio-builder-client";
import { LimitedDataBanner } from "@/components/layout/limited-data-banner";
import { fallbackJobOsSettings, withPageDataFallback } from "@/lib/page-data";
import { prisma } from "@/lib/prisma";
import { getJobOsSettings } from "@/lib/services/job-os";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const portfolioFallback = {
    persona: fallbackJobOsSettings.persona,
    hasResume: false
  };

  const data = await withPageDataFallback(
    (async () => {
      const settings = await getJobOsSettings();
      const resume = await prisma.resume.findFirst({
        where: { isPrimary: true },
        select: { id: true }
      });

      return {
        persona: settings.persona,
        hasResume: Boolean(resume)
      };
    })().catch(() => portfolioFallback),
    portfolioFallback
  );

  const degraded = data === portfolioFallback;

  return (
    <div className="space-y-6">
      {degraded ? (
        <LimitedDataBanner description="Portfolio Builder loaded with fallback persona data because the workspace source resume is responding slowly. You can still open the page and retry generation once the data source settles." />
      ) : null}
      <PortfolioBuilderClient persona={data.persona} hasResume={data.hasResume} />
    </div>
  );
}
