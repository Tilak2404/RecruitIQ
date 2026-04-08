"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Download, RefreshCcw, Send, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { statusTone } from "@/lib/constants";
import { apiFetch } from "@/lib/http";
import { formatDateTime } from "@/lib/utils";
import type { CampaignDetail, CampaignListItem } from "@/types/app";

export function CampaignsClient({
  campaigns,
  initialCampaign
}: {
  campaigns: CampaignListItem[];
  initialCampaign: CampaignDetail | null;
}) {
  const router = useRouter();
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignDetail | null>(initialCampaign);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSelectedCampaign(initialCampaign);
  }, [initialCampaign]);

  const filteredLogs = useMemo(() => {
    if (!selectedCampaign) {
      return [];
    }

    return selectedCampaign.emailLogs.filter((log) => (filterStatus === "ALL" ? true : log.status === filterStatus));
  }, [filterStatus, selectedCampaign]);

  async function loadCampaign(id: string) {
    const campaign = await apiFetch<CampaignDetail>(`/api/campaigns/${id}`);
    setSelectedCampaign(campaign);
  }

  async function regenerateAll() {
    if (!selectedCampaign) {
      return;
    }

    setLoading(true);

    try {
      await apiFetch("/api/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: selectedCampaign.id, regenerateAll: true })
      });

      toast.success("Campaign drafts regenerated.");
      await loadCampaign(selectedCampaign.id);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not regenerate campaign drafts.");
    } finally {
      setLoading(false);
    }
  }

  async function sendCampaign() {
    if (!selectedCampaign) {
      return;
    }

    setLoading(true);
    const interval = window.setInterval(() => {
      void loadCampaign(selectedCampaign.id);
    }, 2500);

    try {
      const result = await apiFetch<{ sent: number; failed: number }>("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: selectedCampaign.id })
      });

      toast.success(`Send run finished. ${result.sent} sent, ${result.failed} failed.`);
      await loadCampaign(selectedCampaign.id);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send campaign.");
    } finally {
      window.clearInterval(interval);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="rounded-[32px] border border-white/10 bg-black/30 p-8 backdrop-blur-xl">
        <Badge className="border-primary/20 bg-primary/10 text-primary">Campaign Command Center</Badge>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">Campaign execution with AI drafts, progress tracking, and ATS visibility.</h1>
            <p className="mt-3 max-w-2xl text-white/60">Review campaign health, relaunch draft generation, and watch send progress update as the engine rotates across available sending accounts.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {campaigns.slice(0, 3).map((campaign) => (
              <div key={campaign.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-white/45">{campaign.name}</p>
                <p className="mt-3 text-2xl font-semibold text-white">{campaign.sentCount}</p>
                <p className="text-sm text-white/50">sent records</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[0.42fr_0.58fr]">
        <Card>
          <CardHeader>
            <CardTitle>All campaigns</CardTitle>
            <CardDescription>Pick a campaign to inspect its draft pipeline, send state, and recruiter-level records.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {campaigns.map((campaign) => (
              <button
                key={campaign.id}
                type="button"
                onClick={() => void loadCampaign(campaign.id)}
                className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${selectedCampaign?.id === campaign.id ? "border-primary/30 bg-primary/10" : "border-white/10 bg-white/5 hover:border-white/20"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{campaign.name}</p>
                    <p className="text-sm text-white/45">{campaign.description || "No description provided"}</p>
                  </div>
                  <Badge>{campaign.sendState}</Badge>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-white/55 sm:grid-cols-2">
                  <p>Drafts: {campaign.draftCount}</p>
                  <p>Replies: {campaign.replyCount}</p>
                  <p>Failed: {campaign.failedCount}</p>
                  <p>Created: {formatDateTime(campaign.createdAt)}</p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>{selectedCampaign?.name ?? "No campaign selected"}</CardTitle>
                <CardDescription>{selectedCampaign?.description || "Select a campaign to inspect its outreach flow."}</CardDescription>
              </div>
              {selectedCampaign ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => void regenerateAll()} disabled={loading}>
                    <RefreshCcw className="h-4 w-4" />
                    Regenerate all
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => window.open(`/api/logs/export?campaignId=${selectedCampaign.id}`, "_blank")}>
                    <Download className="h-4 w-4" />
                    Export logs
                  </Button>
                  <Button size="sm" onClick={() => void sendCampaign()} disabled={loading}>
                    <Send className="h-4 w-4" />
                    {loading ? "Running..." : "Send now"}
                  </Button>
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {selectedCampaign ? (
              <>
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between text-sm text-white/55">
                    <span>Progress</span>
                    <span>{selectedCampaign.sendProgress}%</span>
                  </div>
                  <Progress className="mt-3" value={selectedCampaign.sendProgress} />
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-sm text-white/45">Draft count</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{selectedCampaign.emailLogs.filter((log) => ["DRAFT", "NOT_SENT"].includes(log.status)).length}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-sm text-white/45">Sent count</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{selectedCampaign.emailLogs.filter((log) => ["SENT", "OPENED", "REPLIED"].includes(log.status)).length}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-sm text-white/45">Failed</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{selectedCampaign.emailLogs.filter((log) => log.status === "FAILED").length}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm text-white/55">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Drafts are editable on the main dashboard page.
                  </div>
                  <select className="h-10 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
                    <option value="ALL">All statuses</option>
                    <option value="NOT_SENT">Pending</option>
                    <option value="SENT">Sent</option>
                    <option value="OPENED">Opened</option>
                    <option value="REPLIED">Replied</option>
                    <option value="FAILED">Failed</option>
                  </select>
                </div>

                <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/20">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Recruiter</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Last activity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              <p className="font-medium text-white">{log.recruiter.name}</p>
                              <p className="text-xs text-white/45">{log.recruiter.company}</p>
                            </TableCell>
                            <TableCell>
                              <Badge className={statusTone[log.status].className}>{statusTone[log.status].label}</Badge>
                            </TableCell>
                            <TableCell className="max-w-[280px] truncate">{log.subject}</TableCell>
                            <TableCell>{formatDateTime(log.repliedAt ?? log.openedAt ?? log.sentAt ?? log.updatedAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-white/55">Create a campaign from the dashboard to start sending recruiter outreach.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
