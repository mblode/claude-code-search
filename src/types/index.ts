// JSONL message types from Claude Code session files

export interface TextPart {
  type: "text";
  text: string;
}

export interface ToolUsePart {
  type: "tool_use";
  id: string;
  name: string;
  input: unknown;
}

export interface ToolResultPart {
  type: "tool_result";
  tool_use_id: string;
  content: string | Array<{ type: "text"; text: string }>;
  is_error?: boolean;
}

export type ContentPart = TextPart | ToolUsePart | ToolResultPart;

export interface MessageContent {
  role: "user" | "assistant";
  content: string | ContentPart[];
  model?: string;
  id?: string;
  type?: string;
  stop_reason?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

export interface JSONLRecord {
  type: "user" | "assistant" | "summary" | "file-history-snapshot";
  timestamp: string;
  uuid: string;
  sessionId: string;
  agentId?: string;
  parentUuid?: string;
  cwd: string;
  gitBranch?: string;
  slug?: string;
  userType?: string;
  version?: string;
  isSidechain?: boolean;
  message?: MessageContent;
  requestId?: string;
  toolUseResult?: unknown;
  summary?: string;
  leafUuid?: string;
}

export interface ParsedMessage {
  type: "user" | "assistant";
  timestamp: Date;
  uuid: string;
  sessionId: string;
  cwd: string;
  gitBranch?: string;
  content: string;
  projectPath: string;
  projectName: string;
  filePath: string;
}

export interface SearchResult {
  item: ParsedMessage;
  score: number;
  positions: Set<number>;
}

export interface CLIOptions {
  after?: string;
  before?: string;
  project?: string;
  session?: string;
  role?: "user" | "assistant";
  interactive: boolean;
  regex?: boolean;
}

export interface FilterOptions {
  afterDate?: Date;
  beforeDate?: Date;
  project?: string;
  session?: string;
  role?: "user" | "assistant";
}
