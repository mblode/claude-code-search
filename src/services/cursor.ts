import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { ParsedMessage } from "../types/index.js";
import { warn } from "../utils/errors.js";
import { extractProjectName } from "../utils/paths.js";
import { yieldEventLoop } from "../utils/pool.js";

export const CURSOR_LOCKED =
  "cannot read Cursor state.vscdb (locked or missing). Quit Cursor and retry.";

interface ComposerHeaderRow {
  composerId: string;
  workspaceId?: string;
  isSubagent?: number | boolean;
  value?: string;
}

interface Bubble {
  type?: number;
  text?: string;
  createdAt?: number;
}

function cursorGlobalDbPath(): string | null {
  const home = homedir();
  const candidates = [
    join(
      home,
      "Library",
      "Application Support",
      "Cursor",
      "User",
      "globalStorage",
      "state.vscdb"
    ),
    join(home, ".config", "Cursor", "User", "globalStorage", "state.vscdb"),
    join(
      process.env.APPDATA ?? join(home, "AppData", "Roaming"),
      "Cursor",
      "User",
      "globalStorage",
      "state.vscdb"
    ),
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

function openReadonly(path: string): DatabaseSync | null {
  try {
    const uri = `${pathToFileURL(path).href}?mode=ro`;
    return new DatabaseSync(uri, { readOnly: true });
  } catch {
    return null;
  }
}

function parseHeaderValue(raw: string | undefined): {
  fsPath?: string;
  name?: string;
  createdAt?: number;
} {
  if (!raw) {
    return {};
  }
  try {
    const json = JSON.parse(raw) as {
      name?: string;
      createdAt?: number;
      workspaceIdentifier?: { uri?: { fsPath?: string } };
    };
    return {
      createdAt: json.createdAt,
      fsPath: json.workspaceIdentifier?.uri?.fsPath,
      name: json.name,
    };
  } catch {
    return {};
  }
}

function matchesProject(
  fsPath: string | undefined,
  filter: string | undefined
): boolean {
  if (!filter) {
    return true;
  }
  if (!fsPath) {
    return false;
  }
  if (filter.startsWith("/")) {
    return fsPath === filter || fsPath.startsWith(`${filter}/`);
  }
  return fsPath.toLowerCase().includes(filter.toLowerCase());
}

function sqlLikeContains(value: string): string {
  return `%${value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
}

function cursorUserDirs(): string[] {
  const home = homedir();
  return [
    join(home, "Library", "Application Support", "Cursor", "User"),
    join(home, ".config", "Cursor", "User"),
    join(
      process.env.APPDATA ?? join(home, "AppData", "Roaming"),
      "Cursor",
      "User"
    ),
  ];
}

function folderUriPath(folder: string): string | null {
  if (folder.startsWith("file:")) {
    try {
      return fileURLToPath(folder);
    } catch {
      return null;
    }
  }
  return folder;
}

function workspaceIdsForPath(absPath: string): string[] {
  const ids: string[] = [];
  for (const userDir of cursorUserDirs()) {
    const root = join(userDir, "workspaceStorage");
    if (!existsSync(root)) {
      continue;
    }
    let entries: string[];
    try {
      entries = readdirSync(root);
    } catch {
      continue;
    }
    for (const name of entries) {
      const workspaceFile = join(root, name, "workspace.json");
      if (!existsSync(workspaceFile)) {
        continue;
      }
      try {
        const json = JSON.parse(readFileSync(workspaceFile, "utf-8")) as {
          folder?: string;
        };
        const fsPath = json.folder ? folderUriPath(json.folder) : null;
        if (
          fsPath === absPath ||
          (fsPath && absPath.startsWith(`${fsPath}/`))
        ) {
          ids.push(name);
        }
      } catch {
        // skip unreadable workspace metadata
      }
    }
  }
  return ids;
}

function blobText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Uint8Array) {
    return new TextDecoder().decode(value);
  }
  return String(value ?? "");
}

function loadHeaderRows(
  db: DatabaseSync,
  sql: string,
  params: string[] = []
): ComposerHeaderRow[] {
  const stmt = db.prepare(sql);
  const rows = (params.length > 0
    ? stmt.all(...params)
    : stmt.all()) as unknown as ComposerHeaderRow[];
  return rows.filter((r) => !r.isSubagent);
}

function loadHeaders(
  db: DatabaseSync,
  projectFilter?: string
): ComposerHeaderRow[] {
  try {
    if (projectFilter?.startsWith("/")) {
      const ids = workspaceIdsForPath(projectFilter);
      if (ids.length > 0) {
        const placeholders = ids.map(() => "?").join(", ");
        const rows = loadHeaderRows(
          db,
          `SELECT composerId, workspaceId, isSubagent, value FROM composerHeaders WHERE workspaceId IN (${placeholders})`,
          ids
        );
        if (rows.length > 0) {
          return rows;
        }
      }
      return loadHeaderRows(
        db,
        "SELECT composerId, workspaceId, isSubagent, value FROM composerHeaders WHERE value LIKE ? ESCAPE '\\'",
        [sqlLikeContains(projectFilter)]
      );
    }
    return loadHeaderRows(
      db,
      "SELECT composerId, workspaceId, isSubagent, value FROM composerHeaders",
      []
    );
  } catch {
    // ItemTable fallback
  }
  try {
    const row = db
      .prepare("SELECT value FROM ItemTable WHERE key = ?")
      .get("composer.composerHeaders") as unknown as
      | { value?: string }
      | undefined;
    if (row?.value) {
      const parsed = JSON.parse(row.value) as {
        allComposers?: ComposerHeaderRow[];
        headers?: ComposerHeaderRow[];
      };
      const list = parsed.allComposers ?? parsed.headers ?? [];
      return list.filter((r) => !r.isSubagent);
    }
  } catch {
    // composer.composerData fallback
  }
  try {
    const row = db
      .prepare("SELECT value FROM ItemTable WHERE key = ?")
      .get("composer.composerData") as unknown as
      | { value?: string }
      | undefined;
    if (!row?.value) {
      return [];
    }
    const parsed = JSON.parse(row.value) as {
      allComposers?: ComposerHeaderRow[];
    };
    return (parsed.allComposers ?? []).filter((r) => !r.isSubagent);
  } catch {
    return [];
  }
}

function bubbleText(raw: unknown): Bubble | null {
  try {
    return JSON.parse(blobText(raw)) as Bubble;
  } catch {
    return null;
  }
}

function messagesFromComposer(
  dbPath: string,
  header: ComposerHeaderRow,
  projectFilter: string | undefined,
  bubbleStmt: { all: (lo: string, hi: string) => unknown }
): ParsedMessage[] {
  const meta = parseHeaderValue(
    typeof header.value === "string" ? header.value : String(header.value ?? "")
  );
  const { fsPath } = meta;
  if (!matchesProject(fsPath, projectFilter)) {
    return [];
  }
  const { composerId } = header;
  if (!composerId) {
    return [];
  }
  const projectPath = fsPath ?? "";
  const projectName = meta.name || extractProjectName(projectPath) || "cursor";
  let rows: { key: string; value: unknown }[];
  try {
    rows = bubbleStmt.all(
      `bubbleId:${composerId}:`,
      `bubbleId:${composerId};`
    ) as unknown as {
      key: string;
      value: unknown;
    }[];
  } catch {
    return [];
  }
  const messages: ParsedMessage[] = [];
  for (const row of rows) {
    const bubble = bubbleText(row.value);
    if (!bubble || bubble.type !== 1 || !bubble.text?.trim()) {
      continue;
    }
    const bubbleId = row.key.split(":").at(-1) ?? row.key;
    const createdAt = bubble.createdAt ?? meta.createdAt ?? 0;
    messages.push({
      content: bubble.text,
      cwd: projectPath,
      filePath: dbPath,
      projectName,
      projectPath,
      sessionId: composerId,
      source: "cursor",
      timestamp: new Date(createdAt),
      type: "user",
      uuid: bubbleId,
    });
  }
  return messages;
}

export async function loadCursorMessages(
  options: {
    projectFilter?: string;
    dbPath?: string;
    skipLockedWarning?: boolean;
  } = {}
): Promise<ParsedMessage[]> {
  const dbPath = options.dbPath ?? cursorGlobalDbPath();
  if (!dbPath) {
    return [];
  }

  const db = openReadonly(dbPath);
  if (!db) {
    if (!options.skipLockedWarning) {
      warn(CURSOR_LOCKED);
    }
    return [];
  }

  try {
    const headers = loadHeaders(db, options.projectFilter);
    const bubbleStmt = db.prepare(
      "SELECT key, value FROM cursorDiskKV WHERE key >= ? AND key < ?"
    );
    const messages: ParsedMessage[] = [];
    for (const [index, header] of headers.entries()) {
      messages.push(
        ...messagesFromComposer(
          dbPath,
          header,
          options.projectFilter,
          bubbleStmt
        )
      );
      if (index > 0 && index % 20 === 0) {
        await yieldEventLoop();
      }
    }
    return messages;
  } catch {
    if (!options.skipLockedWarning) {
      warn(CURSOR_LOCKED);
    }
    return [];
  } finally {
    db.close();
  }
}
