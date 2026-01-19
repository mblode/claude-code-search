import { createReadStream } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { getProjectsDir } from "../utils/config.js";
import { matchesProject } from "../utils/paths.js";

export interface ScanOptions {
  projectFilter?: string;
  sessionFilter?: string;
}

async function discoverProjects(projectFilter?: string): Promise<string[]> {
  try {
    const entries = await readdir(getProjectsDir(), { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((name) => !projectFilter || matchesProject(name, projectFilter));
  } catch {
    return [];
  }
}

async function discoverSessionFiles(
  projectDir: string,
  sessionFilter?: string
): Promise<string[]> {
  try {
    const projectsDir = getProjectsDir();
    const entries = await readdir(join(projectsDir, projectDir));
    return entries
      .filter((f) => f.endsWith(".jsonl"))
      .filter((f) => !sessionFilter || f.includes(sessionFilter))
      .map((f) => join(projectsDir, projectDir, f));
  } catch {
    return [];
  }
}

export async function* streamLines(filePath: string): AsyncGenerator<string> {
  const rl = createInterface({
    input: createReadStream(filePath, { encoding: "utf-8" }),
    crlfDelay: Number.POSITIVE_INFINITY,
  });
  for await (const line of rl) {
    if (line.trim()) {
      yield line;
    }
  }
}

export async function* scanAllFiles(
  options: ScanOptions = {}
): AsyncGenerator<{ filePath: string; projectDir: string }> {
  for (const projectDir of await discoverProjects(options.projectFilter)) {
    for (const filePath of await discoverSessionFiles(
      projectDir,
      options.sessionFilter
    )) {
      yield { filePath, projectDir };
    }
  }
}
