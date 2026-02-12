import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

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
  openapi?: {
    specs?: Record<string, OpenAPISpecConfig>;
  };
  preferences?: {
    defaultJql?: string;
  };
}

const CONFIG_DIR = join(homedir(), ".shiba-agent");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
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
