import type { JSONLRecord, ParsedMessage } from "../types/index.js";
import { extractContent } from "../utils/content.js";
import { decodeProjectPath, extractProjectName } from "../utils/paths.js";

const SEARCHABLE_TYPES = new Set(["user", "assistant"]);

export function parseJSONL(line: string): JSONLRecord | null {
  try {
    return JSON.parse(line) as JSONLRecord;
  } catch {
    return null;
  }
}

function isActualPrompt(record: JSONLRecord): boolean {
  if (record.type !== "user" || !record.message?.content) return false;
  if (record.isCompactSummary || record.isSidechain) return false;
  if (record.agentId && record.parentUuid === null) return false;
  if (typeof record.message.content !== "string") return false;

  const content = record.message.content;
  return !content.startsWith("Warmup");
}

export function shouldIndex(record: JSONLRecord, userPromptsOnly = false): boolean {
  if (!record.message?.content || !record.timestamp) return false;
  if (!SEARCHABLE_TYPES.has(record.type)) return false;
  if (userPromptsOnly && record.type === "user") return isActualPrompt(record);
  return true;
}

export function parseMessage(
  record: JSONLRecord,
  projectDir: string,
  filePath: string,
  userPromptsOnly = false
): ParsedMessage | null {
  if (!shouldIndex(record, userPromptsOnly)) return null;

  const content = record.message?.content;
  if (!content) return null;

  const extractedContent = extractContent(content);
  if (!extractedContent.trim()) return null;

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

export function parseAllMessages(
  lines: string[],
  projectDir: string,
  filePath: string
): ParsedMessage[] {
  return lines
    .map((line) => parseJSONL(line))
    .filter((record): record is JSONLRecord => record !== null)
    .map((record) => parseMessage(record, projectDir, filePath))
    .filter((message): message is ParsedMessage => message !== null);
}
