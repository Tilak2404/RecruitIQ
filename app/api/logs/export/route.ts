import { prisma } from "@/lib/prisma";
import { exportCsv } from "@/lib/services/csv";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId");

    const logs = await prisma.emailLog.findMany({
      where: campaignId ? { campaignId } : undefined,
      include: {
        recruiter: true,
        campaign: true,
        sendingAccount: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const csv = exportCsv(
      logs.map((log) => ({
        campaign: log.campaign.name,
        recruiter: log.recruiter.name,
        company: log.recruiter.company,
        email: log.recruiter.email,
        subject: log.subject,
        status: log.status,
        sentAt: log.sentAt?.toISOString() ?? "",
        openedAt: log.openedAt?.toISOString() ?? "",
        repliedAt: log.repliedAt?.toISOString() ?? "",
        sendingAccount: log.sendingAccount?.email ?? "",
        lastError: log.lastError ?? ""
      }))
    );

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="outreach-logs-${campaignId ?? "all"}.csv"`
      }
    });
  } catch (error) {
    console.error("[LOG EXPORT]", error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
