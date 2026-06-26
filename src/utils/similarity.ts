/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Computes the Levenshtein distance between two strings
 */
export function getLevenshteinDistance(a: string, b: string): number {
  const tmp: number[][] = [];
  const aLen = a.length;
  const bLen = b.length;

  for (let i = 0; i <= aLen; i++) {
    tmp[i] = [i];
  }
  for (let j = 0; j <= bLen; j++) {
    tmp[0][j] = j;
  }

  for (let i = 1; i <= aLen; i++) {
    for (let j = 1; j <= bLen; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1, // deletion
        tmp[i][j - 1] + 1, // insertion
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1) // substitution
      );
    }
  }
  return tmp[aLen][bLen];
}

/**
 * Returns a similarity score between 0.0 and 1.0
 */
export function getNameSimilarity(a: string, b: string): number {
  const cleanA = a.trim().toLowerCase().replace(/[^a-z0-9 ]/g, "");
  const cleanB = b.trim().toLowerCase().replace(/[^a-z0-9 ]/g, "");

  if (cleanA === cleanB) return 1.0;
  if (!cleanA || !cleanB) return 0.0;

  const maxLen = Math.max(cleanA.length, cleanB.length);
  const distance = getLevenshteinDistance(cleanA, cleanB);
  return 1.0 - distance / maxLen;
}
