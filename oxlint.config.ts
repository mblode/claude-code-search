import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";

export default defineConfig({
  extends: [core],
  ignorePatterns: [...core.ignorePatterns, "dist/**"],
  // Ultracite rules relaxed for this CLI. Each is a mechanical/stylistic
  // finding surfaced by the biome→oxlint move on pre-existing code, with no
  // safe autofix and no behavioural benefit; every other Ultracite rule is
  // enforced and real findings were fixed by hand. Notes:
  // - func-style/no-plusplus/no-inline-comments: this codebase's existing style.
  // - no-await-in-loop + promise/*: intentional sequential CLI I/O paths.
  // - require-unicode-regexp + unicorn/escape-case/no-hex-escape: ANSI escapes
  //   and existing regex literals; the rewrites are churn that can alter matching.
  // - unicorn/prefer-number-coercion: parseInt→Number would change arg-parse semantics.
  // - unicorn/import-style + no-array-reduce: named node: imports and reduce read fine here.
  rules: {
    "func-style": "off",
    "no-await-in-loop": "off",
    "no-inline-comments": "off",
    "no-plusplus": "off",
    "promise/prefer-await-to-callbacks": "off",
    "promise/prefer-await-to-then": "off",
    "require-unicode-regexp": "off",
    "unicorn/escape-case": "off",
    "unicorn/import-style": "off",
    "unicorn/no-array-reduce": "off",
    "unicorn/no-hex-escape": "off",
    "unicorn/prefer-number-coercion": "off",
  },
});
