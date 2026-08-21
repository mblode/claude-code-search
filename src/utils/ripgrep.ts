import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function exitStatus(error: unknown): number | string | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }
  const { code, status } = error as {
    code?: number | string;
    status?: number;
  };
  return status ?? code;
}

export async function ripgrepFiles(options: {
  pattern: string;
  dirs: string[];
  glob?: string;
}): Promise<string[] | null> {
  const dirs = options.dirs.filter((dir) => existsSync(dir));
  if (dirs.length === 0) {
    return [];
  }

  try {
    const args = [
      "--files-with-matches",
      "--no-config",
      "--color",
      "never",
      "--fixed-strings",
      "--glob",
      options.glob ?? "*",
      "--glob",
      "!*.zst",
      "--",
      options.pattern,
      ...dirs,
    ];
    const { stdout } = await execFileAsync("rg", args, {
      maxBuffer: 20 * 1024 * 1024,
    });
    return stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    const code = exitStatus(error);
    if (code === "ENOENT") {
      return null;
    }
    if (code === 1) {
      return [];
    }
    return null;
  }
}
