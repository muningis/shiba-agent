import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, renameSync } from "fs";
import { join } from "path";
import { getOapiDir } from "@shiba-agent/shared";
import type { OpenAPISpec, CachedSpec } from "./types.js";

export function getOpenAPIDir(): string {
  return getOapiDir();
}

export function ensureOpenAPIDir(): void {
  const dir = getOpenAPIDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function getCachedSpecPath(name: string): string {
  return join(getOpenAPIDir(), `${name}.json`);
}

export function getCachedSpec(name: string): CachedSpec | null {
  const path = getCachedSpecPath(name);
  if (!existsSync(path)) {
    return null;
  }

  try {
    const content = readFileSync(path, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export function cacheSpec(name: string, spec: OpenAPISpec): void {
  ensureOpenAPIDir();
  const cached: CachedSpec = {
    spec,
    fetchedAt: new Date().toISOString(),
  };
  const path = getCachedSpecPath(name);
  // Atomic write: write to temp file then rename (same filesystem = atomic)
  const tmpPath = path + `.tmp.${process.pid}`;
  writeFileSync(tmpPath, JSON.stringify(cached, null, 2) + "\n");
  renameSync(tmpPath, path);
}

export function listCachedSpecs(): string[] {
  const dir = getOpenAPIDir();
  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.replace(".json", ""));
}

export function isCacheStale(
  cached: CachedSpec,
  maxAgeMs: number = 24 * 60 * 60 * 1000 // Default: 24 hours
): boolean {
  const fetchedAt = new Date(cached.fetchedAt).getTime();
  const now = Date.now();
  return now - fetchedAt > maxAgeMs;
}
