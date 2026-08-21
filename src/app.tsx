import clipboard from "clipboardy";
import { Box, Text, useApp, useInput, useStdout } from "ink";
import TextInput from "ink-text-input";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { PreviewPane } from "./components/preview-pane.js";
import { ResultRow } from "./components/result-row.js";
import { loadMessages } from "./services/loader.js";
import { search } from "./services/matcher.js";
import type { MessageSource, ParsedMessage } from "./types/index.js";
import { cleanText } from "./utils/content.js";
import { compactTime } from "./utils/time.js";

type FilterMode = "global" | "directory";

interface AppProps {
  cwd: string;
  initialProjectFilter?: string;
  sources?: MessageSource[];
}

const DIGIT_REGEX = /^[1-9]$/;

function messageKey(message: ParsedMessage): string {
  return `${message.source}:${message.uuid}`;
}

function mergeMessages(
  prev: ParsedMessage[],
  batch: ParsedMessage[]
): ParsedMessage[] {
  const seen = new Set(prev.map(messageKey));
  const extra = batch.filter((item) => !seen.has(messageKey(item)));
  if (extra.length === 0) {
    return prev;
  }
  return [...prev, ...extra].toSorted(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );
}

export function App({ cwd, initialProjectFilter, sources }: AppProps) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [filterMode, setFilterMode] = useState<FilterMode>("directory");
  const [messages, setMessages] = useState<ParsedMessage[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    setMessages([]);
    loadMessages({
      cwd,
      filters: { role: "user" },
      onProgress: (batch) => {
        if (!cancelled) {
          setMessages((prev) => mergeMessages(prev, batch));
        }
      },
      projectFilter:
        filterMode === "directory" ? initialProjectFilter || cwd : undefined,
      sources,
    })
      .then((loaded) => {
        if (!cancelled) {
          setMessages(loaded);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load"
          );
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [filterMode, cwd, initialProjectFilter, sources]);

  const results = useMemo(
    () => search(messages, deferredQuery, 100),
    [messages, deferredQuery]
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [deferredQuery]);

  const selectItem = (index: number) => {
    const selected = results[index];
    if (selected) {
      clipboard.writeSync(selected.item.content);
      setCopyStatus("copied");
      setTimeout(() => {
        exit();
        process.stdout.write(`${selected.item.content}\n`);
      }, 150);
    }
  };

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((i) => Math.min(results.length - 1, i + 1));
      return;
    }
    if (key.return) {
      selectItem(selectedIndex);
      return;
    }
    if (DIGIT_REGEX.test(input)) {
      const index = Number.parseInt(input, 10) - 1;
      if (index < results.length) {
        selectItem(index);
      }
      return;
    }
    if ((key.ctrl && input === "r") || (key.tab && key.shift)) {
      setFilterMode((m) => (m === "global" ? "directory" : "global"));
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
  const previewLines = Math.max(6, terminalHeight - 8);

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
            {!loadError && isLoading && results.length === 0 && (
              <Text color="gray" dimColor>
                Loading prompts…
              </Text>
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
              visibleResults.map((result, i) => {
                const idx = startIndex + i;
                return (
                  <ResultRow
                    index={idx}
                    isSelected={idx === selectedIndex}
                    key={`${result.item.source}-${result.item.uuid}`}
                    maxContentWidth={maxContentWidth}
                    preview={cleanText(result.item.content)}
                    result={result}
                    timeLabel={compactTime(result.item.timestamp)}
                  />
                );
              })}
          </Box>
        </Box>
        <PreviewPane
          maxLines={previewLines}
          message={selectedMessage}
          width={rightPaneWidth}
        />
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
