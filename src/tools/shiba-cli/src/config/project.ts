import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

export interface ProjectConfig {
  repository: string;
}

const CONFIG_DIR = ".shiba";
const CONFIG_FILE = "config.json";
const TASKS_DIR = "tasks";

export function getConfigDir(cwd: string = process.cwd()): string {
  return join(cwd, CONFIG_DIR);
}

export function getProjectConfigPath(cwd: string = process.cwd()): string {
  return join(cwd, CONFIG_DIR, CONFIG_FILE);
}

export function getTasksDir(cwd: string = process.cwd()): string {
  return join(cwd, CONFIG_DIR, TASKS_DIR);
}

export function ensureProjectDirs(cwd: string = process.cwd()): void {
  const configDir = getConfigDir(cwd);
  const tasksDir = getTasksDir(cwd);
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  if (!existsSync(tasksDir)) {
    mkdirSync(tasksDir, { recursive: true });
  }
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
  ensureProjectDirs(cwd);
  const configPath = getProjectConfigPath(cwd);
  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
}

export function getRepositoryFromConfig(cwd: string = process.cwd()): string | null {
  const config = loadProjectConfig(cwd);
  return config?.repository ?? null;
}
