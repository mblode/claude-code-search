import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const workflowsDir = join(import.meta.dirname, "..", ".github", "workflows");
const USES = /^\s*(?:-\s+)?uses:\s+(?<ref>.+)$/;
const PINNED = /^[\w.-]+\/[\w./-]+@[0-9a-f]{40} # v\d/;

describe("workflows", () => {
  // The release job holds id-token: write, so a moved tag could publish to npm.
  it("pins every action to a full commit SHA with its version tag", async () => {
    const refs: string[] = [];
    for (const file of await readdir(workflowsDir)) {
      const text = await readFile(join(workflowsDir, file), "utf-8");
      for (const line of text.split("\n")) {
        const ref = USES.exec(line)?.groups?.ref;
        if (ref) {
          refs.push(ref);
        }
      }
    }

    expect(refs.length).toBeGreaterThan(0);
    expect(refs.filter((ref) => !PINNED.test(ref))).toEqual([]);
  });
});
