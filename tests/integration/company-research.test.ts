import { describe, expect, test } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/company-research/route";

function buildRequest(body: unknown) {
  return new NextRequest("http://localhost/api/company-research", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

describe("Company Research Route", () => {
  test("returns fallback research when API keys are unavailable", async () => {
    const response = await POST(buildRequest({ company: "TestCo" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("company", "TestCo");
    expect(data).toHaveProperty("overview");
    expect(data).toHaveProperty("culture");
    expect(data).toHaveProperty("hiring_focus");
    expect(data).toHaveProperty("keywords");
    expect(data).toHaveProperty("outreach_angle");
    expect(data).toHaveProperty("outreachAngles");
    expect(Array.isArray(data.outreachAngles)).toBe(true);
  });

  test("rejects missing company names", async () => {
    const response = await POST(buildRequest({}));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/2\+ characters/);
  });

  test("rejects one-character company names", async () => {
    const response = await POST(buildRequest({ company: "a" }));

    expect(response.status).toBe(400);
  });
});
