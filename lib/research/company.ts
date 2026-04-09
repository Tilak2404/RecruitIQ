import axios from "axios";
import type { CompanyResearchResult } from "@/types/app";
import { parseModelJson } from "@/lib/ai/json";
import { sanitizeStringList, sanitizeText } from "@/lib/utils/safety";

type SearchSnippet = Record<string, unknown>;

interface SerperSearchResult {
  organic?: SearchSnippet[];
}

function buildFallback(query: string, snippets: SearchSnippet[]): CompanyResearchResult {
  const safeQuery = sanitizeText(query, "Target company", 120);
  const snippetText = snippets
    .map((item) => {
      const title = typeof item.title === "string" ? item.title : "";
      const snippet = typeof item.snippet === "string" ? item.snippet : "";
      return `${title} ${snippet}`.trim();
    })
    .filter(Boolean)
    .join(" ");

  const keywords = [
    safeQuery.toLowerCase(),
    ...snippetText.match(/\b[a-z][a-z0-9-]{4,}\b/gi)?.slice(0, 5) ?? ["software", "engineering", "hiring"]
  ].slice(0, 6);

  return {
    company: safeQuery,
    overview: snippetText || `${safeQuery} appears active in technology-focused hiring and public company messaging.`,
    key_products: ["Technology services", "Digital products", "Engineering delivery"],
    culture: "Use concise, role-relevant outreach and avoid claims you cannot support with public evidence.",
    hiring_focus: "Highlight direct role fit, practical skills, and relevant execution experience.",
    tech_stack: ["JavaScript", "Cloud", "APIs", "Databases"],
    recent_signals: snippetText || "No reliable recent signals were fetched, so outreach should stay grounded in role fit.",
    keywords,
    outreach_angle: `Open with one role-relevant reason you fit ${safeQuery}, then connect a verified resume example to likely team needs.`,
    cultureNotes: ["Keep the message specific and professional.", "Anchor outreach in verifiable role fit."],
    recentSignals: snippetText ? [snippetText.slice(0, 220)] : ["No verified recent signals were fetched."],
    outreachAngles: [`Connect your strongest verified experience to ${query}'s likely engineering needs.`],
    toneRecommendation: "Polished, concise, and evidence-based."
  };
}

export async function fetchCompanySearchResults(query: string, apiKey?: string) {
  if (!apiKey) {
    return { organic: [] } satisfies SerperSearchResult;
  }

  const safeQuery = sanitizeText(query, "", 120);
  if (!safeQuery) {
    return { organic: [] } satisfies SerperSearchResult;
  }

  const response = await axios.post(
    "https://google.serper.dev/search",
    { q: `${safeQuery} company overview culture hiring engineering news` },
    {
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json"
      },
      timeout: 8000
    }
  );

  return response.data as SerperSearchResult;
}

export async function buildCompanyResearch(input: {
  company: string;
  serperApiKey?: string;
  geminiApiKey?: string;
}) : Promise<CompanyResearchResult> {
  const safeCompany = sanitizeText(input.company, "Target company", 120);
  let snippets: SearchSnippet[] = [];

  try {
    const result = await fetchCompanySearchResults(safeCompany, input.serperApiKey);
    snippets = result.organic?.slice(0, 8) ?? [];
  } catch {
    snippets = [];
  }

  const fallback = buildFallback(safeCompany, snippets);
  if (!input.geminiApiKey || snippets.length === 0) {
    return fallback;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${input.geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Use only the provided search snippets to produce JSON for company outreach research.

Company: ${safeCompany}
Snippets:
${JSON.stringify(snippets, null, 2)}

Return JSON with:
{
  "overview": string,
  "culture": string,
  "hiring_focus": string,
  "keywords": string[],
  "outreach_angle": string
}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
            maxOutputTokens: 900
          }
        })
      }
    );

    if (!response.ok) {
      return fallback;
    }

    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    const parsed = parseModelJson<Partial<CompanyResearchResult>>(text, {});

    return {
      ...fallback,
      overview: parsed.overview?.trim() || fallback.overview,
      culture: parsed.culture?.trim() || fallback.culture,
      hiring_focus: parsed.hiring_focus?.trim() || fallback.hiring_focus,
      keywords: sanitizeStringList(parsed.keywords, fallback.keywords, 6),
      outreach_angle: parsed.outreach_angle?.trim() || fallback.outreach_angle,
      cultureNotes: [parsed.culture?.trim() || fallback.culture],
      recentSignals: fallback.recentSignals,
      outreachAngles: [parsed.outreach_angle?.trim() || fallback.outreach_angle],
      toneRecommendation: fallback.toneRecommendation
    };
  } catch {
    return fallback;
  }
}
