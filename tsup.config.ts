import { defineConfig } from "tsup";

export default defineConfig([
  // Library entry
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    clean: true,
    sourcemap: true,
    target: "node18",
    outDir: "dist",
  },
  // CLI entry with shebang
  {
    entry: ["src/bin/ccs.ts"],
    format: ["esm"],
    dts: true,
    sourcemap: true,
    target: "node18",
    outDir: "dist",
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
]);
