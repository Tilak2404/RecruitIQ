import { describe, expect, it, vi } from "vitest";

const {
  resumeFindFirst,
  recruiterCount,
  sendingAccountCount,
  emailLogFindMany
} = vi.hoisted(() => ({
  resumeFindFirst: vi.fn(),
  recruiterCount: vi.fn(),
  sendingAccountCount: vi.fn(),
  emailLogFindMany: vi.fn()
}));

const { getRecentAtsAnalyses } = vi.hoisted(() => ({
  getRecentAtsAnalyses: vi.fn()
}));

const { getOutreachOverview } = vi.hoisted(() => ({
  getOutreachOverview: vi.fn()
}));

const { getJobOsSettings } = vi.hoisted(() => ({
  getJobOsSettings: vi.fn()
}));

const { scoreOutreachEmail } = vi.hoisted(() => ({
  scoreOutreachEmail: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    resume: {
      findFirst: resumeFindFirst
    },
    recruiter: {
      count: recruiterCount
    },
    sendingAccount: {
      count: sendingAccountCount
    },
    emailLog: {
      findMany: emailLogFindMany
    }
  }
}));

vi.mock("@/lib/services/ats", () => ({
  getRecentAtsAnalyses
}));

vi.mock("@/lib/services/strategy", () => ({
  getOutreachOverview
}));

vi.mock("@/lib/services/job-os", () => ({
  getJobOsSettings
}));

vi.mock("@/lib/services/job-intelligence", () => ({
  scoreOutreachEmail
}));

import { getApplyReadinessSnapshot, getImprovementLoopSnapshot } from "@/lib/services/readiness";

describe("readiness service", () => {
  it("flags blockers when the system is not fully ready", async () => {
    resumeFindFirst.mockResolvedValue({ extractedText: "Resume content" });
    recruiterCount.mockResolvedValue(0);
    sendingAccountCount.mockResolvedValue(0);
    getRecentAtsAnalyses.mockResolvedValue([]);
    getOutreachOverview.mockResolvedValue({
      totalSent: 0,
      replies: 0,
      responseRate: 0,
      pending: 0,
      scheduled: 0,
      followUpsDue: 0
    });

    const readiness = await getApplyReadinessSnapshot();

    expect(readiness.ready).toBe(false);
    expect(readiness.blockers.join(" ")).toContain("ATS analysis");
    expect(readiness.blockers.join(" ")).toContain("sending account");
  });

  it("builds improvement loop labels from ATS and email quality trends", async () => {
    getRecentAtsAnalyses.mockResolvedValue([
      { atsScore: 78 },
      { atsScore: 62 }
    ]);
    getJobOsSettings.mockResolvedValue({ persona: "STARTUP" });
    emailLogFindMany.mockResolvedValue([
      {
        subject: "A",
        body: "<p>1</p>",
        recruiter: { name: "A", email: "a@example.com", company: "Northwind" }
      },
      {
        subject: "B",
        body: "<p>2</p>",
        recruiter: { name: "B", email: "b@example.com", company: "Northwind" }
      },
      {
        subject: "C",
        body: "<p>3</p>",
        recruiter: { name: "C", email: "c@example.com", company: "Northwind" }
      },
      {
        subject: "D",
        body: "<p>4</p>",
        recruiter: { name: "D", email: "d@example.com", company: "Northwind" }
      },
      {
        subject: "E",
        body: "<p>5</p>",
        recruiter: { name: "E", email: "e@example.com", company: "Northwind" }
      },
      {
        subject: "F",
        body: "<p>6</p>",
        recruiter: { name: "F", email: "f@example.com", company: "Northwind" }
      }
    ]);
    scoreOutreachEmail
      .mockResolvedValueOnce({ replyScore: 80 })
      .mockResolvedValueOnce({ replyScore: 78 })
      .mockResolvedValueOnce({ replyScore: 76 })
      .mockResolvedValueOnce({ replyScore: 60 })
      .mockResolvedValueOnce({ replyScore: 58 })
      .mockResolvedValueOnce({ replyScore: 56 });

    const loop = await getImprovementLoopSnapshot();

    expect(loop.atsScoreLabel).toContain("62 -> 78");
    expect(loop.emailScoreLabel).toContain("58 -> 78");
    expect(loop.highlights.length).toBeGreaterThan(0);
  });
});
