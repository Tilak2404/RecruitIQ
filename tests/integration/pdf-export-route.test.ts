import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { launch, setContent, pdf, close } = vi.hoisted(() => {
  const setContent = vi.fn();
  const emulateMediaType = vi.fn();
  const pdf = vi.fn(async () => new Uint8Array([1, 2, 3]));
  const close = vi.fn(async () => undefined);
  const newPage = vi.fn(async () => ({
    setContent,
    emulateMediaType,
    pdf
  }));
  const launch = vi.fn(async () => ({
    newPage,
    close
  }));

  return { launch, setContent, pdf, close };
});

vi.mock("puppeteer", () => ({
  default: {
    launch
  }
}));

import { POST } from "@/app/api/export/pdf/route";

function buildRequest(body: unknown) {
  return new NextRequest("http://localhost/api/export/pdf", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("PDF export route", () => {
  it("returns a PDF when valid HTML is provided", async () => {
    const response = await POST(buildRequest({
      html: "<html><body><h1>Resume</h1></body></html>",
      filename: "resume.pdf"
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("resume.pdf");
    expect(launch).toHaveBeenCalled();
    expect(setContent).toHaveBeenCalled();
    expect(pdf).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });

  it("rejects invalid payloads", async () => {
    const response = await POST(buildRequest({ html: "" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid PDF export payload");
  });
});
