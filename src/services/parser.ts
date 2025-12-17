import type { JSONLRecord, ParsedMessage } from "../types/index.js";
import { extractContent } from "../utils/content.js";
import { decodeProjectPath, extractProjectName } from "../utils/paths.js";

const SEARCHABLE_TYPES = new Set(["user", "assistant"]);

/**
 * Parse a JSONL line into a JSONLRecord
 */
export function parseJSONL(line: string): JSONLRecord | null {
  try {
    return JSON.parse(line) as JSONLRecord;
  } catch {
    return null;
  }
}

/**
 * Check if a record is an actual user prompt (not tool results, warmups, or agent prompts)
 * Real prompts have content as a string, tool results have content as an array
 */
function isActualPrompt(record: JSONLRecord): boolean {
  if (record.type !== "user") return false;
  if (!record.message?.content) return false;

  // Real user prompts have string content
  // Tool results have array content with tool_result items
  if (typeof record.message.content !== "string") return false;

  const content = record.message.content;

  // Filter out warmup messages
  if (content === "Warmup" || content.startsWith("Warmup")) return false;

  // Filter out agent/subagent prompts (they often start with specific patterns)
  if (record.isSidechain) return false; // Subagent messages
  if (record.agentId && record.parentUuid === null) return false; // Agent root messages

  return true;
}

/**
 * Check if a record should be indexed for search
 * For user messages, only index actual prompts (not tool results)
 */
export function shouldIndex(record: JSONLRecord, userPromptsOnly = false): boolean {
  if (!record.message?.content || !record.timestamp) return false;
  if (!SEARCHABLE_TYPES.has(record.type)) return false;

  // If we only want user prompts, filter to actual prompts (string content)
  if (userPromptsOnly && record.type === "user") {
    return isActualPrompt(record);
  }

  return true;
}

/**
 * Parse a JSONL record into a searchable message
 */
export function parseMessage(
  record: JSONLRecord,
  projectDir: string,
  filePath: string,
  userPromptsOnly = false
): ParsedMessage | null {
  if (!shouldIndex(record, userPromptsOnly)) {
    return null;
  }

  const content = record.message?.content;
  if (!content) {
    return null;
  }

  const extractedContent = extractContent(content);
  if (!extractedContent.trim()) {
    return null;
  }

  return {
    type: record.type as "user" | "assistant",
    timestamp: new Date(record.timestamp),
    uuid: record.uuid,
    sessionId: record.sessionId,
    cwd: record.cwd,
    gitBranch: record.gitBranch,
    content: extractedContent,
    projectPath: decodeProjectPath(projectDir),
    projectName: extractProjectName(projectDir),
    filePath,
  };
}

/**
 * Parse all messages from a JSONL file content
 */
export function parseAllMessages(
  lines: string[],
  projectDir: string,
  filePath: string
): ParsedMessage[] {
  const messages: ParsedMessage[] = [];

  for (const line of lines) {
    const record = parseJSONL(line);
    if (record) {
      const message = parseMessage(record, projectDir, filePath);
      if (message) {
        messages.push(message);
      }
    }
  }

  return messages;
}
