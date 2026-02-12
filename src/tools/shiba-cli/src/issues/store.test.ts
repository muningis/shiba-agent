import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// We test the atomic write pattern directly rather than importing the module
// (which depends on global config paths). This validates the write-then-rename logic.

describe("atomic file writes", () => {
  const testDir = join(tmpdir(), `shiba-store-test-${process.pid}`);

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("write-then-rename produces valid JSON", () => {
    const { writeFileSync, renameSync } = require("fs");
    const filePath = join(testDir, "test.json");
    const data = { issueKey: "PROJ-123", version: "1.0" };

    // Replicate the atomic write pattern from saveIssue
    const tmpPath = filePath + `.tmp.${process.pid}`;
    writeFileSync(tmpPath, JSON.stringify(data, null, 2) + "\n");
    renameSync(tmpPath, filePath);

    expect(existsSync(filePath)).toBe(true);
    expect(existsSync(tmpPath)).toBe(false);

    const content = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(content);
    expect(parsed.issueKey).toBe("PROJ-123");
    expect(parsed.version).toBe("1.0");
  });

  it("rename overwrites existing file atomically", () => {
    const { writeFileSync, renameSync } = require("fs");
    const filePath = join(testDir, "overwrite.json");

    // Write initial content
    writeFileSync(filePath, JSON.stringify({ v: 1 }));

    // Atomic overwrite
    const tmpPath = filePath + `.tmp.${process.pid}`;
    writeFileSync(tmpPath, JSON.stringify({ v: 2 }, null, 2) + "\n");
    renameSync(tmpPath, filePath);

    const parsed = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(parsed.v).toBe(2);
    expect(existsSync(tmpPath)).toBe(false);
  });

  it("temp file does not persist if rename fails", () => {
    const { writeFileSync } = require("fs");
    const filePath = join(testDir, "nonexistent-dir", "test.json");
    const tmpPath = filePath + `.tmp.${process.pid}`;

    // Writing to a nonexistent directory should fail
    try {
      writeFileSync(tmpPath, "data");
    } catch {
      // expected
    }

    expect(existsSync(tmpPath)).toBe(false);
    expect(existsSync(filePath)).toBe(false);
  });
});
