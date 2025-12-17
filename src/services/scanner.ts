import { createReadStream } from "fs";
import { readdir } from "fs/promises";
import { join } from "path";
import { createInterface } from "readline";
import { PROJECTS_DIR, matchesProject } from "../utils/paths.js";

export interface ScanOptions {
  projectFilter?: string;
  sessionFilter?: string;
}

async function discoverProjects(projectFilter?: string): Promise<string[]> {
  try {
    const entries = await readdir(PROJECTS_DIR, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((name) => !projectFilter || matchesProject(name, projectFilter));
  } catch {
    return [];
  }
}

async function discoverSessionFiles(projectDir: string, sessionFilter?: string): Promise<string[]> {
  try {
    const entries = await readdir(join(PROJECTS_DIR, projectDir));
    return entries
      .filter((f) => f.endsWith(".jsonl"))
      .filter((f) => !sessionFilter || f.includes(sessionFilter))
      .map((f) => join(PROJECTS_DIR, projectDir, f));
  } catch {
    return [];
  }
}

export async function* streamLines(filePath: string): AsyncGenerator<string> {
  const rl = createInterface({
    input: createReadStream(filePath, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (line.trim()) yield line;
  }
}

export async function* scanAllFiles(options: ScanOptions = {}): AsyncGenerator<{ filePath: string; projectDir: string }> {
  for (const projectDir of await discoverProjects(options.projectFilter)) {
    for (const filePath of await discoverSessionFiles(projectDir, options.sessionFilter)) {
      yield { filePath, projectDir };
    }
  }
}
