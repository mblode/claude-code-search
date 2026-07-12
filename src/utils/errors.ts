export const EXIT_CODES = {
  ERROR: 1,
  INVALID_ARGS: 2,
  NO_RESULTS: 3,
  SUCCESS: 0,
} as const;

export function fatal(message: string, code: number = EXIT_CODES.ERROR): never {
  console.error(`ccs: ${message}`);
  process.exit(code);
}

export function warn(message: string): void {
  console.error(`ccs: warning: ${message}`);
}
