"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BrainCircuit, BriefcaseBusiness, Building2, Command, LineChart, MessageSquareText, Send, Sparkles } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

type CommandAction = {
  id: string;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  run: () => void;
};

const commandMotion = {
  initial: { opacity: 0, y: 18, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 18, scale: 0.98 },
  transition: { duration: 0.18 }
};

export function JobOsCommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }

      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const actions = useMemo<CommandAction[]>(
    () => {
      function queueAssistantPrompt(prompt: string) {
        if (pathname !== "/dashboard") {
          window.sessionStorage.setItem("job-os-command-prompt", prompt);
          router.push("/dashboard");
          setOpen(false);
          return;
        }

        window.dispatchEvent(new CustomEvent("jobos:assistant-prompt", { detail: { prompt, openAssistant: true } }));
        setOpen(false);
      }

      return [
      {
        id: "improve-chances",
        label: "Improve My Chances",
        hint: "Ask the assistant to run a readiness and messaging check",
        icon: Sparkles,
        run: () => queueAssistantPrompt("Improve my chances with the current setup.")
      },
      {
        id: "apply-readiness",
        label: "Am I Ready?",
        hint: "Check whether your system is ready to apply and what to fix first",
        icon: BrainCircuit,
        run: () => queueAssistantPrompt("Am I ready to apply yet?")
      },
      {
        id: "write-email",
        label: "Write Email",
        hint: "Open the assistant with an outreach draft prompt",
        icon: MessageSquareText,
        run: () => queueAssistantPrompt("Write a personalized recruiter email for my current target role.")
      },
      {
        id: "linkedin-dm",
        label: "Generate LinkedIn DM",
        hint: "Create a concise LinkedIn outreach message",
        icon: Sparkles,
        run: () => queueAssistantPrompt("Write a concise LinkedIn message for a recruiter at my target company.")
      },
      {
        id: "ats-analyzer",
        label: "Open ATS Analyzer",
        hint: "Analyze your resume against a job description",
        icon: BrainCircuit,
        run: () => {
          router.push("/ats-analyzer");
          setOpen(false);
        }
      },
      {
        id: "outreach",
        label: "Open Outreach",
        hint: "Manage recruiters, drafts, and send timing",
        icon: Send,
        run: () => {
          router.push("/outreach");
          setOpen(false);
        }
      },
      {
        id: "company-research",
        label: "Research Company",
        hint: "Open the dedicated research workspace",
        icon: Building2,
        run: () => {
          router.push("/company");
          setOpen(false);
        }
      },
      {
        id: "insights",
        label: "Open Insights",
        hint: "Review reply analysis and strategy suggestions",
        icon: LineChart,
        run: () => {
          router.push("/insights");
          setOpen(false);
        }
      },
      {
        id: "portfolio",
        label: "Build Portfolio Copy",
        hint: "Open the portfolio builder workspace",
        icon: BriefcaseBusiness,
        run: () => {
          router.push("/portfolio");
          setOpen(false);
        }
      }
      ];
    },
    [pathname, router]
  );

  const filteredActions = actions.filter((action) => {
    const value = `${action.label} ${action.hint}`.toLowerCase();
    return value.includes(query.trim().toLowerCase());
  });

  const pageHint =
    pathname === "/ats-analyzer"
      ? "ATS page suggestions: extract a job URL, improve missing skills, then use the result for outreach."
      : pathname === "/resume"
        ? "Resume page suggestions: upload the source PDF, save edits, then compare ATS improvements."
        : pathname === "/outreach"
          ? "Outreach suggestions: add recruiters, generate drafts, and check reply probability before sending."
          : pathname === "/insights"
            ? "Insights suggestions: analyze a recruiter reply and review weak pattern recommendations."
            : pathname === "/dashboard"
              ? "Dashboard suggestions: set persona, review core stats, and jump into the next focused workspace."
              : "Use the palette to jump between ATS, outreach, insights, and AI guidance.";

  return (
    <>
      <button
        type="button"
        className="fixed bottom-5 left-5 z-[60] inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/60 backdrop-blur-xl transition hover:border-primary/20 hover:text-white"
        onClick={() => setOpen(true)}
      >
        <Command className="h-3.5 w-3.5" />
        Job OS
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div className="fixed inset-0 z-[70]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.div
              {...commandMotion}
              className="absolute left-1/2 top-[14vh] w-[min(760px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-[30px] border border-white/10 bg-[#0f0f0f]/95 shadow-[0_30px_100px_rgba(0,0,0,0.48)]"
            >
              <div className="border-b border-white/10 px-5 py-5 sm:px-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Badge className="border-primary/20 bg-primary/10 text-primary">Command Palette</Badge>
                    <p className="mt-3 text-sm leading-7 text-white/60">{pageHint}</p>
                  </div>
                  <p className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/40">
                    Ctrl/Cmd + K
                  </p>
                </div>
                <div className="mt-4 rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3">
                  <input
                    autoFocus
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
                    placeholder="Search actions..."
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-3">
                {filteredActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      className="flex w-full items-center justify-between gap-4 rounded-[24px] border border-transparent px-4 py-4 text-left transition hover:border-primary/20 hover:bg-primary/8"
                      onClick={action.run}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">{action.label}</p>
                          <p className="mt-1 text-sm text-white/45">{action.hint}</p>
                        </div>
                      </div>
                      <span className="text-xs uppercase tracking-[0.2em] text-white/25">Run</span>
                    </button>
                  );
                })}

                {filteredActions.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center text-sm text-white/45">
                    No matching commands.
                  </div>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
