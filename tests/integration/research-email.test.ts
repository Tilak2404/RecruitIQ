import { describe, expect, it } from "vitest";
import { buildCompanyResearch } from "@/lib/research/company";
import { buildOutreachEmailDraft } from "@/lib/email/generator";

describe("research -> email flow", () => {
  it("uses research output to shape outreach copy safely", async () => {
    const research = await buildCompanyResearch({ company: "Northwind" });
    const email = buildOutreachEmailDraft({
      recruiterName: "Avery",
      company: research.company,
      candidateName: "Tilak",
      persona: "HIRING_MANAGER",
      variationHint: research.outreach_angle
    });

    expect(research.overview).toBeTruthy();
    expect(email.subject).toContain("Northwind");
    expect(email.body).toContain("Northwind");
  });
});
