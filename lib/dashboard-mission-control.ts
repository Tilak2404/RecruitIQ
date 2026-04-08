import type { JobTargetPersona, OutreachOverview, SendTimeSuggestion, StoredAtsAnalysis } from "@/types/app";

export type SystemTone = "optimal" | "warning" | "critical";
export type HealthStatus = "Optimal" | "Warning" | "Critical";
export type StageId = "resume" | "ats" | "emails" | "replies" | "interviews";
export type SimulationState = Record<"resume" | "ats" | "personalize" | "timing" | "followups" | "interviews", boolean>;
export type SimulationPreset = "live" | "ats" | "campaign" | "max";

export type StageModel = {
  id: StageId;
  label: string;
  currentScore: number;
  projectedScore: number;
  tone: SystemTone;
  active: boolean;
  currentStatus: string;
  predictedOutcome: string;
};

export type InsightModel = {
  title: string;
  detail: string;
  severity: "critical" | "warning" | "watch";
  command: string;
  action: string;
};

export type WorkflowStep = {
  title: string;
  detail: string;
  command: string;
  action: string;
};

export type MissionControlInput = {
  persona: JobTargetPersona;
  overview: OutreachOverview;
  timeSuggestion: SendTimeSuggestion;
  hasResume: boolean;
  resumeFileName: string | null;
  activeAtsAnalysis: StoredAtsAnalysis | null;
  assistantMessageCount: number;
  simulation: SimulationState;
};

export const defaultSimulationState: SimulationState = {
  resume: false,
  ats: false,
  personalize: false,
  timing: false,
  followups: false,
  interviews: false
};

export const simulationModules = [
  { id: "resume", label: "Resume Sync", detail: "Sharpen story and proof points.", impact: "+resume clarity", command: "Improve resume" },
  { id: "ats", label: "ATS Repair", detail: "Close keyword gaps for the active role.", impact: "+ATS fit", command: "Run ATS analysis" },
  { id: "personalize", label: "Email Personalization", detail: "Increase recruiter-specific messaging.", impact: "+reply lift", command: "Generate emails" },
  { id: "timing", label: "Timing Optimization", detail: "Move sends into stronger windows.", impact: "+open-to-reply", command: "Optimize send timing" },
  { id: "followups", label: "Follow-Up Automation", detail: "Recover warm leads before they cool.", impact: "+reply recovery", command: "Run follow-ups" },
  { id: "interviews", label: "Interview Prep", detail: "Convert replies into stronger loops.", impact: "+interview odds", command: "Prepare interview stories" }
] as const;

export const simulationPresets = [
  { id: "live", label: "Live State", modules: [] },
  { id: "ats", label: "ATS Sprint", modules: ["resume", "ats"] },
  { id: "campaign", label: "Campaign Boost", modules: ["personalize", "timing", "followups"] },
  { id: "max", label: "Full Optimize", modules: ["resume", "ats", "personalize", "timing", "followups", "interviews"] }
] as const satisfies ReadonlyArray<{ id: SimulationPreset; label: string; modules: Array<keyof SimulationState> }>;

const personaWeight: Record<JobTargetPersona, number> = { STARTUP: 6, BIG_TECH: 9, HR_RECRUITER: 8, HIRING_MANAGER: 7 };
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const tone = (value: number): SystemTone => (value < 40 ? "critical" : value < 67 ? "warning" : "optimal");

export function applySimulationPreset(id: SimulationPreset): SimulationState {
  const preset = simulationPresets.find((item) => item.id === id) ?? simulationPresets[0];
  const next = { ...defaultSimulationState };
  for (const key of preset.modules) next[key] = true;
  return next;
}

export function getSimulationPresetId(state: SimulationState): SimulationPreset | null {
  const active = Object.entries(state).filter(([, on]) => on).map(([key]) => key).sort().join("|");
  for (const preset of simulationPresets) {
    if ([...preset.modules].sort().join("|") === active) return preset.id;
  }
  return null;
}

