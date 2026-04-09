import type { JobTargetPersona } from "@/types/app";
import { sanitizeStringList, sanitizeText } from "@/lib/utils/safety";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function personaPositioning(persona: JobTargetPersona) {
  if (persona === "STARTUP") return "I enjoy shipping practical software quickly and taking ownership end to end.";
  if (persona === "BIG_TECH") return "I focus on reliable execution, scalable systems, and measurable outcomes.";
  if (persona === "HR_RECRUITER") return "I focus on communicating role fit clearly and concisely.";
  return "I focus on practical engineering execution and strong delivery fundamentals.";
}

export function buildOutreachEmailDraft(input: {
  recruiterName: string;
  company: string;
  candidateName: string;
  persona: JobTargetPersona;
  verifiedSkills?: string[];
  variationHint?: string;
}) {
  const recruiterName = sanitizeText(input.recruiterName, "Recruiter", 120);
  const company = sanitizeText(input.company, "your team", 120);
  const candidateName = sanitizeText(input.candidateName, "Candidate", 120);
  const verifiedSkills = sanitizeStringList(input.verifiedSkills, [], 3);
  const variationHint = sanitizeText(input.variationHint, "", 220);
  const skillsLine =
    verifiedSkills.length > 0
      ? ` My recent work includes ${verifiedSkills.join(", ")}.`
      : "";
  const variationLine = variationHint ? ` ${variationHint}` : "";
  const companyLine = `I am reaching out because the work at ${company} looks especially relevant to the kind of role I want to grow into.`;

  return {
    subject: `${candidateName} | ${company} opportunities`,
    body: [
      `<p>Dear ${escapeHtml(recruiterName)},</p>`,
      `<p>I'm ${escapeHtml(candidateName)}, and I'm reaching out about software opportunities at ${escapeHtml(company)}. ${escapeHtml(companyLine)} ${escapeHtml(personaPositioning(input.persona))}${escapeHtml(skillsLine)}${escapeHtml(variationLine)}</p>`,
      "<p>If it is useful, I would be glad to share the most relevant parts of my background or send a short note on the teams where I may be a fit.</p>",
      `<p>Best regards,<br />${escapeHtml(candidateName)}</p>`
    ].join("")
  };
}

export function buildFollowUpDraft(input: {
  recruiterName: string;
  company: string;
  previousSubject: string;
  candidateName: string;
  stage: number;
}) {
  const recruiterName = sanitizeText(input.recruiterName, "Recruiter", 120);
  const company = sanitizeText(input.company, "your team", 120);
  const previousSubject = sanitizeText(input.previousSubject, "your previous email", 140);
  const candidateName = sanitizeText(input.candidateName, "Candidate", 120);
  const stagePhrase = input.stage === 1 ? "following up" : "checking back in";

  return {
    subject: `Following up on ${previousSubject}`,
    body: [
      `<p>Dear ${escapeHtml(recruiterName)},</p>`,
      `<p>I wanted to ${stagePhrase} regarding my earlier note about opportunities at ${escapeHtml(company)}.</p>`,
      "<p>If it is helpful, I would be glad to share any additional context or examples from my work.</p>",
      `<p>Best regards,<br />${escapeHtml(candidateName)}</p>`
    ].join("")
  };
}
