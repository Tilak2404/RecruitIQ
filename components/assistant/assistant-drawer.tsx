"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Copy, Send, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { VoiceInputButton } from "@/components/shared/voice-input-button";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/http";
import { cn } from "@/lib/utils";
import { formatAssistantMessageTime, getMessageActions } from "@/lib/workspace-ui";
import type { AssistantMessageSummary } from "@/types/app";

const assistantQuickPrompts = [
  "Write a LinkedIn DM for a Google recruiter",
  "How should I improve my outreach strategy this week?",
  "What follow-up plan should I use for non-responsive recruiters?"
];

type AssistantResponsePayload = {
  reply: AssistantMessageSummary;
  messages: AssistantMessageSummary[];
};

function AssistantPanel({
  assistantLoading,
  assistantMessages,
  assistantPrompt,
  copiedMessageId,
  onClose,
  onCopyMessage,
  onPromptChange,
  onSubmit,
  scrollRef,
  inputRef
}: {
  assistantLoading: boolean;
  assistantMessages: AssistantMessageSummary[];
  assistantPrompt: string;
  copiedMessageId: string | null;
  onClose: () => void;
  onCopyMessage: (message: AssistantMessageSummary) => Promise<void>;
  onPromptChange: (value: string) => void;
  onSubmit: (overridePrompt?: string) => Promise<void>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#0b0b0b]/98 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,255,159,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.05),transparent_32%),linear-gradient(180deg,rgba(15,15,15,0.98),rgba(11,11,11,0.98))]" />

      <div className="relative flex items-start justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-6">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Live Copilot
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-white">AI Assistant</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-white/50">
            Memory-aware help for timing, messaging, LinkedIn outreach, and follow-ups.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-full border border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
          aria-label="Close assistant"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div ref={scrollRef} className="relative flex-1 min-h-0 overflow-y-auto px-5 py-5 sm:px-6">
        <div className="space-y-4 pb-2">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/40">Quick Start</p>
            <p className="mt-3 text-sm leading-7 text-white/70">
              Ask for recruiter strategy, a LinkedIn DM, reply guidance, or the best time to reach out.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {assistantQuickPrompts.map((prompt) => (
                <Button
                  key={prompt}
                  variant="secondary"
                  size="sm"
                  className="rounded-full border-white/10 bg-white/[0.06] px-4 text-white/80 hover:border-primary/25 hover:bg-primary/10 hover:text-white"
                  onClick={() => void onSubmit(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>

          {assistantMessages.length > 0 ? (
            assistantMessages.map((message) => {
              const isAssistant = message.role === "ASSISTANT";
              const actions = getMessageActions(message.metadata);
              const copied = copiedMessageId === message.id;

              return (
                <div key={message.id} className={cn("group flex", isAssistant ? "justify-start" : "justify-end")}>
                  <div
                    className={cn(
                      "max-w-[92%] rounded-[28px] border px-4 py-4 text-sm shadow-[0_18px_50px_rgba(0,0,0,0.24)] transition-transform duration-200 group-hover:-translate-y-0.5",
                      isAssistant
                        ? "border-primary/15 bg-[linear-gradient(145deg,rgba(0,255,159,0.12),rgba(255,255,255,0.03))] text-white shadow-[0_18px_50px_rgba(0,0,0,0.3),0_0_28px_rgba(0,255,159,0.08)]"
                        : "border-white/10 bg-white/[0.05] text-white/80"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">
                          {isAssistant ? "Assistant" : "You"}
                        </p>
                        <p className="mt-1 text-xs text-white/30">{formatAssistantMessageTime(message.createdAt)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-full px-3 text-white/55 hover:bg-white/5 hover:text-white"
                        onClick={() => void onCopyMessage(message)}
                      >
                        {copied ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                        {copied ? "Copied" : "Copy"}
                      </Button>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap leading-7 text-white/80">{message.content}</p>

                    {actions.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {actions.map((action) => (
                          <Button
                            key={action}
                            variant="secondary"
                            size="sm"
                            className="rounded-full border-white/10 bg-white/[0.06] px-4 text-white/80 hover:border-primary/25 hover:bg-primary/10 hover:text-white"
                            onClick={() => void onSubmit(action)}
                          >
                            {action}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-[28px] border border-dashed border-white/15 bg-black/20 px-5 py-6 text-sm leading-7 text-white/45">
              Your assistant keeps conversation memory, suggested next steps, and copyable replies in one focused overlay.
            </div>
          )}

          {assistantLoading ? (
            <div className="flex justify-start">
              <div className="max-w-[92%] rounded-[28px] border border-primary/15 bg-[linear-gradient(145deg,rgba(0,255,159,0.1),rgba(255,255,255,0.03))] px-4 py-4 shadow-[0_18px_50px_rgba(0,0,0,0.3),0_0_28px_rgba(0,255,159,0.08)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">Assistant</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="assistant-typing-dot h-2.5 w-2.5 rounded-full bg-primary" style={{ animationDelay: "0ms" }} />
                  <span className="assistant-typing-dot h-2.5 w-2.5 rounded-full bg-primary" style={{ animationDelay: "160ms" }} />
                  <span className="assistant-typing-dot h-2.5 w-2.5 rounded-full bg-primary" style={{ animationDelay: "320ms" }} />
                  <span className="ml-2 text-sm text-white/55">Thinking...</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="relative border-t border-white/10 bg-black/30 px-5 py-5 sm:px-6">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.24)]">
          <Textarea
            ref={inputRef}
            value={assistantPrompt}
            onChange={(event) => onPromptChange(event.target.value)}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                event.preventDefault();
                void onSubmit();
              }
            }}
            className="min-h-[120px] resize-none border-0 bg-transparent px-3 py-2 text-[15px] text-white shadow-none focus:border-transparent focus:ring-0"
            placeholder="Ask about reply strategy, follow-ups, best send times, or a LinkedIn message..."
          />
          <div className="mt-3 flex items-center justify-between gap-3 px-3 pb-1">
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">Ctrl + Enter to send</p>
            <div className="flex items-center gap-2">
              <VoiceInputButton
                className="h-11 w-11 rounded-full border border-white/10 bg-white/[0.04] text-white/70"
                disabled={assistantLoading}
                onTranscript={(value) => onPromptChange(`${assistantPrompt}${assistantPrompt ? " " : ""}${value}`)}
              />
              <Button className="h-11 rounded-full px-5 text-sm shadow-glow" disabled={assistantLoading} onClick={() => void onSubmit()}>
                <Send className="h-4 w-4" />
                {assistantLoading ? "Thinking..." : "Send"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AssistantDrawer({ initialMessages }: { initialMessages: AssistantMessageSummary[] }) {
  const [assistantMessages, setAssistantMessages] = useState(initialMessages);
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const assistantFeedRef = useRef<HTMLDivElement>(null);
  const assistantInputRef = useRef<HTMLTextAreaElement>(null);
  const copyResetTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setAssistantMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    if (!assistantOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAssistantOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [assistantOpen]);

  useEffect(() => {
    function consumeQueuedPrompt() {
      const queuedPrompt = window.sessionStorage.getItem("job-os-command-prompt");
      if (!queuedPrompt) {
        return;
      }

      window.sessionStorage.removeItem("job-os-command-prompt");
      setAssistantOpen(true);
      setAssistantPrompt(queuedPrompt);
    }

    function handleAssistantPrompt(event: Event) {
      const detail = (event as CustomEvent<{ prompt?: string; openAssistant?: boolean }>).detail;
      if (!detail?.prompt) {
        return;
      }

      if (detail.openAssistant) {
        setAssistantOpen(true);
      }

      setAssistantPrompt(detail.prompt);
    }

    consumeQueuedPrompt();
    window.addEventListener("jobos:assistant-prompt", handleAssistantPrompt);
    return () => window.removeEventListener("jobos:assistant-prompt", handleAssistantPrompt);
  }, []);

  useEffect(() => {
    return () => {
      if (copyResetTimeoutRef.current) {
        window.clearTimeout(copyResetTimeoutRef.current);
      }
    };
  }, []);

  const latestAssistantMessageId = assistantMessages[assistantMessages.length - 1]?.id;

  useEffect(() => {
    if (!assistantOpen) return;

    const frame = window.requestAnimationFrame(() => {
      assistantInputRef.current?.focus();
      assistantFeedRef.current?.scrollTo({
        top: assistantFeedRef.current.scrollHeight,
        behavior: "smooth"
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [assistantLoading, assistantOpen, latestAssistantMessageId]);

  async function copyToClipboard(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
      return true;
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}.`);
      return false;
    }
  }

  async function handleAssistantMessageCopy(message: AssistantMessageSummary) {
    const copied = await copyToClipboard(message.content, message.role === "ASSISTANT" ? "Assistant reply" : "Prompt");
    if (!copied) return;

    setCopiedMessageId(message.id);
    if (copyResetTimeoutRef.current) {
      window.clearTimeout(copyResetTimeoutRef.current);
    }
    copyResetTimeoutRef.current = window.setTimeout(() => setCopiedMessageId(null), 1800);
  }

  async function handleAssistantSubmit(overridePrompt?: string) {
    const content = (overridePrompt ?? assistantPrompt).trim();
    if (!content) {
      toast.error("Ask the assistant something first.");
      return;
    }

    setAssistantLoading(true);

    try {
      const result = await apiFetch<AssistantResponsePayload>("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
      });
      setAssistantMessages(result.messages);
      setAssistantPrompt("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Assistant request failed.");
    } finally {
      setAssistantLoading(false);
    }
  }

  return (
    <>
      <AnimatePresence>
        {!assistantOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed bottom-6 right-6 z-40"
          >
            <button
              type="button"
              aria-label="Open assistant"
              className="group flex items-center gap-3 rounded-full border border-primary/20 bg-[#00ff9f] px-5 py-3 text-sm font-semibold text-black shadow-[0_18px_50px_rgba(0,255,159,0.24)] transition duration-200 hover:scale-[1.03] hover:shadow-[0_20px_60px_rgba(0,255,159,0.34)]"
              onClick={() => setAssistantOpen(true)}
            >
              <Sparkles className="h-4 w-4 transition duration-200 group-hover:rotate-6" />
              Ask Assistant
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {assistantOpen ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50">
            <button
              type="button"
              aria-label="Close assistant"
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setAssistantOpen(false)}
            />
            <motion.div
              initial={false}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="absolute inset-y-0 right-0 h-full w-full lg:w-[40vw]"
              aria-label="AI Assistant"
              aria-modal="true"
              role="dialog"
            >
              <div className="animate-slide-in h-full w-full bg-[#0f0f0f] shadow-[0_0_60px_rgba(0,0,0,0.52)] lg:border-l lg:border-neutral-800">
                <AssistantPanel
                  assistantLoading={assistantLoading}
                  assistantMessages={assistantMessages}
                  assistantPrompt={assistantPrompt}
                  copiedMessageId={copiedMessageId}
                  onClose={() => setAssistantOpen(false)}
                  onCopyMessage={handleAssistantMessageCopy}
                  onPromptChange={setAssistantPrompt}
                  onSubmit={handleAssistantSubmit}
                  scrollRef={assistantFeedRef}
                  inputRef={assistantInputRef}
                />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
