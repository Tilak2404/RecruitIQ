import { stripHtml } from "@/lib/utils";
import { analyzeAtsCompatibility, extractJobProfile } from "@/lib/ats/engine";
import type { ResumeSection } from "@/lib/resume/sections";
import { clampNumber } from "@/lib/utils/safety";

export interface ConsistencyIssue {
  type: "role_mismatch" | "skill_misalign" | "experience_gap" | "messaging_inconsistent";
  description: string;
  elements: Array<"resume" | "email" | "jd">;
}

export interface ConsistencyResult {
  consistencyScore: number;
  roleDetected: string;
  issues: ConsistencyIssue[];
  alignedElements: string[];
  misalignedElements: string[];
  emailFix: string;
  resumeFixSuggestions: string[];
  fixes: string[];
  reason: string;
}

export function analyzeConsistency(input: {
  resumeText: string;
  jobDescription: string;
  emailDraft?: string;
  sections?: ResumeSection[];
}): ConsistencyResult {
  const emailText = stripHtml(input.emailDraft ?? "");
  const ats = analyzeAtsCompatibility({
    resumeText: input.resumeText,
    jobDescription: input.jobDescription,
    persona: "STARTUP",
    sections: input.sections
  });
  const jobProfile = extractJobProfile(input.jobDescription);
  const emailSkills = [...jobProfile.criticalSkills, ...jobProfile.importantSkills].filter((skill) =>
    emailText.toLowerCase().includes(skill.toLowerCase())
  );
  const issues: ConsistencyIssue[] = [];

  if (emailText && jobProfile.criticalSkills.length > 0 && emailSkills.length === 0) {
    issues.push({
      type: "skill_misalign",
      description: "The email does not reinforce any of the job's critical skills.",
      elements: ["email", "jd"]
    });
  }

  if (ats.missing_skills.critical.length > 0) {
    issues.push({
      type: "experience_gap",
      description: `Critical skills missing from resume evidence: ${ats.missing_skills.critical.slice(0, 3).join(", ")}.`,
      elements: ["resume", "jd"]
    });
  }

  if (emailText && !emailText.toLowerCase().includes(jobProfile.role.toLowerCase().split(" ")[0])) {
    issues.push({
      type: "role_mismatch",
      description: "The email positioning does not clearly align to the target role.",
      elements: ["email", "jd"]
    });
  }

  const alignedElements = [
    ...(ats.matchedKeywords.length > 0 ? [`Resume supports ${ats.matchedKeywords.slice(0, 4).join(", ")}.`] : []),
    ...(emailSkills.length > 0 ? [`Email already mentions ${emailSkills.slice(0, 3).join(", ")}.`] : [])
  ];

  const resumeFixSuggestions = [
    ...ats.improvements.slice(0, 4),
    ...ats.missing_skills.critical.slice(0, 2).map((skill) => `Only if accurate, add resume evidence that proves ${skill}.`)
  ].slice(0, 5);

  const fixes = [...issues.map((issue) => issue.description), ...resumeFixSuggestions].slice(0, 6);

  const emailFix = emailText
    ? `<p>I'm reaching out about ${jobProfile.role} opportunities. My background already reflects ${ats.matchedKeywords.slice(0, 3).join(", ") || "relevant engineering work"}, and I would be glad to share the most relevant experience in more detail.</p>`
    : "";

  const consistencyScore = clampNumber(
    (ats.atsScore * 0.6) + ((emailSkills.length / Math.max(1, jobProfile.criticalSkills.length || 1)) * 40),
    0,
    100
  );

  return {
    consistencyScore,
    roleDetected: jobProfile.role,
    issues,
    alignedElements,
    misalignedElements: issues.map((issue) => issue.description),
    emailFix,
    resumeFixSuggestions,
    fixes,
    reason:
      issues.length === 0
        ? "Resume, role targeting, and email messaging are broadly aligned."
        : "The strongest gains will come from tightening how verified resume evidence is echoed in the outreach message."
  };
}
