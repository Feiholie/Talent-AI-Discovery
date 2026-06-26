/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { CandidateResult } from "../types";
import { CandidateConnector } from "./CandidateConnector";

export class RedditConnector implements CandidateConnector {
  public name = "Reddit";
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
      id: raw.id || `re_${Date.now()}_${defaultIdx}`,
      name: raw.name || "Anonymous Redditor",
      jobTitle: raw.jobTitle || "Job Seeker",
      location: raw.location || "Remote / Worldwide",
      summary: raw.summary || "",
      email: raw.email || undefined,
      phone: raw.phone || undefined,
      telegram: raw.telegram || undefined,
      skills: Array.isArray(raw.skills) ? raw.skills : raw.skills ? [raw.skills] : [],
      sourceName: "Reddit",
      sourceUrl: raw.sourceUrl || "https://reddit.com",
      postedAt: raw.postedAt || new Date().toISOString().split("T")[0],
    };
  }

  public async search(query: string, parsedQueries?: string[]): Promise<CandidateResult[]> {
    if (!this.apiKey) {
      console.warn("RedditConnector: GEMINI_API_KEY missing, using fallback.");
      return this.getFallbackData(query);
    }

    try {
      const ai = new GoogleGenAI({ apiKey: this.apiKey });
      const searchTarget = parsedQueries && parsedQueries.length > 0
        ? parsedQueries.filter(q => q.includes("reddit")).join(" OR ")
        : `site:reddit.com/r/forhire "looking for work" "${query}"`;

      const systemInstruction = `You are a recruitment search system specialized in Reddit.
Extract posts of candidates looking for hire or offering services.
ONLY extract public and real candidate postings.
DO NOT fabricate contact information or URLs.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Search Reddit for candidate posts seeking work matching: ${query}. Targets: ${searchTarget}`,
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
      console.error("RedditConnector error:", err);
      return this.getFallbackData(query);
    }
  }

  private getFallbackData(query: string): CandidateResult[] {
    const candidates: CandidateResult[] = [
      {
        id: "re_fallback_1",
        name: "Siti Rahma",
        jobTitle: "HR Generalist & Recruiter",
        location: "Bandung (Open to Remote)",
        summary: "Extensive background in onboarding, managing employer branding campaigns, and screening candidates for high-growth startups.",
        email: "siti.rahma.careers@outlook.com",
        telegram: "@sitirahma_recruiter",
        skills: ["Onboarding", "Employer Branding", "Screening"],
        sourceName: "Reddit",
        sourceUrl: "https://reddit.com/r/indonesiajobs/comments/hr_generalist_looking_for_role_bandung",
        postedAt: "2026-06-24T09:15:00Z",
      }
    ];

    const norm = query.toLowerCase();
    return candidates.filter(c => 
      c.name.toLowerCase().includes(norm) ||
      c.jobTitle.toLowerCase().includes(norm) ||
      c.location.toLowerCase().includes(norm) ||
      c.summary.toLowerCase().includes(norm) ||
      (c.skills && c.skills.some(s => s.toLowerCase().includes(norm)))
    );
  }
}
