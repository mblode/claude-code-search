import clipboard from "clipboardy";
import { Box, Text, useApp, useInput, useStdout } from "ink";
import TextInput from "ink-text-input";
import { useEffect, useState } from "react";
import { HighlightedText } from "./components/highlighted-text.js";
import { PreviewPane } from "./components/preview-pane.js";
import { loadMessages } from "./services/loader.js";
import { search } from "./services/matcher.js";
import type { ParsedMessage, SearchResult } from "./types/index.js";
import { cleanText } from "./utils/content.js";
import { compactTime } from "./utils/time.js";

type FilterMode = "global" | "directory";

interface AppProps {
  cwd: string;
  initialProjectFilter?: string;
}

const DIGIT_REGEX = /^[1-9]$/;

export function App({ cwd, initialProjectFilter }: AppProps) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  const [query, setQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>(
    initialProjectFilter ? "directory" : "global"
  );
  const [messages, setMessages] = useState<ParsedMessage[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setLoadError(null);
    loadMessages({
      projectFilter:
        filterMode === "directory" ? initialProjectFilter || cwd : undefined,
      filters: { role: "user" },
    })
      .then((loaded) => {
        setMessages(loaded);
        setIsLoading(false);
      })
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : "Failed to load");
        setIsLoading(false);
      });
  }, [filterMode, cwd, initialProjectFilter]);

  useEffect(() => {
    setResults(search(messages, query, 100));
    setSelectedIndex(0);
  }, [query, messages]);

  const selectItem = (index: number) => {
    const selected = results[index];
    if (selected) {
      clipboard.writeSync(selected.item.content);
      setCopyStatus("copied");
      setTimeout(() => {
        console.log(selected.item.content);
        exit();
      }, 150);
    }
  };

  const handleNavigationKey = (key: {
    upArrow?: boolean;
    downArrow?: boolean;
  }) => {
    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
      return true;
    }
    if (key.downArrow) {
      setSelectedIndex((i) => Math.min(results.length - 1, i + 1));
      return true;
    }
    return false;
  };

  const handleDigitInput = (input: string) => {
    if (DIGIT_REGEX.test(input)) {
      const index = Number.parseInt(input, 10) - 1;
      if (index < results.length) {
        selectItem(index);
        return true;
      }
    }
    return false;
  };

  const handleToggleMode = (
    key: { ctrl?: boolean; tab?: boolean; shift?: boolean },
    input: string
  ) => {
    if ((key.ctrl && input === "r") || (key.tab && key.shift)) {
      setFilterMode((m) => (m === "global" ? "directory" : "global"));
      return true;
    }
    return false;
  };

  useInput((input, key) => {
    if (handleNavigationKey(key)) {
      return;
    }
    if (key.return) {
      selectItem(selectedIndex);
      return;
    }
    if (handleDigitInput(input)) {
      return;
    }
    if (handleToggleMode(key, input)) {
      return;
    }
    if (key.escape) {
      exit();
    }
  });

  const terminalHeight = stdout?.rows || 24;
  const terminalWidth = stdout?.columns || 80;
  const leftPaneWidth = Math.floor(terminalWidth / 2);
  const rightPaneWidth = terminalWidth - leftPaneWidth;
  const maxResults = Math.max(5, terminalHeight - 8);

  const halfWindow = Math.floor(maxResults / 2);
  let startIndex = Math.max(0, selectedIndex - halfWindow);
  const endIndex = Math.min(results.length, startIndex + maxResults);
  startIndex = Math.max(0, endIndex - maxResults);
  const visibleResults = results.slice(startIndex, endIndex);

  const selectedMessage = results[selectedIndex]?.item;

  const maxContentWidth = leftPaneWidth - 14;

  return (
    <Box flexDirection="column" height={terminalHeight}>
      <Box flexDirection="row" flexGrow={1} overflow="hidden">
        <Box
          borderColor="gray"
          borderStyle="round"
          flexDirection="column"
          flexGrow={1}
          overflow="hidden"
          paddingX={1}
          width={leftPaneWidth}
        >
          <Box>
            <Text bold color="magenta">
              ❯{" "}
            </Text>
            <TextInput
              onChange={setQuery}
              placeholder="Search prompts..."
              value={query}
            />
          </Box>
          <Box flexDirection="column" flexGrow={1} marginTop={1}>
            {loadError && (
              <Box flexDirection="column">
                <Text color="red">{loadError}</Text>
                <Text color="gray" dimColor>
                  Press Esc to quit
                </Text>
              </Box>
            )}
            {!loadError && results.length === 0 && !isLoading && (
              <Box flexDirection="column">
                <Text color="gray" dimColor>
                  {query ? `No results for '${query}'` : "No prompts found"}
                </Text>
                {filterMode === "directory" && (
                  <Text color="gray" dimColor>
                    Try Ctrl+R for global search
                  </Text>
                )}
              </Box>
            )}
            {!loadError &&
              (results.length > 0 || isLoading) &&
              visibleResults.map((result, i) => {
                const idx = startIndex + i;
                const isSelected = idx === selectedIndex;
                return (
                  <Box key={`${idx}-${result.item.uuid}`}>
                    <Box flexGrow={1}>
                      <Text
                        color={isSelected ? "magenta" : "gray"}
                        dimColor={!isSelected}
                      >
                        {isSelected ? "▸" : " "}
                      </Text>
                      <Text color="gray" dimColor>
                        {idx < 9 ? idx + 1 : " "}{" "}
                      </Text>
                      <HighlightedText
                        isSelected={isSelected}
                        maxLength={maxContentWidth}
                        positions={result.positions}
                        text={cleanText(result.item.content)}
                      />
                    </Box>
                    <Text color="gray" dimColor>
                      {compactTime(result.item.timestamp)}
                    </Text>
                  </Box>
                );
              })}
          </Box>
        </Box>
        <PreviewPane message={selectedMessage} width={rightPaneWidth} />
      </Box>
      <Box justifyContent="space-between" paddingX={1}>
        {copyStatus === "copied" ? (
          <Text color="green">Copied!</Text>
        ) : (
          <Text color="gray" dimColor>
            ↑↓ navigate · 1-9 jump · ⏎ copy · ^R mode · esc quit
          </Text>
        )}
        <Text>
          <Text color="magenta">
            [{filterMode === "global" ? "global" : "dir"}]
          </Text>
          <Text color="gray" dimColor>
            {" "}
            {isLoading ? "loading..." : `${messages.length} prompts`}
          </Text>
        </Text>
      </Box>
    </Box>
  );
}
