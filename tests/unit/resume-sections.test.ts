import { describe, expect, it } from "vitest";
import { detectResumeSections, flattenResumeSections, getResumeBullets, getSectionText } from "@/lib/resume/sections";

const resumeText = `
SUMMARY
Full-stack engineer focused on AI-assisted workflows.

SKILLS
TypeScript
React
Node.js

EXPERIENCE
- Built recruiter workflow APIs with Node.js
- Improved ATS scoring visibility in React

PROJECTS
- Built a DOCX resume exporter
`;

describe("resume sections", () => {
  it("detects common resume sections and preserves their content", () => {
    const sections = detectResumeSections(resumeText);

    expect(sections.map((section) => section.name)).toEqual(["Summary", "Skills", "Experience", "Projects"]);
    expect(getSectionText(sections, "Skills")).toContain("TypeScript");
    expect(getSectionText(sections, "Experience")).toContain("Built recruiter workflow APIs");
  });

  it("extracts bullets and can flatten the resume back to text", () => {
    const sections = detectResumeSections(resumeText);

    expect(getResumeBullets(sections)).toHaveLength(3);
    expect(flattenResumeSections(sections)).toContain("Built a DOCX resume exporter");
  });
});
