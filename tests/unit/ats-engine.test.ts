import { describe, expect, it } from "vitest";
import { analyzeAtsCompatibility, extractJobProfile } from "@/lib/ats/engine";

describe("ATS engine", () => {
  it("extracts a role profile and separates critical vs important skills", () => {
    const profile = extractJobProfile(`
      We are hiring a Full-Stack Engineer.
      Required: TypeScript, React, Node.js, PostgreSQL, AWS.
      Nice to have: Docker, GraphQL.
    `);

    expect(profile.role).toContain("full-stack engineer");
    expect(profile.criticalSkills).toEqual(expect.arrayContaining(["typescript", "react", "node.js", "postgresql", "aws"]));
    expect(profile.importantSkills).toEqual(expect.arrayContaining(["docker", "graphql"]));
  });

  it("returns section scores, missing skill buckets, and safe improvements", () => {
    const result = analyzeAtsCompatibility({
      resumeText: `
        SUMMARY
        Full-stack engineer building React and Node.js products.

        SKILLS
        React
        TypeScript
        Node.js

        EXPERIENCE
        Built React dashboards and Node.js APIs used by internal teams.
        Improved release quality with Vitest and API regression checks.

        PROJECTS
        Built a portfolio app with React and PostgreSQL.
      `,
      jobDescription: `
        Full-Stack Engineer
        Required: TypeScript, React, Node.js, PostgreSQL, AWS.
        Nice to have: Docker.
      `,
      persona: "STARTUP"
    });

    expect(result.atsScore).toBeGreaterThan(0);
    expect(result.sections).toHaveLength(4);
    expect(result.matchedKeywords).toEqual(expect.arrayContaining(["typescript", "react", "node.js", "postgresql"]));
    expect(result.missing_skills.critical).toContain("aws");
    expect(result.improvements.join(" ")).toMatch(/Only if accurate, add concrete evidence/i);
    expect(result.improvedBulletPoints.length).toBeGreaterThanOrEqual(1);
  });
});
