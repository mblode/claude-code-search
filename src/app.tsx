import { Box, render, Text, useApp, useInput, useStdout } from "ink";
import TextInput from "ink-text-input";
import React, { useEffect, useState } from "react";
import clipboard from "clipboardy";
import type { ParsedMessage, SearchResult } from "./types/index.js";
import { loadMessages } from "./services/loader.js";
import { search } from "./services/matcher.js";
import { compactTime } from "./utils/time.js";
import { cleanText } from "./utils/content.js";
import { HighlightedText } from "./components/HighlightedText.js";
import { PreviewPane } from "./components/PreviewPane.js";

type FilterMode = "global" | "directory";

function App({ cwd }: { cwd: string }) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  const [query, setQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("global");
  const [messages, setMessages] = useState<ParsedMessage[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    loadMessages({
      projectFilter: filterMode === "directory" ? cwd : undefined,
      filters: { role: "user" },
    }).then((loaded) => {
      setMessages(loaded);
      setIsLoading(false);
    });
  }, [filterMode, cwd]);

  useEffect(() => {
    setResults(search(messages, query, 100));
    setSelectedIndex(0);
  }, [query, messages]);

  const selectItem = (index: number) => {
    const selected = results[index];
    if (selected) {
      clipboard.writeSync(selected.item.content);
      console.log(selected.item.content);
      exit();
    }
  };

  useInput((input, key) => {
    if (key.upArrow) setSelectedIndex((i) => Math.max(0, i - 1));
    else if (key.downArrow) setSelectedIndex((i) => Math.min(results.length - 1, i + 1));
    else if (key.return) selectItem(selectedIndex);
    else if (/^[1-9]$/.test(input) && parseInt(input) - 1 < results.length) selectItem(parseInt(input) - 1);
    else if ((key.ctrl && input === "r") || (key.tab && key.shift)) {
      setFilterMode((m) => (m === "global" ? "directory" : "global"));
    } else if (key.escape) exit();
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
      <Box flexGrow={1} flexDirection="row" overflow="hidden">
        <Box flexDirection="column" width={leftPaneWidth} borderStyle="round" borderColor="gray" paddingX={1} overflow="hidden">
          <Box>
            <Text color="magenta" bold>❯ </Text>
            <TextInput value={query} onChange={setQuery} placeholder="Search prompts..." />
          </Box>
          <Box flexDirection="column" marginTop={1} flexGrow={1}>
            {results.length === 0 && !isLoading ? (
              <Text color="gray" dimColor>No results</Text>
            ) : (
              visibleResults.map((result, i) => {
                const idx = startIndex + i;
                const isSelected = idx === selectedIndex;
                return (
                  <Box key={`${idx}-${result.item.uuid}`}>
                    <Box flexGrow={1}>
                      <Text color={isSelected ? "magenta" : "gray"} dimColor={!isSelected}>
                        {isSelected ? "▸" : " "}
                      </Text>
                      <Text color="gray" dimColor>{idx < 9 ? idx + 1 : " "} </Text>
                      <HighlightedText
                        text={cleanText(result.item.content)}
                        positions={result.positions}
                        isSelected={isSelected}
                        maxLength={maxContentWidth}
                      />
                    </Box>
                    <Text color="gray" dimColor>{compactTime(result.item.timestamp)}</Text>
                  </Box>
                );
              })
            )}
          </Box>
        </Box>
        <Box width={rightPaneWidth} overflow="hidden">
          <PreviewPane message={selectedMessage} height={terminalHeight - 3} width={rightPaneWidth} />
        </Box>
      </Box>
      <Box justifyContent="space-between" paddingX={1}>
        <Text color="gray" dimColor>↑↓ navigate · 1-9 jump · ⏎ copy · ^R mode · esc quit</Text>
        <Text>
          <Text color="magenta">[{filterMode === "global" ? "global" : "dir"}]</Text>
          <Text color="gray" dimColor> {isLoading ? "loading..." : `${messages.length} prompts`}</Text>
        </Text>
      </Box>
    </Box>
  );
}

export function run(cwd: string) {
  render(<App cwd={cwd} />);
}
