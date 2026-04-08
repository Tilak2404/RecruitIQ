"use client";

import { WandSparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { applySimulationPreset, getSimulationPresetId, simulationModules, simulationPresets, type SimulationPreset, type SimulationState } from "@/lib/dashboard-mission-control";
import { cn } from "@/lib/utils";

function ModuleCard({
  enabled,
  label,
  detail,
  impact,
  onToggle
}: {
  enabled: boolean;
  label: string;
  detail: string;
  impact: string;
  onToggle: () => void;
}) {
  return (
    <button type="button" onClick={onToggle} className={cn("rounded-[26px] border p-4 text-left transition duration-200", enabled ? "border-primary/25 bg-[linear-gradient(135deg,rgba(0,255,159,0.16),rgba(56,189,248,0.08))] shadow-[0_0_0_1px_rgba(0,255,159,0.14),0_18px_44px_rgba(0,255,159,0.12)]" : "border-white/10 bg-black/25 hover:border-cyan-400/20 hover:bg-white/[0.04]")}>
      <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-white">{label}</p><p className="mt-2 text-sm leading-7 text-white/58">{detail}</p></div><Badge className={enabled ? "border-primary/20 bg-primary/10 text-primary" : "border-white/10 bg-white/5 text-white/55"}>{enabled ? "Enabled" : "Idle"}</Badge></div>
      <div className="mt-4 text-xs uppercase tracking-[0.22em] text-white/35">{impact}</div>
    </button>
  );
}

export function DashboardSimulationPanel({
  simulation,
  onSimulationChange
}: {
  simulation: SimulationState;
  onSimulationChange: (next: SimulationState) => void;
}) {
  const activePreset = getSimulationPresetId(simulation);

  function toggleModule(key: keyof SimulationState) {
    onSimulationChange({ ...simulation, [key]: !simulation[key] });
  }

  function applyPreset(preset: SimulationPreset) {
    onSimulationChange(applySimulationPreset(preset));
  }

  return (
    <Card className="overflow-hidden border-primary/10 bg-[linear-gradient(145deg,rgba(5,10,13,0.96),rgba(7,7,9,0.94))]">
      <CardHeader className="flex-row items-start justify-between"><div><CardTitle className="flex items-center gap-2"><WandSparkles className="h-5 w-5 text-primary" />What-If Simulation Matrix</CardTitle><CardDescription>Toggle improvements and watch the pipeline re-forecast itself in real time.</CardDescription></div><Badge className="border-white/10 bg-white/5 text-white/65">{simulationModules.filter((module) => simulation[module.id]).length} active</Badge></CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2">{simulationPresets.map((preset) => <Button key={preset.id} variant={activePreset === preset.id ? "default" : "secondary"} size="sm" className={activePreset === preset.id ? "rounded-full px-4" : "rounded-full border-white/10 bg-white/[0.04] px-4 text-white/75"} onClick={() => applyPreset(preset.id)}>{preset.label}</Button>)}</div>
        <div className="grid gap-3 md:grid-cols-2">{simulationModules.map((module) => <ModuleCard key={module.id} enabled={simulation[module.id]} label={module.label} detail={module.detail} impact={module.impact} onToggle={() => toggleModule(module.id)} />)}</div>
      </CardContent>
    </Card>
  );
}
