import { createRequire } from "node:module";
import { join } from "node:path";
import { styleText } from "node:util";

import { Command } from "commander";

import { run } from "./index.js";
import { loadMessages } from "./services/loader.js";
import { search } from "./services/matcher.js";
import type { MessageSource, ParsedMessage } from "./types/index.js";
import { colorize } from "./utils/color.js";
import { getDefaultProjectsDir, initConfig } from "./utils/config.js";
import { EXIT_CODES } from "./utils/errors.js";

const __dirname = import.meta.dirname;
const require = createRequire(import.meta.url);
const pkg = require(join(__dirname, "..", "package.json")) as {
  version: string;
};

const isInteractive =
  Boolean(process.stdout.isTTY) && !process.env.NO_COLOR && !process.env.CI;

type OutputFormat = "text" | "json";

interface GlobalOpts {
  output?: OutputFormat;
  input?: boolean;
  list?: boolean;
  search?: string;
  json?: boolean;
  limit?: string;
  project?: string;
  projectsDir?: string;
  source?: string[];
}

function parseSources(raw: string[] | undefined): MessageSource[] | undefined {
  if (!raw?.length) {
    return undefined;
  }
  const out = new Set<MessageSource>();
  for (const item of raw) {
    for (const part of item.split(",")) {
      const value = part.trim().toLowerCase();
      if (!value || value === "all") {
        return undefined;
      }
      if (value === "claude" || value === "codex" || value === "cursor") {
        out.add(value);
        continue;
      }
      throw new Error(`invalid --source ${JSON.stringify(part)}`);
    }
  }
  return [...out];
}

function jsonError(
  code: string,
  message: string,
  details: Record<string, unknown> = {}
) {
  process.stdout.write(JSON.stringify({ code, details, error: true, message }));
}

function writeJson(data: unknown) {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

function serialize(msg: ParsedMessage) {
  return {
    content: msg.content,
    cwd: msg.cwd,
    gitBranch: msg.gitBranch,
    project: msg.projectName,
    projectPath: msg.projectPath,
    sessionId: msg.sessionId,
    source: msg.source,
    timestamp: msg.timestamp.toISOString(),
  };
}

async function runNonInteractive(options: {
  output: OutputFormat;
  search: string | null;
  limit: number;
  project?: string;
  sources?: MessageSource[];
}): Promise<number> {
  const messages = await loadMessages({
    cwd: process.cwd(),
    filters: { role: "user" },
    projectFilter: options.project,
    sources: options.sources,
  });

  if (messages.length === 0) {
    if (options.output === "json") {
      jsonError("NO_RESULTS", "no prompts found");
    } else {
      process.stderr.write("ccs: no prompts found\n");
    }
    return EXIT_CODES.NO_RESULTS;
  }

  let output = messages;
  if (options.search) {
    const results = search(messages, options.search, options.limit);
    if (results.length === 0) {
      const message = `no results for '${options.search}'`;
      if (options.output === "json") {
        jsonError("NO_RESULTS", message);
      } else {
        process.stderr.write(`ccs: ${message}\n`);
      }
      return EXIT_CODES.NO_RESULTS;
    }
    output = results.map((r) => r.item);
  } else {
    output = messages.slice(0, options.limit);
  }

  if (options.output === "json") {
    writeJson(output.map(serialize));
  } else {
    for (const msg of output) {
      const date = msg.timestamp.toISOString().slice(0, 10);
      const project = msg.projectName || "unknown";
      const preview = msg.content.slice(0, 200).replaceAll("\n", " ");
      const { source } = msg;
      process.stdout.write(
        `${colorize(`[${date}]`, "gray")} ${colorize(`[${source}]`, "cyan")} ${colorize(`[${project}]`, "magenta")} ${preview}\n`
      );
    }
  }
  return EXIT_CODES.SUCCESS;
}

function isTTY(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

const program = new Command();

program
  .name("ccs")
  .description("Search your Claude Code, Codex, and Cursor prompt history")
  .version(pkg.version)
  .option("--output <format>", "output format: text or json", "text")
  .option("--no-input", "never prompt; fail if a required value is missing")
  .option("-l, --list", "list prompts and exit (non-interactive)")
  .option("-s, --search <query>", "search prompts and exit (non-interactive)")
  .option("-j, --json", "alias for --output json")
  .option("-n, --limit <n>", "limit number of results", "100")
  .option("-p, --project <path>", "filter by project path")
  .option(
    "--projects-dir <dir>",
    `Claude projects directory (default: ${getDefaultProjectsDir()})`
  )
  .option(
    "--source <source>",
    "claude, codex, cursor, or all (repeatable)",
    (value: string, previous: string[] = []) => {
      previous.push(value);
      return previous;
    },
    [] as string[]
  );

program
  .command("schema")
  .description("print the command surface as JSON")
  .action(() => {
    const schema = [
      {
        command: "",
        description: program.description(),
        options: program.options.map((opt) => ({
          default: opt.defaultValue,
          description: opt.description,
          flag: opt.long,
          required: opt.required,
        })),
      },
      ...program.commands.map((cmd) => ({
        command: cmd.name(),
        description: cmd.description(),
        options: cmd.options.map((opt) => ({
          default: opt.defaultValue,
          description: opt.description,
          flag: opt.long,
          required: opt.required,
        })),
      })),
    ];
    process.stdout.write(`${JSON.stringify(schema)}\n`);
  });

program.action(async () => {
  const opts = program.opts<GlobalOpts>();
  const output: OutputFormat =
    opts.json || opts.output === "json" ? "json" : "text";
  const limit = Number.parseInt(opts.limit ?? "100", 10);
  if (Number.isNaN(limit) || limit <= 0) {
    throw new Error("option '-n, --limit' must be a positive integer");
  }
  const sources = parseSources(opts.source);
  initConfig({ projectsDir: opts.projectsDir });

  const list = Boolean(opts.list);
  const searchQuery = opts.search ?? null;
  const nonInteractive = list || searchQuery !== null || !isTTY();

  if (nonInteractive) {
    const code = await runNonInteractive({
      limit,
      output,
      project: opts.project,
      search: searchQuery,
      sources,
    });
    process.exitCode = code;
    return;
  }

  run(process.cwd(), opts.project, sources);
});

program.parseAsync().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const { output } = program.opts<GlobalOpts>();
  if (output === "json" || program.opts<GlobalOpts>().json) {
    jsonError("UNEXPECTED", message);
  } else {
    const label = isInteractive ? styleText("red", "Error:") : "Error:";
    process.stderr.write(`${label} ${message}\n`);
  }
  process.exitCode = 1;
});