function currentScores(input: MissionControlInput) {
  const ats = clamp(input.activeAtsAnalysis?.atsScore ?? (input.hasResume ? 38 : 10), 10, 96);
  const resume = clamp((input.hasResume ? 58 : 12) + (input.resumeFileName ? 6 : 0) + (input.activeAtsAnalysis ? 8 : 0) + input.assistantMessageCount * 0.6 + personaWeight[input.persona] * 0.4, 8, 94);
  const emails = clamp((input.hasResume ? 24 : 8) + Math.min(input.overview.pending * 12, 24) + Math.min(input.overview.totalSent * 14, 26) + (input.timeSuggestion.confidenceLabel === "Data-informed" ? 10 : 4) - Math.min(input.overview.followUpsDue * 6, 16), 10, 92);
  const replies = clamp(10 + Math.min(input.overview.replies * 18, 34) + input.overview.responseRate * 0.9 + (input.overview.totalSent > 0 ? 8 : 0), 8, 95);
  const replyProbability = clamp(8 + resume * 0.1 + ats * 0.18 + emails * 0.24 + replies * 0.18, 6, 93);
  const interviews = clamp(8 + replyProbability * 0.58 + ats * 0.14 + (input.overview.replies > 0 ? 6 : 0), 7, 88);
  const interviewProbability = clamp(4 + replyProbability * 0.44 + interviews * 0.18, 4, 78);
  return { resume, ats, emails, replies, interviews, replyProbability, interviewProbability };
}

function projectedScores(base: ReturnType<typeof currentScores>, state: SimulationState) {
  const resume = clamp(base.resume + (state.resume ? 14 : 0), 8, 99);
  const ats = clamp(base.ats + (state.ats ? 18 : 0), 10, 99);
  const emails = clamp(base.emails + (state.personalize ? 16 : 0) + (state.timing ? 11 : 0) + (state.followups ? 8 : 0), 10, 99);
  const replies = clamp(base.replies + (state.personalize ? 12 : 0) + (state.timing ? 7 : 0) + (state.followups ? 14 : 0), 8, 99);
  const replyProbability = clamp(8 + resume * 0.1 + ats * 0.18 + emails * 0.24 + replies * 0.18, 6, 96);
  const interviews = clamp(base.interviews + (state.interviews ? 16 : 0) + (state.resume ? 6 : 0) + (state.followups ? 4 : 0), 7, 99);
  const interviewProbability = clamp(4 + replyProbability * 0.44 + interviews * 0.18 + (state.interviews ? 7 : 0), 4, 86);
  return { resume, ats, emails, replies, interviews, replyProbability, interviewProbability };
}

