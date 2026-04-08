import type { JobTargetPersona } from "@/types/app";
import type { SimulationPreset } from "@/lib/dashboard-mission-control";

export type DashboardCommand =
  | { type: "navigate"; href: string; summary: string }
  | { type: "persona"; persona: JobTargetPersona; summary: string }
  | { type: "simulation"; preset: SimulationPreset; summary: string }
  | { type: "assistant"; prompt: string; summary: string };

export const commandSuggestions = [
  "Improve resume",
  "Run ATS analysis",
  "Generate emails",
  "Analyze replies",
  "Simulate full optimization"
] as const;

export function resolveDashboardCommand(input: string): DashboardCommand {
  const normalized = input.toLowerCase().trim();
  if (!normalized) return { type: "assistant", prompt: "Review my job hunt system and tell me the next highest-leverage move.", summary: "Opening the copilot with a system review prompt." };
  if (/\b(full optimize|full optimization|simulate full optimization|simulate improvements|what if everything improves)\b/.test(normalized)) return { type: "simulation", preset: "max", summary: "Applying the full optimization simulation." };
  if (/\b(campaign boost|boost replies|improve replies)\b/.test(normalized)) return { type: "simulation", preset: "campaign", summary: "Applying the campaign boost simulation." };
  if (/\b(ats sprint|repair ats|improve ats|keyword gaps)\b/.test(normalized)) return { type: "simulation", preset: "ats", summary: "Applying the ATS sprint simulation." };
  if (/\b(reset simulation|live state|clear simulation)\b/.test(normalized)) return { type: "simulation", preset: "live", summary: "Resetting the dashboard to live telemetry." };
  if (/\b(improve resume|open resume|resume lab)\b/.test(normalized)) return { type: "navigate", href: "/resume", summary: "Routing to Resume Lab." };
  if (/\b(run ats|ats analyzer|analyze ats|keyword scan)\b/.test(normalized)) return { type: "navigate", href: "/ats-analyzer", summary: "Routing to ATS Analyzer." };
  if (/\b(generate emails|open outreach|send emails|outreach|run follow-ups|follow up|follow-up|optimize send timing|send timing)\b/.test(normalized)) return { type: "navigate", href: "/outreach", summary: "Routing to Outreach." };
  if (/\b(analyze replies|reply insights|open insights|reply analysis)\b/.test(normalized)) return { type: "navigate", href: "/insights", summary: "Routing to Insights." };
  if (/\b(research company|company research)\b/.test(normalized)) return { type: "navigate", href: "/company", summary: "Routing to Company Research." };
  if (/\b(build portfolio|portfolio)\b/.test(normalized)) return { type: "navigate", href: "/portfolio", summary: "Routing to Portfolio Builder." };
  if (/\b(a\/b|ab test|compare emails)\b/.test(normalized)) return { type: "navigate", href: "/ab-testing", summary: "Routing to A/B Testing." };
  if (/\b(prepare interview stories|interview prep|prepare interviews)\b/.test(normalized)) return { type: "assistant", prompt: "Help me prepare interview stories from my recent outreach and resume so I can convert recruiter interest into interview loops.", summary: "Opening the copilot with interview prep guidance." };
  if (/\b(startup persona|startup mode)\b/.test(normalized)) return { type: "persona", persona: "STARTUP", summary: "Switching the system persona to Startup." };
  if (/\b(big tech persona|big tech mode)\b/.test(normalized)) return { type: "persona", persona: "BIG_TECH", summary: "Switching the system persona to Big Tech." };
  if (/\b(hr recruiter persona|recruiter persona|hr mode)\b/.test(normalized)) return { type: "persona", persona: "HR_RECRUITER", summary: "Switching the system persona to HR Recruiter." };
  if (/\b(hiring manager persona|hiring manager mode)\b/.test(normalized)) return { type: "persona", persona: "HIRING_MANAGER", summary: "Switching the system persona to Hiring Manager." };
  return { type: "assistant", prompt: input, summary: "Handing the command to the copilot." };
}
