import type { ContentPart } from "../types/index.js";

function extractTextFromToolResult(content: string | ContentPart[]): string[] {
  const parts: string[] = [];

  if (typeof content === "string") {
    parts.push(content);
  } else if (Array.isArray(content)) {
    for (const c of content) {
      if (c.type === "text") {
        parts.push(c.text);
      }
    }
  }

  return parts;
}

function extractFromContentPart(part: ContentPart): string[] {
  if (part.type === "text") {
    return [part.text];
  }

  if (part.type === "tool_result") {
    return extractTextFromToolResult(part.content);
  }

  return [];
}

export function extractContent(content: string | ContentPart[]): string {
  if (typeof content === "string") {
    return content;
  }

  const parts: string[] = [];
  for (const part of content) {
    parts.push(...extractFromContentPart(part));
  }
  return parts.join("\n");
}

const COMPACTION_CONTINUATION_MARKER =
  "This session is being continued from a previous conversation";

/** User-prompt text only: strings or `text` parts. Tool-result-only users are empty. */
export function extractUserPrompt(
  content: string | ContentPart[]
): string | null {
  if (typeof content === "string") {
    const trimmed = content.trim();
    if (!trimmed || trimmed.startsWith("Warmup")) {
      return null;
    }
    if (trimmed.startsWith(COMPACTION_CONTINUATION_MARKER)) {
      return null;
    }
    return content;
  }

  const texts: string[] = [];
  for (const part of content) {
    if (part.type === "text" && part.text.trim()) {
      texts.push(part.text);
    }
  }
  if (texts.length === 0) {
    return null;
  }
  const joined = texts.join("\n");
  const trimmed = joined.trim();
  if (trimmed.startsWith("Warmup")) {
    return null;
  }
  if (trimmed.startsWith(COMPACTION_CONTINUATION_MARKER)) {
    return null;
  }
  return joined;
}

export function cleanText(text: string): string {
  const firstLine = text.split("\n").find((l) => l.trim()) || "";
  return firstLine.replaceAll(/\s+/g, " ").trim();
}
