import { existsSync, mkdirSync, rmSync, symlinkSync, lstatSync, readlinkSync, renameSync, cpSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { spawnSync } from "child_process";
import { createInterface } from "readline";
import { stdin, stdout } from "process";
import {
  getDataDir,
  ensureDataDir,
  successResponse,
  errorResponse,
  getCurrentEnvironment,
  isDataInitialized,
} from "@shiba-agent/shared";

const GLAB_CONFIG_PATH = join(homedir(), ".config", "glab-cli");
const JIRA_CONFIG_PATH = join(homedir(), ".config", ".jira");

/**
 * Initialize the data directory as a git repository
 */
export async function envInit(): Promise<void> {
  const dataDir = getDataDir();
  ensureDataDir();

  if (isDataInitialized()) {
    successResponse({
      initialized: true,
      path: dataDir,
      message: "Data directory already initialized",
    });
    return;
  }

  try {
    spawnSync("git", ["init"], { cwd: dataDir, stdio: "pipe" });
    spawnSync("git", ["commit", "--allow-empty", "-m", "Initialize shiba data repository"], {
      cwd: dataDir,
      stdio: "pipe",
    });

    // Create initial directory structure
    const dirs = ["oapi", "issues", "figma", "glab", "jira"];
    for (const dir of dirs) {
      mkdirSync(join(dataDir, dir), { recursive: true });
    }

    successResponse({
      initialized: true,
      path: dataDir,
      message: "Data directory initialized. Run 'shiba env create <name>' to create an environment.",
    });
  } catch (err) {
    errorResponse("INIT_FAILED", `Failed to initialize data directory: ${err}`);
  }
}

/**
 * Create a new environment (git branch)
 */
export interface EnvCreateOpts {
  name: string;
}

export async function envCreate(opts: EnvCreateOpts): Promise<void> {
  const dataDir = getDataDir();

  if (!isDataInitialized()) {
    errorResponse("NOT_INITIALIZED", "Data directory not initialized. Run 'shiba env init' first.");
  }

  // Validate branch name
  if (!/^[a-zA-Z0-9_-]+$/.test(opts.name)) {
    errorResponse("INVALID_NAME", "Environment name must contain only letters, numbers, hyphens, and underscores.");
  }

  try {
    // Check if branch already exists
    const branches = spawnSync("git", ["branch", "--list"], { cwd: dataDir, encoding: "utf-8", stdio: "pipe" }).stdout;
    if (branches.split("\n").some((b) => b.trim().replace(/^\* /, "") === opts.name)) {
      errorResponse("ALREADY_EXISTS", `Environment '${opts.name}' already exists.`);
    }

    // Create new branch (spawnSync to avoid shell injection)
    const branchResult = spawnSync("git", ["checkout", "-b", opts.name], { cwd: dataDir, encoding: "utf-8", stdio: "pipe" });
    if (branchResult.status !== 0) {
      errorResponse("CREATE_FAILED", branchResult.stderr || "Failed to create git branch");
    }

    // Create directory structure for this environment
    const dirs = ["oapi", "issues", "figma", "glab", "jira"];
    for (const dir of dirs) {
      mkdirSync(join(dataDir, dir), { recursive: true });
    }

    // Commit the structure
    spawnSync("git", ["add", "-A"], { cwd: dataDir, stdio: "pipe" });
    const commitResult = spawnSync("git", ["commit", "--allow-empty", "-m", `Create environment: ${opts.name}`], {
      cwd: dataDir,
      encoding: "utf-8",
      stdio: "pipe",
    });
    if (commitResult.status !== 0) {
      errorResponse("CREATE_FAILED", commitResult.stderr || "Failed to commit environment structure");
    }

    successResponse({
      created: opts.name,
      message: `Environment '${opts.name}' created. Run 'shiba env use ${opts.name}' to switch to it.`,
    });
  } catch (err) {
    errorResponse("CREATE_FAILED", `Failed to create environment: ${err}`);
  }
}

/**
 * Switch to an environment (INTERACTIVE - blocks Claude)
 */
export interface EnvUseOpts {
  name: string;
}

export async function envUse(opts: EnvUseOpts): Promise<void> {
  const dataDir = getDataDir();

  if (!isDataInitialized()) {
    errorResponse("NOT_INITIALIZED", "Data directory not initialized. Run 'shiba env init' first.");
  }

  // Check if environment exists
  const branches = spawnSync("git", ["branch", "--list"], { cwd: dataDir, encoding: "utf-8", stdio: "pipe" }).stdout;
  const envExists = branches.split("\n").some((b) => b.trim().replace(/^\* /, "") === opts.name);

  if (!envExists) {
    errorResponse("NOT_FOUND", `Environment '${opts.name}' does not exist.`);
  }

  // Interactive confirmation - Claude cannot answer this
  const rl = createInterface({ input: stdin, output: stdout });

  const answer = await new Promise<string>((resolve) => {
    rl.question(`Switch to environment '${opts.name}'? Type 'yes' to confirm: `, resolve);
  });
  rl.close();

  if (answer.toLowerCase() !== "yes") {
    errorResponse("CANCELLED", "Environment switch cancelled.");
  }

  try {
    // Switch git branch (spawnSync to avoid shell injection)
    const switchResult = spawnSync("git", ["checkout", opts.name], { cwd: dataDir, encoding: "utf-8", stdio: "pipe" });
    if (switchResult.status !== 0) {
      errorResponse("SWITCH_FAILED", switchResult.stderr || "Failed to switch git branch");
    }

    // Update CLI config symlinks
    updateCliSymlinks(dataDir);

    successResponse({
      switched: opts.name,
      message: `Switched to environment '${opts.name}'.`,
    });
  } catch (err) {
    errorResponse("SWITCH_FAILED", `Failed to switch environment: ${err}`);
  }
}

/**
 * List all environments
 */
export async function envList(): Promise<void> {
  const dataDir = getDataDir();

  if (!isDataInitialized()) {
    errorResponse("NOT_INITIALIZED", "Data directory not initialized. Run 'shiba env init' first.");
  }

  try {
    const result = spawnSync("git", ["branch", "--list"], { cwd: dataDir, encoding: "utf-8", stdio: "pipe" }).stdout;
    const branches = result
      .split("\n")
      .map((b) => b.trim())
      .filter(Boolean)
      .map((b) => b.replace(/^\* /, ""));

    const current = getCurrentEnvironment();

    successResponse({
      environments: branches,
      current,
    });
  } catch (err) {
    errorResponse("LIST_FAILED", `Failed to list environments: ${err}`);
  }
}

/**
 * Show current environment
 */
export async function envCurrent(): Promise<void> {
  if (!isDataInitialized()) {
    errorResponse("NOT_INITIALIZED", "Data directory not initialized. Run 'shiba env init' first.");
  }

  const current = getCurrentEnvironment();

  if (!current) {
    errorResponse("NO_ENVIRONMENT", "No environment is currently active.");
  }

  successResponse({ current });
}

/**
 * Delete an environment (with confirmation)
 */
export interface EnvDeleteOpts {
  name: string;
}

export async function envDelete(opts: EnvDeleteOpts): Promise<void> {
  const dataDir = getDataDir();

  if (!isDataInitialized()) {
    errorResponse("NOT_INITIALIZED", "Data directory not initialized. Run 'shiba env init' first.");
  }

  const current = getCurrentEnvironment();

  if (opts.name === current) {
    errorResponse("CANNOT_DELETE_CURRENT", "Cannot delete the currently active environment. Switch to another environment first.");
  }

  // Check if environment exists
  const branches = spawnSync("git", ["branch", "--list"], { cwd: dataDir, encoding: "utf-8", stdio: "pipe" }).stdout;
  const envExists = branches.split("\n").some((b) => b.trim().replace(/^\* /, "") === opts.name);

  if (!envExists) {
    errorResponse("NOT_FOUND", `Environment '${opts.name}' does not exist.`);
  }

  // Interactive confirmation
  const rl = createInterface({ input: stdin, output: stdout });

  const answer = await new Promise<string>((resolve) => {
    rl.question(`Delete environment '${opts.name}'? This cannot be undone. Type 'yes' to confirm: `, resolve);
  });
  rl.close();

  if (answer.toLowerCase() !== "yes") {
    errorResponse("CANCELLED", "Environment deletion cancelled.");
  }

  try {
    const deleteResult = spawnSync("git", ["branch", "-D", opts.name], { cwd: dataDir, encoding: "utf-8", stdio: "pipe" });
    if (deleteResult.status !== 0) {
      errorResponse("DELETE_FAILED", deleteResult.stderr || "Failed to delete git branch");
    }

    successResponse({
      deleted: opts.name,
      message: `Environment '${opts.name}' deleted.`,
    });
  } catch (err) {
    errorResponse("DELETE_FAILED", `Failed to delete environment: ${err}`);
  }
}

/**
 * Migrate existing data to the new structure
 */
export async function envMigrate(): Promise<void> {
  const dataDir = getDataDir();
  const repoRoot = join(homedir(), ".shiba-agent");

  // Check if there's existing data to migrate
  const oldConfigDir = join(repoRoot, "config");
  const oldOapiDir = join(repoRoot, "oapi");
  const oldIssuesDir = join(repoRoot, "issues");
  const oldFigmaDir = join(repoRoot, "figma");

  const hasOldData =
    existsSync(oldConfigDir) ||
    existsSync(oldOapiDir) ||
    existsSync(oldIssuesDir) ||
    existsSync(oldFigmaDir);

  if (!hasOldData) {
    successResponse({
      migrated: false,
      message: "No existing data to migrate.",
    });
    return;
  }

  // Initialize data dir if needed
  if (!isDataInitialized()) {
    await envInit();
  }

  // Create 'default' environment if not on a branch
  const current = getCurrentEnvironment();
  if (!current || current === "main" || current === "master") {
    const createResult = spawnSync("git", ["checkout", "-b", "default"], { cwd: dataDir, encoding: "utf-8", stdio: "pipe" });
    if (createResult.status !== 0) {
      // Branch might already exist — try switching to it
      const switchResult = spawnSync("git", ["checkout", "default"], { cwd: dataDir, encoding: "utf-8", stdio: "pipe" });
      if (switchResult.status !== 0) {
        errorResponse("MIGRATE_FAILED", switchResult.stderr || "Failed to create or switch to 'default' environment");
      }
    }
  }

  // Move old directories to data/
  const migrations: Array<{ from: string; to: string }> = [
    { from: join(oldConfigDir, "config.json"), to: join(dataDir, "config.json") },
    { from: oldOapiDir, to: join(dataDir, "oapi") },
    { from: oldIssuesDir, to: join(dataDir, "issues") },
    { from: oldFigmaDir, to: join(dataDir, "figma") },
  ];

  const migratedItems: string[] = [];

  for (const { from, to } of migrations) {
    if (existsSync(from)) {
      try {
        cpSync(from, to, { recursive: true, force: true });
        migratedItems.push(from);
      } catch (err) {
        process.stderr.write(`[shiba] Warning: Failed to migrate ${from}: ${err}\n`);
      }
    }
  }

  // Commit the migration
  spawnSync("git", ["add", "-A"], { cwd: dataDir, stdio: "pipe" });
  const migrateCommit = spawnSync("git", ["commit", "-m", "Migrate existing data to environment structure"], {
    cwd: dataDir,
    encoding: "utf-8",
    stdio: "pipe",
  });
  // Non-zero is expected if there's nothing to commit — not an error

  successResponse({
    migrated: true,
    items: migratedItems,
    environment: getCurrentEnvironment(),
    message: `Migrated ${migratedItems.length} items to environment '${getCurrentEnvironment()}'.`,
  });
}

/**
 * Update CLI config symlinks to point to current environment's configs
 */
function updateCliSymlinks(dataDir: string): void {
  const glabTarget = join(dataDir, "glab");
  const jiraTarget = join(dataDir, "jira");

  // Ensure target directories exist
  mkdirSync(glabTarget, { recursive: true });
  mkdirSync(jiraTarget, { recursive: true });

  // Ensure ~/.config exists
  mkdirSync(join(homedir(), ".config"), { recursive: true });

  // Handle glab symlink
  updateSymlink(glabTarget, GLAB_CONFIG_PATH, "glab-cli.backup");

  // Handle jira symlink
  updateSymlink(jiraTarget, JIRA_CONFIG_PATH, ".jira.backup");
}

/**
 * Create or update a symlink, backing up existing non-symlink if needed
 */
function updateSymlink(target: string, linkPath: string, backupSuffix: string): void {
  if (existsSync(linkPath)) {
    try {
      const stat = lstatSync(linkPath);

      if (stat.isSymbolicLink()) {
        // Check if it already points to the right place
        const currentTarget = readlinkSync(linkPath);
        if (currentTarget === target) {
          return; // Already correct
        }
        // Remove old symlink
        rmSync(linkPath);
      } else {
        // Backup existing directory/file
        const backupPath = `${linkPath}.${backupSuffix}`;
        if (!existsSync(backupPath)) {
          renameSync(linkPath, backupPath);
          process.stderr.write(`[shiba] Backed up existing config: ${linkPath} -> ${backupPath}\n`);
        } else {
          process.stderr.write(`[shiba] Warning: Removing ${linkPath} (backup already exists at ${backupPath})\n`);
          rmSync(linkPath, { recursive: true });
        }
      }
    } catch {
      // Path doesn't exist or can't be read, continue
    }
  }

  // Create symlink
  symlinkSync(target, linkPath);
}
