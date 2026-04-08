import { prisma } from "@/lib/prisma";

export interface OutreachOverview {
  totalSent: number;
  replies: number;
  responseRate: number;
  pending: number;
  scheduled: number;
  followUpsDue: number;
}

export interface SendTimeSuggestion {
  recommendedDay: string;
  recommendedWindow: string;
  rationale: string;
  confidenceLabel: string;
}

const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getWindowLabel(hour: number) {
  if (hour >= 8 && hour < 10) {
    return "8:00 AM - 10:00 AM";
  }

  if (hour >= 10 && hour < 12) {
    return "10:00 AM - 12:00 PM";
  }

  if (hour >= 13 && hour < 15) {
    return "1:00 PM - 3:00 PM";
  }

  return "9:00 AM - 11:00 AM";
}

export function getDueFollowUpStage(log: {
  sentAt: Date | null;
  lastSentAt: Date | null;
  repliedAt: Date | null;
  followUpStage: number;
  status: string;
}) {
  if (!log.sentAt || log.repliedAt || !["SENT", "OPENED"].includes(log.status)) {
    return null;
  }

  const now = Date.now();
  const initialSend = new Date(log.sentAt).getTime();
  const latestTouchpoint = new Date(log.lastSentAt ?? log.sentAt).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  if (log.followUpStage === 0 && now - initialSend >= 3 * dayMs) {
    return 1;
  }

  if (log.followUpStage === 1 && now - latestTouchpoint >= 4 * dayMs) {
    return 2;
  }

  return null;
}

export async function getOutreachOverview(): Promise<OutreachOverview> {
  const now = new Date();

  const [totalSent, replies, pending, scheduled, followUpCandidates] = await prisma.$transaction([
    prisma.emailLog.count({ where: { sentAt: { not: null } } }),
    prisma.emailLog.count({ where: { repliedAt: { not: null } } }),
    prisma.emailLog.count({ where: { status: "NOT_SENT" } }),
    prisma.emailLog.count({ where: { status: "NOT_SENT", scheduledAt: { gt: now } } }),
    prisma.emailLog.findMany({
      where: {
        sentAt: { not: null },
        repliedAt: null,
        followUpStage: { lt: 2 },
        status: { in: ["SENT", "OPENED"] }
      },
      select: {
        sentAt: true,
        lastSentAt: true,
        repliedAt: true,
        followUpStage: true,
        status: true
      }
    })
  ]);

  const followUpsDue = followUpCandidates.filter((candidate) => getDueFollowUpStage(candidate) !== null).length;

  return {
    totalSent,
    replies,
    responseRate: totalSent ? (replies / totalSent) * 100 : 0,
    pending,
    scheduled,
    followUpsDue
  };
}

export async function getBestSendTimeSuggestion(): Promise<SendTimeSuggestion> {
  const successfulReplyLogs = await prisma.emailLog.findMany({
    where: {
      sentAt: { not: null },
      repliedAt: { not: null }
    },
    select: {
      sentAt: true
    },
    take: 50
  });

  if (successfulReplyLogs.length < 3) {
    return {
      recommendedDay: "Tuesday to Thursday",
      recommendedWindow: "8:00 AM - 10:00 AM",
      rationale:
        "Recruiters are usually more responsive during weekday mornings. Avoid weekends and late evenings unless you already have an active thread.",
      confidenceLabel: "Heuristic"
    };
  }

  const weekdayCounts = new Map<number, number>();
  const hourCounts = new Map<number, number>();

  for (const entry of successfulReplyLogs) {
    if (!entry.sentAt) {
      continue;
    }

    const sentAt = new Date(entry.sentAt);
    weekdayCounts.set(sentAt.getDay(), (weekdayCounts.get(sentAt.getDay()) ?? 0) + 1);
    hourCounts.set(sentAt.getHours(), (hourCounts.get(sentAt.getHours()) ?? 0) + 1);
  }

  const bestWeekday = [...weekdayCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 2;
  const bestHour = [...hourCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 9;

  return {
    recommendedDay: weekdayNames[bestWeekday],
    recommendedWindow: getWindowLabel(bestHour),
    rationale: `This recommendation is based on ${successfulReplyLogs.length} past sends that received replies.`,
    confidenceLabel: "Data-informed"
  };
}

