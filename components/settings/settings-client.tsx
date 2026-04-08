"use client";

import { Mail, ShieldCheck, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/http";
import type { AccountSummary, JobTargetPersona } from "@/types/app";

const selectClassName =
  "flex h-11 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20";

export function SettingsClient({
  accounts,
  initialPersona
}: {
  accounts: AccountSummary[];
  initialPersona: JobTargetPersona;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [persona, setPersona] = useState<JobTargetPersona>(initialPersona);
  const [form, setForm] = useState({
    name: "",
    type: "GMAIL",
    fromName: "",
    email: "",
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpSecure: false,
    password: "",
    dailyLimit: 75,
    hourlyLimit: 20,
    isActive: true
  });

  async function handlePersonaChange(nextPersona: JobTargetPersona) {
    setPersona(nextPersona);

    try {
      await apiFetch("/api/job-os/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona: nextPersona })
      });
      toast.success("Persona updated.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the persona.");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      await apiFetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      toast.success("Sending account saved.");
      setForm({
        name: "",
        type: "GMAIL",
        fromName: "",
        email: "",
        smtpHost: "smtp.gmail.com",
        smtpPort: 587,
        smtpSecure: false,
        password: "",
        dailyLimit: 75,
        hourlyLimit: 20,
        isActive: true
      });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save account.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleAccount(id: string, isActive: boolean) {
    try {
      await apiFetch("/api/accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !isActive })
      });
      toast.success(isActive ? "Account paused." : "Account activated.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update account.");
    }
  }

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        badge="Settings"
        title="Manage workspace defaults and sending infrastructure."
        description="Keep persona preferences, Gmail or SMTP rotation, and rate limits in one configuration page so the rest of the product stays focused on execution."
      />

      <section className="grid gap-6 xl:grid-cols-[0.42fr_0.58fr]">
        <Card>
          <CardHeader>
            <CardTitle>Workspace Persona</CardTitle>
            <CardDescription>Set the default voice and emphasis used across analysis, outreach, and strategy pages.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <select
              className={selectClassName}
              value={persona}
              onChange={(event) => void handlePersonaChange(event.target.value as JobTargetPersona)}
            >
              <option value="STARTUP">Startup</option>
              <option value="BIG_TECH">Big Tech</option>
              <option value="HR_RECRUITER">HR Recruiter</option>
              <option value="HIRING_MANAGER">Hiring Manager</option>
            </select>
            <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-white/60">
              {persona === "STARTUP"
                ? "Startup mode favors ownership, pace, experimentation, and direct outcome framing."
                : persona === "BIG_TECH"
                  ? "Big Tech mode favors scale, reliability, systems thinking, and polished cross-functional communication."
                  : persona === "HR_RECRUITER"
                    ? "HR Recruiter mode favors clarity, keyword alignment, and easy top-of-funnel readability."
                    : "Hiring Manager mode favors execution depth, practical tradeoffs, and hands-on impact."}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add Sending Account</CardTitle>
            <CardDescription>Configure Gmail SMTP or a custom domain with explicit rate limits for safer send runs.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <Input placeholder="Account label" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  className={selectClassName}
                  value={form.type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      type: event.target.value,
                      smtpHost: event.target.value === "GMAIL" ? "smtp.gmail.com" : current.smtpHost,
                      smtpPort: event.target.value === "GMAIL" ? 587 : current.smtpPort
                    }))
                  }
                >
                  <option value="GMAIL">Gmail SMTP</option>
                  <option value="CUSTOM">Custom SMTP</option>
                </select>
                <Input placeholder="From name" value={form.fromName} onChange={(event) => setForm((current) => ({ ...current, fromName: event.target.value }))} />
              </div>
              <Input placeholder="Email address" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input placeholder="SMTP host" value={form.smtpHost} onChange={(event) => setForm((current) => ({ ...current, smtpHost: event.target.value }))} />
                <Input type="number" placeholder="SMTP port" value={form.smtpPort} onChange={(event) => setForm((current) => ({ ...current, smtpPort: Number(event.target.value) }))} />
              </div>
              <Input type="password" placeholder="SMTP password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input type="number" placeholder="Daily limit" value={form.dailyLimit} onChange={(event) => setForm((current) => ({ ...current, dailyLimit: Number(event.target.value) }))} />
                <Input type="number" placeholder="Hourly limit" value={form.hourlyLimit} onChange={(event) => setForm((current) => ({ ...current, hourlyLimit: Number(event.target.value) }))} />
              </div>
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">
                <input type="checkbox" checked={form.smtpSecure} onChange={(event) => setForm((current) => ({ ...current, smtpSecure: event.target.checked }))} />
                Use secure SMTP transport
              </label>
              <Button type="submit" className="w-full" disabled={loading}>
                <ShieldCheck className="h-4 w-4" />
                {loading ? "Saving account..." : "Save account"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Account Pool</CardTitle>
          <CardDescription>Active accounts participate in rotation immediately. Paused accounts are skipped from future send runs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {accounts.length > 0 ? (
            accounts.map((account) => (
              <div key={account.id} className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                        <Mail className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{account.name}</p>
                        <p className="text-sm text-white/45">{account.email}</p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2 text-sm text-white/55 sm:grid-cols-2">
                      <p>Type: {account.type}</p>
                      <p>SMTP: {account.smtpHost}:{account.smtpPort}</p>
                      <p>Daily limit: {account.dailyLimit}</p>
                      <p>Hourly limit: {account.hourlyLimit}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-3 sm:items-end">
                    <Badge className={account.isActive ? "bg-primary/10 text-primary" : "bg-white/10 text-white/50"}>{account.isActive ? "Active" : "Paused"}</Badge>
                    <Button variant="secondary" size="sm" onClick={() => void toggleAccount(account.id, account.isActive)}>
                      {account.isActive ? "Pause" : "Activate"}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-white/50">No sending accounts configured yet.</p>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-6 md:grid-cols-3">
        {[
          {
            title: "Gmail ready",
            description: "Use app passwords with smtp.gmail.com:587 for fast setup.",
            icon: Mail
          },
          {
            title: "Custom domains",
            description: "Plug in any SMTP provider to spread campaigns across multiple domains.",
            icon: Zap
          },
          {
            title: "Rate limiting",
            description: "Daily and hourly caps protect deliverability during larger outreach runs.",
            icon: ShieldCheck
          }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title}>
              <CardHeader>
                <div className="w-fit rounded-2xl bg-primary/10 p-3 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="mt-3">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
