"use client";

import { motion } from "framer-motion";
import { BriefcaseBusiness, ScanSearch, Send, TrendingUp, Zap } from "lucide-react";

const actions = [
  { label: "Resume Lab", href: "/resume", icon: BriefcaseBusiness },
  { label: "ATS Analyzer", href: "/ats-analyzer", icon: ScanSearch },
  { label: "Outreach", href: "/outreach", icon: Send },
  { label: "Insights", href: "/insights", icon: TrendingUp }
] as const;

export function DashboardFloatingActions({
  onNavigate,
  onOpenCopilot
}: {
  onNavigate: (href: string) => void;
  onOpenCopilot: () => void;
}) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-24 z-30 hidden xl:flex flex-col gap-3">
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <motion.button key={action.href} type="button" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * index + 0.05, duration: 0.25 }} className="pointer-events-auto flex items-center gap-3 rounded-full border border-cyan-400/15 bg-[linear-gradient(135deg,rgba(7,13,18,0.96),rgba(4,7,10,0.92))] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(0,0,0,0.26)] transition hover:border-primary/20 hover:text-primary" onClick={() => onNavigate(action.href)}>
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-primary"><Icon className="h-4 w-4" /></span>
            <span>{action.label}</span>
          </motion.button>
        );
      })}
      <motion.button type="button" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.28, duration: 0.25 }} className="pointer-events-auto flex items-center gap-3 rounded-full border border-primary/20 bg-[linear-gradient(135deg,rgba(0,255,159,0.2),rgba(56,189,248,0.08))] px-4 py-3 text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(0,255,159,0.14),0_18px_50px_rgba(0,255,159,0.14)] transition hover:scale-[1.02]" onClick={onOpenCopilot}>
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary"><Zap className="h-4 w-4" /></span>
        <span>Open Copilot</span>
      </motion.button>
    </div>
  );
}