export function deriveMissionControl(input: MissionControlInput) {
  const base = currentScores(input);
  const projected = projectedScores(base, input.simulation);
  const current = { resume: base.resume, ats: base.ats, emails: base.emails, replies: base.replies, interviews: base.interviews };
  const activeId = (Object.entries(current) as Array<[StageId, number]>).sort((a, b) => a[1] - b[1])[0]?.[0] ?? "resume";
  const stage = (id: StageId, label: string, currentStatus: string, predictedOutcome: string): StageModel => ({ id, label, currentScore: Math.round(current[id]), projectedScore: Math.round(projected[id]), tone: tone(current[id]), active: activeId === id, currentStatus, predictedOutcome });
  const pipeline = [
    stage("resume", "Resume", input.hasResume ? (input.resumeFileName ? `Primary file synced: ${input.resumeFileName}` : "Primary resume loaded") : "Resume core missing", `Projected recruiter resonance ${Math.round(projected.resume)} / 100`),
    stage("ats", "ATS", input.activeAtsAnalysis ? `Active role lock at ${input.activeAtsAnalysis.atsScore} / 100` : "No ATS comparison connected", `Projected ATS fit ${Math.round(projected.ats)} / 100`),
    stage("emails", "Emails", input.overview.totalSent > 0 ? `${input.overview.totalSent} sends live, ${input.overview.pending} queued` : input.overview.pending > 0 ? `${input.overview.pending} drafts ready to deploy` : "No active outreach sequence", `Projected reply entry ${Math.round(projected.replyProbability)}%`),
    stage("replies", "Replies", input.overview.replies > 0 ? `${input.overview.replies} replies at ${input.overview.responseRate.toFixed(1)}%` : "Reply signal is weak or absent", `Projected reply stream +${Math.round(projected.replyProbability - base.replyProbability)} pts`),
    stage("interviews", "Interviews", base.interviewProbability >= 28 ? "Interview path is warming up" : "Interview conversion is fragile", `Projected interview odds ${Math.round(projected.interviewProbability)}%`)
  ];
  const weakest = Math.min(...pipeline.map((item) => item.currentScore));
  const healthStatus: HealthStatus = !input.hasResume || weakest < 38 || base.replyProbability < 20 ? "Critical" : weakest < 67 || base.interviewProbability < 26 ? "Warning" : "Optimal";
  const readinessScore = clamp(Math.round((pipeline.reduce((sum, item) => sum + item.currentScore, 0) / pipeline.length + base.replyProbability + base.interviewProbability) / 3), 8, 96);
  const insights: InsightModel[] = [];
  if (!input.hasResume) insights.push({ title: "Resume core offline", detail: "A missing primary resume suppresses ATS, outreach, and interview predictions.", severity: "critical", command: "Improve resume", action: "Resume Lab" });
  if (!input.activeAtsAnalysis) insights.push({ title: "ATS lock missing", detail: "There is no active ATS analysis linked to the role you are targeting.", severity: "warning", command: "Run ATS analysis", action: "Run ATS" });
  else if (input.activeAtsAnalysis.atsScore < 60) insights.push({ title: "ATS fit below target", detail: `The active role match is only ${input.activeAtsAnalysis.atsScore}/100.`, severity: "warning", command: "Run ATS analysis", action: "Repair Fit" });
  if (input.overview.totalSent === 0 && input.overview.pending === 0) insights.push({ title: "Outbound engine idle", detail: "The system has no live draft volume to generate signal.", severity: "critical", command: "Generate emails", action: "Generate" });
  else if (input.overview.followUpsDue > 0) insights.push({ title: "Follow-up debt accumulating", detail: `${input.overview.followUpsDue} follow-ups are due right now.`, severity: "warning", command: "Run follow-ups", action: "Recover" });
  if (input.overview.totalSent > 0 && input.overview.responseRate < 8) insights.push({ title: "Reply conversion underpowered", detail: "The current send volume is not converting into healthy recruiter replies.", severity: "warning", command: "Generate emails", action: "Tune Emails" });
  if (base.interviewProbability < 20) insights.push({ title: "Interview path fragile", detail: "Interest is not yet translating into stable interview odds.", severity: "watch", command: "Prepare interview stories", action: "Prepare" });
  if (insights.length === 0) insights.push({ title: "No critical bottleneck detected", detail: "The system is balanced enough to focus on scale.", severity: "watch", command: "Simulate full optimization", action: "Stress Test" });
  const workflow: WorkflowStep[] = insights.slice(0, 3).map((item, index) => ({ title: `${index + 1}. ${item.title}`, detail: item.detail, command: item.command, action: item.action }));
  if (!Object.values(input.simulation).some(Boolean)) workflow.push({ title: `${workflow.length + 1}. Run a what-if pass`, detail: "Switch on simulations before committing to a fix so you know which stage is worth repairing first.", command: "Simulate full optimization", action: "Simulate" });
  const summary = Object.values(input.simulation).some(Boolean) ? "Simulation modules are active. Projected probabilities are being recalculated in real time." : "Live telemetry only. No speculative upgrades are active.";
  const healthSummary = healthStatus === "Critical" ? `${pipeline.find((item) => item.active)?.label ?? "System"} is suppressing the pipeline.` : healthStatus === "Warning" ? `${pipeline.find((item) => item.active)?.label ?? "System"} is the main bottleneck right now.` : "The system is balanced enough to scale while keeping timing and messaging clean.";
  return { pipeline, healthStatus, readinessScore, healthSummary, currentReplyProbability: Math.round(base.replyProbability), projectedReplyProbability: Math.round(projected.replyProbability), currentInterviewProbability: Math.round(base.interviewProbability), projectedInterviewProbability: Math.round(projected.interviewProbability), insights: insights.slice(0, 4), workflow: workflow.slice(0, 4), summary };
}
