import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { JSONLRecord } from "../types/index.js";
import { initConfig } from "../utils/config.js";
import { loadMessages } from "./loader.js";
import { parseJSONL, parseMessage } from "./parser.js";

const TS = "2026-08-20T12:00:00.000Z";

function userRecord(content: unknown, extra: Record<string, unknown> = {}) {
  return {
    cwd: "/Users/mblode/Code/mblode/claude-code-search",
    message: { content, role: "user" },
    sessionId: "sess-1",
    timestamp: TS,
    type: "user",
    uuid: "uuid-1",
    ...extra,
  };
}

function parseUser(recordJson: string, projectDir = "proj") {
  const record = parseJSONL(recordJson);
  expect(record).toBeTruthy();
  if (!record) {
    return null;
  }
  return parseMessage(record as JSONLRecord, projectDir, "/tmp/a.jsonl", true);
}

describe("parseMessage", () => {
  it("indexes string user prompts", () => {
    const msg = parseUser(
      JSON.stringify(userRecord("refactor the loader")),
      "-Users-mblode-Code-mblode-claude-code-search"
    );
    expect(msg?.content).toBe("refactor the loader");
    expect(msg?.source).toBe("claude");
  });

  it("indexes array text parts", () => {
    const msg = parseUser(
      JSON.stringify(userRecord([{ text: "array prompt", type: "text" }]))
    );
    expect(msg?.content).toBe("array prompt");
  });

  it("skips tool_result-only users", () => {
    expect(
      parseUser(
        JSON.stringify(
          userRecord([
            {
              content: "ok",
              tool_use_id: "t1",
              type: "tool_result",
            },
          ])
        )
      )
    ).toBeNull();
  });

  it("skips unknown types", () => {
    expect(
      parseUser(
        JSON.stringify({
          sessionId: "s",
          timestamp: TS,
          type: "last-prompt",
          uuid: "u",
        })
      )
    ).toBeNull();
  });

  it("skips compact continuation", () => {
    expect(
      parseUser(
        JSON.stringify(
          userRecord(
            "This session is being continued from a previous conversation that ran out of context."
          )
        )
      )
    ).toBeNull();
  });
});

describe("loadMessages nested subagents", () => {
  afterEach(() => {
    initConfig({});
    delete process.env.CCS_PROJECT_DIR;
  });

  it("does not index prompts from subagents/", async () => {
    const root = await mkdtemp(join(tmpdir(), "ccs-claude-"));
    const project = "-Users-mblode-Code-demo";
    const session = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    await mkdir(join(root, project, session, "subagents"), { recursive: true });
    const rootLine = JSON.stringify(userRecord("root prompt only"));
    const nestedLine = JSON.stringify({
      ...userRecord("nested subagent prompt"),
      uuid: "uuid-2",
    });
    await writeFile(join(root, project, `${session}.jsonl`), `${rootLine}\n`);
    await writeFile(
      join(root, project, session, "subagents", "agent-1.jsonl"),
      `${nestedLine}\n`
    );
    initConfig({ projectsDir: root });
    const messages = await loadMessages({
      filters: { role: "user" },
      sources: ["claude"],
    });
    expect(messages.map((m) => m.content)).toEqual(["root prompt only"]);
  });

  it("does not scan sibling Claude project dirs for an absolute filter", async () => {
    const root = await mkdtemp(join(tmpdir(), "ccs-claude-scope-"));
    const keep = "-Users-mblode-Code-demo";
    const skip = "-Users-mblode-Code-other";
    await mkdir(join(root, keep), { recursive: true });
    await mkdir(join(root, skip), { recursive: true });
    await writeFile(
      join(root, keep, "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.jsonl"),
      `${JSON.stringify(userRecord("keep prompt", { cwd: "/Users/mblode/Code/demo" }))}\n`
    );
    await writeFile(
      join(root, skip, "bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee.jsonl"),
      `${JSON.stringify({
        ...userRecord("skip prompt", { cwd: "/Users/mblode/Code/other" }),
        uuid: "uuid-2",
      })}\n`
    );
    initConfig({ projectsDir: root });
    const messages = await loadMessages({
      filters: { role: "user" },
      projectFilter: "/Users/mblode/Code/demo",
      sources: ["claude"],
    });
    expect(messages.map((m) => m.content)).toEqual(["keep prompt"]);
  });
});
