import type { ParsedMessage, SearchResult } from "../types/index.js";

/**
 * Create a matcher for messages using simple fulltext search
 */
export function createMatcher(messages: ParsedMessage[]) {
  return {
    /**
     * Search messages with fulltext (substring) matching
     * Supports multi-term queries: "deploy prod" matches content containing both words
     */
    search(query: string, limit = 100): SearchResult[] {
      if (!query.trim()) {
        // Return most recent messages when no query
        return messages
          .slice()
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, limit)
          .map((item) => ({
            item,
            score: 0,
            positions: new Set<number>(),
          }));
      }

      // Split query into terms (space-separated)
      const terms = query
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 0);

      const results: SearchResult[] = [];

      for (const item of messages) {
        const lowerContent = item.content.toLowerCase();

        // All terms must be present
        if (!terms.every((term) => lowerContent.includes(term))) {
          continue;
        }

        // Calculate positions for highlighting all occurrences of all terms
        const positions = new Set<number>();
        for (const term of terms) {
          let idx = lowerContent.indexOf(term);
          while (idx !== -1) {
            for (let i = idx; i < idx + term.length; i++) {
              positions.add(i);
            }
            idx = lowerContent.indexOf(term, idx + 1);
          }
        }

        results.push({
          item,
          score: 100,
          positions,
        });
      }

      // Sort by timestamp descending (most recent first)
      results.sort(
        (a, b) => b.item.timestamp.getTime() - a.item.timestamp.getTime()
      );

      return results.slice(0, limit);
    },

    /**
     * Search messages with regex pattern
     */
    searchRegex(pattern: string, limit = 100): SearchResult[] {
      try {
        const regex = new RegExp(pattern, "i");
        const results: SearchResult[] = [];

        for (const item of messages) {
          const match = regex.exec(item.content);
          if (match) {
            const positions = new Set<number>();
            for (let i = match.index; i < match.index + match[0].length; i++) {
              positions.add(i);
            }
            results.push({
              item,
              score: 100,
              positions,
            });
          }
        }

        // Sort by timestamp descending
        results.sort(
          (a, b) => b.item.timestamp.getTime() - a.item.timestamp.getTime()
        );

        return results.slice(0, limit);
      } catch {
        // Invalid regex, return empty results
        return [];
      }
    },
  };
}

export type Matcher = ReturnType<typeof createMatcher>;
