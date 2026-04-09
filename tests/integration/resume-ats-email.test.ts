import { describe, expect, it } from "vitest";
import { detectResumeSections } from "@/lib/resume/sections";
import { analyzeAtsCompatibility } from "@/lib/ats/engine";
import { buildOutreachEmailDraft } from "@/lib/email/generator";
import { analyzeConsistency } from "@/lib/consistency/engine";

describe("resume -> ATS -> email flow", () => {
  it("keeps ATS evidence and outreach messaging aligned", () => {
    const resumeText = `
      SUMMARY
      Full-stack engineer with experience in React, TypeScript, Node.js, PostgreSQL, and API automation.

      SKILLS
      React
      TypeScript
      Node.js
      PostgreSQL

      EXPERIENCE
      Built Node.js APIs and React dashboards that reduced manual recruiter operations by 30%.
      Automated reporting workflows with TypeScript and SQL.
    `;

    const jobDescription = `
      Full-Stack Engineer
      Required: React, TypeScript, Node.js, PostgreSQL.
      Nice to have: AWS.
    `;

    const sections = detectResumeSections(resumeText);
    const ats = analyzeAtsCompatibility({
      resumeText,
      jobDescription,
      persona: "STARTUP",
      sections
    });
    const email = buildOutreachEmailDraft({
      recruiterName: "Jordan",
      company: "Acme",
      candidateName: "Tilak",
      persona: "STARTUP",
      verifiedSkills: ats.matchedKeywords.slice(0, 3)
    });
    const consistency = analyzeConsistency({
      resumeText,
      jobDescription,
      emailDraft: email.body,
      sections
    });

    expect(ats.atsScore).toBeGreaterThan(60);
    expect(email.body).toContain("Acme");
    expect(consistency.consistencyScore).toBeGreaterThan(50);
  });
});
