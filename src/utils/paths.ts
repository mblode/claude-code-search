const LEADING_HYPHEN_REGEX = /^-/;
const HYPHEN_REGEX = /-/g;

export function decodeProjectPath(dirname: string): string {
  return dirname.replace(LEADING_HYPHEN_REGEX, "/").replace(HYPHEN_REGEX, "/");
}

export function extractProjectName(dirname: string): string {
  const parts = dirname.split("-").filter(Boolean);
  const codeIndex = parts.findIndex(
    (p) => p.toLowerCase() === "code" || p.toLowerCase() === "projects"
  );
  if (codeIndex >= 0 && codeIndex < parts.length - 1) {
    return parts.slice(codeIndex + 1).join("/");
  }
  return parts.slice(-2).join("/");
}

export function matchesProject(dirname: string, filter: string): boolean {
  if (filter.startsWith("/")) {
    // For absolute paths, be very permissive at scanner level
    // The actual filtering will happen at the loader level based on message.cwd
    // Due to lossy encoding (hyphens become slashes), we can't reliably match here
    // So we just check if they could potentially be related based on parent directories
    const decoded = decodeProjectPath(dirname);
    const filterParts = filter.split("/").filter(Boolean);
    const decodedParts = decoded.split("/").filter(Boolean);

    // Check if they share at least some common parent directories
    // We'll be permissive and only require matching the first few parts
    const minPartsToMatch = Math.min(
      4,
      Math.min(filterParts.length, decodedParts.length)
    );
    for (let i = 0; i < minPartsToMatch; i++) {
      if (filterParts[i] !== decodedParts[i]) {
        return false;
      }
    }
    return true;
  }
  return extractProjectName(dirname)
    .toLowerCase()
    .includes(filter.toLowerCase());
}
