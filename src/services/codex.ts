import { createHash } from "node:crypto";
import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";

import type { ParsedMessage } from "../types/index.js";
import { extractProjectName } from "../utils/paths.js";
import { mapPool } from "../utils/pool.js";
import { ripgrepFiles } from "../utils/ripgrep.js";
import { streamLines } from "./scanner.js";

interface CodexLine {
  timestamp?: string;
  type?: string;
  payload?: Record<string, unknown>;
}

function extractCodexText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return "";
  }
  const parts: string[] = [];
  for (const p of content) {
    if (!p || typeof p !== "object") {
      continue;
    }
    const o = p as Record<string, unknown>;
    if (o.type === "input_text" && typeof o.text === "string") {
      parts.push(o.text);
      continue;
    }
    if (typeof o.text === "string") {
      parts.push(o.text);
    }
  }
  return parts.join("\n");
}

function unwrap(rec: CodexLine): {
  kind: string | undefined;
  payload: Record<string, unknown>;
} {
  const wrapped = rec.payload !== undefined;
  const payload: Record<string, unknown> = wrapped
    ? (rec.payload ?? {})
    : (rec as unknown as Record<string, unknown>);
  let kind = rec.type;
  if (!wrapped) {
    if (
      payload.instructions !== undefined ||
      (payload.id && payload.cwd !== undefined)
    ) {
      kind = "session_meta";
    } else if (
      payload.type === "function_call" ||
      payload.type === "custom_tool_call" ||
      payload.type === "message"
    ) {
      kind = "response_item";
    } else if (payload.role) {
      kind = "response_item";
    }
  }
  return { kind, payload };
}

function sessionIdFromFilename(filePath: string): string {
  const name = basename(filePath);
  const uuid = name.match(
    /(?<id>[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
  );
  return (
    uuid?.groups?.id ?? name.replace(/^rollout-/, "").replace(/\.jsonl$/, "")
  );
}

function projectFromCwd(cwd: string): {
  projectName: string;
  projectPath: string;
} {
  const projectPath = cwd || "";
  const parts = projectPath.split("/").filter(Boolean);
  const projectName =
    parts.length >= 2 ? parts.slice(-2).join("/") : extractProjectName(cwd);
  return { projectName: projectName || "unknown", projectPath };
}

export function parseCodexUserMessage(
  rec: CodexLine,
  filePath: string,
  ctx: { cwd: string; gitBranch?: string; sessionId: string }
): ParsedMessage | null {
  const { kind, payload } = unwrap(rec);
  if (kind !== "response_item") {
    return null;
  }
  const payloadType = payload.type ?? (payload.role ? "message" : undefined);
  if (payloadType !== "message" || payload.role !== "user") {
    return null;
  }
  const text = extractCodexText(payload.content).trim();
  if (!text) {
    return null;
  }
  const { projectName, projectPath } = projectFromCwd(ctx.cwd);
  const timestamp = rec.timestamp ? new Date(rec.timestamp) : new Date(0);
  const uuid =
    typeof payload.id === "string"
      ? payload.id
      : createHash("sha1")
          .update(`${filePath}:${text}:${rec.timestamp ?? ""}`)
          .digest("hex");
  return {
    content: text,
    cwd: ctx.cwd,
    filePath,
    gitBranch: ctx.gitBranch,
    projectName,
    projectPath,
    sessionId: ctx.sessionId,
    source: "codex",
    timestamp,
    type: "user",
    uuid,
  };
}

function cwdOutsideFilter(cwd: string, projectFilter?: string): boolean {
  return Boolean(
    projectFilter?.startsWith("/") && cwd && !cwd.startsWith(projectFilter)
  );
}

interface CodexSessionCtx {
  cwd: string;
  gitBranch?: string;
  sessionId: string;
}

function applySessionMeta(
  payload: Record<string, unknown>,
  ctx: CodexSessionCtx
): CodexSessionCtx {
  const next = { ...ctx };
  const { cwd: metaCwd, git, id: metaId } = payload;
  if (typeof metaId === "string" && metaId) {
    next.sessionId = metaId;
  }
  if (typeof metaCwd === "string" && metaCwd) {
    next.cwd = metaCwd;
  }
  const gitInfo = git as { branch?: string } | undefined;
  if (gitInfo?.branch) {
    next.gitBranch = gitInfo.branch;
  }
  return next;
}

export async function loadCodexFile(
  filePath: string,
  projectFilter?: string
): Promise<ParsedMessage[]> {
  if (filePath.endsWith(".zst")) {
    return [];
  }
  let ctx: CodexSessionCtx = {
    cwd: "",
    sessionId: sessionIdFromFilename(filePath),
  };
  const messages: ParsedMessage[] = [];

  for await (const line of streamLines(filePath)) {
    let rec: CodexLine;
    try {
      rec = JSON.parse(line) as CodexLine;
    } catch {
      continue;
    }
    const { kind, payload } = unwrap(rec);
    if (kind === "session_meta") {
      ctx = applySessionMeta(payload, ctx);
      if (cwdOutsideFilter(ctx.cwd, projectFilter)) {
        break;
      }
      continue;
    }
    const { cwd: turnCwd } = payload;
    if (kind === "turn_context" && typeof turnCwd === "string" && turnCwd) {
      ctx = { ...ctx, cwd: turnCwd };
    }
    const msg = parseCodexUserMessage(rec, filePath, ctx);
    if (!msg || cwdOutsideFilter(msg.cwd, projectFilter)) {
      continue;
    }
    messages.push(msg);
  }
  return messages;
}

export function defaultCodexDirs(): string[] {
  const home = homedir();
  return [
    join(home, ".codex", "sessions"),
    join(home, ".codex", "archived_sessions"),
  ];
}

export async function collectRolloutFiles(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { recursive: true, withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    if (
      !(
        entry.name.startsWith("rollout-") &&
        entry.name.endsWith(".jsonl") &&
        !entry.name.endsWith(".jsonl.zst")
      )
    ) {
      continue;
    }
    out.push(join(entry.parentPath ?? dir, entry.name));
  }
  return out;
}

export async function loadCodexMessages(
  options: { projectFilter?: string; dirs?: string[] } = {}
): Promise<ParsedMessage[]> {
  const dirs = options.dirs ?? defaultCodexDirs();
  const filter = options.projectFilter;
  let files: string[] | null = null;
  if (filter?.startsWith("/")) {
    files = await ripgrepFiles({
      dirs,
      glob: "rollout-*.jsonl",
      pattern: filter,
    });
  }
  if (files === null) {
    const nested = await Promise.all(
      dirs.map((dir) => collectRolloutFiles(dir))
    );
    files = nested.flat();
  }
  const batches = await mapPool(files, (filePath) =>
    loadCodexFile(filePath, filter)
  );
  return batches.flat();
}
