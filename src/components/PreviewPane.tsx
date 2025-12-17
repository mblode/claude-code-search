import { Box, Text } from "ink";
import React from "react";
import type { ParsedMessage } from "../types/index.js";
import { compactTime } from "../utils/time.js";

interface PreviewPaneProps {
  message: ParsedMessage | undefined;
  height: number;
  width: number;
}

/**
 * Right-side pane showing full content of selected message
 */
export function PreviewPane({ message, height, width }: PreviewPaneProps) {
  // Content width: pane width - border(2) - padding(2)
  const contentWidth = Math.max(10, width - 4);
  const separatorWidth = Math.max(10, contentWidth - 2);

  if (!message) {
    return (
      <Box
        flexDirection="column"
        width={width}
        borderStyle="round"
        borderColor="gray"
        paddingX={1}
        height={height}
        overflow="hidden"
      >
        <Text color="gray" dimColor>
          Select a prompt to preview
        </Text>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="round"
      borderColor="gray"
      paddingX={1}
      height={height}
      overflow="hidden"
    >
      {/* Compact header */}
      <Box width={contentWidth}>
        <Text wrap="truncate">
          <Text color="white" bold>
            {message.projectName}
          </Text>
          {message.gitBranch && (
            <Text color="gray" dimColor>
              {" · "}
              {message.gitBranch}
            </Text>
          )}
          <Text color="gray" dimColor>
            {" · "}
            {compactTime(message.timestamp)}
          </Text>
        </Text>
      </Box>

      {/* Separator */}
      <Text color="gray" dimColor>
        {"─".repeat(separatorWidth)}
      </Text>

      {/* Full content - constrained width */}
      <Box
        flexDirection="column"
        marginTop={1}
        flexGrow={1}
        width={contentWidth}
        overflow="hidden"
      >
        <Text wrap="wrap">{message.content}</Text>
      </Box>
    </Box>
  );
}
