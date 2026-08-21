import { describe, expect, it } from "vitest";

import { highlightRuns } from "./highlight.js";

describe("highlightRuns", () => {
  it("emits one run when nothing is highlighted", () => {
    expect(highlightRuns("hello", new Set(), false)).toEqual([
      { bold: false, color: "gray", text: "hello" },
    ]);
  });

  it("groups adjacent highlighted characters", () => {
    expect(highlightRuns("hello", new Set([1, 2]), true)).toEqual([
      { bold: false, color: "white", text: "h" },
      { bold: true, color: "magenta", text: "el" },
      { bold: false, color: "white", text: "lo" },
    ]);
  });
});
