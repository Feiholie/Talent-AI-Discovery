/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CandidateResult {
  id: string;
  name: string;
  jobTitle: string;
  location: string;
  summary: string;
  email?: string;
  phone?: string;
  telegram?: string;
  sourceName: string;
  sourceUrl: string;
  postedAt: string; // ISO date or formatted date string
  rawPostText?: string;
}

export interface SearchHistoryItem {
  id: string;
  userId: string;
  query: string;
  keywords: string[];
  candidateCount: number;
  searchedAt: string; // ISO date
}

export interface FavoriteCandidate {
  id: string;
  userId: string;
  candidateId: string; // maps to CandidateResult.id or a unique combination
  candidateData: CandidateResult;
  savedAt: string; // ISO date
}

export interface UserSession {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface DashboardStats {
  totalSearches: number;
  totalFavorites: number;
  recentSearchesCount: number;
  supportedConnectors: string[];
}
