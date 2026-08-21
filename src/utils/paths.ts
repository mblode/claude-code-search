const LEADING_HYPHEN_REGEX = /^-/;
const HYPHEN_REGEX = /-/g;

export function decodeProjectPath(dirname: string): string {
  return dirname.replace(LEADING_HYPHEN_REGEX, "/").replace(HYPHEN_REGEX, "/");
}

/** Claude stores the cwd as a directory name with `/` replaced by `-`. */
export function encodeClaudeProjectDir(absPath: string): string {
  const trimmed = absPath.replace(/\/$/, "");
  return trimmed.replaceAll("/", "-");
}

export function extractProjectName(dirname: string): string {
  const parts = dirname.split("-").filter(Boolean);
  const codeIndex = parts.findIndex(
    (p) => p.toLowerCase() === "code" || p.toLowerCase() === "projects"
  );
  if (codeIndex !== -1 && codeIndex < parts.length - 1) {
    return parts.slice(codeIndex + 1).join("/");
  }
  return parts.slice(-2).join("/");
}

function matchesAbsoluteProject(dirname: string, filter: string): boolean {
  const encoded = encodeClaudeProjectDir(filter);
  if (dirname === encoded) {
    return true;
  }
  const decoded = decodeProjectPath(dirname);
  return decoded === filter || decoded.startsWith(`${filter}/`);
}

export function matchesProject(dirname: string, filter: string): boolean {
  if (filter.startsWith("/")) {
    return matchesAbsoluteProject(dirname, filter);
  }
  return extractProjectName(dirname)
    .toLowerCase()
    .includes(filter.toLowerCase());
}
