"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BrainCircuit,
  CheckCircle2,
  Copy,
  FileSearch,
  GitCompare,
  LoaderCircle,
  Link2,
  RefreshCw,
  Sparkles,
  Target,
  TriangleAlert,
  WandSparkles
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { VoiceInputButton } from "@/components/shared/voice-input-button";
import { apiFetch } from "@/lib/http";
import { cn } from "@/lib/utils";
import type { AtsAnalysisResult, JobTargetPersona } from "@/types/app";

const motionProps = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28 }
};

function formatResumeForEditor(text: string) {
  if (!text.trim()) {
    return "";
  }

  return text
    .replace(/\b(PROFESSIONAL SUMMARY|SUMMARY|EXPERIENCE|EDUCATION|PROJECTS|SKILLS|CERTIFICATIONS|ACHIEVEMENTS)\b/g, "\n\n$1")
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toCopyText(content: string | string[]) {
  return Array.isArray(content) ? content.map((item) => `- ${item}`).join("\n") : content;
}

function buildResumeDiffPreview(resumeText: string, improvedLines: string[]) {
  const sourceLines = resumeText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 30)
    .slice(0, improvedLines.length);

  return improvedLines.map((line, index) => ({
    removed: sourceLines[index] ?? "Original line not available.",
    added: line
  }));
}

function getScoreAppearance(score: number) {
  if (score < 50) {
    return {
      badge: "Needs work",
      badgeClassName: "border-red-400/25 bg-red-400/10 text-red-300",
      ringClassName: "border-red-400/20 bg-[radial-gradient(circle_at_top,rgba(255,77,77,0.2),transparent_55%)]",
      scoreClassName: "text-red-300"
    };
  }

  if (score <= 75) {
    return {
      badge: "Moderate match",
      badgeClassName: "border-yellow-400/25 bg-yellow-400/10 text-yellow-200",
      ringClassName: "border-yellow-400/20 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.18),transparent_55%)]",
      scoreClassName: "text-yellow-200"
    };
  }

  return {
    badge: "Strong match",
    badgeClassName: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    ringClassName: "border-emerald-400/20 bg-[radial-gradient(circle_at_top,rgba(0,255,159,0.22),transparent_55%)]",
    scoreClassName: "text-primary"
  };
}

function AnalysisSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-[32px]">
          <CardContent className="space-y-5 p-6">
            <div className="h-5 w-32 animate-pulse rounded-full bg-white/10" />
            <div className="h-24 w-24 animate-pulse rounded-full bg-white/[0.06]" />
            <div className="h-5 w-40 animate-pulse rounded-full bg-white/10" />
            <div className="h-4 w-full animate-pulse rounded-full bg-white/5" />
            <div className="h-4 w-5/6 animate-pulse rounded-full bg-white/5" />
          </CardContent>
        </Card>
        <Card className="rounded-[32px]">
          <CardContent className="space-y-4 p-6">
            <div className="h-5 w-36 animate-pulse rounded-full bg-white/10" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-9 w-24 animate-pulse rounded-full bg-white/[0.06]" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={index} className="rounded-[32px]">
            <CardContent className="space-y-3 p-6">
              <div className="h-5 w-36 animate-pulse rounded-full bg-white/10" />
              <div className="h-4 w-full animate-pulse rounded-full bg-white/5" />
              <div className="h-4 w-11/12 animate-pulse rounded-full bg-white/5" />
              <div className="h-4 w-4/5 animate-pulse rounded-full bg-white/5" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="rounded-[32px]">
        <CardContent className="space-y-4 p-6">
          <div className="h-5 w-48 animate-pulse rounded-full bg-white/10" />
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-[22px] bg-white/[0.05]" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ResultSection({
  title,
  description,
  content,
  onCopy,
  className
}: {
  title: string;
  description: string;
  content: string | string[];
  onCopy: () => Promise<void>;
  className?: string;
}) {
  const items = Array.isArray(content) ? content : null;

  return (
    <Card className={cn("rounded-[32px]", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void onCopy()}>
          <Copy className="h-4 w-4" />
          Copy
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {items ? (
          items.length > 0 ? (
            items.map((item) => (
              <div key={item} className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-white/70">
                {item}
              </div>
            ))
          ) : (
            <div className="rounded-[22px] border border-dashed border-white/10 bg-black/20 px-4 py-5 text-sm text-white/45">
              Nothing to show yet.
            </div>
          )
        ) : (
          <div className="rounded-[24px] border border-white/10 bg-black/20 px-5 py-5 text-sm leading-7 text-white/70">{content}</div>
        )}
      </CardContent>
    </Card>
  );
}

export function AtsAnalyzerClient({
  initialResumeText,
  candidateName,
  fileName,
  initialPersona,
  loadError
}: {
  initialResumeText: string;
  candidateName: string | null;
  fileName: string | null;
  initialPersona: JobTargetPersona;
  loadError: string | null;
}) {
  const router = useRouter();
  const [resumeText, setResumeText] = useState(() => formatResumeForEditor(initialResumeText));
  const [persona, setPersona] = useState<JobTargetPersona>(initialPersona);
  const [jobDescription, setJobDescription] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [analysis, setAnalysis] = useState<AtsAnalysisResult | null>(null);
  const [improvedLines, setImprovedLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [extractingUrl, setExtractingUrl] = useState(false);
  const [activating, setActivating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ resume?: string; jobDescription?: string }>({});
  const [storedAnalysisId, setStoredAnalysisId] = useState<string | null>(null);

  useEffect(() => {
    setResumeText(formatResumeForEditor(initialResumeText));
  }, [initialResumeText]);

  useEffect(() => {
    setPersona(initialPersona);
  }, [initialPersona]);

  useEffect(() => {
    setImprovedLines(analysis?.improvedBulletPoints ?? []);
  }, [analysis]);

  const scoreAppearance = getScoreAppearance(analysis?.atsScore ?? 0);

  async function copySection(label: string, content: string | string[]) {
    try {
      await navigator.clipboard.writeText(toCopyText(content));
      toast.success(`${label} copied.`);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}.`);
    }
  }

  async function handlePersonaChange(nextPersona: JobTargetPersona) {
    setPersona(nextPersona);

    try {
      await apiFetch("/api/job-os/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          persona: nextPersona
        })
      });
    } catch {
      toast.error("Could not save the selected persona.");
    }
  }

  async function handleExtractFromUrl() {
    if (!jobUrl.trim()) {
      toast.error("Paste a job URL first.");
      return;
    }

    setExtractingUrl(true);
    try {
      const extracted = await apiFetch<{ title: string; description: string }>("/api/job-extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url: jobUrl
        })
      });
      setJobDescription(extracted.description);
      toast.success(`Job description extracted from ${extracted.title}.`);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Could not extract the job description.";
      toast.error(message);
    } finally {
      setExtractingUrl(false);
    }
  }

  async function handleAnalyze() {
    const nextErrors: { resume?: string; jobDescription?: string } = {};

    if (resumeText.trim().length < 20) {
      nextErrors.resume = "Add your resume before running the analyzer.";
    }

    if (jobDescription.trim().length < 20) {
      nextErrors.jobDescription = "Paste a meaningful job description to compare against.";
    }

    setFieldErrors(nextErrors);
    if (nextErrors.resume || nextErrors.jobDescription) {
      toast.error("Add both the resume and job description before analyzing.");
      return;
    }

    setLoading(true);
    setError(null);
    setStoredAnalysisId(null);

    try {
      const result = await apiFetch<{ analysis: AtsAnalysisResult; storageId: string }>("/api/ats-analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          resume: resumeText,
          jobDescription,
          persona
        })
      });

      setAnalysis(result.analysis);
      setStoredAnalysisId(result.storageId);
      toast.success("ATS analysis complete.");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "ATS analysis failed.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  function handleApplyImprovements() {
    if (improvedLines.length === 0) {
      toast.error("No improved lines are available to apply yet.");
      return;
    }

    const addition = `\n\nImproved Resume Lines\n${improvedLines.map((line) => `- ${line.replace(/^[-\u2022]\s*/, "")}`).join("\n")}`;
    setResumeText((current) => `${current.trim()}${addition}`);
    toast.success("Improved lines added to the resume editor.");
  }

  async function handleUseForOutreach() {
    if (!storedAnalysisId) {
      toast.error("Run an ATS analysis before using it for outreach.");
      return;
    }

    setActivating(true);
    try {
      await apiFetch("/api/ats-analyze/use", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          analysisId: storedAnalysisId
        })
      });
      toast.success("ATS insights connected to outreach.");
      router.push("/resume");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Could not connect ATS insights to outreach.";
      toast.error(message);
    } finally {
      setActivating(false);
    }
  }

  async function handleAutoImproveResume() {
    if (!storedAnalysisId) {
      toast.error("Run an ATS analysis before applying improvements.");
      return;
    }

    setApplying(true);
    try {
      const updatedResume = await apiFetch<{ extractedText: string }>("/api/ats-analyze/use", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          analysisId: storedAnalysisId
        })
      });
      setResumeText(formatResumeForEditor(updatedResume.extractedText));
      toast.success("Improved lines were applied to the stored resume.");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Could not apply ATS improvements.";
      toast.error(message);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <motion.section
        {...motionProps}
        className="relative overflow-hidden rounded-[34px] border border-white/10 bg-black/30 px-6 py-8 backdrop-blur-xl sm:px-8"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,255,159,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.06),transparent_28%)]" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
              <BrainCircuit className="h-3.5 w-3.5" />
              AI-Powered Resume Scoring
            </div>
            <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">ATS Resume Analyzer</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
              Optimize your resume for any job with a role-specific ATS score, keyword gap analysis, and resume-ready
              rewrites that feel production-grade.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="secondary" className="h-12 rounded-full px-5" onClick={() => router.push("/resume")}>
              <ArrowLeft className="h-4 w-4" />
              Back to Resume Lab
            </Button>
            <div className="rounded-[28px] border border-primary/15 bg-primary/10 px-5 py-4 text-left shadow-[0_18px_50px_rgba(0,255,159,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">Primary Resume</p>
              <p className="mt-2 text-sm font-medium text-white">{fileName ?? "Paste a resume to begin"}</p>
              <p className="mt-1 text-sm text-white/50">{candidateName ? `Candidate: ${candidateName}` : "Manual editor mode"}</p>
            </div>
          </div>
        </div>
      </motion.section>

      {loadError ? (
        <motion.div {...motionProps}>
          <Card className="rounded-[30px] border-red-400/15">
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-400/10 text-red-300">
                  <TriangleAlert className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-base font-semibold text-white">Resume auto-fill is unavailable right now</p>
                  <p className="mt-2 text-sm leading-7 text-white/60">{loadError}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : null}

      <motion.section {...motionProps} className="grid gap-4 xl:grid-cols-[0.78fr_1.22fr]">
        <Card className="rounded-[32px]">
          <CardHeader>
            <CardTitle>Persona Optimization</CardTitle>
            <CardDescription>Shift the analyzer and outreach recommendations toward the audience you want to impress.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <select
              value={persona}
              onChange={(event) => void handlePersonaChange(event.target.value as JobTargetPersona)}
              className="h-12 w-full rounded-[20px] border border-white/10 bg-white/5 px-4 text-sm font-medium text-white outline-none transition focus:border-primary/40"
            >
              <option value="STARTUP" className="bg-[#111111] text-white">Startup</option>
              <option value="BIG_TECH" className="bg-[#111111] text-white">Big Tech</option>
              <option value="HR_RECRUITER" className="bg-[#111111] text-white">HR Recruiter</option>
              <option value="HIRING_MANAGER" className="bg-[#111111] text-white">Hiring Manager</option>
            </select>
            <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-white/60">
              {persona === "STARTUP"
                ? "Startup mode prioritizes ownership, speed, experimentation, and impact-heavy resume language."
                : persona === "BIG_TECH"
                  ? "Big Tech mode prioritizes systems thinking, reliability, scale, and polished cross-functional execution."
                  : persona === "HR_RECRUITER"
                    ? "HR Recruiter mode prioritizes fast readability, clear fit, keyword alignment, and recruiter-friendly language."
                    : "Hiring Manager mode prioritizes practical execution, technical judgment, and the strongest hands-on accomplishments."}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[32px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Job URL Auto Extractor
            </CardTitle>
            <CardDescription>Paste a LinkedIn or careers-page URL to auto-fill the job description.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Textarea
                value={jobUrl}
                onChange={(event) => setJobUrl(event.target.value)}
                className="min-h-[92px] text-sm leading-7"
                placeholder="Paste a job URL here..."
              />
              <Button className="h-12 sm:self-start" disabled={extractingUrl} onClick={() => void handleExtractFromUrl()}>
                {extractingUrl ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                {extractingUrl ? "Extracting..." : "Extract Job"}
              </Button>
            </div>
            <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-white/50">
              ATS suggestions on this page will stay focused on keyword alignment, missing skills, and premium resume rewrites for the selected persona.
            </div>
          </CardContent>
        </Card>
      </motion.section>

      <motion.section {...motionProps} className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-[32px]">
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileSearch className="h-5 w-5 text-primary" />
                  Resume
                </CardTitle>
                <CardDescription>Edit the imported resume text or paste a tailored version.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {initialResumeText ? <Badge className="border-primary/20 bg-primary/10 text-primary">Auto-filled</Badge> : null}
                <VoiceInputButton
                  className="h-9 w-9 rounded-full border border-white/10 bg-white/[0.04] text-white/75"
                  onTranscript={(value) => setResumeText((current) => `${current}${current ? " " : ""}${value}`)}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!initialResumeText}
                  onClick={() => setResumeText(formatResumeForEditor(initialResumeText))}
                >
                  <RefreshCw className="h-4 w-4" />
                  Reset
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/55">
              Keep the content plain, ATS-friendly, and close to the actual resume. You can tune wording here before
              analyzing.
            </div>
            <Textarea
              value={resumeText}
              onChange={(event) => setResumeText(event.target.value)}
              className="min-h-[420px] text-[15px] leading-7"
              placeholder="Paste your resume text here..."
            />
            {fieldErrors.resume ? <p className="text-sm text-red-300">{fieldErrors.resume}</p> : null}
          </CardContent>
        </Card>

        <Card className="rounded-[32px]">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Job Description
                </CardTitle>
                <CardDescription>Paste the full job description to compare against your resume.</CardDescription>
              </div>
              <VoiceInputButton
                className="h-9 w-9 rounded-full border border-white/10 bg-white/[0.04] text-white/75"
                onTranscript={(value) => setJobDescription((current) => `${current}${current ? " " : ""}${value}`)}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/55">
              Include responsibilities, required skills, and preferred qualifications for the strongest ATS comparison.
            </div>
            <Textarea
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              className="min-h-[420px] text-[15px] leading-7"
              placeholder="Paste the target job description here..."
            />
            {fieldErrors.jobDescription ? <p className="text-sm text-red-300">{fieldErrors.jobDescription}</p> : null}
          </CardContent>
        </Card>
      </motion.section>

      <motion.div {...motionProps} className="flex justify-center">
        <Button
          className="h-14 rounded-full px-8 text-base shadow-[0_18px_55px_rgba(0,255,159,0.22)]"
          disabled={loading}
          onClick={() => void handleAnalyze()}
        >
          {loading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <WandSparkles className="h-5 w-5" />}
          {loading ? "Analyzing Resume..." : "Analyze Resume"}
        </Button>
      </motion.div>

      {error ? (
        <motion.div {...motionProps}>
          <Card className="rounded-[30px] border-red-400/15">
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-400/10 text-red-300">
                  <TriangleAlert className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-base font-semibold text-white">Analysis failed</p>
                  <p className="mt-2 text-sm leading-7 text-white/60">{error}</p>
                </div>
              </div>
              <Button variant="secondary" className="h-11 rounded-full px-5" onClick={() => void handleAnalyze()}>
                <RefreshCw className="h-4 w-4" />
                Retry Analysis
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : null}

      {loading ? <AnalysisSkeleton /> : null}

      {!loading && analysis ? (
        <div className="space-y-6">
          <motion.section {...motionProps} className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <Card className={cn("rounded-[32px] overflow-hidden", scoreAppearance.ringClassName)}>
              <CardContent className="flex flex-col gap-6 p-6 sm:p-7">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className={scoreAppearance.badgeClassName}>{scoreAppearance.badge}</Badge>
                  <Badge className="border-white/10 bg-white/5 text-white/75">Keyword Match {analysis.keywordMatchPercentage}%</Badge>
                  <Badge className="border-white/10 bg-white/5 text-white/75">{analysis.personaTarget.replace(/_/g, " ")}</Badge>
                </div>

                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex h-32 w-32 items-center justify-center rounded-full border border-white/10 bg-black/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                    <div className="text-center">
                      <p className={cn("text-4xl font-bold", scoreAppearance.scoreClassName)}>{analysis.atsScore}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/45">ATS Score</p>
                    </div>
                  </div>

                  <div className="max-w-xl">
                    <p className="text-sm uppercase tracking-[0.2em] text-white/45">Match Summary</p>
                    <p className="mt-3 text-sm leading-7 text-white/75 sm:text-base">{analysis.matchSummary}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 text-sm text-white/60">
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    Matched keywords <span className="ml-2 font-semibold text-white">{analysis.matchedKeywords.length}</span>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    Missing keywords <span className="ml-2 font-semibold text-white">{analysis.missingKeywords.length}</span>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    Skill gaps <span className="ml-2 font-semibold text-white">{analysis.skillGaps.length}</span>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    Improved lines <span className="ml-2 font-semibold text-white">{improvedLines.length}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button className="h-12 rounded-full px-6" disabled={!storedAnalysisId || activating} onClick={() => void handleUseForOutreach()}>
                    {activating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {activating ? "Connecting..." : "Use for Outreach"}
                  </Button>
                  <Button variant="secondary" className="h-12 rounded-full px-6" disabled={!storedAnalysisId || applying} onClick={() => void handleAutoImproveResume()}>
                    {applying ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
                    {applying ? "Applying..." : "Auto Improve Resume"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[32px]">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Keyword Coverage
                  </CardTitle>
                  <CardDescription>Scan the overlap between the role language and your resume wording.</CardDescription>
                </div>
                <Button variant="secondary" size="sm" onClick={() => void copySection("Matched keywords", analysis.matchedKeywords)}>
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-white">Matched Keywords</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {analysis.matchedKeywords.map((keyword) => (
                      <Badge key={keyword} className="border-primary/15 bg-primary/10 text-primary">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-white/65">
                  Prioritize weaving missing terms into your summary, skills section, and the strongest experience bullets
                  where they accurately match your work. That usually improves both ATS scoring and recruiter readability.
                </div>
              </CardContent>
            </Card>
          </motion.section>

          <motion.section {...motionProps} className="grid gap-6 xl:grid-cols-2">
            <ResultSection
              title="Match Summary"
              description="High-level assessment of resume fit against the target role."
              content={analysis.matchSummary}
              onCopy={() => copySection("Match summary", analysis.matchSummary)}
            />
            <ResultSection
              title="Missing Keywords"
              description="High-value terms the job description expects but your resume does not highlight enough."
              content={analysis.missingKeywords}
              onCopy={() => copySection("Missing keywords", analysis.missingKeywords)}
            />
            <ResultSection
              title="Strengths"
              description="What already aligns well with the target role."
              content={analysis.strengths}
              onCopy={() => copySection("Strengths", analysis.strengths)}
            />
            <ResultSection
              title="Skill Gaps"
              description="Important skills the job expects that are missing or underrepresented."
              content={analysis.skillGaps}
              onCopy={() => copySection("Skill gaps", analysis.skillGaps)}
            />
            <ResultSection
              title="Weaknesses"
              description="Gaps likely reducing ATS and recruiter performance."
              content={analysis.weaknesses}
              onCopy={() => copySection("Weaknesses", analysis.weaknesses)}
            />
            <ResultSection
              title="Suggested Additions"
              description="Resume changes that would make those missing skills more visible and credible."
              content={analysis.suggestedSkillAdditions}
              onCopy={() => copySection("Suggested additions", analysis.suggestedSkillAdditions)}
            />
            <ResultSection
              title="Suggestions"
              description="Actionable changes to improve alignment for this role."
              content={analysis.suggestions}
              onCopy={() => copySection("Suggestions", analysis.suggestions)}
              className="xl:col-span-2"
            />
          </motion.section>

          <motion.section {...motionProps}>
            <Card className="rounded-[32px]">
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <WandSparkles className="h-5 w-5 text-primary" />
                    Improved Resume Lines
                  </CardTitle>
                  <CardDescription>Edit, copy, or apply these rewrites back into the resume editor.</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => void copySection("Improved resume lines", improvedLines)}>
                    <Copy className="h-4 w-4" />
                    Copy All
                  </Button>
                  <Button size="sm" onClick={handleApplyImprovements}>
                    <CheckCircle2 className="h-4 w-4" />
                    Apply Improvements
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {improvedLines.map((line, index) => (
                  <div key={`${index}-${line}`} className="rounded-[24px] border border-white/10 bg-black/20 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Improved line {index + 1}</p>
                      <Button variant="ghost" size="sm" onClick={() => void copySection(`Improved line ${index + 1}`, line)}>
                        <Copy className="h-4 w-4" />
                        Copy
                      </Button>
                    </div>
                    <Textarea
                      value={line}
                      onChange={(event) =>
                        setImprovedLines((current) => current.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))
                      }
                      className="min-h-[110px] text-sm leading-7"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.section>

          <motion.section {...motionProps}>
            <Card className="rounded-[32px]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitCompare className="h-5 w-5 text-primary" />
                  Resume Diff View
                </CardTitle>
                <CardDescription>Original lines in red, ATS-improved rewrites in green.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {buildResumeDiffPreview(initialResumeText || resumeText, improvedLines).map((item, index) => (
                  <div key={`${index}-${item.added}`} className="grid gap-3 xl:grid-cols-2">
                    <div className="rounded-[24px] border border-red-400/20 bg-red-400/10 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-200/70">Original</p>
                      <p className="mt-3 text-sm leading-7 text-red-100/80">{item.removed}</p>
                    </div>
                    <div className="rounded-[24px] border border-primary/20 bg-primary/10 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">Improved</p>
                      <p className="mt-3 text-sm leading-7 text-white/85">{item.added}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.section>
        </div>
      ) : null}

      {!loading && !analysis ? (
        <motion.div {...motionProps}>
          <Card className="rounded-[32px]">
            <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-[24px] border border-primary/20 bg-primary/10 text-primary shadow-glow">
                <BrainCircuit className="h-7 w-7" />
              </div>
              <p className="mt-5 text-xl font-semibold text-white">Ready for ATS analysis</p>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55 sm:text-base">
                Paste a job description, tune your resume if needed, and run the analyzer to get a score, keyword gaps,
                strengths, weaknesses, and resume-ready improvements.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : null}
    </div>
  );
}
