import { CompanyResearchClient } from "@/components/company/company-research-client";
// Removed: import { LimitedDataBanner } from "@/components/layout/limited-data-banner";
// Removed: import { withPageDataFallback } from "@/lib/page-data";
// Removed: import { getActiveAtsAnalysis } from "@/lib/services/ats";

export const dynamic = "force-dynamic";

export default async function CompanyPage() {
  // Removed: const companyFallback = { jobDescription: null };
  // Removed: const data = await withPageDataFallback(...);
  // Removed: const degraded = data === companyFallback;

  return (
    <div className="space-y-6">
      {/* Removed: degraded ? (<LimitedDataBanner ... />) : null */}
      <CompanyResearchClient /> {/* Removed jobDescription prop */}
    </div>
  );
}
