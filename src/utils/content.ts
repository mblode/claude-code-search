import type { ContentPart } from "../types/index.js";

export function extractContent(content: string | ContentPart[]): string {
  if (typeof content === "string") {
    return content;
  }

  const parts: string[] = [];
  for (const part of content) {
    if (part.type === "text") {
      parts.push(part.text);
    } else if (part.type === "tool_result") {
      if (typeof part.content === "string") {
        parts.push(part.content);
      } else if (Array.isArray(part.content)) {
        for (const c of part.content) {
          if (c.type === "text") {
            parts.push(c.text);
          }
        }
      }
    }
  }
  return parts.join("\n");
}

export function cleanText(text: string): string {
  const firstLine = text.split("\n").find((l) => l.trim()) || "";
  return firstLine.replace(/\s+/g, " ").trim();
}
