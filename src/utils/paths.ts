import { homedir } from "os";
import { join } from "path";

export const CLAUDE_DIR = join(homedir(), ".claude");
export const PROJECTS_DIR = join(CLAUDE_DIR, "projects");

/**
 * Decode project directory name to full path
 * "-Users-mblode-Code-project" -> "/Users/mblode/Code/project"
 */
export function decodeProjectPath(dirname: string): string {
  return dirname.replace(/^-/, "/").replace(/-/g, "/");
}

/**
 * Extract a human-friendly project name from directory name
 * "-Users-mblode-Code-linktree-discover" -> "linktree/discover"
 */
export function extractProjectName(dirname: string): string {
  const parts = dirname.split("-").filter(Boolean);
  // Skip common path segments like Users, username, Code
  const codeIndex = parts.findIndex(
    (p) => p.toLowerCase() === "code" || p.toLowerCase() === "projects"
  );
  if (codeIndex >= 0 && codeIndex < parts.length - 1) {
    return parts.slice(codeIndex + 1).join("/");
  }
  // Fallback: take last 2 segments
  return parts.slice(-2).join("/");
}

/**
 * Check if a project directory name matches a filter
 * Filter can be:
 * - A substring to match against project name (e.g., "linktree")
 * - A full path to match against the decoded project path (e.g., "/Users/mblode/Code/linktree")
 */
export function matchesProject(dirname: string, filter: string): boolean {
  // If filter looks like a path, match against decoded path
  if (filter.startsWith("/")) {
    const decodedPath = decodeProjectPath(dirname);
    // Check if cwd starts with project path or project path starts with cwd
    return filter.startsWith(decodedPath) || decodedPath.startsWith(filter);
  }

  // Otherwise match against project name
  const projectName = extractProjectName(dirname).toLowerCase();
  const filterLower = filter.toLowerCase();
  return projectName.includes(filterLower);
}
