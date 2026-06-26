/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CandidateResult } from "../types";

export interface CandidateConnector {
  name: string;
  enabled: boolean;
  
  /**
   * Performs the web-grounded or public sourcing search for the specific query
   */
  search(query: string, parsedQueries?: string[]): Promise<CandidateResult[]>;

  /**
   * Verifies connector configuration or API connectivity
   */
  healthCheck(): Promise<boolean>;

  /**
   * Standardizes raw connector responses into a unified CandidateResult schema
   */
  normalize(rawResult: any): CandidateResult;
}
