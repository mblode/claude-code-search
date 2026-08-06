<div align="center">

# Claude Code Search

**Fuzzy-search every prompt you have written in Claude Code and copy one back to your clipboard**

Like [fzf](https://github.com/junegunn/fzf) or [atuin](https://github.com/atuinsh/atuin), but for the prompts buried across your past sessions.

<p align="center">
  <a href="https://www.npmjs.com/package/claude-code-search">
    <img src="https://img.shields.io/npm/v/claude-code-search?style=flat&colorA=000000&colorB=000000" />
  </a>
  <a href="https://github.com/mblode/claude-code-search/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/mblode/claude-code-search?style=flat&colorA=000000&colorB=000000" />
  </a>
</p>

</div>

![ccs searching a prompt history](./example.png)

## Install

```bash
npm install -g claude-code-search
```

## Quickstart

```bash
ccs
```

Type to filter. Results rank by match quality rather than date, the preview pane shows the full prompt, and `Enter` copies the selected one to your clipboard and prints it to stdout.

The same search runs non-interactively, so you can feed your own history back into Claude:

```bash
# Search and print the matches
ccs -s "refactor"

# Pipe the last 50 prompts into Claude
ccs -l -n 50 | claude "what patterns do you see in how I prompt?"

# Machine-readable output for a script
ccs -s "refactor" -j
```

## Options

| Flag                   | Default              | Description                            |
| ---------------------- | -------------------- | -------------------------------------- |
| `-l, --list`           |                      | List prompts and exit, no TUI          |
| `-s, --search <query>` |                      | Search for a query and exit, no TUI    |
| `-j, --json`           |                      | Output JSON, for use with `-l` or `-s` |
| `-n, --limit <n>`      | `100`                | Maximum number of results              |
| `-p, --project <path>` |                      | Only prompts from one project path     |
| `--projects-dir <dir>` | `~/.claude/projects` | Where to read session files from       |

## Keyboard shortcuts

| Key                    | Action                                  |
| ---------------------- | --------------------------------------- |
| `↑` / `↓`              | Move through results                    |
| `1` to `9`             | Jump straight to a result and copy it   |
| `Enter`                | Copy the selected prompt and exit       |
| `Ctrl+R` / `Shift+Tab` | Toggle global or current-directory only |
| `Esc` / `Ctrl+C`       | Quit                                    |

## Exit codes

| Code | Meaning           |
| ---- | ----------------- |
| `0`  | Success           |
| `1`  | General error     |
| `2`  | Invalid arguments |
| `3`  | No results found  |

## Notes

- Node.js 24 or newer.
- Sessions are read from `~/.claude/projects/`. Override with `--projects-dir` or `CCS_PROJECT_DIR`, and the flag wins over the environment variable.
- Colour follows `NO_COLOR` and `FORCE_COLOR`, and drops out when stdout is not a terminal.
- Your history is only read, never written to.

## License

MIT

---

Crafted by [<img src="https://blode.co/avatar-circle.png" width="20" align="top" />](https://blode.co) [Matthew Blode](https://blode.co)
