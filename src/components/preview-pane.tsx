import { Box, Text } from "ink";
import { memo } from "react";

import type { ParsedMessage } from "../types/index.js";
import { compactTime } from "../utils/time.js";

interface Props {
  message: ParsedMessage | undefined;
  width: number;
  maxLines: number;
}

function previewText(content: string, maxLines: number, width: number): string {
  const colWidth = Math.max(10, width);
  const budget = Math.max(4, maxLines);
  const lines = content.split("\n");
  const out: string[] = [];
  let used = 0;
  for (const line of lines) {
    const wrapped = Math.max(1, Math.ceil(line.length / colWidth));
    if (used + wrapped > budget) {
      out.push("…");
      break;
    }
    out.push(line);
    used += wrapped;
  }
  return out.join("\n");
}

export const PreviewPane = memo(({ message, width, maxLines }: Props) => {
  const contentWidth = Math.max(10, width - 4);

  if (!message) {
    return (
      <Box
        borderColor="gray"
        borderStyle="round"
        flexDirection="column"
        flexGrow={1}
        overflow="hidden"
        paddingX={1}
        width={width}
      >
        <Text color="gray" dimColor>
          Select a prompt to preview
        </Text>
      </Box>
    );
  }

  return (
    <Box
      borderColor="gray"
      borderStyle="round"
      flexDirection="column"
      flexGrow={1}
      overflow="hidden"
      paddingX={1}
      width={width}
    >
      <Box width={contentWidth}>
        <Text wrap="truncate">
          <Text bold color="white">
            {message.projectName}
          </Text>
          <Text color="gray" dimColor>
            {" "}
            · {message.source}
          </Text>
          {message.gitBranch && (
            <Text color="gray" dimColor>
              {" "}
              · {message.gitBranch}
            </Text>
          )}
          <Text color="gray" dimColor>
            {" "}
            · {compactTime(message.timestamp)}
          </Text>
        </Text>
      </Box>
      <Text color="gray" dimColor>
        {"─".repeat(contentWidth - 2)}
      </Text>
      <Box
        flexDirection="column"
        flexGrow={1}
        marginTop={1}
        overflow="hidden"
        width={contentWidth}
      >
        <Text wrap="wrap">
          {previewText(message.content, maxLines, contentWidth)}
        </Text>
      </Box>
    </Box>
  );
});
