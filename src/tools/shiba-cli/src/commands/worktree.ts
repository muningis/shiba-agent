import { spawnSync } from "child_process";
import { existsSync, mkdirSync, symlinkSync } from "fs";
import { join, basename, resolve } from "path";
import { successResponse, errorResponse, isCliAvailable } from "@shiba-agent/shared";
import { generateBranchName, getEffectivePreferences } from "../config/resolve.js";
import { issueTransition } from "./jira.js";

/**
 * Get git repository root directory
 */
function getGitRoot(): string | null {
  const result = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf-8",
    stdio: "pipe",
  });
  return result.status === 0 ? result.stdout.trim() : null;
}

/**
 * Get default worktree path: ../<repo>-worktrees/<branch>
 */
function getDefaultWorktreePath(branchName: string): string {
  const gitRoot = getGitRoot();
  if (!gitRoot) {
    errorResponse("NOT_GIT_REPO", "Not in a git repository");
    throw new Error("Not in a git repository"); // Never reached, but satisfies TS
  }
  const repoName = basename(gitRoot);
  // Replace slashes in branch name with dashes for directory compatibility
  const safeBranchName = branchName.replace(/\//g, "-");
  return resolve(gitRoot, "..", `${repoName}-worktrees`, safeBranchName);
}

/**
 * Symlink .claude/settings.local.json from the main worktree into a new worktree.
 * This ensures user-specific Claude Code settings are shared across worktrees.
 */
function symlinkLocalSettings(worktreePath: string): string[] {
  const gitRoot = getGitRoot();
  if (!gitRoot) return [];

  const filesToSymlink = ["settings.local.json"];
  const symlinked: string[] = [];

  for (const file of filesToSymlink) {
    const source = join(gitRoot, ".claude", file);
    if (!existsSync(source)) continue;

    const targetDir = join(worktreePath, ".claude");
    const target = join(targetDir, file);

    if (existsSync(target)) continue;

    try {
      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
      }
      symlinkSync(source, target);
      symlinked.push(`.claude/${file}`);
    } catch {
      // Non-fatal — log but continue
      console.error(`Warning: Failed to symlink .claude/${file}`);
    }
  }

  return symlinked;
}

export interface WorktreeCreateOpts {
  key: string;
  description?: string;
  type?: string;
  path?: string;
  noTransition?: boolean;
}

export async function worktreeCreate(opts: WorktreeCreateOpts): Promise<void> {
  if (!opts.key) {
    errorResponse("MISSING_KEY", "Issue key is required (--key)");
  }

  const branchName = generateBranchName({
    key: opts.key,
    description: opts.description,
    type: opts.type,
  });

  const worktreePath = opts.path || getDefaultWorktreePath(branchName);

  if (existsSync(worktreePath)) {
    errorResponse("PATH_EXISTS", `Worktree path already exists: ${worktreePath}`);
  }

  // Create worktree with new branch
  const result = spawnSync("git", ["worktree", "add", "-b", branchName, worktreePath], {
    encoding: "utf-8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    // Check if branch already exists
    if (result.stderr?.includes("already exists")) {
      // Try adding worktree with existing branch
      const retryResult = spawnSync("git", ["worktree", "add", worktreePath, branchName], {
        encoding: "utf-8",
        stdio: "pipe",
      });
      if (retryResult.status !== 0) {
        errorResponse("WORKTREE_FAILED", retryResult.stderr || "Failed to create worktree");
      }
    } else {
      errorResponse("WORKTREE_FAILED", result.stderr || "Failed to create worktree");
    }
  }

  // Symlink .claude/settings.local.json from main worktree
  const symlinked = symlinkLocalSettings(worktreePath);

  // Transition Jira issue (if configured)
  let jiraTransitioned = false;
  const prefs = getEffectivePreferences();

  if (!opts.noTransition && prefs.workflow.enabled && isCliAvailable("jira")) {
    const transition = prefs.workflow.transitions?.onBranchCreate ?? "In Progress";
    try {
      await issueTransition({ key: opts.key, transition });
      jiraTransitioned = true;
    } catch {
      console.error(`Warning: Failed to transition Jira issue to "${transition}"`);
    }
  }

  successResponse({
    branch: branchName,
    path: worktreePath,
    key: opts.key,
    jiraTransitioned,
    symlinked,
    hint: `cd ${worktreePath}`,
  });
}

export async function worktreeList(): Promise<void> {
  const result = spawnSync("git", ["worktree", "list", "--porcelain"], {
    encoding: "utf-8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    errorResponse("LIST_FAILED", result.stderr || "Failed to list worktrees");
  }

  // Parse porcelain output
  const worktrees: Array<{ path: string; branch: string; commit: string; bare?: boolean }> = [];
  const blocks = result.stdout.split("\n\n").filter(Boolean);

  for (const block of blocks) {
    const lines = block.split("\n");
    const worktree: { path?: string; branch?: string; commit?: string; bare?: boolean } = {};

    for (const line of lines) {
      if (line.startsWith("worktree ")) {
        worktree.path = line.slice(9);
      } else if (line.startsWith("HEAD ")) {
        worktree.commit = line.slice(5);
      } else if (line.startsWith("branch ")) {
        worktree.branch = line.slice(7).replace("refs/heads/", "");
      } else if (line === "bare") {
        worktree.bare = true;
      }
    }

    if (worktree.path) {
      worktrees.push({
        path: worktree.path,
        branch: worktree.branch || "(detached)",
        commit: worktree.commit || "",
        bare: worktree.bare,
      });
    }
  }

  successResponse({ worktrees });
}

export interface WorktreePruneOpts {
  dryRun?: boolean;
  verbose?: boolean;
}

export async function worktreePrune(opts: WorktreePruneOpts): Promise<void> {
  const args = ["worktree", "prune"];
  if (opts.dryRun) args.push("--dry-run");
  if (opts.verbose) args.push("--verbose");

  const result = spawnSync("git", args, {
    encoding: "utf-8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    errorResponse("PRUNE_FAILED", result.stderr || "Failed to prune worktrees");
  }

  const output = result.stderr.trim();
  const lines = output ? output.split("\n").filter(Boolean) : [];

  successResponse({
    pruned: lines.length,
    details: lines,
    dryRun: opts.dryRun ?? false,
  });
}

export interface WorktreeRemoveOpts {
  path: string;
  force?: boolean;
}

export async function worktreeRemove(opts: WorktreeRemoveOpts): Promise<void> {
  if (!opts.path) {
    errorResponse("MISSING_PATH", "Worktree path is required (--path)");
  }

  const args = ["worktree", "remove", opts.path];
  if (opts.force) args.push("--force");

  const result = spawnSync("git", args, {
    encoding: "utf-8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    errorResponse("REMOVE_FAILED", result.stderr || "Failed to remove worktree");
  }

  successResponse({
    removed: opts.path,
  });
}
