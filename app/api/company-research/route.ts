import { NextRequest, NextResponse } from "next/server";
import { buildCompanyResearch } from "@/lib/research/company";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { company?: string };
    const query = body.company?.trim() ?? "";

    if (query.length < 2) {
      return NextResponse.json(
        {
          error: "Company name must be 2+ characters",
          company: query,
          overview: "",
          key_products: [],
          culture: "",
          hiring_focus: "",
          tech_stack: [],
          recent_signals: "",
          keywords: [],
          outreach_angle: "",
          cultureNotes: [],
          recentSignals: [],
          outreachAngles: [],
          toneRecommendation: ""
        },
        { status: 400 }
      );
    }

    const research = await buildCompanyResearch({
      company: query,
      serperApiKey: process.env.SERPER_API_KEY,
      geminiApiKey: process.env.GEMINI_API_KEY
    });

    return NextResponse.json(research);
  } catch (error) {
    console.error("[COMPANY-RESEARCH] Fatal:", error);
    return NextResponse.json(
      {
        company: "",
        overview: "Research temporarily unavailable",
        key_products: [],
        culture: "",
        hiring_focus: "",
        tech_stack: [],
        recent_signals: "",
        keywords: [],
        outreach_angle: "Try again shortly",
        cultureNotes: [],
        recentSignals: [],
        outreachAngles: [],
        toneRecommendation: "Try again shortly"
      },
      { status: 500 }
    );
  }
}
