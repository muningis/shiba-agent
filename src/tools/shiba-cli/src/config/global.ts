import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface GlobalConfig {
  jira?: {
    host?: string;
    email?: string;
    token?: string;
  };
  gitlab?: {
    host?: string;
    token?: string;
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

export function ensureGlobalConfigDir(): void {
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
  ensureGlobalConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n");
}
