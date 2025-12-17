# ccs - Claude Code Search

[![npm version](https://img.shields.io/npm/v/claude-code-search.svg)](https://www.npmjs.com/package/claude-code-search)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Like [fzf](https://github.com/junegunn/fzf) or [atuin](https://github.com/atuinsh/atuin), but for your Claude Code prompts.

![ccs example](./example.png)

## Why?

Your best prompts are buried across dozens of Claude Code sessions. This tool lets you instantly search and reuse them instead of rewriting from scratch.

## Install

```bash
npm install -g claude-code-search
```

## Usage

```bash
ccs
```

Select a prompt and it's copied to your clipboard, ready to paste.

### Pipe to Claude

Extract insights from your prompt history:

```bash
ccs | claude "what patterns do you see in how I prompt?"
```

## Features

- **Fuzzy search** - Find prompts by any words they contain
- **Split-pane preview** - See full content before selecting
- **Quick jump** - Press 1-9 to instantly select
- **Filter modes** - Search globally or within current directory (`Ctrl+R`)

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate results |
| `1-9` | Quick jump to result |
| `Enter` | Copy & exit |
| `Ctrl+R` | Toggle global/directory filter |
| `Esc` | Quit |

## Requirements

- Node.js >= 18
- Claude Code (reads from `~/.claude/projects/`)

## License

MIT - Matthew Blode
