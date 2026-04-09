import type { AtsAnalysisResult, JobTargetPersona, SectionName } from "@/types/app";
import { analyzeBulletSet } from "@/lib/credibility/checker";
import { detectResumeSections, getResumeBullets, getSectionText, type ResumeSection } from "@/lib/resume/sections";
import { clampPercentage, sanitizeMultilineText, uniqueNormalized } from "@/lib/utils/safety";

type SkillGroup = {
  canonical: string;
  aliases: string[];
};

type SectionScore = {
  section: SectionName;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  notes: string[];
};

type MissingSkillBuckets = {
  critical: string[];
  important: string[];
};

export interface EnhancedAtsAnalysis extends AtsAnalysisResult {
  score: number;
  sections: SectionScore[];
  missing_skills: MissingSkillBuckets;
  improvements: string[];
}

type JobProfile = {
  role: string;
  criticalSkills: string[];
  importantSkills: string[];
};

const skillGroups: SkillGroup[] = [
  { canonical: "javascript", aliases: ["javascript", "js", "ecmascript"] },
  { canonical: "typescript", aliases: ["typescript", "ts"] },
  { canonical: "react", aliases: ["react", "react.js"] },
  { canonical: "next.js", aliases: ["next.js", "nextjs", "next js"] },
  { canonical: "node.js", aliases: ["node", "node.js", "nodejs"] },
  { canonical: "express", aliases: ["express", "express.js"] },
  { canonical: "python", aliases: ["python"] },
  { canonical: "java", aliases: ["java"] },
  { canonical: "sql", aliases: ["sql"] },
  { canonical: "postgresql", aliases: ["postgres", "postgresql"] },
  { canonical: "mysql", aliases: ["mysql"] },
  { canonical: "mongodb", aliases: ["mongodb", "mongo"] },
  { canonical: "docker", aliases: ["docker", "containerization"] },
  { canonical: "kubernetes", aliases: ["kubernetes", "k8s"] },
  { canonical: "aws", aliases: ["aws", "amazon web services"] },
  { canonical: "azure", aliases: ["azure"] },
  { canonical: "gcp", aliases: ["gcp", "google cloud"] },
  { canonical: "rest api", aliases: ["rest api", "restful api", "api development"] },
  { canonical: "graphql", aliases: ["graphql"] },
  { canonical: "microservices", aliases: ["microservices", "microservice"] },
  { canonical: "ci/cd", aliases: ["ci/cd", "continuous integration", "continuous delivery"] },
  { canonical: "testing", aliases: ["testing", "unit testing", "integration testing", "vitest", "jest"] },
  { canonical: "machine learning", aliases: ["machine learning", "ml", "artificial intelligence", "ai"] },
  { canonical: "nlp", aliases: ["nlp", "natural language processing"] },
  { canonical: "data analysis", aliases: ["data analysis", "analytics", "analysis"] },
  { canonical: "git", aliases: ["git", "github", "version control"] },
  { canonical: "agile", aliases: ["agile", "scrum"] }
];

const rolePatterns = [
  /\b(frontend engineer|frontend developer)\b/i,
  /\b(full[- ]stack engineer|full[- ]stack developer)\b/i,
  /\b(backend engineer|backend developer)\b/i,
  /\b(software engineer|software developer)\b/i,
  /\b(data scientist|data analyst)\b/i,
  /\b(machine learning engineer)\b/i,
  /\b(product engineer)\b/i
];

const sectionWeights: Record<SectionName, number> = {
  Summary: 20,
  Skills: 25,
  Experience: 35,
  Projects: 15,
  Education: 5,
  Other: 0
};

