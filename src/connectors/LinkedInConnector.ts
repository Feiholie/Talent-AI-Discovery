/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { CandidateResult } from "../types";
import { CandidateConnector } from "./CandidateConnector";

export class LinkedInConnector implements CandidateConnector {
  public name = "LinkedIn";
  public enabled = true;
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
  }

  public async healthCheck(): Promise<boolean> {
    return !!this.apiKey;
  }

  public normalize(raw: any): CandidateResult {
    const defaultIdx = Math.floor(Math.random() * 1000);
    return {
      id: raw.id || `li_${Date.now()}_${defaultIdx}`,
      name: raw.name || "Anonymous Candidate",
      jobTitle: raw.jobTitle || "Professional",
      location: raw.location || "Unknown",
      summary: raw.summary || "",
      email: raw.email || undefined,
      phone: raw.phone || undefined,
      telegram: raw.telegram || undefined,
      linkedin: raw.linkedin || raw.sourceUrl || undefined,
      skills: Array.isArray(raw.skills) ? raw.skills : raw.skills ? [raw.skills] : [],
      sourceName: "LinkedIn",
      sourceUrl: raw.sourceUrl || "https://linkedin.com",
      postedAt: raw.postedAt || new Date().toISOString().split("T")[0],
    };
  }

 public async search(query: string, parsedQueries?: string[]): Promise<CandidateResult[]> {
  if (!this.apiKey) {
    console.warn("LinkedInConnector: GEMINI_API_KEY missing.");
    return [];
  }

    try {
      const ai = new GoogleGenAI({ apiKey: this.apiKey });
      const searchTarget = parsedQueries && parsedQueries.length > 0
        ? parsedQueries.filter(q => q.includes("linkedin")).join(" OR ")
        : `site:linkedin.com/posts "looking for" "${query}"`;

      const systemInstruction = `You are an expert LinkedIn talent discovery system.
Extract public candidates actively seeking employment on LinkedIn.
ONLY extract public and real candidate profiles and post details.
DO NOT fabricate contact information or URLs.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Search LinkedIn for public postings or profiles looking for work matching: ${query}. Targets: ${searchTarget}`,
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                jobTitle: { type: Type.STRING },
                location: { type: Type.STRING },
                summary: { type: Type.STRING },
                email: { type: Type.STRING },
                phone: { type: Type.STRING },
                telegram: { type: Type.STRING },
                sourceUrl: { type: Type.STRING },
                postedAt: { type: Type.STRING },
                skills: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["name", "jobTitle", "location", "summary", "sourceUrl", "postedAt"]
            }
          }
        }
      });

      const items: any[] = JSON.parse(response.text || "[]");
      return items.map(item => this.normalize(item));
    } catch (err) {
  console.error("LinkedInConnector error:", err);
  return [];
}
}
}
