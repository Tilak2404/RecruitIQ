import { AtsAnalyzerClient } from "@/components/ats/ats-analyzer-client";
import { LimitedDataBanner } from "@/components/layout/limited-data-banner";
import { fallbackJobOsSettings, withPageDataFallback } from "@/lib/page-data";
import { prisma } from "@/lib/prisma";
import { getJobOsSettings } from "@/lib/services/job-os";

export const dynamic = "force-dynamic";

export default async function AtsAnalyzerPage() {
  const fallbackMessage = "ATS Analyzer opened in manual mode because the current workspace context is responding slowly.";
  const atsFallback = {
    initialResumeText: "",
    candidateName: null,
    fileName: null,
    initialPersona: fallbackJobOsSettings.persona,
    loadError: fallbackMessage
  };

  const data = await withPageDataFallback(
    (async () => {
      const settings = await getJobOsSettings();
      const resume = await prisma.resume.findFirst({
        where: { isPrimary: true },
        orderBy: { createdAt: "desc" },
        select: {
          candidateName: true,
          fileName: true,
          extractedText: true
        }
      });

      return {
        initialResumeText: resume?.extractedText ?? "",
        candidateName: resume?.candidateName ?? null,
        fileName: resume?.fileName ?? null,
        initialPersona: settings.persona,
        loadError: null
      };
    })().catch((error) => ({
      ...atsFallback,
      loadError: error instanceof Error ? error.message : fallbackMessage
    })),
    atsFallback
  );

  const degraded = data.loadError !== null;

  return (
    <div className="space-y-6">
      {degraded ? (
        <LimitedDataBanner description="ATS Analyzer is available in manual mode right now. You can paste a resume and job description immediately, even if the saved workspace resume is still loading." />
      ) : null}
      <AtsAnalyzerClient
        initialResumeText={data.initialResumeText}
        candidateName={data.candidateName}
        fileName={data.fileName}
        initialPersona={data.initialPersona}
        loadError={data.loadError}
      />
    </div>
  );
}
