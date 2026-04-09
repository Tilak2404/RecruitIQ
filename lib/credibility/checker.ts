import { clampNumber } from "@/lib/utils/safety";

export interface CredibilityCheckResult {
  score: number;
  issues: string[];
  improved: string[];
}

const technicalSignals = [
  "api",
  "react",
  "node",
  "typescript",
  "python",
  "java",
  "sql",
  "postgres",
  "docker",
  "aws",
  "azure",
  "ci/cd",
  "pipeline",
  "microservice",
  "model"
];

export function analyzeBulletCredibility(bullet: string): CredibilityCheckResult {
  const normalized = bullet.replace(/^[-*\u2022]\s*/, "").trim();
  const lower = normalized.toLowerCase();
  const issues: string[] = [];
  const improved: string[] = [];
  let score = 100;

  if (normalized.length < 40) {
    score -= 20;
    issues.push("The bullet is too short to communicate specific scope or impact.");
  }

  if (!/\b(built|implemented|developed|designed|created|automated|optimized|improved|delivered|supported|maintained|analyzed)\b/i.test(lower)) {
    score -= 15;
    issues.push("The bullet does not clearly state the action taken.");
  }

  if (!/[0-9%]/.test(normalized)) {
    score -= 15;
    issues.push("No measurable outcome is mentioned.");
  }

  if (!technicalSignals.some((signal) => lower.includes(signal))) {
    score -= 15;
    issues.push("Technical depth is low because no concrete tools, systems, or methods are named.");
  }

  if (/\b(revolutionary|world-class|best ever|unbelievable|amazing)\b/i.test(lower)) {
    score -= 20;
    issues.push("The wording sounds exaggerated and may reduce plausibility.");
  }

  let improvedLine = normalized
    .replace(/\bworked on\b/i, "Contributed to")
    .replace(/\bresponsible for\b/i, "Handled")
    .replace(/\bhelped\b/i, "Supported");

  if (!/[0-9%]/.test(improvedLine)) {
    improvedLine += " Add a measurable result only if you can verify it.";
  }

  if (!technicalSignals.some((signal) => improvedLine.toLowerCase().includes(signal))) {
    improvedLine += " Mention the concrete system, feature, or technology used.";
  }

  if (improvedLine !== normalized || issues.length > 0) {
    improved.push(improvedLine.trim());
  }

  return {
    score: clampNumber(score, 0, 100),
    issues,
    improved
  };
}

export function analyzeBulletSet(bullets: string[]) {
  return bullets.map((bullet) => ({
    bullet,
    ...analyzeBulletCredibility(bullet)
  }));
}
