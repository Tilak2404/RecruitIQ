import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { z } from "zod";

export const runtime = "nodejs";

const pdfExportSchema = z.object({
  html: z.string().min(1, "Resume HTML is required."),
  filename: z.string().optional()
});

export async function POST(req: NextRequest) {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

  try {
    const body = await req.json();
    const { html, filename = "resume.pdf" } = pdfExportSchema.parse(body);
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;

    browser = await puppeteer.launch({
      headless: true,
      executablePath: executablePath || undefined,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.emulateMediaType("screen");

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "12mm",
        right: "10mm",
        bottom: "12mm",
        left: "10mm"
      }
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error("[EXPORT PDF]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid PDF export payload" }, { status: 400 });
    }

    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
  }
}
