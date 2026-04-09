import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/consistency/route";

function buildRequest(body: unknown) {
  return new NextRequest("http://localhost/api/consistency", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("consistency route", () => {
  it("returns a consistency analysis for valid inputs", async () => {
    const response = await POST(buildRequest({
      resumeText: "React TypeScript engineer building APIs and dashboards.",
      jobDescription: "Frontend engineer required: React, TypeScript, APIs",
      emailDraft: "<p>I am reaching out about frontend engineer opportunities.</p>"
    }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("consistencyScore");
    expect(data).toHaveProperty("issues");
  });

  it("returns 400 on invalid inputs", async () => {
    const response = await POST(buildRequest({
      resumeText: 42
    }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid input");
  });
});
