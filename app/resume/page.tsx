import { ResumeLabClient } from "@/components/resume/resume-lab-client";
import { LimitedDataBanner } from "@/components/layout/limited-data-banner";
import { withPageDataFallback } from "@/lib/page-data";
import { prisma } from "@/lib/prisma";
import { getActiveAtsAnalysis } from "@/lib/services/ats";
import type { DashboardSnapshot, StoredAtsAnalysis } from "@/types/app";

export const dynamic = "force-dynamic";

export default async function ResumePage() {
  const resumeFallback = {
    resume: null,
    activeAtsAnalysis: null
  } satisfies {
    resume: DashboardSnapshot["resume"];
    activeAtsAnalysis: StoredAtsAnalysis | null;
  };

  const data = await withPageDataFallback(
    (async () => {
      const resume = await prisma.resume.findFirst({
        where: { isPrimary: true },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          candidateName: true,
          fileName: true,
          extractedText: true,
          createdAt: true
        }
      });
      const activeAtsAnalysis = await getActiveAtsAnalysis();

      return {
        resume,
        activeAtsAnalysis
      };
    })().catch(() => resumeFallback),
    resumeFallback
  );

  const degraded = data === resumeFallback;

  return (
    <div className="space-y-6">
      {degraded ? (
        <LimitedDataBanner description="Resume Lab opened without live workspace context. You can still upload, edit, and save, then retry if you need the ATS-linked diff." />
      ) : null}
      <ResumeLabClient initialResume={data.resume} activeAtsAnalysis={data.activeAtsAnalysis} />
    </div>
  );
}
