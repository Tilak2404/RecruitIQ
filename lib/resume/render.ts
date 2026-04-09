import { getExportSectionsFromText } from "@/lib/resume/sections";
import { sanitizeText } from "@/lib/utils/safety";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildResumeHtmlDocument(input: {
  candidateName?: string;
  text: string;
}) {
  const sections = getExportSectionsFromText(input.text);
  const title = sanitizeText(input.candidateName, "Resume", 120);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page { size: A4; margin: 18mm 14mm; }
      body {
        font-family: "Segoe UI", Arial, sans-serif;
        color: #111827;
        font-size: 11pt;
        line-height: 1.45;
        margin: 0;
        background: #ffffff;
      }
      .page {
        width: 100%;
      }
      h1 {
        font-size: 18pt;
        margin: 0 0 12px;
        letter-spacing: 0.02em;
      }
      section {
        margin-bottom: 14px;
        break-inside: avoid;
      }
      h2 {
        font-size: 11pt;
        margin: 0 0 6px;
        padding-bottom: 3px;
        border-bottom: 1px solid #d1d5db;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      p, li {
        margin: 0 0 5px;
        white-space: pre-wrap;
      }
      ul {
        margin: 0;
        padding-left: 18px;
      }
    </style>
  </head>
  <body>
    <div class="page">
      ${title !== "Resume" ? `<h1>${escapeHtml(title)}</h1>` : ""}
      ${sections
        .map(
          (section) => `<section>
        <h2>${escapeHtml(section.name)}</h2>
        ${section.content
          .map((line) =>
            /^[-*\u2022]\s+/.test(line)
              ? `<ul><li>${escapeHtml(line.replace(/^[-*\u2022]\s+/, ""))}</li></ul>`
              : `<p>${escapeHtml(line)}</p>`
          )
          .join("")}
      </section>`
        )
        .join("")}
    </div>
  </body>
</html>`;
}
