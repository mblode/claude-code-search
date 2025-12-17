import { Box, render, Text, useApp, useInput, useStdout } from "ink";
import TextInput from "ink-text-input";
import React, { useEffect, useState } from "react";
import clipboard from "clipboardy";
import type { ParsedMessage, SearchResult } from "./types/index.js";
import { loadMessages } from "./services/loader.js";
import { createMatcher, type Matcher } from "./services/matcher.js";
import { compactTime } from "./utils/time.js";
import { cleanText } from "./utils/content.js";
import { HighlightedText } from "./components/HighlightedText.js";
import { PreviewPane } from "./components/PreviewPane.js";

type FilterMode = "global" | "directory";

const FILTER_MODES: FilterMode[] = ["global", "directory"];

interface AppProps {
  cwd: string;
}

function App({ cwd }: AppProps) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  const [query, setQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("global");
  const [messages, setMessages] = useState<ParsedMessage[]>([]);
  const [matcher, setMatcher] = useState<Matcher | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Load messages on mount and when filter mode changes
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const projectFilter = filterMode === "directory" ? cwd : undefined;
      const loaded = await loadMessages({
        projectFilter,
        filters: { role: "user" },
      });
      setMessages(loaded);
      setMatcher(createMatcher(loaded));
      setIsLoading(false);
    };
    load();
  }, [filterMode, cwd]);

  // Update search results when query or matcher changes
  useEffect(() => {
    if (!matcher) return;
    const newResults = matcher.search(query, 100);
    setResults(newResults);
    setSelectedIndex(0);
  }, [query, matcher]);

  // Select and copy
  const selectItem = (index: number) => {
    const selected = results[index];
    if (selected) {
      clipboard.writeSync(selected.item.content);
      console.log(selected.item.content);
      exit();
    }
  };

  // Keyboard handling
  useInput((input, key) => {
    // Arrow navigation
    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setSelectedIndex((i) => Math.min(results.length - 1, i + 1));
    }
    // Enter to select
    else if (key.return) {
      selectItem(selectedIndex);
    }
    // Quick jump 1-9
    else if (/^[1-9]$/.test(input)) {
      const jumpIndex = parseInt(input, 10) - 1;
      if (jumpIndex < results.length) {
        selectItem(jumpIndex);
      }
    }
    // Ctrl+R to cycle filter mode
    else if (key.ctrl && input === "r") {
      setFilterMode((mode) => {
        const currentIndex = FILTER_MODES.indexOf(mode);
        return FILTER_MODES[(currentIndex + 1) % FILTER_MODES.length];
      });
    }
    // Shift+Tab also toggles filter mode
    else if (key.tab && key.shift) {
      setFilterMode((mode) => (mode === "global" ? "directory" : "global"));
    }
    // Escape to exit
    else if (key.escape) {
      exit();
    }
  });

  const terminalHeight = stdout?.rows || 24;
  const terminalWidth = stdout?.columns || 80;

  // Calculate pane widths - use 50/50 split
  const leftPaneWidth = Math.floor(terminalWidth / 2);
  const rightPaneWidth = terminalWidth - leftPaneWidth;

  // Left pane content width: total - border(2) - padding(2)
  const leftContentWidth = leftPaneWidth - 4;
  // Result row content: total - indicator(1) - number(2) - space(1) - time(4)
  const maxContentWidth = leftContentWidth - 8;

  const maxResults = Math.max(5, terminalHeight - 8);

  // Calculate visible window
  const halfWindow = Math.floor(maxResults / 2);
  let startIndex = Math.max(0, selectedIndex - halfWindow);
  const endIndex = Math.min(results.length, startIndex + maxResults);
  startIndex = Math.max(0, endIndex - maxResults);
  const visibleResults = results.slice(startIndex, endIndex);

  const selectedMessage = results[selectedIndex]?.item;
  const modeLabel = filterMode === "global" ? "global" : "dir";

  return (
    <Box flexDirection="column" height={terminalHeight}>
      {/* Main content: split pane */}
      <Box flexGrow={1} flexDirection="row" overflow="hidden">
        {/* Left pane: Search + Results */}
        <Box
          flexDirection="column"
          width={leftPaneWidth}
          borderStyle="round"
          borderColor="gray"
          paddingX={1}
          overflow="hidden"
        >
          {/* Search input */}
          <Box>
            <Text color="magenta" bold>
              ❯{" "}
            </Text>
            <TextInput
              value={query}
              onChange={setQuery}
              placeholder="Search prompts..."
            />
          </Box>

          {/* Results list */}
          <Box flexDirection="column" marginTop={1} flexGrow={1}>
            {results.length === 0 && !isLoading ? (
              <Text color="gray" dimColor>
                No results
              </Text>
            ) : (
              visibleResults.map((result, i) => {
                const actualIndex = startIndex + i;
                const displayIndex = actualIndex + 1;
                const isSelected = actualIndex === selectedIndex;
                const { item, positions } = result;

                const timeStr = compactTime(item.timestamp);
                const maxContentWidth = leftPaneWidth - 14;
                const preview = cleanText(item.content);

                return (
                  <Box key={`${actualIndex}-${item.uuid}`}>
                    <Box flexGrow={1}>
                      {/* Selection indicator */}
                      <Text color={isSelected ? "magenta" : "gray"} dimColor={!isSelected}>
                        {isSelected ? "▸" : " "}
                      </Text>
                      {/* Number for quick jump (1-9 only) */}
                      <Text color="gray" dimColor>
                        {displayIndex <= 9 ? displayIndex : " "}{" "}
                      </Text>
                      {/* Highlighted content */}
                      <HighlightedText
                        text={preview}
                        positions={positions}
                        isSelected={isSelected}
                        maxLength={maxContentWidth}
                      />
                    </Box>
                    <Text color="gray" dimColor>
                      {timeStr}
                    </Text>
                  </Box>
                );
              })
            )}
          </Box>
        </Box>

        {/* Right pane: Preview */}
        <Box width={rightPaneWidth} overflow="hidden">
          <PreviewPane
            message={selectedMessage}
            height={terminalHeight - 3}
            width={rightPaneWidth}
          />
        </Box>
      </Box>

      {/* Footer */}
      <Box justifyContent="space-between" paddingX={1}>
        <Text color="gray" dimColor>
          ↑↓ navigate · 1-9 jump · ⏎ copy · ^R mode · esc quit
        </Text>
        <Text>
          <Text color="magenta">[{modeLabel}]</Text>
          <Text color="gray" dimColor>
            {" "}
            {isLoading ? "loading..." : `${messages.length} prompts`}
          </Text>
        </Text>
      </Box>
    </Box>
  );
}

export function run(cwd: string) {
  render(<App cwd={cwd} />);
}
