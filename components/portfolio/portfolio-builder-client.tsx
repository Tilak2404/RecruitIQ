"use client";

import { BriefcaseBusiness, Copy, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/http";
import type { JobTargetPersona, PortfolioGenerationResult } from "@/types/app";

export function PortfolioBuilderClient({
  persona,
  hasResume
}: {
  persona: JobTargetPersona;
  hasResume: boolean;
}) {
  const [portfolio, setPortfolio] = useState<PortfolioGenerationResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function copyToClipboard(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}.`);
    }
  }

  async function handleGeneratePortfolio() {
    if (!hasResume) {
      toast.error("Upload a resume before generating portfolio copy.");
      return;
    }

    setLoading(true);

    try {
      const result = await apiFetch<{ portfolio: PortfolioGenerationResult }>("/api/portfolio-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona })
      });
      setPortfolio(result.portfolio);
      toast.success("Portfolio copy generated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate portfolio copy.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        badge="Portfolio Builder"
        title="Turn resume experience into portfolio-ready positioning."
        description="Generate a homepage headline, stronger summaries, project descriptions, GitHub about copy, and clean portfolio sections from the current primary resume."
        actions={
          <Button onClick={() => void handleGeneratePortfolio()} disabled={loading}>
            <Sparkles className="h-4 w-4" />
            {loading ? "Generating..." : "Generate Copy"}
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Builder Context</CardTitle>
          <CardDescription>The output is currently tuned for the selected workspace persona.</CardDescription>
        </CardHeader>
        <CardContent className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-white/65">
          Persona: {persona.replace(/_/g, " ")}. {hasResume ? "A primary resume is loaded and ready for generation." : "Upload a resume first to unlock this page."}
        </CardContent>
      </Card>

      {portfolio ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BriefcaseBusiness className="h-5 w-5 text-primary" />
                  Headline
                </CardTitle>
                <CardDescription>A concise first impression for your portfolio landing page.</CardDescription>
              </div>
              <Button variant="secondary" size="sm" onClick={() => void copyToClipboard(portfolio.headline, "Headline")}>
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </CardHeader>
            <CardContent className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-white/75">
              {portfolio.headline}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Summary</CardTitle>
                <CardDescription>A higher-level intro block you can reuse across multiple surfaces.</CardDescription>
              </div>
              <Button variant="secondary" size="sm" onClick={() => void copyToClipboard(portfolio.summary, "Summary")}>
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </CardHeader>
            <CardContent className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-white/75">
              {portfolio.summary}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>GitHub About</CardTitle>
                <CardDescription>Short profile copy for GitHub or README intros.</CardDescription>
              </div>
              <Button variant="secondary" size="sm" onClick={() => void copyToClipboard(portfolio.githubAbout, "GitHub about")}>
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </CardHeader>
            <CardContent className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-white/75">
              {portfolio.githubAbout}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Portfolio Sections</CardTitle>
              <CardDescription>Suggested structure for the page itself.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {portfolio.portfolioSections.map((item) => (
                <div key={item} className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-white/65">
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Project Descriptions</CardTitle>
              <CardDescription>Use these as starting points for project cards or case-study sections.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {portfolio.projectDescriptions.map((item) => (
                <div key={item} className="rounded-[22px] border border-primary/15 bg-primary/10 px-4 py-3 text-sm leading-7 text-white/75">
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
