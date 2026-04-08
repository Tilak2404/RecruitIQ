"use client";

import { Bot, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { InsightModel, WorkflowStep } from "@/lib/dashboard-mission-control";

export function DashboardInsightPanel({
  insights,
  workflow,
  onRunCommand
}: {
  insights: InsightModel[];
  workflow: WorkflowStep[];
  onRunCommand: (command: string) => Promise<void>;
}) {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-cyan-400/10 bg-[linear-gradient(145deg,rgba(5,10,15,0.96),rgba(7,8,10,0.94))]">
        <CardHeader><CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-primary" />AI Insight Panel</CardTitle><CardDescription>Current bottlenecks, weak points, and recommendations generated from live system state.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {insights.map((item) => (
            <div key={item.title} className="rounded-[24px] border border-white/10 bg-black/25 p-4">
              <div className="flex items-start justify-between gap-4">
                <div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-white">{item.title}</p><Badge className={item.severity === "critical" ? "border-red-400/25 bg-red-400/10 text-red-200" : item.severity === "warning" ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-100" : "border-white/10 bg-white/5 text-white/55"}>{item.severity}</Badge></div><p className="mt-3 text-sm leading-7 text-white/62">{item.detail}</p></div>
                <Button variant="secondary" size="sm" className="rounded-full px-4" onClick={() => void onRunCommand(item.command)}>{item.action}</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="overflow-hidden border-primary/10 bg-[linear-gradient(145deg,rgba(5,11,13,0.96),rgba(7,7,9,0.94))]">
        <CardHeader><CardTitle className="flex items-center gap-2"><Workflow className="h-5 w-5 text-primary" />Suggested Workflow</CardTitle><CardDescription>The AI system is recommending the next sequence of moves based on your weakest stages.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {workflow.map((item) => (
            <div key={item.title} className="rounded-[24px] border border-white/10 bg-black/25 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="max-w-[80%]"><p className="font-semibold text-white">{item.title}</p><p className="mt-2 text-sm leading-7 text-white/62">{item.detail}</p></div>
                <Button variant="ghost" size="sm" className="rounded-full px-3 text-primary" onClick={() => void onRunCommand(item.command)}>{item.action}</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
