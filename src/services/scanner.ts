import { createReadStream } from "node:fs";
import { readdir } from "node:fs/promises";
import { basename, join, relative, sep } from "node:path";
import { createInterface } from "node:readline";

import { getClaudeProjectDirs } from "../utils/config.js";
import { matchesProject } from "../utils/paths.js";
import { mapPool } from "../utils/pool.js";

export interface ScanOptions {
  projectFilter?: string;
  sessionFilter?: string;
}

const SUBAGENTS_SEGMENT = `${sep}subagents${sep}`;
const SUBAGENTS_SUFFIX = `${sep}subagents`;

function isUnderSubagents(filePath: string, root: string): boolean {
  const rel = `${sep}${relative(root, filePath)}`;
  return rel.includes(SUBAGENTS_SEGMENT) || rel.endsWith(SUBAGENTS_SUFFIX);
}

async function discoverProjects(
  projectsRoot: string,
  projectFilter?: string
): Promise<string[]> {
  try {
    const entries = await readdir(projectsRoot, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((name) => !projectFilter || matchesProject(name, projectFilter));
  } catch {
    return [];
  }
}

function direntFullPath(
  dir: string,
  entry: { name: string; parentPath?: string }
): string {
  return join(entry.parentPath ?? dir, entry.name);
}

async function collectJsonlFiles(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { recursive: true, withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    if (!entry.name.endsWith(".jsonl") || entry.name.endsWith(".jsonl.zst")) {
      continue;
    }
    out.push(direntFullPath(dir, entry));
  }
  return out;
}

async function discoverSessionFiles(
  projectsRoot: string,
  projectDir: string,
  sessionFilter?: string
): Promise<string[]> {
  const projectPath = join(projectsRoot, projectDir);
  const files = await collectJsonlFiles(projectPath);
  return files.filter((filePath) => {
    if (isUnderSubagents(filePath, projectPath)) {
      return false;
    }
    if (sessionFilter && !basename(filePath).includes(sessionFilter)) {
      return false;
    }
    return true;
  });
}

export async function* streamLines(filePath: string): AsyncGenerator<string> {
  const rl = createInterface({
    crlfDelay: Number.POSITIVE_INFINITY,
    input: createReadStream(filePath, { encoding: "utf-8" }),
  });
  for await (const line of rl) {
    if (line.trim()) {
      yield line;
    }
  }
}

export async function scanAllFiles(
  options: ScanOptions = {}
): Promise<{ filePath: string; projectDir: string }[]> {
  const files: { filePath: string; projectDir: string }[] = [];
  for (const projectsRoot of getClaudeProjectDirs()) {
    const projects = await discoverProjects(
      projectsRoot,
      options.projectFilter
    );
    const nested = await mapPool(projects, async (projectDir) => {
      const sessionFiles = await discoverSessionFiles(
        projectsRoot,
        projectDir,
        options.sessionFilter
      );
      return sessionFiles.map((filePath) => ({ filePath, projectDir }));
    });
    for (const group of nested) {
      files.push(...group);
    }
  }
  return files;
}
