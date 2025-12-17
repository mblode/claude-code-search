import type { ContentPart, MessageContent } from "../types/index.js";

/**
 * Extract searchable text content from a message
 * Handles both string content and array of content parts
 */
export function extractContent(content: string | ContentPart[]): string {
  if (typeof content === "string") {
    return content;
  }

  const textParts: string[] = [];

  for (const part of content) {
    if (part.type === "text") {
      textParts.push(part.text);
    } else if (part.type === "tool_result") {
      // Extract text from tool results
      if (typeof part.content === "string") {
        textParts.push(part.content);
      } else if (Array.isArray(part.content)) {
        for (const c of part.content) {
          if (c.type === "text") {
            textParts.push(c.text);
          }
        }
      }
    }
    // Skip tool_use parts as they don't contain searchable text
  }

  return textParts.join("\n");
}

/**
 * Truncate text to a maximum length with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Get the first line of text (for preview)
 */
export function firstLine(text: string): string {
  const newlineIndex = text.indexOf("\n");
  if (newlineIndex === -1) {
    return text;
  }
  return text.slice(0, newlineIndex);
}

/**
 * Clean up text for display - get first non-empty line only
 */
export function cleanText(text: string): string {
  // Find first non-empty line
  const lines = text.split("\n");
  const firstLine = lines.find((line) => line.trim().length > 0) || "";
  // Collapse whitespace within the line
  return firstLine.replace(/\s+/g, " ").trim();
}
