# Implementation notes

Log deviations from the multi-source prompt search plan here.

## Deviations

### `src/sources/` vs `src/services/`

- Plan said: move to `src/sources/` once a second source exists.
- Code required: Codex and Cursor landed as `src/services/codex.ts` and `src/services/cursor.ts` next to the existing scanner/parser/loader so imports and AGENTS.md stay one folder.
- Option taken: keep `src/services/`; no Provider interface.

### tsdown `.js` vs `.mjs`

- Plan said: `dist/cli.js` matching scaffold-cli `bin`.
- Code required: tsdown Node platform defaults `fixedExtension` so output is `.mjs`.
- Option taken: `fixedExtension: false` so `"type": "module"` emits `.js` / `.d.ts`.

### Cursor open URI

- Plan said: `file:…?mode=ro` via `node:sqlite` `DatabaseSync`.
- Code required: `pathToFileURL(path).href + "?mode=ro"` plus `{ readOnly: true }`.
- Option taken: that URI form.

### TUI copy

- Plan said: do not `console.log` during Ink; write stdout after unmount.
- Option taken: `exit()` then `process.stdout.write` in the existing 150ms timeout.
