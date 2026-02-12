import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

export interface ProjectConfig {
  repository: string;
}

const CONFIG_FILENAME = "shiba.json";

export function getProjectConfigPath(cwd: string = process.cwd()): string {
  return join(cwd, CONFIG_FILENAME);
}

export function loadProjectConfig(cwd: string = process.cwd()): ProjectConfig | null {
  const configPath = getProjectConfigPath(cwd);

  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export function saveProjectConfig(config: ProjectConfig, cwd: string = process.cwd()): void {
  const configPath = getProjectConfigPath(cwd);
  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
}

export function getRepositoryFromConfig(cwd: string = process.cwd()): string | null {
  const config = loadProjectConfig(cwd);
  return config?.repository ?? null;
}
