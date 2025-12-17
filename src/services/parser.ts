import type { JSONLRecord, ParsedMessage } from "../types/index.js";
import { extractContent } from "../utils/content.js";
import { decodeProjectPath, extractProjectName } from "../utils/paths.js";

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
  return !record.message.content.startsWith("Warmup");
}

function shouldIndex(record: JSONLRecord, userPromptsOnly: boolean): boolean {
  if (!record.message?.content || !record.timestamp) return false;
  if (record.type !== "user" && record.type !== "assistant") return false;
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

  const extracted = extractContent(content);
  if (!extracted.trim()) return null;

  return {
    type: record.type as "user" | "assistant",
    timestamp: new Date(record.timestamp),
    uuid: record.uuid,
    sessionId: record.sessionId,
    cwd: record.cwd,
    gitBranch: record.gitBranch,
    content: extracted,
    projectPath: decodeProjectPath(projectDir),
    projectName: extractProjectName(projectDir),
    filePath,
  };
}
