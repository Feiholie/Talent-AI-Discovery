/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CandidateConnector } from "./CandidateConnector";
import { LinkedInConnector } from "./LinkedInConnector";
import { RedditConnector } from "./RedditConnector";
import { TwitterConnector } from "./TwitterConnector";

export * from "./CandidateConnector";
export * from "./LinkedInConnector";
export * from "./RedditConnector";
export * from "./TwitterConnector";

/**
 * Returns instantiated active candidate connectors
 */
export function getRegisteredConnectors(): CandidateConnector[] {
  return [
    new LinkedInConnector(),
    new RedditConnector(),
    new TwitterConnector(),
  ];
}
