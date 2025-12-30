import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "../app.js";
import { loadMessages } from "../services/loader.js";
import { search } from "../services/matcher.js";
import { colorize } from "../utils/color.js";
import { EXIT_CODES, fatal } from "../utils/errors.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);
const pkg = require(join(__dirname, "..", "package.json"));

interface CliArgs {
  list: boolean;
  search: string | null;
  json: boolean;
  limit: number;
  help: boolean;
  project: string | null;
  version: boolean;
}

function parseArgs(args: string[]): CliArgs {
  const result: CliArgs = {
    list: false,
    search: null,
    json: false,
    limit: 100,
    help: false,
    project: null,
    version: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-l" || arg === "--list") {
      result.list = true;
    } else if (arg === "-s" || arg === "--search") {
      i++;
      if (i >= args.length || args[i].startsWith("-")) {
        fatal(
          "option '-s, --search' requires an argument",
          EXIT_CODES.INVALID_ARGS
        );
      }
      result.search = args[i];
    } else if (arg === "-j" || arg === "--json") {
      result.json = true;
    } else if (arg === "-n" || arg === "--limit") {
      i++;
      if (i >= args.length || args[i].startsWith("-")) {
        fatal(
          "option '-n, --limit' requires an argument",
          EXIT_CODES.INVALID_ARGS
        );
      }
      const limit = Number.parseInt(args[i], 10);
      if (Number.isNaN(limit) || limit <= 0) {
        fatal(
          "option '-n, --limit' must be a positive integer",
          EXIT_CODES.INVALID_ARGS
        );
      }
      result.limit = limit;
    } else if (arg === "-p" || arg === "--project") {
      i++;
      if (i >= args.length || args[i].startsWith("-")) {
        fatal(
          "option '-p, --project' requires an argument",
          EXIT_CODES.INVALID_ARGS
        );
      }
      result.project = args[i];
    } else if (arg === "-h" || arg === "--help") {
      result.help = true;
    } else if (arg === "-v" || arg === "--version") {
      result.version = true;
    } else if (arg.startsWith("-")) {
      fatal(`unknown option: ${arg}`, EXIT_CODES.INVALID_ARGS);
    }
  }

  return result;
}

function printHelp() {
  console.log(`ccs - Claude Code Search

Usage: ccs [options]

Options:
  -l, --list            List all prompts (non-interactive)
  -s, --search <query>  Search prompts with query (non-interactive)
  -j, --json            Output as JSON (use with -l or -s)
  -n, --limit <n>       Limit number of results (default: 100)
  -p, --project <path>  Filter by project path
  -v, --version         Show version number
  -h, --help            Show this help

Interactive Mode:
  When launched without arguments, ccs starts an interactive TUI.

  Keyboard Shortcuts:
    Ctrl+R / Shift+Tab  Toggle search/results focus
    j / k               Navigate results (vim-style)
    Up / Down           Navigate results
    Enter               Copy selected prompt to clipboard
    Ctrl+C / q          Quit

Examples:
  ccs                   Launch interactive TUI
  ccs -l                List recent prompts
  ccs -l -j             List prompts as JSON
  ccs -s "refactor"     Search for "refactor"
  ccs -s "test" -j      Search and output JSON
  ccs -l -n 50          List last 50 prompts
  ccs -p /path/to/proj  Filter by project path
`);
}

function isTTY(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

async function runNonInteractive(cliArgs: CliArgs): Promise<number> {
  const messages = await loadMessages({
    projectFilter: cliArgs.project || undefined,
    filters: { role: "user" },
  });

  if (messages.length === 0) {
    console.error("ccs: no prompts found");
    return EXIT_CODES.NO_RESULTS;
  }

  let output = messages;

  if (cliArgs.search) {
    const results = search(messages, cliArgs.search, cliArgs.limit);
    if (results.length === 0) {
      console.error(`ccs: no results for '${cliArgs.search}'`);
      return EXIT_CODES.NO_RESULTS;
    }
    output = results.map((r) => r.item);
  } else {
    output = messages.slice(0, cliArgs.limit);
  }

  if (cliArgs.json) {
    console.log(
      JSON.stringify(
        output.map((m) => ({
          content: m.content,
          timestamp: m.timestamp.toISOString(),
          project: m.projectName,
          projectPath: m.projectPath,
          cwd: m.cwd,
          gitBranch: m.gitBranch,
        })),
        null,
        2
      )
    );
  } else {
    for (const msg of output) {
      const date = msg.timestamp.toISOString().slice(0, 10);
      const project = msg.projectName || "unknown";
      const preview = msg.content.slice(0, 200).replace(/\n/g, " ");
      console.log(
        `${colorize(`[${date}]`, "gray")} ${colorize(`[${project}]`, "cyan")} ${preview}`
      );
    }
  }

  return EXIT_CODES.SUCCESS;
}

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(EXIT_CODES.SUCCESS);
} else if (args.version) {
  console.log(pkg.version);
  process.exit(EXIT_CODES.SUCCESS);
} else if (args.list || args.search !== null) {
  runNonInteractive(args)
    .then((code) => process.exit(code))
    .catch((err) => {
      fatal(err.message || "An error occurred");
    });
} else if (isTTY()) {
  run(process.cwd(), args.project || undefined);
} else {
  // Fall back to list mode when not in a TTY (e.g., piped)
  runNonInteractive({ ...args, list: true })
    .then((code) => process.exit(code))
    .catch((err) => {
      fatal(err.message || "An error occurred");
    });
}
