"use client";

import { Building2, Search, Brain, Users, Lightbulb, Tag } from "lucide-react"; // Added new icons
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/http";
interface CompanyResearchResult {
  overview: string;
  culture: string;
  hiring_focus: string;
  keywords: string[];
  outreach_angle: string;
}
import { Badge } from "@/components/ui/badge"; // Assuming a Badge component exists for tags

export function CompanyResearchClient() { // jobDescription prop removed
  const [company, setCompany] = useState("");
  const [result, setResult] = useState<CompanyResearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleResearch() {
    if (!company.trim()) {
      toast.error("Enter a company name first.");
      return;
    }

    setLoading(true);

    try {
      const research = await apiFetch<CompanyResearchResult>("/api/company-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          // jobDescription removed
        })
      });
      setResult(research);
      toast.success("Company research ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not research that company.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        badge="Company Research"
        title="Get sharper context before you send a message."
        description="Pull culture notes, recent signals, outreach angles, and tone guidance so your first email sounds informed instead of generic."
      />

      <Card>
        <CardHeader>
          <CardTitle>Research Input</CardTitle>
          <CardDescription>Enter a company name to get structured insights.</CardDescription> {/* Updated description */}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row">
<Input id="company-name" name="company" placeholder="Enter company name" value={company} onChange={(event) => setCompany(event.target.value)} />
            <Button onClick={() => void handleResearch()} disabled={loading}>
              <Search className="h-4 w-4" />
              {loading ? "Researching..." : "Research Company"}
            </Button>
          </div>
          {/* Removed jobDescription context div */}
        </CardContent>
      </Card>

      {result ? (
        <div className="grid gap-6 xl:grid-cols-2">
          {/* Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Overview
              </CardTitle>
              <CardDescription>A concise summary of the company.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-white/65">
                {result.overview}
              </div>
            </CardContent>
          </Card>

          {/* Culture Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Culture
              </CardTitle>
              <CardDescription>Insights into the company's work environment and values.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-white/65">
                {result.culture}
              </div>
            </CardContent>
          </Card>

          {/* Hiring Focus Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Hiring Focus
              </CardTitle>
              <CardDescription>What the company typically looks for in candidates.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-white/65">
                {result.hiring_focus}
              </div>
            </CardContent>
          </Card>

          {/* Keywords Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                Keywords
              </CardTitle>
              <CardDescription>Important terms and concepts associated with the company.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
{result.keywords.map((keyword, index) => (
  <Badge key={index} className="bg-secondary text-secondary-foreground">
    {keyword}
  </Badge>
))}
            </CardContent>
          </Card>

          {/* Outreach Angle Card (Strongly Highlighted) */}
          <Card className="xl:col-span-2 border-primary"> {/* Span full width, added border-primary for highlighting */}
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Lightbulb className="h-5 w-5" />
                Outreach Angle
              </CardTitle>
              <CardDescription>Key points to leverage for effective communication.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-[22px] border border-primary/15 bg-primary/10 px-4 py-3 text-sm leading-7 text-white/75 font-semibold"> {/* Made font bolder */}
                {result.outreach_angle}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
