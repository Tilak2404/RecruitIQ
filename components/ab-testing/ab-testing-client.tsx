"use client";

import { FlaskConical, LineChart, RefreshCw, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { apiFetch } from "@/lib/http";
import { formatPercent } from "@/lib/utils";
import type { AbTestSummary, JobTargetPersona } from "@/types/app";

export function AbTestingClient({
  initialAbTest,
  campaignId,
  persona,
  hasResume,
  recruiterCount
}: {
  initialAbTest: AbTestSummary | null;
  campaignId: string | null;
  persona: JobTargetPersona;
  hasResume: boolean;
  recruiterCount: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleGenerateAbTest() {
    if (!campaignId) {
      toast.error("No outreach campaign is ready yet.");
      return;
    }

    if (!hasResume) {
      toast.error("Upload a resume before generating an A/B test.");
      return;
    }

    if (recruiterCount === 0) {
      toast.error("Add recruiters before generating an A/B test.");
      return;
    }

    setLoading(true);

    try {
      await apiFetch("/api/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          regenerateAll: true,
          persona,
          mode: "AB_TEST"
        })
      });
      toast.success("A/B test generated.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate an A/B test.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        badge="A/B Testing"
        title="Compare two outreach angles before you scale."
        description="Generate a paired experiment, split recruiters across both variants, and use reply-rate data to decide which subject line and body style deserve more volume."
        actions={
          <Button onClick={() => void handleGenerateAbTest()} disabled={loading}>
            <FlaskConical className="h-4 w-4" />
            {loading ? "Generating..." : "Generate Test"}
          </Button>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Persona</CardDescription>
            <CardTitle>{persona.replace(/_/g, " ")}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Recruiters available</CardDescription>
            <CardTitle>{recruiterCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Campaign status</CardDescription>
            <CardTitle>{initialAbTest ? "Active test" : "Ready to generate"}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5 text-primary" />
            Variant Comparison
          </CardTitle>
          <CardDescription>Compare the subject, body style, assigned volume, and live response rate for each branch.</CardDescription>
        </CardHeader>
        <CardContent>
          {initialAbTest ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {initialAbTest.variants.map((variant) => (
                <div key={variant.label} className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-white/45">Variant {variant.label}</p>
                      <p className="mt-2 text-lg font-semibold text-white">{variant.subject}</p>
                    </div>
                    <Badge className={initialAbTest.winner === variant.label ? "border-primary/20 bg-primary/10 text-primary" : "border-white/10 bg-white/5 text-white"}>
                      {formatPercent(variant.responseRate)}
                    </Badge>
                  </div>
                  <div className="mt-4 rounded-[20px] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-7 text-white/65">
                    {variant.body}
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[18px] border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/35">Assigned</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{variant.assignedCount}</p>
                    </div>
                    <div className="rounded-[18px] border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/35">Replies</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{variant.replyCount}</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm text-white/55">
                      <span>Response rate</span>
                      <span>{formatPercent(variant.responseRate)}</span>
                    </div>
                    <Progress value={variant.responseRate} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-5 py-10 text-center">
              <p className="text-base font-semibold text-white">No A/B experiment has been generated yet.</p>
              <p className="mt-3 text-sm leading-7 text-white/55">
                Create one when your recruiter list and resume are ready, then use Insights to review downstream response patterns.
              </p>
              <div className="mt-5 flex justify-center gap-3">
                <Button onClick={() => void handleGenerateAbTest()} disabled={loading}>
                  <FlaskConical className="h-4 w-4" />
                  {loading ? "Generating..." : "Generate Test"}
                </Button>
                <Button variant="secondary" onClick={() => router.push("/outreach")}>
                  <Send className="h-4 w-4" />
                  Open Outreach
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {initialAbTest ? (
        <Card>
          <CardHeader>
            <CardTitle>Next Move</CardTitle>
            <CardDescription>Use the winning direction carefully. Early reply-rate swings can be noisy on small samples.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => router.refresh()}>
              <RefreshCw className="h-4 w-4" />
              Refresh Results
            </Button>
            <Button variant="secondary" onClick={() => router.push("/insights")}>
              <LineChart className="h-4 w-4" />
              Open Insights
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
