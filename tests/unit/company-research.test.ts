import { describe, expect, it } from "vitest";
import { buildCompanyResearch, fetchCompanySearchResults } from "@/lib/research/company";

describe("company research", () => {
  it("returns an empty organic result when no Serper API key is configured", async () => {
    await expect(fetchCompanySearchResults("Acme", undefined)).resolves.toEqual({ organic: [] });
  });

  it("returns a structured fallback when external keys are unavailable", async () => {
    const result = await buildCompanyResearch({ company: "Acme" });

    expect(result.company).toBe("Acme");
    expect(result.overview).toBeTruthy();
    expect(result.keywords.length).toBeGreaterThan(0);
    expect(result.outreachAngles.length).toBeGreaterThan(0);
    expect(result.toneRecommendation).toBeTruthy();
  });
});
