"use client";

import { Copy, Download, FileText, GitCompare, Save, ScanSearch, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { saveAs } from "file-saver";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/http";
import { buildResumeHtmlDocument } from "@/lib/resume/render";
import { getExportSectionsFromText } from "@/lib/resume/sections";
import { buildResumeDiffPreview, formatResumeForEditor } from "@/lib/workspace-ui";
import type { DashboardSnapshot, StoredAtsAnalysis } from "@/types/app";

type ResumeRecord = DashboardSnapshot["resume"];

export function ResumeLabClient({
  initialResume,
  activeAtsAnalysis
}: {
  initialResume: ResumeRecord;
  activeAtsAnalysis: StoredAtsAnalysis | null;
}) {
  const router = useRouter();
  const [resume, setResume] = useState(initialResume);
  const [candidateName, setCandidateName] = useState(initialResume?.candidateName ?? "");
  const [editorText, setEditorText] = useState(formatResumeForEditor(initialResume?.extractedText ?? ""));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [docxExporting, setDocxExporting] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);

  useEffect(() => {
    setResume(initialResume);
    setCandidateName(initialResume?.candidateName ?? "");
    setEditorText(formatResumeForEditor(initialResume?.extractedText ?? ""));
  }, [initialResume]);

  async function copyToClipboard(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}.`);
    }
  }

  async function handleResumeUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("candidateName", candidateName || "Candidate");
    setUploading(true);

    try {
      const nextResume = await apiFetch<NonNullable<ResumeRecord>>("/api/resume", {
        method: "POST",
        body: formData
      });
      setResume(nextResume);
      setCandidateName(nextResume.candidateName);
      setEditorText(formatResumeForEditor(nextResume.extractedText));
      toast.success("Resume uploaded.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Resume upload failed.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function handleSaveResume() {
    if (!resume) {
      toast.error("Upload a resume before saving edits.");
      return;
    }

    if (!editorText.trim()) {
      toast.error("Add resume content before saving.");
      return;
    }

    setSaving(true);

    try {
      const updatedResume = await apiFetch<NonNullable<ResumeRecord>>("/api/resume", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateName: candidateName || resume.candidateName,
          extractedText: editorText
        })
      });
      setResume(updatedResume);
      setEditorText(formatResumeForEditor(updatedResume.extractedText));
      toast.success("Resume changes saved.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the resume.");
    } finally {
      setSaving(false);
    }
  }

  async function handleExportDocx() {
    if (!editorText.trim()) {
      toast.error("Add resume content before exporting.");
      return;
    }

    setDocxExporting(true);

    const fileStem = (candidateName || resume?.candidateName || "optimized-resume").trim().replace(/\s+/g, "-").toLowerCase();

    try {
      const response = await fetch("/api/resume/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: `${fileStem}.docx`,
          sections: getExportSectionsFromText(editorText)
        })
      });

      if (!response.ok) {
        throw new Error("Export failed.");
      }

      const blob = await response.blob();
      saveAs(blob, `${fileStem}.docx`);
      toast.success("DOCX export is ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not export the resume.");
    } finally {
      setDocxExporting(false);
    }
  }

  async function handleExportPdf() {
    if (!editorText.trim()) {
      toast.error("Add resume content before exporting.");
      return;
    }

    setPdfExporting(true);
    const fileStem = (candidateName || resume?.candidateName || "optimized-resume").trim().replace(/\s+/g, "-").toLowerCase();

    try {
      const response = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: `${fileStem}.pdf`,
          html: buildResumeHtmlDocument({
            candidateName: candidateName || resume?.candidateName || "Resume",
            text: editorText
          })
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "PDF generation failed." }));
        throw new Error(payload.error ?? "PDF generation failed.");
      }

      const blob = await response.blob();
      saveAs(blob, `${fileStem}.pdf`);
      toast.success("PDF export is ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not export the PDF.");
    } finally {
      setPdfExporting(false);
    }
  }

  const diffItems = buildResumeDiffPreview(resume?.extractedText ?? editorText, activeAtsAnalysis?.improvedBulletPoints ?? []);

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        badge="Resume Lab"
        title="Keep the resume clean, editable, and ready for tailoring."
        description="Upload the source PDF, make direct text edits, and compare the latest ATS-powered improvement suggestions without leaving the workspace."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={handleExportDocx} disabled={docxExporting || pdfExporting}>
              <FileText className="h-4 w-4" />
              {docxExporting ? "Exporting..." : "Export DOCX"}
            </Button>
            <Button variant="secondary" onClick={handleExportPdf} disabled={pdfExporting || docxExporting}>
              <Download className="h-4 w-4" />
              {pdfExporting ? "Generating..." : "Download PDF"}
            </Button>
            <Button variant="secondary" onClick={() => router.push("/ats-analyzer")}>
              <ScanSearch className="h-4 w-4" />
              Open ATS Analyzer
            </Button>
          </div>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[0.42fr_0.58fr]">
        <Card>
          <CardHeader>
            <CardTitle>Upload Primary Resume</CardTitle>
            <CardDescription>Replace the current PDF or DOCX to refresh the shared resume used across ATS, outreach, and portfolio generation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex cursor-pointer items-center justify-between rounded-[24px] border border-dashed border-white/15 bg-black/20 px-5 py-4 transition hover:border-primary/40 hover:bg-primary/5">
              <div className="text-left">
                <p className="font-semibold text-white">Choose PDF or DOCX resume</p>
                <p className="mt-1 text-sm text-white/45">Upload the file that should power the rest of the workspace.</p>
              </div>
              <span className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white">
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading..." : "Select File"}
              </span>
              <input
                className="hidden"
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleResumeUpload}
              />
            </label>

            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <p className="text-sm font-semibold text-white">Candidate name</p>
              <input
                value={candidateName}
                onChange={(event) => setCandidateName(event.target.value)}
                className="mt-3 h-12 w-full rounded-[20px] border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition focus:border-primary/40"
                placeholder="Candidate name"
              />
            </div>

            <div className="rounded-[24px] border border-primary/15 bg-primary/10 p-4">
              <p className="text-sm font-semibold text-white">Current primary file</p>
              <p className="mt-2 text-sm leading-7 text-white/70">{resume?.fileName ?? "No resume uploaded yet."}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resume Status</CardTitle>
            <CardDescription>Track what is loaded right now and whether an ATS diff is available for review.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <p className="text-sm text-white/45">Loaded resume</p>
              <p className="mt-2 text-lg font-semibold text-white">{resume?.fileName ?? "None yet"}</p>
              <p className="mt-2 text-sm text-white/55">{resume ? `Candidate: ${resume.candidateName}` : "Upload a PDF to start editing."}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <p className="text-sm text-white/45">ATS diff</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {activeAtsAnalysis ? `${activeAtsAnalysis.atsScore}/100 score available` : "No active diff yet"}
              </p>
              <p className="mt-2 text-sm text-white/55">
                {activeAtsAnalysis
                  ? "The current outreach-linked ATS suggestions can be reviewed below."
                  : "Run the ATS Analyzer and connect the result to outreach to populate the diff view."}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 md:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Last ATS-linked job description</p>
                  <p className="mt-2 text-sm leading-7 text-white/55">
                    {activeAtsAnalysis?.jobDescription
                      ? `${activeAtsAnalysis.jobDescription.slice(0, 220)}${activeAtsAnalysis.jobDescription.length > 220 ? "..." : ""}`
                      : "No role context is active yet."}
                  </p>
                </div>
                {activeAtsAnalysis ? <Badge className="border-primary/20 bg-primary/10 text-primary">Live Diff</Badge> : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Resume Editor
            </CardTitle>
            <CardDescription>Make direct edits to the stored resume text so every downstream tool uses the latest version.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void copyToClipboard(editorText, "Resume text")}>
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            <Button onClick={() => void handleSaveResume()} disabled={!resume || saving}>
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={editorText}
            onChange={(event) => setEditorText(event.target.value)}
            className="min-h-[480px] text-[15px] leading-7"
            placeholder="Upload a resume or paste the source content here..."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-primary" />
            Diff View
          </CardTitle>
          <CardDescription>Compare current resume lines against the latest ATS-guided improvements available to outreach.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {diffItems.length > 0 ? (
            diffItems.map((item, index) => (
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
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-5 py-8 text-center">
              <p className="text-base font-semibold text-white">No active ATS diff yet</p>
              <p className="mt-3 text-sm leading-7 text-white/55">
                Run the ATS Analyzer for a target job and connect that result to outreach to review side-by-side improvements here.
              </p>
              <Button className="mt-5" onClick={() => router.push("/ats-analyzer")}>
                <ScanSearch className="h-4 w-4" />
                Analyze Resume
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
