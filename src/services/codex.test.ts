import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { collectRolloutFiles, loadCodexMessages } from "./codex.js";

describe("codex", () => {
  it("extracts wrapped user input_text", async () => {
    const root = await mkdtemp(join(tmpdir(), "ccs-codex-"));
    const dir = join(root, "2026", "08", "20");
    await mkdir(dir, { recursive: true });
    const file = join(
      dir,
      "rollout-2026-08-20T07-22-43-01a01be7-ae99-77b0-8818-7ad10668b5c8.jsonl"
    );
    const lines = [
      JSON.stringify({
        payload: {
          cwd: "/Users/mblode/Code/demo",
          git: { branch: "main" },
          id: "01a01be7-ae99-77b0-8818-7ad10668b5c8",
        },
        timestamp: "2026-08-20T07:22:43.000Z",
        type: "session_meta",
      }),
      JSON.stringify({
        payload: {
          content: [{ text: "fix the build", type: "input_text" }],
          role: "user",
          type: "message",
        },
        timestamp: "2026-08-20T07:22:44.000Z",
        type: "response_item",
      }),
      JSON.stringify({
        payload: {
          content: [{ text: "ok", type: "output_text" }],
          role: "assistant",
          type: "message",
        },
        timestamp: "2026-08-20T07:22:45.000Z",
        type: "response_item",
      }),
    ];
    await writeFile(file, `${lines.join("\n")}\n`);
    const messages = await loadCodexMessages({ dirs: [root] });
    expect(messages).toHaveLength(1);
    expect(messages[0]?.content).toBe("fix the build");
    expect(messages[0]?.source).toBe("codex");
    expect(messages[0]?.cwd).toBe("/Users/mblode/Code/demo");
  });

  it("skips .jsonl.zst filenames", async () => {
    const root = await mkdtemp(join(tmpdir(), "ccs-codex-zst-"));
    await writeFile(join(root, "rollout-x.jsonl.zst"), "not-json\n");
    expect(await collectRolloutFiles(root)).toEqual([]);
  });

  it("keeps only rollouts whose cwd matches an absolute filter", async () => {
    const root = await mkdtemp(join(tmpdir(), "ccs-codex-filter-"));
    await mkdir(join(root, "a"), { recursive: true });
    await mkdir(join(root, "b"), { recursive: true });
    const keep = join(
      root,
      "a",
      "rollout-2026-08-20T07-22-43-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.jsonl"
    );
    const skip = join(
      root,
      "b",
      "rollout-2026-08-20T07-22-43-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.jsonl"
    );
    const user = {
      payload: {
        content: [{ text: "keep me", type: "input_text" }],
        role: "user",
        type: "message",
      },
      timestamp: "2026-08-20T07:22:44.000Z",
      type: "response_item",
    };
    await writeFile(
      keep,
      `${JSON.stringify({
        payload: { cwd: "/Users/mblode/Code/demo", id: "a" },
        timestamp: "2026-08-20T07:22:43.000Z",
        type: "session_meta",
      })}\n${JSON.stringify(user)}\n`
    );
    await writeFile(
      skip,
      `${JSON.stringify({
        payload: { cwd: "/Users/mblode/Code/other", id: "b" },
        timestamp: "2026-08-20T07:22:43.000Z",
        type: "session_meta",
      })}\n${JSON.stringify({ ...user, payload: { ...user.payload, content: [{ text: "skip me", type: "input_text" }] } })}\n`
    );
    const messages = await loadCodexMessages({
      dirs: [root],
      projectFilter: "/Users/mblode/Code/demo",
    });
    expect(messages.map((m) => m.content)).toEqual(["keep me"]);
  });
});
