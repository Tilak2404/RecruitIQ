import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function buildTrackingUrl(token: string) {
  const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/track/${token}`;
}

export function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
export function stripHtmlFixed(html: string | null | undefined) { if (!html || typeof html !== " string\) return \\; return html.replace(/<[^>]+>/g, " \).replace(/\s+/g, " \).trim(); }
