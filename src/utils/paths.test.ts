import { describe, expect, it } from "vitest";

import { encodeClaudeProjectDir, matchesProject } from "./paths.js";

describe("matchesProject", () => {
  const dir = "-Users-mblode-Code-mblode-claude-code-search";

  it("encodes an absolute cwd the way Claude names project folders", () => {
    expect(
      encodeClaudeProjectDir("/Users/mblode/Code/mblode/claude-code-search")
    ).toBe(dir);
  });

  it("matches the encoded folder for an absolute filter", () => {
    expect(
      matchesProject(dir, "/Users/mblode/Code/mblode/claude-code-search")
    ).toBe(true);
  });

  it("does not match sibling projects that share a parent path", () => {
    expect(
      matchesProject(
        "-Users-mblode-Code-mblode-cadence-2",
        "/Users/mblode/Code/mblode/claude-code-search"
      )
    ).toBe(false);
  });
});
