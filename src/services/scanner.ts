import { createReadStream } from "fs";
import { readdir, stat } from "fs/promises";
import { join } from "path";
import { createInterface } from "readline";
import { PROJECTS_DIR, matchesProject } from "../utils/paths.js";

export interface ScanOptions {
  projectFilter?: string;
  sessionFilter?: string;
}

/**
 * Discover all project directories
 */
export async function discoverProjects(
  projectFilter?: string
): Promise<string[]> {
  try {
    const entries = await readdir(PROJECTS_DIR, { withFileTypes: true });
    const dirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((name) => !projectFilter || matchesProject(name, projectFilter));
    return dirs;
  } catch {
    return [];
  }
}

/**
 * Discover all JSONL files in a project directory
 */
export async function discoverSessionFiles(
  projectDir: string,
  sessionFilter?: string
): Promise<string[]> {
  const projectPath = join(PROJECTS_DIR, projectDir);
  try {
    const entries = await readdir(projectPath);
    const jsonlFiles = entries
      .filter((f) => f.endsWith(".jsonl"))
      .filter((f) => !sessionFilter || f.includes(sessionFilter))
      .map((f) => join(projectPath, f));
    return jsonlFiles;
  } catch {
    return [];
  }
}

/**
 * Stream lines from a JSONL file
 */
export async function* streamLines(filePath: string): AsyncGenerator<string> {
  const fileStream = createReadStream(filePath, { encoding: "utf-8" });
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (line.trim()) {
      yield line;
    }
  }
}

/**
 * Scan all session files and return file paths with project info
 */
export async function* scanAllFiles(
  options: ScanOptions = {}
): AsyncGenerator<{ filePath: string; projectDir: string }> {
  const projects = await discoverProjects(options.projectFilter);

  for (const projectDir of projects) {
    const files = await discoverSessionFiles(projectDir, options.sessionFilter);
    for (const filePath of files) {
      yield { filePath, projectDir };
    }
  }
}

/**
 * Get total count of session files (for progress indication)
 */
export async function countSessionFiles(
  options: ScanOptions = {}
): Promise<number> {
  let count = 0;
  const projects = await discoverProjects(options.projectFilter);

  for (const projectDir of projects) {
    const files = await discoverSessionFiles(projectDir, options.sessionFilter);
    count += files.length;
  }

  return count;
}
