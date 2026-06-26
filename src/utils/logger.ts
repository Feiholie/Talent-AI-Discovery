/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ConnectorLog {
  connectorName: string;
  durationMs: number;
  success: boolean;
  candidatesCount: number;
  errorMessage?: string;
}

export interface SearchSessionLog {
  query: string;
  timestamp: string;
  connectors: ConnectorLog[];
  rawTotalCount: number;
  duplicatesRemoved: number;
  finalCount: number;
}

class SearchLogger {
  private logs: SearchSessionLog[] = [];

  public logSearchSession(log: SearchSessionLog) {
    this.logs.push(log);
    
    // Output beautiful formatted terminal logs
    console.log(`\n=== [TalentAI Search Session: "${log.query}"] ===`);
    console.log(`Timestamp: ${log.timestamp}`);
    console.log(`Connectors Polled:`);
    log.connectors.forEach((c) => {
      const status = c.success ? "✅ SUCCESS" : `❌ FAILED (${c.errorMessage || "Unknown Error"})`;
      console.log(`  - ${c.connectorName}: ${status} | Time: ${c.durationMs}ms | Sourced: ${c.candidatesCount} candidates`);
    });
    console.log(`Deduplication Results:`);
    console.log(`  - Raw Discovered Candidates: ${log.rawTotalCount}`);
    console.log(`  - Duplicate Candidates Filtered: ${log.duplicatesRemoved}`);
    console.log(`  - Final Unique Candidates: ${log.finalCount}`);
    console.log(`================================================\n`);
  }

  public getLogs(): SearchSessionLog[] {
    return this.logs;
  }
}

export const searchLogger = new SearchLogger();
