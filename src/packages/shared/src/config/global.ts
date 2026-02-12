import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

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

export interface GlobalConfig {
  gitlab?: {
    host?: string;
    token?: string;
  };
  jira?: {
    host?: string;
    email?: string;
    token?: string;
  };
  figma?: {
    token?: string;
  };
  openapi?: {
    specs?: Record<string, OpenAPISpecConfig>;
  };
  preferences?: {
    defaultJql?: string;
  };
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
const CONFIG_DIR = join(REPO_ROOT, "config");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");
const OAPI_DIR = join(REPO_ROOT, "oapi");
const ISSUES_DIR = join(REPO_ROOT, "issues");
const FIGMA_DIR = join(REPO_ROOT, "figma");

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

export function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
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
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n");
}
