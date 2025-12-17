import { Text } from "ink";
import React from "react";

interface Props {
  text: string;
  positions: Set<number>;
  isSelected?: boolean;
  maxLength?: number;
}

export function HighlightedText({ text, positions, isSelected = false, maxLength }: Props) {
  const display = maxLength && text.length > maxLength ? text.slice(0, maxLength - 1) : text;
  const truncated = maxLength && text.length > maxLength;

  return (
    <Text>
      {[...display].map((char, i) => (
        <Text key={i} bold={positions.has(i)} color={positions.has(i) ? "magenta" : isSelected ? "white" : "gray"}>
          {char}
        </Text>
      ))}
      {truncated && <Text color="gray" dimColor>…</Text>}
    </Text>
  );
}
