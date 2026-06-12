import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "../index.js";
import { loadMessages } from "../services/loader.js";
import { search } from "../services/matcher.js";
import { colorize } from "../utils/color.js";
import { getDefaultProjectsDir, initConfig } from "../utils/config.js";
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
  projectsDir: string | null;
  version: boolean;
}

function getNextArg(args: string[], index: number, optionName: string): string {
  const nextIndex = index + 1;
  if (nextIndex >= args.length || args[nextIndex].startsWith("-")) {
    fatal(
      `option '${optionName}' requires an argument`,
      EXIT_CODES.INVALID_ARGS
    );
  }
  return args[nextIndex];
}

function parseLimit(value: string): number {
  const limit = Number.parseInt(value, 10);
  if (Number.isNaN(limit) || limit <= 0) {
    fatal(
      "option '-n, --limit' must be a positive integer",
      EXIT_CODES.INVALID_ARGS
    );
  }
  return limit;
}

function handleSearchArg(args: string[], i: number, result: CliArgs): number {
  result.search = getNextArg(args, i, "-s, --search");
  return i + 1;
}

function handleLimitArg(args: string[], i: number, result: CliArgs): number {
  const value = getNextArg(args, i, "-n, --limit");
  result.limit = parseLimit(value);
  return i + 1;
}

function handleProjectArg(args: string[], i: number, result: CliArgs): number {
  result.project = getNextArg(args, i, "-p, --project");
  return i + 1;
}

function handleProjectsDirArg(
  args: string[],
  i: number,
  result: CliArgs
): number {
  result.projectsDir = getNextArg(args, i, "--projects-dir");
  return i + 1;
}

function isFlagMatch(arg: string, short: string, long: string): boolean {
  return arg === short || arg === long;
}

function processArgument(
  arg: string,
  args: string[],
  i: number,
  result: CliArgs
): number {
  if (isFlagMatch(arg, "-l", "--list")) {
    result.list = true;
    return i;
  }

  if (isFlagMatch(arg, "-s", "--search")) {
    return handleSearchArg(args, i, result);
  }

  if (isFlagMatch(arg, "-j", "--json")) {
    result.json = true;
    return i;
  }

  if (isFlagMatch(arg, "-n", "--limit")) {
    return handleLimitArg(args, i, result);
  }

  if (isFlagMatch(arg, "-p", "--project")) {
    return handleProjectArg(args, i, result);
  }

  if (arg === "--projects-dir") {
    return handleProjectsDirArg(args, i, result);
  }

  if (isFlagMatch(arg, "-h", "--help")) {
    result.help = true;
    return i;
  }

  if (isFlagMatch(arg, "-v", "--version")) {
    result.version = true;
    return i;
  }

  if (arg.startsWith("-")) {
    fatal(`unknown option: ${arg}`, EXIT_CODES.INVALID_ARGS);
  }

  return i;
}

function parseArgs(args: string[]): CliArgs {
  const result: CliArgs = {
    list: false,
    search: null,
    json: false,
    limit: 100,
    help: false,
    project: null,
    projectsDir: null,
    version: false,
  };

  for (let i = 0; i < args.length; i++) {
    i = processArgument(args[i], args, i, result);
  }

  return result;
}

function printHelp() {
  const defaultDir = getDefaultProjectsDir();
  console.log(`ccs - Claude Code Search

Usage: ccs [options]

Options:
  -l, --list            List all prompts (non-interactive)
  -s, --search <query>  Search prompts with query (non-interactive)
  -j, --json            Output as JSON (use with -l or -s)
  -n, --limit <n>       Limit number of results (default: 100)
  -p, --project <path>  Filter by project path
  --projects-dir <dir>  Projects directory (default: ${defaultDir})
  -v, --version         Show version number
  -h, --help            Show this help

Environment Variables:
  CCS_PROJECT_DIR       Override the projects directory (--projects-dir takes precedence)

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
  ccs --projects-dir ~/backup/claude/projects  Use alternate directory
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

// Initialize config with CLI args (precedence: CLI > env > default)
initConfig({ projectsDir: args.projectsDir || undefined });

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
