import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { getConfigDir, ensureConfigDir } from "@shiba-agent/shared";
import type { OpenAPISpec, CachedSpec } from "./types.js";

const OPENAPI_DIR = "openapi";

export function getOpenAPIDir(): string {
  return join(getConfigDir(), OPENAPI_DIR);
}

export function ensureOpenAPIDir(): void {
  ensureConfigDir();
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
  writeFileSync(path, JSON.stringify(cached, null, 2) + "\n");
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
