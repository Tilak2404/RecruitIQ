import type { EmailStatus } from "@prisma/client";
import {
  BrainCircuit,
  BriefcaseBusiness,
  Building2,
  FlaskConical,
  LayoutDashboard,
  Mail,
  ScanSearch,
  Send,
  Settings2,
  Sparkles
} from "lucide-react";

export const navigation = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard
  },
  {
    href: "/resume",
    label: "Resume Lab",
    icon: BriefcaseBusiness
  },
  {
    href: "/ats-analyzer",
    label: "ATS Analyzer",
    icon: ScanSearch
  },
  {
    href: "/outreach",
    label: "Outreach",
    icon: Send
  },
  {
    href: "/ab-testing",
    label: "A/B Testing",
    icon: FlaskConical
  },
  {
    href: "/insights",
    label: "Insights",
    icon: Sparkles
  },
  {
    href: "/company",
    label: "Company Research",
    icon: Building2
  },
  {
    href: "/portfolio",
    label: "Portfolio Builder",
    icon: BrainCircuit
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings2
  }
] as const;

export const statusTone: Record<
  EmailStatus,
  {
    label: string;
    className: string;
  }
> = {
  DRAFT: {
    label: "Draft",
    className: "border-zinc-400/20 bg-zinc-400/10 text-zinc-200"
  },
  NOT_SENT: {
    label: "Pending",
    className: "border-zinc-400/20 bg-zinc-400/10 text-zinc-200"
  },
  SENT: {
    label: "Sent",
    className: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
  },
  OPENED: {
    label: "Opened",
    className: "border-cyan-400/25 bg-cyan-400/10 text-cyan-300"
  },
  REPLIED: {
    label: "Replied",
    className: "border-lime-400/30 bg-lime-400/10 text-lime-300"
  },
  FAILED: {
    label: "Failed",
    className: "border-red-400/25 bg-red-400/10 text-red-300"
  }
};

export const heroKpis = [
  {
    label: "Cold outreach orchestrated",
    value: "Multi-domain",
    description: "Gmail + custom SMTP rotation",
    icon: Mail
  },
  {
    label: "AI personalization layer",
    value: "Gemini",
    description: "Per-recruiter subject + body generation",
    icon: BriefcaseBusiness
  }
] as const;
