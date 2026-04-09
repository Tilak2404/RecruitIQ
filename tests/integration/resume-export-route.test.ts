import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/resume/export/route";

function buildRequest(body: unknown) {
  return new NextRequest("http://localhost/api/resume/export", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("resume export route", () => {
  it("returns a DOCX file for valid sections", async () => {
    const response = await POST(buildRequest({
      filename: "resume.docx",
      sections: [
        { name: "Summary", content: ["Full-stack engineer"] },
        { name: "Experience", content: ["- Built recruiter workflow APIs"] }
      ]
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(response.headers.get("content-disposition")).toContain("resume.docx");
  });

  it("returns 400 on invalid payloads", async () => {
    const response = await POST(buildRequest({ sections: "bad" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid export payload");
  });
});
