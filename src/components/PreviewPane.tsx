import { Box, Text } from "ink";
import React from "react";
import type { ParsedMessage } from "../types/index.js";
import { compactTime } from "../utils/time.js";

interface Props {
  message: ParsedMessage | undefined;
  width: number;
}

export function PreviewPane({ message, width }: Props) {
  const contentWidth = Math.max(10, width - 4);

  if (!message) {
    return (
      <Box flexDirection="column" width={width} borderStyle="round" borderColor="gray" paddingX={1} flexGrow={1} overflow="hidden">
        <Text color="gray" dimColor>Select a prompt to preview</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width={width} borderStyle="round" borderColor="gray" paddingX={1} flexGrow={1} overflow="hidden">
      <Box width={contentWidth}>
        <Text wrap="truncate">
          <Text color="white" bold>{message.projectName}</Text>
          {message.gitBranch && <Text color="gray" dimColor> · {message.gitBranch}</Text>}
          <Text color="gray" dimColor> · {compactTime(message.timestamp)}</Text>
        </Text>
      </Box>
      <Text color="gray" dimColor>{"─".repeat(contentWidth - 2)}</Text>
      <Box flexDirection="column" marginTop={1} flexGrow={1} width={contentWidth} overflow="hidden">
        <Text wrap="wrap">{message.content}</Text>
      </Box>
    </Box>
  );
}
