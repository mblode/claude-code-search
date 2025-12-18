import type { ParsedMessage, SearchResult } from "../types/index.js";

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
  const termOccurrences = terms.reduce((sum, term) => {
    let count = 0;
    let idx = lower.indexOf(term);
    while (idx !== -1) {
      count++;
      idx = lower.indexOf(term, idx + 1);
    }
    return sum + count;
  }, 0);
  score += Math.min(termOccurrences * 5, 25);

  // 2. Position bonus: terms near start score higher
  const firstPosition = Math.min(...positions);
  if (firstPosition < 50) score += 15;
  else if (firstPosition < 150) score += 10;
  else if (firstPosition < 300) score += 5;

  // 3. Exact phrase match bonus
  const query = terms.join(" ");
  if (lower.includes(query)) {
    score += 20;
  }

  // 4. Term proximity bonus (for multi-term queries)
  if (terms.length > 1 && positions.size > 0) {
    const sortedPos = [...positions].sort((a, b) => a - b);
    const span = sortedPos[sortedPos.length - 1] - sortedPos[0];
    const idealSpan = terms.reduce((sum, t) => sum + t.length, 0) + terms.length - 1;
    if (span <= idealSpan * 2) score += 15;
    else if (span <= idealSpan * 5) score += 10;
  }

  // 5. Content length normalization (prefer concise matches)
  if (content.length < 200) score += 5;
  else if (content.length < 500) score += 3;

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

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const results: SearchResult[] = [];

  for (const item of messages) {
    const lower = item.content.toLowerCase();
    if (!terms.every((t) => lower.includes(t))) continue;

    const positions = new Set<number>();
    for (const term of terms) {
      let idx = lower.indexOf(term);
      while (idx !== -1) {
        for (let i = idx; i < idx + term.length; i++) positions.add(i);
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
      if (scoreDiff !== 0) return scoreDiff;
      return b.item.timestamp.getTime() - a.item.timestamp.getTime();
    })
    .slice(0, limit);
}
