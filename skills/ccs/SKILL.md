---
name: ccs
description: Search local Claude Code, Codex, and Cursor user-prompt history (read-only). Use when you need a past prompt, want to grep coding-agent session text, or pipe prompt history as JSON.
---

# ccs

Terminal search over **your** Claude Code, Codex CLI, and Cursor prompts. Never writes session files.

## Install

```bash
npm install -g claude-code-search
```

Node >= 24.11.

## Agent usage

Prefer non-interactive flags. stdout is data; stderr is logs.

```bash
ccs --no-input --output json -s "<query>" -n 20
ccs --no-input --output json -l -n 50 --source claude
ccs schema
```

`--source` is `claude`, `codex`, `cursor`, or `all` (repeatable). `-j` is an alias for `--output json`. `-s` / `-l` remain valid.

JSON objects include `content`, `cwd`, `project`, `projectPath`, `source`, `sessionId`, `timestamp`.

Errors in json mode:

```json
{ "error": true, "code": "NO_RESULTS", "message": "...", "details": {} }
```

Do not launch the TUI (`ccs` with no flags) unless the user is at a TTY and asked for it.

## Paths (read-only)

- Claude: `~/.claude/projects/` (override `--projects-dir` / `CCS_PROJECT_DIR`)
- Codex: `~/.codex/sessions/` (skips `.jsonl.zst`)
- Cursor: Cursor `User/globalStorage/state.vscdb` (cwd-scoped unless `--source cursor` alone)
