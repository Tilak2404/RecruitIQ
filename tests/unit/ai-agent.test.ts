import { describe, expect, it } from "vitest";
import { detectAgentIntent, selectAgentTools } from "@/lib/ai/agent";

describe("AI agent planner", () => {
  it("detects ATS intent from role-fit language", () => {
    expect(detectAgentIntent("Check ATS match score for this job description")).toBe("ats");
  });

  it("selects tools based on intent and available context", () => {
    const tools = selectAgentTools("email", {
      hasResume: true,
      hasJobDescription: true,
      hasCompany: true
    });

    expect(tools).toEqual(["email", "ats", "research"]);
  });

  it("detects career-coach intent from readiness language", () => {
    expect(detectAgentIntent("Improve my chances and tell me if I am ready to apply")).toBe("coach");
  });
});
