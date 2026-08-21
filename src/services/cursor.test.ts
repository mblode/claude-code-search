import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import { loadCursorMessages } from "./cursor.js";

describe("cursor", () => {
  it("indexes type 1 bubbles and skips type 2", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ccs-cursor-"));
    const dbPath = join(dir, "state.vscdb");
    const db = new DatabaseSync(dbPath);
    db.exec(`
      CREATE TABLE composerHeaders (
        composerId TEXT PRIMARY KEY,
        workspaceId TEXT,
        isSubagent INTEGER,
        value TEXT
      );
      CREATE TABLE cursorDiskKV (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
    const composerId = "aaaa-bbbb-cccc";
    const headerValue = JSON.stringify({
      createdAt: 1_700_000_000_000,
      name: "demo",
      workspaceIdentifier: {
        uri: { fsPath: "/Users/mblode/Code/demo" },
      },
    });
    db.prepare(
      "INSERT INTO composerHeaders (composerId, workspaceId, isSubagent, value) VALUES (?, ?, ?, ?)"
    ).run(composerId, "ws1", 0, headerValue);
    db.prepare("INSERT INTO cursorDiskKV (key, value) VALUES (?, ?)").run(
      `bubbleId:${composerId}:b1`,
      JSON.stringify({
        createdAt: 1_700_000_000_100,
        text: "user prompt",
        type: 1,
      })
    );
    db.prepare("INSERT INTO cursorDiskKV (key, value) VALUES (?, ?)").run(
      `bubbleId:${composerId}:b2`,
      JSON.stringify({ text: "assistant reply", type: 2 })
    );
    db.close();

    const messages = await loadCursorMessages({
      dbPath,
      skipLockedWarning: true,
    });
    expect(messages).toHaveLength(1);
    expect(messages[0]?.content).toBe("user prompt");
    expect(messages[0]?.source).toBe("cursor");
  });

  it("scopes composerHeaders with an absolute project filter", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ccs-cursor-scope-"));
    const dbPath = join(dir, "state.vscdb");
    const db = new DatabaseSync(dbPath);
    db.exec(`
      CREATE TABLE composerHeaders (
        composerId TEXT PRIMARY KEY,
        workspaceId TEXT,
        isSubagent INTEGER,
        value TEXT
      );
      CREATE TABLE cursorDiskKV (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
    const insertHeader = db.prepare(
      "INSERT INTO composerHeaders (composerId, workspaceId, isSubagent, value) VALUES (?, ?, ?, ?)"
    );
    const insertBubble = db.prepare(
      "INSERT INTO cursorDiskKV (key, value) VALUES (?, ?)"
    );
    insertHeader.run(
      "keep",
      "ws1",
      0,
      JSON.stringify({
        name: "keep",
        workspaceIdentifier: {
          uri: { fsPath: "/Users/mblode/Code/demo" },
        },
      })
    );
    insertHeader.run(
      "skip",
      "ws2",
      0,
      JSON.stringify({
        name: "skip",
        workspaceIdentifier: {
          uri: { fsPath: "/Users/mblode/Code/other" },
        },
      })
    );
    insertBubble.run(
      "bubbleId:keep:b1",
      JSON.stringify({ text: "demo prompt", type: 1 })
    );
    insertBubble.run(
      "bubbleId:skip:b1",
      JSON.stringify({ text: "other prompt", type: 1 })
    );
    db.close();

    const messages = await loadCursorMessages({
      dbPath,
      projectFilter: "/Users/mblode/Code/demo",
      skipLockedWarning: true,
    });
    expect(messages.map((m) => m.content)).toEqual(["demo prompt"]);
  });
});
