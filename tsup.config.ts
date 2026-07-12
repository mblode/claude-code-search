import { defineConfig } from "tsup";

export default defineConfig([
  // Library entry
  {
    clean: true,
    dts: false,
    entry: ["src/index.ts"],
    format: ["esm"],
    outDir: "dist",
    sourcemap: true,
    target: "node24",
  },
  // CLI entry with shebang
  {
    banner: {
      js: "#!/usr/bin/env node",
    },
    dts: false,
    entry: ["src/bin/ccs.ts"],
    format: ["esm"],
    outDir: "dist",
    sourcemap: true,
    target: "node24",
  },
]);
