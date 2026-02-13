import { existsSync, mkdirSync, readFileSync, writeFileSync, lstatSync, renameSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";
import { execSync } from "child_process";
import type { ShibaPreferences } from "./preferences.js";

export interface OpenAPIAuthConfig {
  type: "bearer" | "basic" | "apikey";
  token?: string;
  username?: string;
  password?: string;
  headerName?: string;
}

export interface OpenAPISpecConfig {
  url: string;
  auth?: OpenAPIAuthConfig;
}

export interface JiraConfig {
  host?: string;
  email?: string;
  token?: string;
}

export interface GlobalConfig {
  figma?: {
    token?: string;
  };
  openapi?: {
    specs?: Record<string, OpenAPISpecConfig>;
  };
  preferences?: ShibaPreferences;
  jira?: JiraConfig;
}

// Find the shiba-agent repo root by navigating up from this file
// This file is at: <repo>/src/packages/shared/src/config/global.ts (source)
// or at: <repo>/src/packages/shared/dist/config/global.js (compiled)
function findRepoRoot(): string {
  const currentFile = fileURLToPath(import.meta.url);
  let dir = dirname(currentFile);

  // Navigate up until we find package.json with name containing "shiba-agent"
  // or a setup.sh file (indicators of repo root)
  for (let i = 0; i < 10; i++) {
    const packageJsonPath = join(dir, "package.json");
    const setupShPath = join(dir, "setup.sh");

    if (existsSync(setupShPath)) {
      return dir;
    }

    if (existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
        // Check if this is a workspace root (has workspaces) or the main package
        if (pkg.workspaces || pkg.name === "shiba-agent") {
          return dir;
        }
      } catch {
        // Continue searching
      }
    }

    const parent = dirname(dir);
    if (parent === dir) break; // Reached filesystem root
    dir = parent;
  }

  // Fallback: assume we're 5 levels deep from repo root
  // src/packages/shared/dist/config/global.js -> 5 levels up
  return dirname(dirname(dirname(dirname(dirname(currentFile)))));
}

const REPO_ROOT = findRepoRoot();
const DATA_DIR = join(homedir(), ".shiba-agent", "data");

// Data paths now point to ~/.shiba-agent/data/ (git-managed per environment)
function getDataDir(): string {
  return DATA_DIR;
}

// Legacy paths (kept for backwards compatibility during migration)
const CONFIG_DIR = join(REPO_ROOT, "config");
const CONFIG_FILE = join(DATA_DIR, "config.json");
const OAPI_DIR = join(DATA_DIR, "oapi");
const ISSUES_DIR = join(DATA_DIR, "issues");
const FIGMA_DIR = join(DATA_DIR, "figma");
const GLAB_DIR = join(DATA_DIR, "glab");
const JIRA_DIR = join(DATA_DIR, "jira");
const TICKETS_DIR = join(DATA_DIR, "tickets");
const CUSTOM_AGENTS_DIR = join(DATA_DIR, "agents");

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export function getOapiDir(): string {
  return OAPI_DIR;
}

export function getIssuesDir(): string {
  return ISSUES_DIR;
}

export function getFigmaDir(): string {
  return FIGMA_DIR;
}

export function getRepoRoot(): string {
  return REPO_ROOT;
}

export { getDataDir };

export function getGlabDir(): string {
  return GLAB_DIR;
}

export function getJiraDir(): string {
  return JIRA_DIR;
}

export function getTicketsDir(): string {
  return TICKETS_DIR;
}

export function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function ensureConfigDir(): void {
  ensureDataDir();
}

export function ensureIssuesDir(): void {
  if (!existsSync(ISSUES_DIR)) {
    mkdirSync(ISSUES_DIR, { recursive: true });
  }
}

export function ensureFigmaDir(): void {
  if (!existsSync(FIGMA_DIR)) {
    mkdirSync(FIGMA_DIR, { recursive: true });
  }
}

export function ensureOapiDir(): void {
  if (!existsSync(OAPI_DIR)) {
    mkdirSync(OAPI_DIR, { recursive: true });
  }
}

export function ensureGlabDir(): void {
  if (!existsSync(GLAB_DIR)) {
    mkdirSync(GLAB_DIR, { recursive: true });
  }
}

export function ensureJiraDir(): void {
  if (!existsSync(JIRA_DIR)) {
    mkdirSync(JIRA_DIR, { recursive: true });
  }
}

export function ensureTicketsDir(): void {
  if (!existsSync(TICKETS_DIR)) {
    mkdirSync(TICKETS_DIR, { recursive: true });
  }
}

export function getCustomAgentsDir(): string {
  return CUSTOM_AGENTS_DIR;
}

export function ensureCustomAgentsDir(): void {
  if (!existsSync(CUSTOM_AGENTS_DIR)) {
    mkdirSync(CUSTOM_AGENTS_DIR, { recursive: true });
  }
}

/**
 * Get the current environment name (git branch in data/)
 * Returns null if data/ is not a git repo or has no branches
 */
export function getCurrentEnvironment(): string | null {
  if (!existsSync(join(DATA_DIR, ".git"))) {
    return null;
  }
  try {
    const branch = execSync("git branch --show-current", {
      cwd: DATA_DIR,
      encoding: "utf-8",
    }).trim();
    return branch || null;
  } catch {
    return null;
  }
}

/**
 * Check if data directory is initialized as a git repo
 */
export function isDataInitialized(): boolean {
  return existsSync(join(DATA_DIR, ".git"));
}

export function loadGlobalConfig(): GlobalConfig {
  if (!existsSync(CONFIG_FILE)) {
    return {};
  }

  try {
    const content = readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

export function saveGlobalConfig(config: GlobalConfig): void {
  ensureConfigDir();
  // Atomic write: write to temp file then rename (same filesystem = atomic)
  const tmpPath = CONFIG_FILE + `.tmp.${process.pid}`;
  writeFileSync(tmpPath, JSON.stringify(config, null, 2) + "\n");
  renameSync(tmpPath, CONFIG_FILE);
}
