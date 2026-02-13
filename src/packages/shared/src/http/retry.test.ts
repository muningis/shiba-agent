import { describe, expect, it } from "bun:test";
import { isTransientError, withRetry } from "./retry.js";

describe("isTransientError", () => {
  it("returns true for connection refused", () => {
    expect(isTransientError(new Error("connect ECONNREFUSED 127.0.0.1:443"))).toBe(true);
  });

  it("returns true for connection reset", () => {
    expect(isTransientError(new Error("read ECONNRESET"))).toBe(true);
  });

  it("returns true for DNS not found", () => {
    expect(isTransientError(new Error("getaddrinfo ENOTFOUND example.com"))).toBe(true);
  });

  it("returns true for timeout", () => {
    expect(isTransientError(new Error("request timeout"))).toBe(true);
  });

  it("returns true for ETIMEDOUT", () => {
    expect(isTransientError(new Error("connect ETIMEDOUT 1.2.3.4:443"))).toBe(true);
  });

  it("returns true for socket hang up", () => {
    expect(isTransientError(new Error("socket hang up"))).toBe(true);
  });

  it("returns true for 500 status", () => {
    expect(isTransientError(new Error("Failed to fetch: 500 Internal Server Error"))).toBe(true);
  });

  it("returns true for 502 status", () => {
    expect(isTransientError(new Error("Bad Gateway: 502"))).toBe(true);
  });

  it("returns true for 503 status", () => {
    expect(isTransientError(new Error("Service Unavailable 503"))).toBe(true);
  });

  it("returns false for 404", () => {
    expect(isTransientError(new Error("Not Found: 404"))).toBe(false);
  });

  it("returns false for 401", () => {
    expect(isTransientError(new Error("Unauthorized: 401"))).toBe(false);
  });

  it("returns false for non-Error", () => {
    expect(isTransientError("some string")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isTransientError(null)).toBe(false);
  });

  it("returns false for generic error", () => {
    expect(isTransientError(new Error("Invalid JSON"))).toBe(false);
  });
});

describe("withRetry", () => {
  it("returns result on first success", async () => {
    const result = await withRetry(() => Promise.resolve(42));
    expect(result).toBe(42);
  });

  it("retries on transient error and succeeds", async () => {
    let calls = 0;
    const result = await withRetry(async () => {
      calls++;
      if (calls < 3) {
        throw new Error("connect ECONNREFUSED 127.0.0.1:443");
      }
      return "ok";
    }, "test");

    expect(result).toBe("ok");
    expect(calls).toBe(3);
  });

  it("does not retry on non-transient error", async () => {
    let calls = 0;
    try {
      await withRetry(async () => {
        calls++;
        throw new Error("Not Found: 404");
      });
    } catch {
      // expected
    }

    expect(calls).toBe(1);
  });

  it("throws after max retries for transient errors", async () => {
    let calls = 0;
    try {
      await withRetry(async () => {
        calls++;
        throw new Error("connect ECONNREFUSED 127.0.0.1:443");
      }, "test");
      expect(true).toBe(false); // Should not reach here
    } catch {
      // Expected: should exhaust retries
    }

    // 1 initial + 3 retries = 4
    expect(calls).toBe(4);
  });
});
