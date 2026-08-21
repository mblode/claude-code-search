import type { JSONLRecord, ParsedMessage } from "../types/index.js";
import { extractContent, extractUserPrompt } from "../utils/content.js";
import { decodeProjectPath, extractProjectName } from "../utils/paths.js";

export function parseJSONL(line: string): JSONLRecord | null {
  try {
    return JSON.parse(line) as JSONLRecord;
  } catch {
    return null;
  }
}

function isActualPrompt(record: JSONLRecord): boolean {
  if (record.type !== "user" || !record.message?.content) {
    return false;
  }
  if (record.isCompactSummary || record.isSidechain) {
    return false;
  }
  if (record.agentId && record.parentUuid === null) {
    return false;
  }
  return extractUserPrompt(record.message.content) !== null;
}

function shouldIndex(record: JSONLRecord, userPromptsOnly: boolean): boolean {
  if (!(record.message?.content && record.timestamp)) {
    return false;
  }
  if (record.type !== "user" && record.type !== "assistant") {
    return false;
  }
  if (userPromptsOnly && record.type === "user") {
    return isActualPrompt(record);
  }
  return true;
}

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

  const extracted = userPromptsOnly
    ? extractUserPrompt(content)
    : extractContent(content);
  if (!extracted?.trim()) {
    return null;
  }

  return {
    content: extracted,
    cwd: record.cwd ?? "",
    filePath,
    gitBranch: record.gitBranch,
    projectName: extractProjectName(projectDir),
    projectPath: decodeProjectPath(projectDir),
    sessionId: record.sessionId,
    source: "claude",
    timestamp: new Date(record.timestamp),
    type: record.type as "user" | "assistant",
    uuid: record.uuid,
  };
}
