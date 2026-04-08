"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import type { StageModel, SystemTone } from "@/lib/dashboard-mission-control";
import { cn } from "@/lib/utils";

function toneStyles(tone: SystemTone) {
  if (tone === "optimal") return { badge: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200", ring: "border-emerald-400/20 shadow-[0_0_28px_rgba(0,255,159,0.12)]", bar: "from-emerald-300 via-primary to-cyan-300" };
  if (tone === "warning") return { badge: "border-cyan-400/25 bg-cyan-400/10 text-cyan-100", ring: "border-cyan-400/20 shadow-[0_0_28px_rgba(56,189,248,0.12)]", bar: "from-cyan-300 via-sky-300 to-primary" };
  return { badge: "border-red-400/25 bg-red-400/10 text-red-200", ring: "border-red-400/20 shadow-[0_0_28px_rgba(255,77,77,0.12)]", bar: "from-red-300 via-orange-300 to-cyan-300" };
}

function PipelineNode({ stage }: { stage: StageModel }) {
  const styles = toneStyles(stage.tone);
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0, scale: stage.active ? 1.02 : 1, boxShadow: stage.active ? "0 0 0 1px rgba(0,255,159,0.18), 0 20px 60px rgba(0,255,159,0.18)" : "0 18px 55px rgba(0,0,0,0.25)" }} transition={{ duration: 0.32, ease: "easeOut" }} className={cn("relative overflow-hidden rounded-[30px] border bg-[linear-gradient(180deg,rgba(9,15,20,0.92),rgba(7,9,12,0.96))] p-5", styles.ring)}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.1),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(0,255,159,0.08),transparent_34%)]" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4"><div><p className="text-[11px] uppercase tracking-[0.24em] text-white/35">Stage</p><p className="mt-2 text-xl font-semibold text-white">{stage.label}</p></div><Badge className={styles.badge}>{stage.tone}</Badge></div>
        <div className="mt-5 grid gap-3 text-sm">
          <div className="rounded-[22px] border border-white/10 bg-black/30 px-4 py-3"><p className="text-[11px] uppercase tracking-[0.2em] text-white/40">Current Status</p><p className="mt-2 leading-7 text-white/78">{stage.currentStatus}</p></div>
          <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3"><p className="text-[11px] uppercase tracking-[0.2em] text-primary/70">Predicted Outcome</p><p className="mt-2 leading-7 text-white/82">{stage.predictedOutcome}</p></div>
        </div>
        <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
          <div className="rounded-[20px] border border-white/10 bg-black/25 px-4 py-3"><p className="text-[11px] uppercase tracking-[0.2em] text-white/40">Current</p><p className="mt-2 text-2xl font-semibold text-white">{stage.currentScore}</p></div>
          <div className="rounded-[20px] border border-primary/15 bg-primary/10 px-4 py-3"><p className="text-[11px] uppercase tracking-[0.2em] text-primary/70">Projected</p><p className="mt-2 text-2xl font-semibold text-primary">{stage.projectedScore}</p></div>
        </div>
        <div className="mt-5 space-y-2">
          <div className="h-2 overflow-hidden rounded-full bg-white/6"><motion.div className={cn("h-full rounded-full bg-gradient-to-r", styles.bar)} initial={false} animate={{ width: `${stage.currentScore}%` }} transition={{ duration: 0.45, ease: "easeOut" }} /></div>
          <div className="h-2 overflow-hidden rounded-full bg-white/6"><motion.div className="h-full rounded-full bg-[linear-gradient(90deg,rgba(0,255,159,0.95),rgba(56,189,248,0.95))]" initial={false} animate={{ width: `${stage.projectedScore}%` }} transition={{ duration: 0.45, ease: "easeOut" }} /></div>
        </div>
      </div>
    </motion.div>
  );
}

export function DashboardPipeline({ pipeline, summary }: { pipeline: StageModel[]; summary: string }) {
  return (
    <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(145deg,rgba(4,9,14,0.96),rgba(6,8,12,0.95))] px-6 py-6 shadow-[0_24px_80px_rgba(0,0,0,0.34)] sm:px-8 sm:py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,255,159,0.09),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.12),transparent_32%)]" />
      <div className="relative">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><Badge className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100">Live Pipeline Visualization</Badge><h2 className="mt-4 text-3xl font-bold text-white">Real-time job hunt pipeline with predictive outcomes.</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-white/60">Each node reports current condition plus the projected impact of the improvements you are simulating.</p></div>
          <div className="rounded-[24px] border border-white/10 bg-black/25 px-4 py-4 text-sm leading-7 text-white/65">{summary}</div>
        </div>
        <div className="relative mt-8">
          <div className="pointer-events-none absolute left-[10%] right-[10%] top-8 hidden h-px bg-[linear-gradient(90deg,rgba(0,255,159,0),rgba(0,255,159,0.45),rgba(56,189,248,0.45),rgba(0,255,159,0))] xl:block" />
          <motion.div className="pointer-events-none absolute left-[16%] right-[16%] top-[30px] hidden h-[2px] bg-[linear-gradient(90deg,rgba(0,255,159,0),rgba(0,255,159,0.95),rgba(56,189,248,0.95),rgba(0,255,159,0))] opacity-70 xl:block" animate={{ x: ["-8%", "8%", "-8%"] }} transition={{ repeat: Infinity, duration: 5.8, ease: "easeInOut" }} />
          <div className="grid gap-4 xl:grid-cols-5">{pipeline.map((stage) => <PipelineNode key={stage.id} stage={stage} />)}</div>
        </div>
      </div>
    </section>
  );
}
