import { Box, Text } from "ink";
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
        <Text wrap="wrap">{message.content}</Text>
      </Box>
    </Box>
  );
}
