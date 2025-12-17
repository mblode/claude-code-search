# ccs - Claude Code Search

[![npm version](https://img.shields.io/npm/v/claude-code-search.svg)](https://www.npmjs.com/package/claude-code-search)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Interactive TUI for searching through your Claude Code session history. Find and reuse prompts you've written before.

![ccs example](./example.png)

## Installation

```bash
npm install -g claude-code-search
```

## Usage

```bash
ccs
```

This will open an interactive search interface for all your Claude Code prompts stored in `~/.claude/projects/`.

## Features

- **Fulltext search** - Find prompts containing your search terms
- **Multi-term search** - Search for `deploy prod` to find prompts containing both words
- **Split-pane preview** - See the full prompt content on the right
- **Quick jump** - Press 1-9 to instantly select a result
- **Filter modes** - Search globally or within current directory
- **Copy to clipboard** - Selected prompt is copied and printed on exit

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate results |
| `1-9` | Quick jump to result |
| `Enter` | Copy selected prompt & exit |
| `Ctrl+R` | Toggle filter mode (global/directory) |
| `Shift+Tab` | Toggle filter mode |
| `Esc` | Quit |

## How It Works

Claude Code stores your conversation history in `~/.claude/projects/` as JSONL files. This tool:

1. Scans all session files
2. Extracts your user prompts (filters out tool results, warmups, and agent messages)
3. Provides a fast, searchable interface
4. Copies selected prompts to your clipboard for reuse

## Requirements

- Node.js >= 18
- Claude Code installed (with session history in `~/.claude/projects/`)

## License

MIT - Matthew Blode
