export function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.max(min, Math.min(max, value));
}

export function clampPercentage(value: number) {
  return Math.round(clampNumber(value, 0, 100));
}

export function sanitizeText(value: unknown, fallback = "", maxLength = 4000) {
  if (typeof value !== "string") {
    return fallback;
  }

  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, maxLength) : fallback;
}

export function sanitizeMultilineText(value: unknown, fallback = "", maxLength = 20000) {
  if (typeof value !== "string") {
    return fallback;
  }

  const cleaned = value
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ \u00A0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned ? cleaned.slice(0, maxLength) : fallback;
}

export function sanitizeStringList(value: unknown, fallback: string[] = [], limit = 10) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const cleaned = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);

  return cleaned.length > 0 ? cleaned : fallback;
}

export function sanitizeStringArray(value: unknown, fallback: string[] = [], limit = 12) {
  return sanitizeStringList(value, fallback, limit);
}

export function safeJsonParse<T = unknown>(value: string): T | null;
export function safeJsonParse<T>(value: string, fallback: T): T;
export function safeJsonParse<T = unknown>(value: string, fallback?: T): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback ?? null;
  }
}

export function uniqueNormalized(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(value.trim());
  }

  return result;
}
