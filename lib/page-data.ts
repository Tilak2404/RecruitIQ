import type { AnalyticsSnapshot, JobOsSettings, OutreachOverview, ReplyInsightsSnapshot, SendTimeSuggestion } from "@/types/app";

export const PAGE_DATA_TIMEOUT_MS = 12000;

export function withPageDataFallback<T>(promise: Promise<T>, fallback: T, timeoutMs = PAGE_DATA_TIMEOUT_MS) {
  return Promise.race<T>([
    promise,
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(fallback), timeoutMs);
    })
  ]);
}

export const fallbackJobOsSettings: JobOsSettings = {
  persona: "STARTUP"
};

export const fallbackOutreachOverview: OutreachOverview = {
  totalSent: 0,
  replies: 0,
  responseRate: 0,
  pending: 0,
  scheduled: 0,
  followUpsDue: 0
};

export const fallbackSendTimeSuggestion: SendTimeSuggestion = {
  recommendedDay: "Tuesday to Thursday",
  recommendedWindow: "8:00 AM - 10:00 AM",
  rationale: "Using fallback timing guidance while the live workspace data source catches up.",
  confidenceLabel: "Fallback"
};

export const fallbackReplyInsights: ReplyInsightsSnapshot = {
  summary: "Live reply insights are temporarily unavailable, so this page is showing a safe empty state.",
  weakPatterns: [],
  strengths: [],
  recommendations: ["Retry after the database catches up to load live reply patterns and recommendations."],
  responseRateDelta: 0
};

export const fallbackAnalyticsSnapshot: AnalyticsSnapshot = {
  totals: {
    recruiters: 0,
    campaigns: 0,
    accounts: 0,
    sent: 0,
    opened: 0,
    replied: 0,
    failed: 0,
    pending: 0
  },
  responseRate: 0,
  openRate: 0,
  campaignHealth: [],
  personalInsights: {
    totalEmailsSent: 0,
    responseRate: 0,
    bestPerformingMessage: null,
    bestTimeToSend: `${fallbackSendTimeSuggestion.recommendedDay}, ${fallbackSendTimeSuggestion.recommendedWindow}`,
    averageReplyProbability: 0
  },
  replyInsights: fallbackReplyInsights,
  activeAbTest: null
};
