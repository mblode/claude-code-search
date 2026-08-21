import type { MessageSource, ParsedMessage } from "../types/index.js";
import { mapPool } from "../utils/pool.js";
import { loadCodexMessages } from "./codex.js";
import { loadCursorMessages } from "./cursor.js";
import { parseJSONL, parseMessage } from "./parser.js";
import { scanAllFiles, streamLines } from "./scanner.js";

export interface LoadOptions {
  projectFilter?: string;
  cwd?: string;
  sources?: MessageSource[];
  filters: { role?: "user" | "assistant" };
  onProgress?: (batch: ParsedMessage[]) => void;
}

const ALL_SOURCES: MessageSource[] = ["claude", "codex", "cursor"];

function enabledSources(options: LoadOptions): Set<MessageSource> {
  const list = options.sources?.length ? options.sources : ALL_SOURCES;
  return new Set(list);
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

function cursorScope(options: LoadOptions): string | undefined {
  if (options.projectFilter) {
    return options.projectFilter;
  }
  const sources = enabledSources(options);
  if (sources.size === 1 && sources.has("cursor")) {
    return undefined;
  }
  return options.cwd;
}

function sortMessages(messages: ParsedMessage[]): ParsedMessage[] {
  return messages.toSorted(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );
}

async function loadClaudeFile(
  filePath: string,
  projectDir: string,
  options: LoadOptions
): Promise<ParsedMessage[]> {
  const messages: ParsedMessage[] = [];
  for await (const line of streamLines(filePath)) {
    const message = processLine(line, projectDir, filePath, options);
    if (message) {
      messages.push(message);
    }
  }
  return messages;
}

async function loadClaudeMessages(
  options: LoadOptions
): Promise<ParsedMessage[]> {
  const files = await scanAllFiles({
    projectFilter: options.projectFilter,
  });
  const batches = await mapPool(files, ({ filePath, projectDir }) =>
    loadClaudeFile(filePath, projectDir, options)
  );
  return batches.flat();
}

async function emit(
  options: LoadOptions,
  load: () => Promise<ParsedMessage[]>
): Promise<ParsedMessage[]> {
  const messages = await load();
  if (messages.length > 0) {
    options.onProgress?.(messages);
  }
  return messages;
}

export async function loadMessages(
  options: LoadOptions
): Promise<ParsedMessage[]> {
  const sources = enabledSources(options);
  const tasks: Promise<ParsedMessage[]>[] = [];

  if (sources.has("claude")) {
    tasks.push(emit(options, () => loadClaudeMessages(options)));
  }
  if (sources.has("codex") && options.filters.role !== "assistant") {
    tasks.push(
      emit(options, () =>
        loadCodexMessages({ projectFilter: options.projectFilter })
      )
    );
  }
  if (sources.has("cursor") && options.filters.role !== "assistant") {
    tasks.push(
      emit(options, () =>
        loadCursorMessages({
          projectFilter: cursorScope(options),
        })
      )
    );
  }

  const batches = await Promise.all(tasks);
  return sortMessages(batches.flat());
}
