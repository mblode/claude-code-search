import type { ParsedMessage } from "../types/index.js";
import { parseJSONL, parseMessage } from "./parser.js";
import { scanAllFiles, streamLines } from "./scanner.js";

export interface LoadOptions {
  projectFilter?: string;
  filters: { role?: "user" | "assistant" };
}

export async function loadMessages(options: LoadOptions): Promise<ParsedMessage[]> {
  const messages: ParsedMessage[] = [];

  for await (const { filePath, projectDir } of scanAllFiles({ projectFilter: options.projectFilter })) {
    for await (const line of streamLines(filePath)) {
      const record = parseJSONL(line);
      if (!record) continue;
      if (options.filters.role && record.type !== options.filters.role) continue;

      const message = parseMessage(record, projectDir, filePath, options.filters.role === "user");
      if (message) messages.push(message);
    }
  }

  return messages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
