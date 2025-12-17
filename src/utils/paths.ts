import { homedir } from "os";
import { join } from "path";

export const CLAUDE_DIR = join(homedir(), ".claude");
export const PROJECTS_DIR = join(CLAUDE_DIR, "projects");

export function decodeProjectPath(dirname: string): string {
  return dirname.replace(/^-/, "/").replace(/-/g, "/");
}

export function extractProjectName(dirname: string): string {
  const parts = dirname.split("-").filter(Boolean);
  const codeIndex = parts.findIndex((p) => p.toLowerCase() === "code" || p.toLowerCase() === "projects");
  if (codeIndex >= 0 && codeIndex < parts.length - 1) return parts.slice(codeIndex + 1).join("/");
  return parts.slice(-2).join("/");
}

export function matchesProject(dirname: string, filter: string): boolean {
  if (filter.startsWith("/")) {
    const decoded = decodeProjectPath(dirname);
    return filter.startsWith(decoded) || decoded.startsWith(filter);
  }
  return extractProjectName(dirname).toLowerCase().includes(filter.toLowerCase());
}
