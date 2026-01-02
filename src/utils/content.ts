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

export function cleanText(text: string): string {
  const firstLine = text.split("\n").find((l) => l.trim()) || "";
  return firstLine.replace(/\s+/g, " ").trim();
}
