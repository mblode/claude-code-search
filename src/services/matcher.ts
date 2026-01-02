import type { ParsedMessage, SearchResult } from "../types/index.js";

const WHITESPACE_REGEX = /\s+/;

const MAX_FREQUENCY_BONUS = 25;
const FREQUENCY_MULTIPLIER = 5;

function countTermOccurrences(lower: string, terms: string[]): number {
  return terms.reduce((sum, term) => {
    let count = 0;
    let idx = lower.indexOf(term);
    while (idx !== -1) {
      count++;
      idx = lower.indexOf(term, idx + 1);
    }
    return sum + count;
  }, 0);
}

function calculatePositionBonus(positions: Set<number>): number {
  const firstPosition = Math.min(...positions);
  if (firstPosition < 50) {
    return 15;
  }
  if (firstPosition < 150) {
    return 10;
  }
  if (firstPosition < 300) {
    return 5;
  }
  return 0;
}

function calculateProximityBonus(
  terms: string[],
  positions: Set<number>
): number {
  if (terms.length <= 1 || positions.size === 0) {
    return 0;
  }

  const sortedPos = [...positions].sort((a, b) => a - b);
  const lastPos = sortedPos.at(-1);
  if (lastPos === undefined) {
    return 0;
  }

  const span = lastPos - sortedPos[0];
  const idealSpan =
    terms.reduce((sum, t) => sum + t.length, 0) + terms.length - 1;

  if (span <= idealSpan * 2) {
    return 15;
  }
  if (span <= idealSpan * 5) {
    return 10;
  }
  return 0;
}

function calculateLengthBonus(contentLength: number): number {
  if (contentLength < 200) {
    return 5;
  }
  if (contentLength < 500) {
    return 3;
  }
  return 0;
}

/**
 * Calculate relevance score for a search match
 */
function calculateScore(
  content: string,
  terms: string[],
  positions: Set<number>
): number {
  const lower = content.toLowerCase();
  let score = 50; // Base score for matching all terms

  // 1. Term frequency bonus (capped at 25 points)
  const termOccurrences = countTermOccurrences(lower, terms);
  score += Math.min(
    termOccurrences * FREQUENCY_MULTIPLIER,
    MAX_FREQUENCY_BONUS
  );

  // 2. Position bonus: terms near start score higher
  score += calculatePositionBonus(positions);

  // 3. Exact phrase match bonus
  const query = terms.join(" ");
  if (lower.includes(query)) {
    score += 20;
  }

  // 4. Term proximity bonus (for multi-term queries)
  score += calculateProximityBonus(terms, positions);

  // 5. Content length normalization (prefer concise matches)
  score += calculateLengthBonus(content.length);

  return score;
}

export function search(
  messages: ParsedMessage[],
  query: string,
  limit = 100
): SearchResult[] {
  if (!query.trim()) {
    // No query: return most recent
    return messages
      .slice()
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
      .map((item) => ({ item, score: 0, positions: new Set<number>() }));
  }

  const terms = query.toLowerCase().split(WHITESPACE_REGEX).filter(Boolean);
  const results: SearchResult[] = [];

  for (const item of messages) {
    const lower = item.content.toLowerCase();
    if (!terms.every((t) => lower.includes(t))) {
      continue;
    }

    const positions = new Set<number>();
    for (const term of terms) {
      let idx = lower.indexOf(term);
      while (idx !== -1) {
        for (let i = idx; i < idx + term.length; i++) {
          positions.add(i);
        }
        idx = lower.indexOf(term, idx + 1);
      }
    }

    const score = calculateScore(item.content, terms, positions);
    results.push({ item, score, positions });
  }

  // Primary sort: score descending
  // Secondary sort: timestamp descending (for equal scores)
  return results
    .sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      return b.item.timestamp.getTime() - a.item.timestamp.getTime();
    })
    .slice(0, limit);
}
