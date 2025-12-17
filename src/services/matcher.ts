import type { ParsedMessage, SearchResult } from "../types/index.js";

export function search(messages: ParsedMessage[], query: string, limit = 100): SearchResult[] {
  if (!query.trim()) {
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
    results.push({ item, score: 100, positions });
  }

  return results
    .sort((a, b) => b.item.timestamp.getTime() - a.item.timestamp.getTime())
    .slice(0, limit);
}
