import { Text } from "ink";

import { highlightRuns } from "../utils/highlight.js";

interface Props {
  text: string;
  positions: Set<number>;
  isSelected?: boolean;
  maxLength?: number;
}

export function HighlightedText({
  text,
  positions,
  isSelected = false,
  maxLength,
}: Props) {
  const truncated = Boolean(maxLength && text.length > maxLength);
  const display =
    maxLength && text.length > maxLength ? text.slice(0, maxLength - 1) : text;
  const runs = highlightRuns(display, positions, isSelected);

  return (
    <Text>
      {runs.map((run, i) => (
        <Text bold={run.bold} color={run.color} key={`${i}-${run.text.length}`}>
          {run.text}
        </Text>
      ))}
      {truncated && (
        <Text color="gray" dimColor>
          …
        </Text>
      )}
    </Text>
  );
}
