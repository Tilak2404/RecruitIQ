import { describe, expect, it } from "vitest";
import { scoreOutreachEmail } from "@/lib/services/job-intelligence";

describe("email scoring", () => {
  it("returns reply score aliases and concrete issues in fast mode", async () => {
    const score = await scoreOutreachEmail({
      recruiterName: "Avery",
      recruiterEmail: "avery@northwind.com",
      company: "Northwind",
      subject: "Hello",
      body: "<p>Hello there.</p>",
      persona: "STARTUP",
      fastMode: true
    });

    expect(score.replyScore).toBe(score.score);
    expect(Array.isArray(score.issues)).toBe(true);
    expect(score.issues.length).toBeGreaterThan(0);
  });
});
