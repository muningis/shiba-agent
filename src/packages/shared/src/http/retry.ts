import { Effect, Schedule } from "effect";

/**
 * Check if an error is transient and worth retrying.
 * Returns true for: timeouts, connection errors, 5xx status codes.
 * Returns false for 4xx and other non-transient errors.
 */
export function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    // Connection / DNS / timeout errors
    if (
      msg.includes("econnrefused") ||
      msg.includes("econnreset") ||
      msg.includes("enotfound") ||
      msg.includes("etimedout") ||
      msg.includes("timeout") ||
      msg.includes("socket hang up") ||
      msg.includes("network error") ||
      msg.includes("networkerror")
    ) {
      return true;
    }

    // HTTP 5xx errors (from our own fetch wrappers that include status in message)
    const statusMatch = msg.match(/\b(5\d{2})\b/);
    if (statusMatch) {
      return true;
    }
  }

  return false;
}

/**
 * Retry schedule: exponential backoff starting at 500ms, max 3 retries, capped at 10s total.
 */
const retrySchedule = Schedule.compose(
  Schedule.exponential("500 millis"),
  Schedule.recurs(3),
);

/**
 * Wrap an async function with retry logic for transient errors.
 * Logs retry attempts to stderr (won't break JSON stdout output).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  label?: string,
): Promise<T> {
  let attempt = 0;

  const effect = Effect.retry(
    Effect.tryPromise({
      try: () => {
        attempt++;
        return fn();
      },
      catch: (error) => error,
    }),
    {
      schedule: retrySchedule,
      while: (error) => {
        const transient = isTransientError(error);
        if (transient) {
          const tag = label ? ` ${label}` : "";
          process.stderr.write(
            `[shiba] Retrying${tag}... attempt ${attempt + 1}/4\n`,
          );
        }
        return transient;
      },
    },
  );

  return Effect.runPromise(effect);
}
