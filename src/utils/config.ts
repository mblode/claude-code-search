import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CLAUDE_DIR = join(homedir(), ".claude");
const DEFAULT_PROJECTS_DIR = join(CLAUDE_DIR, "projects");
const XDG_CLAUDE_PROJECTS_DIR = join(
  homedir(),
  ".config",
  "claude",
  "projects"
);

interface Config {
  projectsDir: string | null;
}

const config: Config = {
  projectsDir: null,
};

/**
 * Initialize configuration with CLI arguments.
 * Precedence: CLI flag > CCS_PROJECT_DIR env var > default roots
 */
export function initConfig(options: { projectsDir?: string } = {}): void {
  const envProjectsDir = process.env.CCS_PROJECT_DIR;

  if (options.projectsDir) {
    config.projectsDir = options.projectsDir;
  } else if (envProjectsDir) {
    config.projectsDir = envProjectsDir;
  } else {
    config.projectsDir = null;
  }
}

export function getProjectsDir(): string {
  return config.projectsDir ?? DEFAULT_PROJECTS_DIR;
}

/** Claude project roots to scan. A flag/env override is a single root. */
export function getClaudeProjectDirs(): string[] {
  if (config.projectsDir) {
    return [config.projectsDir];
  }
  const dirs = [DEFAULT_PROJECTS_DIR];
  if (
    existsSync(XDG_CLAUDE_PROJECTS_DIR) &&
    XDG_CLAUDE_PROJECTS_DIR !== DEFAULT_PROJECTS_DIR
  ) {
    dirs.push(XDG_CLAUDE_PROJECTS_DIR);
  }
  return dirs;
}

export function getDefaultProjectsDir(): string {
  return DEFAULT_PROJECTS_DIR;
}
