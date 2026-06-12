import { homedir } from "node:os";
import { join } from "node:path";

const CLAUDE_DIR = join(homedir(), ".claude");
const DEFAULT_PROJECTS_DIR = join(CLAUDE_DIR, "projects");

interface Config {
  projectsDir: string;
}

const config: Config = {
  projectsDir: DEFAULT_PROJECTS_DIR,
};

/**
 * Initialize configuration with CLI arguments.
 * Precedence: CLI flag > CCS_PROJECT_DIR env var > default
 */
export function initConfig(options: { projectsDir?: string } = {}): void {
  const envProjectsDir = process.env.CCS_PROJECT_DIR;

  if (options.projectsDir) {
    config.projectsDir = options.projectsDir;
  } else if (envProjectsDir) {
    config.projectsDir = envProjectsDir;
  } else {
    config.projectsDir = DEFAULT_PROJECTS_DIR;
  }
}

export function getProjectsDir(): string {
  return config.projectsDir;
}

export function getDefaultProjectsDir(): string {
  return DEFAULT_PROJECTS_DIR;
}
