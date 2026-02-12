import { errorResponse } from "./json.js";

/**
 * Top-level error handler for CLI commands.
 * Catches any thrown error, formats it as structured JSON to stderr, and exits non-zero.
 */
export function handleCliError(err: unknown): never {
  if (err instanceof Error) {
    // Try to extract HTTP status from common API error shapes
    const errAny = err as unknown as Record<string, unknown>;
    const statusCode =
      errAny.cause instanceof Object
        ? (errAny.cause as Record<string, unknown>).status as number | undefined
        : errAny.status as number | undefined;

    const code = mapErrorToCode(err);
    errorResponse(code, err.message, { stack: err.stack?.split("\n").slice(0, 3).join("\n") }, statusCode);
  }

  errorResponse("UNKNOWN_ERROR", String(err));
}

function mapErrorToCode(err: Error): string {
  const msg = err.message.toLowerCase();

  if (msg.includes("401") || msg.includes("unauthorized")) return "UNAUTHORIZED";
  if (msg.includes("403") || msg.includes("forbidden")) return "FORBIDDEN";
  if (msg.includes("404") || msg.includes("not found")) return "NOT_FOUND";
  if (msg.includes("409") || msg.includes("conflict")) return "CONFLICT";
  if (msg.includes("422") || msg.includes("unprocessable")) return "VALIDATION_ERROR";
  if (msg.includes("timeout") || msg.includes("timed out")) return "TIMEOUT";
  if (msg.includes("econnrefused") || msg.includes("enotfound")) return "CONNECTION_ERROR";

  return "API_ERROR";
}
