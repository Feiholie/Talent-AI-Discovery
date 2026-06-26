/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { parseSearchIntent } from "../connectors/orchestrator";
import { getRegisteredConnectors } from "../connectors";
import { CandidateResult } from "../types";
import { getNameSimilarity } from "../utils/similarity";
import { searchLogger, ConnectorLog } from "../utils/logger";

/**
 * Runs a promise with a specified timeout, returning a default value if it exceeds the duration.
 */
async function runWithTimeout<T>(promise: Promise<T>, timeoutMs: number, defaultValue: T): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      resolve(defaultValue);
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).then((result) => {
    clearTimeout(timeoutId);
    return result;
  });
}

/**
 * The main orchestrator that coordinates public candidates discovery.
 */
export async function executeSearchOrchestration(
  prompt: string,
  userId: string = "u_default",
  preParsedQueries?: string[]
): Promise<{
  keywords: string[];
  searchQueries: string[];
  candidates: CandidateResult[];
}> {
  const startTime = Date.now();
  
  // 1. Extract intents & search queries using Gemini if not pre-parsed
  let keywords: string[];
  let searchQueries: string[];

  if (preParsedQueries && preParsedQueries.length > 0) {
    keywords = [prompt];
    searchQueries = preParsedQueries;
  } else {
    const parsed = await parseSearchIntent(prompt);
    keywords = parsed.keywords;
    searchQueries = parsed.searchQueries;
  }
  
  const connectors = getRegisteredConnectors();
  const connectorLogs: ConnectorLog[] = [];
  
  console.log(`Orchestrator running search for prompt: "${prompt}"`);
  console.log(`Keywords: [${keywords.join(", ")}]`);
  console.log(`Active connectors: [${connectors.map(c => c.name).join(", ")}]`);

  // 2. Execute all connectors in parallel with a 10s timeout
  const connectorPromises = connectors.map(async (connector) => {
    const connStartTime = Date.now();
    let success = false;
    let results: CandidateResult[] = [];
    let errorMessage: string | undefined;

    if (!connector.enabled) {
      return { connectorName: connector.name, success: true, results: [] };
    }

    try {
      // 10 seconds timeout constraint as per requirements
      results = await runWithTimeout(
        connector.search(prompt, searchQueries),
        10000,
        []
      );
      success = true;
    } catch (err: any) {
      console.error(`Connector "${connector.name}" failed:`, err);
      errorMessage = err?.message || "Timeout or Unknown Error";
    }

    const durationMs = Date.now() - connStartTime;
    connectorLogs.push({
      connectorName: connector.name,
      durationMs,
      success,
      candidatesCount: results.length,
      errorMessage,
    });

    return {
      connectorName: connector.name,
      success,
      results,
    };
  });

  const allConnectorResults = await Promise.all(connectorPromises);
  
  // Merge candidates
  let rawMergedCandidates: CandidateResult[] = [];
  allConnectorResults.forEach((res) => {
    if (res.results) {
      rawMergedCandidates.push(...res.results);
    }
  });

  const rawTotalCount = rawMergedCandidates.length;

  // 3. Deduplicate candidates by: sourceUrl, email, phone, and name similarity
  const seenUrls = new Set<string>();
  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();
  const finalCandidates: CandidateResult[] = [];
  let duplicatesRemoved = 0;

  for (const candidate of rawMergedCandidates) {
    if (!candidate) continue;

    const url = (candidate.sourceUrl || "").trim().toLowerCase();
    const email = (candidate.email || "").trim().toLowerCase();
    const phone = (candidate.phone || "").trim().toLowerCase();
    const name = (candidate.name || "").trim().toLowerCase();

    let isDuplicate = false;

    // Check URL duplicate
    if (url && seenUrls.has(url)) {
      isDuplicate = true;
    }
    // Check Email duplicate
    if (!isDuplicate && email && seenEmails.has(email)) {
      isDuplicate = true;
    }
    // Check Phone duplicate
    if (!isDuplicate && phone && seenPhones.has(phone)) {
      isDuplicate = true;
    }
    // Check Name Similarity (Jaro-Winkler/Levenshtein)
    if (!isDuplicate && name) {
      for (const existing of finalCandidates) {
        const existingName = existing.name.trim().toLowerCase();
        const sim = getNameSimilarity(name, existingName);
        if (sim > 0.85) {
          isDuplicate = true;
          break;
        }
      }
    }

    if (isDuplicate) {
      duplicatesRemoved++;
    } else {
      if (url) seenUrls.add(url);
      if (email) seenEmails.add(email);
      if (phone) seenPhones.add(phone);
      finalCandidates.push(candidate);
    }
  }

  // 4. Sort by newest (postedAt ISO timestamp descending)
  finalCandidates.sort((a, b) => {
    const timeA = new Date(a.postedAt).getTime() || 0;
    const timeB = new Date(b.postedAt).getTime() || 0;
    return timeB - timeA;
  });

  // 5. Log metrics
  searchLogger.logSearchSession({
    query: prompt,
    timestamp: new Date().toISOString(),
    connectors: connectorLogs,
    rawTotalCount,
    duplicatesRemoved,
    finalCount: finalCandidates.length,
  });

  return {
    keywords,
    searchQueries,
    candidates: finalCandidates,
  };
}
