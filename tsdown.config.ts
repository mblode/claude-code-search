import { defineConfig } from "tsdown";

export default defineConfig([
  {
    banner: { js: "#!/usr/bin/env node" },
    clean: true,
    dts: false,
    entry: { cli: "src/cli.ts" },
    fixedExtension: false,
    format: ["esm"],
    sourcemap: true,
    target: "node24",
  },
  {
    dts: true,
    entry: { index: "src/index.ts" },
    fixedExtension: false,
    format: ["esm"],
    sourcemap: true,
    target: "node24",
  },
]);
