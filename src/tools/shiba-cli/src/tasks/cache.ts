import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { getTasksDir, ensureProjectDirs } from "../config/project.js";
import type { JiraIssueFull, CachedTask } from "../tui/types.js";

export function cacheTask(task: JiraIssueFull, cwd: string = process.cwd()): void {
  ensureProjectDirs(cwd);
  const tasksDir = getTasksDir(cwd);
  const taskPath = join(tasksDir, `${task.key}.json`);

  const cachedTask: CachedTask = {
    ...task,
    fetchedAt: new Date().toISOString(),
  };

  writeFileSync(taskPath, JSON.stringify(cachedTask, null, 2) + "\n");
}

export function loadCachedTask(
  key: string,
  cwd: string = process.cwd()
): CachedTask | null {
  const taskPath = join(getTasksDir(cwd), `${key}.json`);

  if (!existsSync(taskPath)) {
    return null;
  }

  try {
    const content = readFileSync(taskPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export function isCacheStale(
  cachedTask: CachedTask,
  maxAgeMs: number = 5 * 60 * 1000 // Default: 5 minutes
): boolean {
  const fetchedAt = new Date(cachedTask.fetchedAt).getTime();
  const now = Date.now();
  return now - fetchedAt > maxAgeMs;
}
