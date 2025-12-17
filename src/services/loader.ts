import type { ParsedMessage } from "../types/index.js";
import { parseJSONL, parseMessage } from "./parser.js";
import { scanAllFiles, streamLines } from "./scanner.js";

export interface LoadOptions {
  projectFilter?: string;
  filters: {
    role?: "user" | "assistant";
  };
}

/**
 * Load all messages from Claude Code session files
 */
export async function loadMessages(
  options: LoadOptions
): Promise<ParsedMessage[]> {
  const messages: ParsedMessage[] = [];

  for await (const { filePath, projectDir } of scanAllFiles({
    projectFilter: options.projectFilter,
  })) {
    for await (const line of streamLines(filePath)) {
      const record = parseJSONL(line);
      if (!record) continue;

      // Role filter (applied early for performance)
      if (options.filters.role && record.type !== options.filters.role) {
        continue;
      }

      // When filtering for user prompts, only include actual prompts (not tool results)
      const userPromptsOnly = options.filters.role === "user";
      const message = parseMessage(record, projectDir, filePath, userPromptsOnly);
      if (!message) continue;

      messages.push(message);
    }
  }

  // Sort by timestamp descending (most recent first)
  messages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return messages;
}
