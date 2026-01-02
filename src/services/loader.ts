import type { ParsedMessage } from "../types/index.js";
import { parseJSONL, parseMessage } from "./parser.js";
import { scanAllFiles, streamLines } from "./scanner.js";

export interface LoadOptions {
  projectFilter?: string;
  filters: { role?: "user" | "assistant" };
}

function shouldFilterByRole(
  roleFilter: "user" | "assistant" | undefined,
  recordType: string
): boolean {
  return Boolean(roleFilter && recordType !== roleFilter);
}

function shouldFilterByCwd(
  projectFilter: string | undefined,
  messageCwd: string | undefined
): boolean {
  if (!(projectFilter?.startsWith("/") && messageCwd)) {
    return false;
  }
  return !messageCwd.startsWith(projectFilter);
}

function processLine(
  line: string,
  projectDir: string,
  filePath: string,
  options: LoadOptions
): ParsedMessage | null {
  const record = parseJSONL(line);
  if (!record) {
    return null;
  }

  if (shouldFilterByRole(options.filters.role, record.type)) {
    return null;
  }

  const message = parseMessage(
    record,
    projectDir,
    filePath,
    options.filters.role === "user"
  );
  if (!message) {
    return null;
  }

  if (shouldFilterByCwd(options.projectFilter, message.cwd)) {
    return null;
  }

  return message;
}

export async function loadMessages(
  options: LoadOptions
): Promise<ParsedMessage[]> {
  const messages: ParsedMessage[] = [];

  for await (const { filePath, projectDir } of scanAllFiles({
    projectFilter: options.projectFilter,
  })) {
    for await (const line of streamLines(filePath)) {
      const message = processLine(line, projectDir, filePath, options);
      if (message) {
        messages.push(message);
      }
    }
  }

  return messages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
