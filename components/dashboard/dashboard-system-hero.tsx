"use client";

import { motion } from "framer-motion";
import { Activity, Bot, BriefcaseBusiness, BrainCircuit, Command, Gauge, ShieldAlert, ShieldCheck, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { commandSuggestions } from "@/lib/dashboard-command-router";
import type { HealthStatus } from "@/lib/dashboard-mission-control";

function healthStyles(status: HealthStatus) {
  if (status === "Optimal") return { badge: "border-primary/20 bg-primary/10 text-primary", icon: ShieldCheck, label: "System Optimal" };
  if (status === "Warning") return { badge: "border-cyan-400/25 bg-cyan-400/10 text-cyan-100", icon: Activity, label: "System Warning" };
  return { badge: "border-red-400/25 bg-red-400/10 text-red-200", icon: ShieldAlert, label: "System Critical" };
}

function PredictionMetric({ label, current, projected }: { label: string; current: number; projected: number }) {
  const delta = projected - current;
  return (
    <div className="rounded-[28px] border border-white/10 bg-black/25 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.22em] text-white/38">{label}</p>
        <Badge className={delta > 0 ? "border-primary/20 bg-primary/10 text-primary" : "border-white/10 bg-white/5 text-white/55"}>{delta >= 0 ? `+${delta}` : delta} pts</Badge>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div><p className="text-3xl font-semibold text-white">{current}%</p><p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/35">Current</p></div>
        <div className="text-right"><p className="text-3xl font-semibold text-primary">{projected}%</p><p className="mt-1 text-xs uppercase tracking-[0.2em] text-primary/70">Projected</p></div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/6">
        <motion.div className="h-full rounded-full bg-[linear-gradient(90deg,rgba(0,255,159,0.9),rgba(56,189,248,0.9))]" initial={false} animate={{ width: `${projected}%` }} transition={{ duration: 0.45, ease: "easeOut" }} />
      </div>
    </div>
  );
}

export function DashboardSystemHero({
  personaLabel,
  degraded,
  commandValue,
  commandRunning,
  onCommandChange,
  onExecuteCommand,
  healthStatus,
  readinessScore,
  healthSummary,
  currentReplyProbability,
  projectedReplyProbability,
  currentInterviewProbability,
  projectedInterviewProbability,
  assistantMessageCount,
  timingLabel,
  timingWindow,
  hasResume,
  atsScore
}: {
  personaLabel: string;
  degraded: boolean;
  commandValue: string;
  commandRunning: boolean;
  onCommandChange: (value: string) => void;
  onExecuteCommand: (value: string) => Promise<void>;
  healthStatus: HealthStatus;
  readinessScore: number;
  healthSummary: string;
  currentReplyProbability: number;
  projectedReplyProbability: number;
  currentInterviewProbability: number;
  projectedInterviewProbability: number;
  assistantMessageCount: number;
  timingLabel: string;
  timingWindow: string;
  hasResume: boolean;
  atsScore: number | null;
}) {
  const health = healthStyles(healthStatus);
  const HealthIcon = health.icon;

  return (
    <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(145deg,rgba(4,10,14,0.98),rgba(5,8,12,0.94))] px-6 py-6 shadow-[0_25px_80px_rgba(0,0,0,0.38)] sm:px-8 sm:py-8">
      <div className="pointer-events-none absolute inset-0 grid-overlay opacity-30" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,255,159,0.18),transparent_30%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_32%),radial-gradient(circle_at_bottom,rgba(255,255,255,0.05),transparent_28%)]" />
      <div className="relative grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3"><Badge className="border-primary/20 bg-primary/10 text-primary">AI Job Hunt Simulation</Badge><Badge className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100">Live System State</Badge><Badge className="border-white/10 bg-white/5 text-white/65">{personaLabel}</Badge></div>
          <div><h1 className="max-w-4xl text-4xl font-bold text-white sm:text-5xl">RecruitIQ is now running as a predictive job hunt control system.</h1><p className="mt-4 max-w-3xl text-sm leading-8 text-white/62 sm:text-base">Watch the pipeline, predict recruiter outcomes, stress-test improvements, and dispatch the next move from one AI mission console.</p></div>
          {degraded ? <div className="rounded-[24px] border border-yellow-400/20 bg-yellow-400/10 px-4 py-4 text-sm leading-7 text-yellow-100">Telemetry is partially degraded right now, so some metrics may be stale while the database catches up.</div> : null}
          <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(145deg,rgba(8,14,18,0.92),rgba(7,8,11,0.92))] p-4 shadow-[0_16px_48px_rgba(0,0,0,0.28)]">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[22px] border border-white/10 bg-black/25 px-4 py-3"><Command className="h-4 w-4 text-primary" /><Input value={commandValue} onChange={(event) => onCommandChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void onExecuteCommand(commandValue); } }} className="h-auto border-0 bg-transparent px-0 py-0 text-sm shadow-none focus:border-0 focus:ring-0" placeholder='Type: "Improve resume", "Generate emails", or "Simulate full optimization"...' /></div>
              <Button className="h-12 rounded-full px-6" disabled={commandRunning} onClick={() => void onExecuteCommand(commandValue)}><Bot className="h-4 w-4" />{commandRunning ? "Executing..." : "Execute Command"}</Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">{commandSuggestions.map((suggestion) => <Button key={suggestion} variant="secondary" size="sm" className="rounded-full border-white/10 bg-white/[0.04] px-4 text-white/75 hover:border-primary/25 hover:bg-primary/10 hover:text-white" onClick={() => void onExecuteCommand(suggestion)}>{suggestion}</Button>)}</div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/38"><span>Copilot memory: {assistantMessageCount}</span><span>|</span><span>{timingLabel}</span><span>|</span><span>{timingWindow}</span></div>
          </div>
        </div>
        <Card className="overflow-hidden border-cyan-400/10 bg-[linear-gradient(145deg,rgba(5,12,18,0.96),rgba(6,10,14,0.92))]">
          <CardHeader className="flex-row items-center justify-between"><div><CardTitle className="flex items-center gap-2"><Gauge className="h-5 w-5 text-primary" />Job Hunt Health Engine</CardTitle><CardDescription>Current system status and projected outcomes.</CardDescription></div><Badge className={health.badge}>{health.label}</Badge></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-[0.52fr_0.48fr]">
              <div className="relative flex min-h-[240px] items-center justify-center overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(0,255,159,0.15),transparent_32%),radial-gradient(circle_at_bottom,rgba(56,189,248,0.14),transparent_38%),rgba(5,8,12,0.96)]">
                <motion.div className="absolute h-[74%] w-[74%] rounded-full border border-primary/20" animate={{ scale: [1, 1.05, 1], opacity: [0.55, 1, 0.55] }} transition={{ repeat: Infinity, duration: 3.8, ease: "easeInOut" }} />
                <motion.div className="absolute h-[58%] w-[58%] rounded-full border border-cyan-400/20" animate={{ scale: [1.02, 0.98, 1.02], opacity: [0.7, 0.4, 0.7] }} transition={{ repeat: Infinity, duration: 4.6, ease: "easeInOut" }} />
                <div className="relative text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-primary"><HealthIcon className="h-6 w-6" /></div><p className="mt-5 text-[11px] uppercase tracking-[0.26em] text-white/35">Readiness</p><p className="mt-2 text-5xl font-bold text-white">{readinessScore}</p><p className="mt-3 max-w-[240px] text-sm leading-7 text-white/62">{healthSummary}</p></div>
              </div>
              <div className="space-y-4"><PredictionMetric label="Reply Probability" current={currentReplyProbability} projected={projectedReplyProbability} /><PredictionMetric label="Interview Probability" current={currentInterviewProbability} projected={projectedInterviewProbability} /></div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {[{ label: "Primary Resume", value: hasResume ? "Online" : "Missing", icon: BriefcaseBusiness }, { label: "ATS Lock", value: atsScore ? `${atsScore}/100` : "Idle", icon: BrainCircuit }, { label: "Reply Stream", value: currentReplyProbability > 30 ? "Warming" : "Cold", icon: TrendingUp }].map((item) => {
                const Icon = item.icon;
                return <div key={item.label} className="rounded-[24px] border border-white/10 bg-black/25 px-4 py-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-primary"><Icon className="h-4 w-4" /></div><div><p className="text-xs uppercase tracking-[0.2em] text-white/35">{item.label}</p><p className="mt-1 text-base font-semibold text-white">{item.value}</p></div></div></div>;
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
