import { Text } from "ink";
import React from "react";

interface HighlightedTextProps {
  text: string;
  positions: Set<number>;
  isSelected?: boolean;
  maxLength?: number;
}

/**
 * Render text with matched characters highlighted in magenta/bold
 */
export function HighlightedText({
  text,
  positions,
  isSelected = false,
  maxLength,
}: HighlightedTextProps) {
  // Truncate if needed
  let displayText = text;
  let truncated = false;
  if (maxLength && text.length > maxLength) {
    displayText = text.slice(0, maxLength - 1);
    truncated = true;
  }

  return (
    <Text>
      {[...displayText].map((char, i) => {
        const isMatch = positions.has(i);
        return (
          <Text
            key={i}
            bold={isMatch}
            color={isMatch ? "magenta" : isSelected ? "white" : "gray"}
          >
            {char}
          </Text>
        );
      })}
      {truncated && <Text color="gray" dimColor>…</Text>}
    </Text>
  );
}