export function analyzeAtsCompatibility(input: {
  resumeText: string;
  jobDescription: string;
  persona: JobTargetPersona;
  sections?: ResumeSection[];
}): EnhancedAtsAnalysis {
  const resumeText = sanitizeMultilineText(input.resumeText);
  const jobDescription = sanitizeMultilineText(input.jobDescription);
  const sections = input.sections?.length ? input.sections : detectResumeSections(resumeText);
  const jobProfile = extractJobProfile(jobDescription);
  const allRequiredSkills = uniqueNormalized([...jobProfile.criticalSkills, ...jobProfile.importantSkills]);
  const matchedSkills = allRequiredSkills.filter((skill) => hasSkill(resumeText, skill));
  const missingCritical = jobProfile.criticalSkills.filter((skill) => !hasSkill(resumeText, skill));
  const missingImportant = jobProfile.importantSkills.filter((skill) => !hasSkill(resumeText, skill));
  const sectionScores = buildSectionScores(sections, allRequiredSkills);
  const weightedScore = sectionScores.reduce((total, section) => total + (section.score * sectionWeights[section.section]) / 100, 0);
  const keywordMatchPercentage = allRequiredSkills.length
    ? clampPercentage((matchedSkills.length / allRequiredSkills.length) * 100)
    : 0;
  const credibilityFindings = analyzeBulletSet(getResumeBullets(sections).slice(0, 6));
  const improvedBulletPoints = credibilityFindings
    .filter((item) => item.issues.length > 0)
    .flatMap((item) => item.improved)
    .slice(0, 4);

  const lowSections = sectionScores.filter((section) => section.score < 55);
  const highSections = sectionScores.filter((section) => section.score >= 70);

  const improvements = uniqueNormalized(
    [
      ...lowSections.map((section) =>
        `Strengthen the ${section.section} section by surfacing verified evidence for ${section.missingSkills.slice(0, 2).join(" and ") || "the target role"}.`
      ),
      ...matchedSkills
        .filter((skill) => !hasSkill(getSectionText(sections, "Skills"), skill))
        .slice(0, 3)
        .map((skill) => `Add ${skill} to the Skills section if it already appears in your experience or projects.`),
      ...missingCritical.slice(0, 3).map((skill) => `Only if accurate, add concrete evidence for ${skill} where you already used it.`),
      ...credibilityFindings.flatMap((item) => item.issues.slice(0, 1))
    ].filter(Boolean)
  ).slice(0, 8);

  return {
    score: clampPercentage(weightedScore),
    sections: sectionScores,
    missing_skills: {
      critical: missingCritical,
      important: missingImportant
    },
    improvements,
    personaTarget: input.persona,
    atsScore: clampPercentage((weightedScore * 0.65) + (keywordMatchPercentage * 0.35)),
    keywordMatchPercentage,
    matchSummary: buildMatchSummary(jobProfile.role, matchedSkills.length, allRequiredSkills.length, highSections, lowSections),
    matchedKeywords: matchedSkills,
    missingKeywords: [...missingCritical, ...missingImportant],
    skillGaps: missingCritical,
    suggestedSkillAdditions: missingCritical.map((skill) => `Add verified evidence for ${skill} in summary, skills, or experience.`),
    strengths: highSections.length > 0 ? highSections.map((section) => `${section.section} is aligned with the role.`) : ["The resume has a workable baseline structure."],
    weaknesses: lowSections.length > 0 ? lowSections.map((section) => `${section.section} is under-aligned for the target job.`) : ["No major structural weaknesses detected."],
    suggestions: improvements,
    improvedBulletPoints
  };
}

export function extractJobProfile(jobDescription: string): JobProfile {
  const normalized = jobDescription.toLowerCase();
  const lines = jobDescription.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const role = rolePatterns.find((pattern) => pattern.test(normalized))?.exec(normalized)?.[1] ?? "software role";
  const critical = new Set<string>();
  const important = new Set<string>();

  for (const group of skillGroups) {
    let strength = 0;

    for (const alias of group.aliases) {
      for (const line of lines) {
        const lowerLine = line.toLowerCase();
        if (!lowerLine.includes(alias)) {
          continue;
        }

        if (/\b(required|must have|need to|proficien|strong|hands-on|expert)\b/i.test(line)) strength = Math.max(strength, 2);
        else if (/\b(preferred|nice to have|bonus|plus)\b/i.test(line)) strength = Math.max(strength, 1);
        else strength = Math.max(strength, 1.5);
      }
    }

    if (strength >= 2) {
      critical.add(group.canonical);
    } else if (strength > 0) {
      important.add(group.canonical);
    }
  }

  if (critical.size === 0 && important.size === 0) {
    for (const group of skillGroups) {
      if (group.aliases.some((alias) => normalized.includes(alias))) {
        important.add(group.canonical);
      }
    }
  }

  return {
    role,
    criticalSkills: [...critical],
    importantSkills: [...important].filter((skill) => !critical.has(skill))
  };
}

function buildSectionScores(sections: ResumeSection[], requiredSkills: string[]): SectionScore[] {
  const targetSections: SectionName[] = ["Summary", "Skills", "Experience", "Projects"];

  return targetSections.map((sectionName) => {
    const sectionText = getSectionText(sections, sectionName);
    const matched = requiredSkills.filter((skill) => hasSkill(sectionText, skill));
    const missing = requiredSkills.filter((skill) => !hasSkill(sectionText, skill));
    const notes: string[] = [];

    if (!sectionText) {
      notes.push("Section not detected in the uploaded resume.");
    }

    if (sectionName === "Experience" && matched.length > 0) {
      notes.push("Experience section provides evidence for role-relevant skills.");
    }

    if (sectionName === "Skills" && matched.length < Math.min(3, requiredSkills.length)) {
      notes.push("Skills section can mirror more verified technologies from the target role.");
    }

    return {
      section: sectionName,
      score: requiredSkills.length ? clampPercentage((matched.length / requiredSkills.length) * 100) : 0,
      matchedSkills: matched,
      missingSkills: missing,
      notes
    };
  });
}

function buildMatchSummary(
  role: string,
  matchedCount: number,
  totalCount: number,
  highSections: SectionScore[],
  lowSections: SectionScore[]
) {
  const ratioText = totalCount > 0 ? `${matchedCount}/${totalCount}` : "0/0";
  const strongest = highSections[0]?.section ? ` Strongest section: ${highSections[0].section}.` : "";
  const weakest = lowSections[0]?.section ? ` Biggest gap: ${lowSections[0].section}.` : "";
  return `Detected role: ${role}. The resume currently matches ${ratioText} core role signals.${strongest}${weakest}`;
}

function hasSkill(text: string, skill: string) {
  if (!text) {
    return false;
  }

  const normalized = text.toLowerCase();
  const group = skillGroups.find((candidate) => candidate.canonical === skill);
  const aliases = group?.aliases ?? [skill];
  return aliases.some((alias) => normalized.includes(alias));
}
