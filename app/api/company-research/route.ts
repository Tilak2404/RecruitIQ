import axios from "axios";
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai"; // New import

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string); // New: Initialize Gemini
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" }); // New: Get generative model

// 2. SERPER SEARCH FUNCTION
async function fetchCompanyData(query: string) {
  try {
    const response = await axios.post(
      "https://google.serper.dev/search",
      { q: query + " company overview culture hiring" },
      {
        headers: {
          "X-API-KEY": process.env.SERPER_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching company data from Serper:", error);
    throw new Error("Failed to fetch company data.");
  }
}

// 3. GEMINI ANALYSIS FUNCTION
async function analyzeCompany(companyName: string, searchData: any) {
  const prompt = `
Analyze the company using real search data.

Company: ${companyName}

Search Data:
${JSON.stringify(searchData)}

Return JSON ONLY (no markdown, no additional text before or after the JSON). The JSON must adhere to the following structure:

{
  "overview": "...",
  "culture": "...",
  "hiring_focus": "...",
  "keywords": ["...", "..."], // Array of strings
  "outreach_angle": "..."
}

Be specific. Avoid generic answers.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Attempt to parse the text as JSON
    let parsedJson;
    try {
      parsedJson = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse Gemini response as JSON:", text);
      throw new Error("Gemini did not return valid JSON.");
    }
    return parsedJson;
  } catch (error: any) { // Add ': any' for type safety if needed for error.message
    console.error("Error calling Gemini API:", error);
    throw new Error(`Failed to analyze company with Gemini AI: ${error.message || error.toString()}`);
  }
}

// 1. CREATE API ROUTE - POST /api/company-research
// 4. API FLOW
export async function POST(req: Request) {
  try {
    const { company } = await req.json();

    if (!company) {
      return NextResponse.json(
        { error: "Company name is required." },
        { status: 400 }
      );
    }

    const searchData = await fetchCompanyData(company);
    const analysis = await analyzeCompany(company, searchData);

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
