import type { CliSuccess, CliError } from "../types/index.js";

/**
 * Write a success response to stdout and exit.
 */
export function successResponse<T>(data: T): void {
  const output: CliSuccess<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
  process.stdout.write(JSON.stringify(output, null, 2) + "\n");
}

/**
 * Write an error response to stderr and exit with code 1.
 */
export function errorResponse(
  code: string,
  message: string,
  context?: Record<string, unknown>,
  statusCode?: number
): never {
  const output: CliError = {
    success: false,
    error: { code, message, ...(statusCode && { statusCode }), ...(context && { context }) },
    timestamp: new Date().toISOString(),
  };
  process.stderr.write(JSON.stringify(output, null, 2) + "\n");
  process.exit(1);
}
