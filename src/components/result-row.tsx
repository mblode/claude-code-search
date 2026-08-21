import { Box, Text } from "ink";
import { memo } from "react";

import type { SearchResult } from "../types/index.js";
import { HighlightedText } from "./highlighted-text.js";

interface Props {
  result: SearchResult;
  index: number;
  isSelected: boolean;
  preview: string;
  timeLabel: string;
  maxContentWidth: number;
}

export const ResultRow = memo(
  ({
    index,
    isSelected,
    maxContentWidth,
    preview,
    result,
    timeLabel,
  }: Props) => (
    <Box>
      <Box flexGrow={1}>
        <Text color={isSelected ? "magenta" : "gray"} dimColor={!isSelected}>
          {isSelected ? "▸" : " "}
        </Text>
        <Text color="gray" dimColor>
          {index < 9 ? index + 1 : " "}{" "}
        </Text>
        <HighlightedText
          isSelected={isSelected}
          maxLength={maxContentWidth}
          positions={result.positions}
          text={preview}
        />
      </Box>
      <Text color="gray" dimColor>
        {result.item.source.slice(0, 2)} {timeLabel}
      </Text>
    </Box>
  )
);
