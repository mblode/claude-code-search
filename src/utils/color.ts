/**
 * Check if stdout supports color output.
 * Follows https://no-color.org/ standard.
 */
export function supportsColor(): boolean {
  // NO_COLOR takes precedence (https://no-color.org/)
  if (process.env.NO_COLOR !== undefined) {
    return false;
  }

  // FORCE_COLOR overrides TTY detection
  if (process.env.FORCE_COLOR !== undefined) {
    return process.env.FORCE_COLOR !== "0";
  }

  // Default: check if stdout is a TTY
  return Boolean(process.stdout.isTTY);
}

/**
 * ANSI color codes for terminal output
 */
export const colors = {
  reset: "\x1b[0m",
  gray: "\x1b[90m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
} as const;

/**
 * Wrap text in ANSI color codes if color is supported
 */
export function colorize(text: string, color: keyof typeof colors): string {
  if (!supportsColor()) {
    return text;
  }
  return `${colors[color]}${text}${colors.reset}`;
}
