# AGENTS.md — claude-code-search

`ccs`, a terminal UI for searching your own coding-agent prompts across past
sessions — fzf or atuin, but for prompt history. Sources: Claude Code, Codex
CLI, Cursor. Published to npm as `claude-code-search`.

## Commands

```bash
npm install        # setup (requires Node >= 24.11)
npm run dev        # tsdown --watch
npm run build      # tsdown (CLI + library + dts)
npm run start      # node dist/cli.js
npm run lint       # ultracite check (oxlint + oxfmt)
npm run check      # same as lint
npm run format     # ultracite fix
npm run check:types # tsc --noEmit
npm test           # vitest run --passWithNoTests
```

Gates: `lint`, `check:types`, `test`. Smoke: `npm run build && npm run start` against your own history.

## This is a React app that renders to a terminal

The UI is [Ink](https://github.com/vadimdemedes/ink), so `src/app.tsx` and
`src/components/*.tsx` are React components whose output is text.

- There is no DOM. Layout comes from Ink's `<Box>`; colour from `src/utils/color.ts`.
- Anything written to stdout that is not Ink's render corrupts the frame. Debug
  to stderr or to a file. CLI data (list/search/json) is the exception: stdout is data, stderr is logs.
- Input is `ink-text-input` plus raw key handling.

## Build shape

`tsdown.config.ts` produces two entries: the binary (`dist/cli.js`, `package.json` `bin` → `ccs`) with a shebang banner, and the library (`dist/index.js` + dts). Do not put a shebang in `src/cli.ts`.

`files` is `dist`, `example.png`, README, LICENSE. Check `npm pack --dry-run` after touching the build.

## Reading session history

Never write to Claude, Codex, or Cursor history files. Parse failures are expected: skip the line, do not throw a stack at the user.

| Source | Layout |
|--------|--------|
| Claude | `~/.claude/projects/<encoded-cwd>/<uuid>.jsonl` (also `~/.config/claude/projects` if present). Skip `subagents/`. |
| Codex | `~/.codex/sessions/**/rollout-*.jsonl` and `archived_sessions`. Skip `.jsonl.zst`. |
| Cursor | Read-only `state.vscdb` (`composerHeaders` + `bubbleId` type 1). Cwd-scoped unless `--source cursor` alone. |

`CCS_PROJECT_DIR` / `--projects-dir` override the Claude projects root only.

## Releases

Changesets. `npm run changeset`, commit the generated file, merge to the default
branch, then merge the Version Packages PR — `release` runs the build before
`changeset publish`.
