/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { parseSearchIntent, runSourcedSearch } from "./src/connectors/orchestrator";
import { SearchHistoryItem, FavoriteCandidate, CandidateResult } from "./src/types";
import { getRegisteredConnectors } from "./src/connectors";

// Load environment variables
dotenv.config();

const DB_PATH = path.join(process.cwd(), "src", "db.json");

// Helper to read database
async function readDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      // Create with default structure
      const defaultDB = {
        users: [{ id: "u_default", email: "steffiholiea2b@gmail.com", name: "Steffi Holiea", password: "password" }],
        favorites: [],
        search_history: []
      };
      await fs.promises.writeFile(DB_PATH, JSON.stringify(defaultDB, null, 2), "utf8");
      return defaultDB;
    }
    const data = await fs.promises.readFile(DB_PATH, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading db.json:", err);
    return { users: [], favorites: [], search_history: [] };
  }
}

// Helper to write database
async function writeDB(data: any) {
  try {
    await fs.promises.writeFile(DB_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing db.json:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parser middleware
  app.use(express.json());

  // API Route: Authentication
  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    const db = await readDB();
    const user = db.users.find((u: any) => u.email === email && u.password === password);
    if (user) {
      res.json({
        success: true,
        user: { id: user.id, email: user.email, name: user.name }
      });
    } else {
      res.status(401).json({ success: false, message: "Invalid email or password" });
    }
  });

  // API Route: Search history list
  app.get("/api/history", async (req, res) => {
    const userId = (req.query.userId as string) || "u_default";
    const db = await readDB();
    const userHistory = db.search_history
      .filter((h: SearchHistoryItem) => h.userId === userId)
      .sort((a: SearchHistoryItem, b: SearchHistoryItem) => new Date(b.searchedAt).getTime() - new Date(a.searchedAt).getTime());
    res.json(userHistory);
  });

  // API Route: Search history delete
  app.delete("/api/history/:id", async (req, res) => {
    const { id } = req.params;
    const db = await readDB();
    db.search_history = db.search_history.filter((h: SearchHistoryItem) => h.id !== id);
    await writeDB(db);
    res.json({ success: true });
  });

  // API Route: Search Action (Run search keywords conversion + live grounded search + history saving)
  app.post("/api/search", async (req, res) => {
    const { prompt, userId = "u_default" } = req.body;
    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      return res.status(400).json({ error: "Search prompt is required" });
    }

    try {
      console.log(`Processing search prompt: "${prompt}" for user: ${userId}`);
      
      // 1. Gemini understands recruiter intent and converts to keywords & search queries
      const { keywords, searchQueries } = await parseSearchIntent(prompt);
      console.log("Structured keywords extracted:", keywords);
      console.log("Structured search queries:", searchQueries);

      // 2. Search Engine queries the connectors (grounded Google search via Gemini)
      const candidates = await runSourcedSearch(prompt, searchQueries);
      console.log(`Discovered ${candidates.length} candidates from public sources.`);

      // 3. Save search to history persistently
      const db = await readDB();
      const newHistoryItem: SearchHistoryItem = {
        id: `h_${Date.now()}`,
        userId,
        query: prompt,
        keywords,
        candidateCount: candidates.length,
        searchedAt: new Date().toISOString()
      };
      db.search_history.push(newHistoryItem);
      await writeDB(db);

      res.json({
        success: true,
        keywords,
        searchQueries,
        candidates
      });
    } catch (err: any) {
      console.error("Search API execution failed:", err);
      res.status(500).json({ error: "Failed to execute search. Please try again.", details: err.message });
    }
  });

  // API Route: Favorites list
  app.get("/api/favorites", async (req, res) => {
    const userId = (req.query.userId as string) || "u_default";
    const db = await readDB();
    const userFavorites = db.favorites.filter((f: FavoriteCandidate) => f.userId === userId);
    res.json(userFavorites);
  });

  // API Route: Add Favorite
  app.post("/api/favorites", async (req, res) => {
    const { userId = "u_default", candidate } = req.body;
    if (!candidate || !candidate.id) {
      return res.status(400).json({ error: "Candidate object is required" });
    }

    const db = await readDB();
    
    // Avoid duplicates in favorites
    const exists = db.favorites.some((f: FavoriteCandidate) => f.userId === userId && f.candidateId === candidate.id);
    if (!exists) {
      const newFavorite: FavoriteCandidate = {
        id: `f_${Date.now()}`,
        userId,
        candidateId: candidate.id,
        candidateData: candidate,
        savedAt: new Date().toISOString()
      };
      db.favorites.push(newFavorite);
      await writeDB(db);
      res.json({ success: true, favorite: newFavorite });
    } else {
      res.json({ success: true, message: "Already favorited" });
    }
  });

  // API Route: Remove Favorite
  app.delete("/api/favorites/:id", async (req, res) => {
    const { id } = req.params; // candidateId
    const userId = (req.query.userId as string) || "u_default";
    
    const db = await readDB();
    db.favorites = db.favorites.filter((f: FavoriteCandidate) => !(f.userId === userId && f.candidateId === id));
    await writeDB(db);
    res.json({ success: true });
  });

  // API Route: General Dashboard Statistics
  app.get("/api/stats", async (req, res) => {
    const userId = (req.query.userId as string) || "u_default";
    const db = await readDB();
    
    const userHistory = db.search_history.filter((h: SearchHistoryItem) => h.userId === userId);
    const userFavorites = db.favorites.filter((f: FavoriteCandidate) => f.userId === userId);

    res.json({
      totalSearches: userHistory.length,
      totalFavorites: userFavorites.length,
      recentSearchesCount: Math.min(5, userHistory.length),
      supportedConnectors: ["LinkedIn", "Reddit", "Twitter/X"]
    });
  });

  // API Route: Connectors Health Status Report
  app.get("/api/connectors/health", async (req, res) => {
    try {
      const connectors = getRegisteredConnectors();
      const report = await Promise.all(
        connectors.map(async (connector) => {
          const startTime = Date.now();
          const isHealthy = await connector.healthCheck();
          const duration = Date.now() - startTime;
          return {
            name: connector.name,
            enabled: connector.enabled,
            healthy: isHealthy,
            latencyMs: duration,
            status: isHealthy ? "ACTIVE" : "MISSING_API_KEY",
            lastChecked: new Date().toISOString()
          };
        })
      );
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        geminiApiKeyConfigured: !!process.env.GEMINI_API_KEY,
        connectors: report
      });
    } catch (err: any) {
      console.error("Health report generation failed:", err);
      res.status(500).json({ error: "Failed to generate health report", details: err.message });
    }
  });

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    console.log("Vite dev server middleware initializing...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    console.log("Production Mode active. Serving static files...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[TalentAI Server] Running on http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
