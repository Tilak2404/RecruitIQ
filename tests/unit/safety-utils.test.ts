import { describe, expect, it } from "vitest";
import { clampPercentage, safeJsonParse, sanitizeStringList } from "@/lib/utils/safety";

describe("safety utils", () => {
  it("safeJsonParse returns parsed data when JSON is valid", () => {
    expect(safeJsonParse<{ ok: boolean }>('{\"ok\":true}')).toEqual({ ok: true });
  });

  it("safeJsonParse returns null or fallback when JSON is invalid", () => {
    expect(safeJsonParse("bad-json")).toBeNull();
    expect(safeJsonParse("bad-json", { ok: false })).toEqual({ ok: false });
  });

  it("clampPercentage constrains values to 0-100", () => {
    expect(clampPercentage(Number.NaN)).toBe(0);
    expect(clampPercentage(-25)).toBe(0);
    expect(clampPercentage(120.4)).toBe(100);
    expect(clampPercentage(47.5)).toBe(48);
  });

  it("sanitizeStringList filters and limits list values", () => {
    expect(sanitizeStringList([" one ", "", null, "two", 5], ["fallback"], 2)).toEqual(["one", "two"]);
    expect(sanitizeStringList(null, ["fallback"])).toEqual(["fallback"]);
  });
});
