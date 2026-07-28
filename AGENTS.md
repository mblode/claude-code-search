# AGENTS.md — claude-code-search

`ccs`, a terminal UI for searching your own Claude Code prompts across past
sessions — fzf or atuin, but for prompt history. Published to npm as
`claude-code-search`.

## Commands

```bash
npm run dev            # tsup --watch
npm run build          # tsup, then tsc --emitDeclarationOnly
npm run start          # node dist/ccs.js
npm run lint           # ultracite check (oxlint + oxfmt, not Biome)
npm run format         # ultracite fix
npm run check:types    # tsc --noEmit
```

No test runner. `lint` and `check:types` are the gates, and the real check is
running `npm run build && npm run start` against your own session history.

## This is a React app that renders to a terminal

The UI is [Ink](https://github.com/vadimdemedes/ink), so `src/app.tsx` and
`src/components/*.tsx` are React components whose output is text. That has
consequences worth holding onto:

- There is no DOM. No `div`, no CSS, no browser API. Layout comes from Ink's
  `<Box>` flexbox subset; colour comes from `src/utils/color.ts`.
- Anything written to stdout that is not Ink's render corrupts the frame. Debug
  to stderr or to a file, never `console.log`.
- Input is `ink-text-input` plus raw key handling. Terminals differ; test in more
  than one before trusting a keybinding.

## Build shape

`tsup.config.ts` produces two entries: the binary (`dist/ccs.js`, which
`package.json` `bin` maps to `ccs`) and the library (`dist/index.js`). Types come
from a separate `tsc --emitDeclarationOnly` pass, so `npm run build` is both steps
and running only `tsup` ships no declarations.

`files` is `["dist", "example.png"]`, so nothing under `src/` is published. Check
`npm pack --dry-run` after touching the build.

## Reading session history

`src/utils/paths.ts` locates Claude Code's own session files. That layout is
someone else's and can change between Claude Code releases, so treat a parse
failure as an expected condition with a readable message (`src/utils/errors.ts`),
not an exception the user sees as a stack trace. Never write to those files; this
tool reads history it does not own.

## Releases

Changesets. `npm run changeset`, commit the generated file, merge to the default
branch, then merge the Version Packages PR — `release` runs the build before
`changeset publish`.
