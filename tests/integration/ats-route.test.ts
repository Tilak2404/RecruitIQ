import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { storeAtsAnalysis } = vi.hoisted(() => ({
  storeAtsAnalysis: vi.fn(async () => ({ id: "analysis-1" }))
}));

vi.mock("@/lib/services/ats", () => ({
  storeAtsAnalysis
}));

import { POST } from "@/app/api/ats-analyze/route";

function buildRequest(body: unknown) {
  return new NextRequest("http://localhost/api/ats-analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("ATS analyze route", () => {
  it("returns a stored ATS analysis payload", async () => {
    const response = await POST(buildRequest({
      resume: "React TypeScript Node.js engineer with PostgreSQL API experience",
      jobDescription: "Full-Stack Engineer required: React, TypeScript, Node.js, PostgreSQL",
      persona: "STARTUP"
    }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.storageId).toBe("analysis-1");
    expect(data.data.analysis).toHaveProperty("atsScore");
    expect(storeAtsAnalysis).toHaveBeenCalled();
  });

  it("rejects invalid payloads", async () => {
    const response = await POST(buildRequest({
      resume: "",
      jobDescription: ""
    }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });
});
