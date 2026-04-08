import { SettingsClient } from "@/components/settings/settings-client";
import { LimitedDataBanner } from "@/components/layout/limited-data-banner";
import { fallbackJobOsSettings, withPageDataFallback } from "@/lib/page-data";
import { prisma } from "@/lib/prisma";
import { getJobOsSettings } from "@/lib/services/job-os";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settingsFallback = {
    accounts: [],
    initialPersona: fallbackJobOsSettings.persona
  };

  const data = await withPageDataFallback(
    (async () => {
      const settings = await getJobOsSettings();
      const accounts = await prisma.sendingAccount.findMany({
        orderBy: {
          createdAt: "desc"
        },
        select: {
          id: true,
          name: true,
          type: true,
          fromName: true,
          email: true,
          smtpHost: true,
          smtpPort: true,
          smtpSecure: true,
          dailyLimit: true,
          hourlyLimit: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return {
        accounts,
        initialPersona: settings.persona
      };
    })().catch(() => settingsFallback),
    settingsFallback
  );

  const degraded = data === settingsFallback;

  return (
    <div className="space-y-6">
      {degraded ? (
        <LimitedDataBanner description="Settings loaded with fallback data because the live account and persona records are responding slowly. You can still open the page and retry once the database connection settles." />
      ) : null}
      <SettingsClient accounts={data.accounts} initialPersona={data.initialPersona} />
    </div>
  );
}
