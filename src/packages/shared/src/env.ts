import { config } from "dotenv";
import { join } from "path";
import { getRepoRoot } from "./config/global.js";

// Load .env file from repo root
config({ path: join(getRepoRoot(), ".env"), quiet: true });

/**
 * Get environment variable with optional fallback
 */
export function getEnv(key: string, fallback?: string): string | undefined {
  return process.env[key] ?? fallback;
}

/**
 * Get required environment variable, throws if missing
 */
export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

