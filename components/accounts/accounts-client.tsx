"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Mail, ShieldCheck, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/http";
import type { AccountSummary } from "@/types/app";

const selectClassName =
  "flex h-11 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20";

export function AccountsClient({ accounts }: { accounts: AccountSummary[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="rounded-[32px] border border-white/10 bg-black/30 p-8 backdrop-blur-xl">
        <Badge className="border-primary/20 bg-primary/10 text-primary">Sending Accounts</Badge>
        <h1 className="mt-4 text-4xl font-bold text-white">Rotate Gmail and custom domains without losing control of limits or deliverability.</h1>
        <p className="mt-3 max-w-3xl text-white/60">Each account stores its SMTP credentials, hourly caps, and daily caps so campaigns can rotate automatically instead of burning a single inbox.</p>
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[0.5fr_0.5fr]">
        <Card>
          <CardHeader>
            <CardTitle>Add sending account</CardTitle>
            <CardDescription>Configure Gmail SMTP or a custom domain with explicit rate limits for safer send runs.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <Input placeholder="Account label" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
              <div className="grid gap-3 sm:grid-cols-2">
                <select className={selectClassName} value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value, smtpHost: event.target.value === "GMAIL" ? "smtp.gmail.com" : current.smtpHost, smtpPort: event.target.value === "GMAIL" ? 587 : current.smtpPort }))}>
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

        <Card>
          <CardHeader>
            <CardTitle>Account pool</CardTitle>
            <CardDescription>Active accounts participate in automatic rotation. Paused accounts are excluded from send runs immediately.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {accounts.map((account) => (
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
            ))}
            {accounts.length === 0 ? <p className="text-white/50">No sending accounts configured yet.</p> : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
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
                <div className="rounded-2xl bg-primary/10 p-3 text-primary w-fit">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="mt-3">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
