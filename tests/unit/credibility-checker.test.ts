import { describe, expect, it } from "vitest";
import { analyzeBulletCredibility, analyzeBulletSet } from "@/lib/credibility/checker";

describe("credibility checker", () => {
  it("flags vague bullets and suggests grounded improvements", () => {
    const result = analyzeBulletCredibility("Helped with backend work");

    expect(result.score).toBeLessThan(80);
    expect(result.issues.join(" ")).toMatch(/measurable outcome|technical depth/i);
    expect(result.improved[0]).toMatch(/Add a measurable result only if you can verify it/i);
  });

  it("scores stronger technical bullets higher", () => {
    const results = analyzeBulletSet([
      "Built Node.js APIs that reduced manual review time by 35% across 4 recruiter workflows.",
      "Worked on product features."
    ]);

    expect(results[0].score).toBeGreaterThan(results[1].score);
  });
});
