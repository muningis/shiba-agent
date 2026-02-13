import { useState, useCallback } from "react";
import { spawnSync, spawn } from "child_process";
import { existsSync, writeFileSync } from "fs";
import { join, basename, resolve } from "path";
import { randomUUID } from "crypto";
import { isCliAvailable } from "@shiba-agent/shared";
import { generateBranchName } from "../../config/resolve.js";
import { addSession, loadSessions } from "../../sessions/index.js";
import type { IssueBasic } from "../types.js";

interface LaunchResult {
  success: boolean;
  error?: string;
  issueKey?: string;
}

interface UseSessionLauncherResult {
  launch: (issue: IssueBasic) => LaunchResult;
  launching: boolean;
}

function getGitRoot(): string | null {
  const result = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf-8",
    stdio: "pipe",
  });
  return result.status === 0 ? result.stdout.trim() : null;
}

function getDefaultWorktreePath(branchName: string): string | null {
  const gitRoot = getGitRoot();
  if (!gitRoot) return null;
  const repoName = basename(gitRoot);
  const safeBranchName = branchName.replace(/\//g, "-");
  return resolve(gitRoot, "..", `${repoName}-worktrees`, safeBranchName);
}

function getTrackerCommand(source: string): string {
  switch (source) {
    case "jira": return "jira";
    case "github": return "github";
    case "gitlab": return "gitlab";
    default: return "jira";
  }
}

function getIssueGetFlag(source: string): string {
  switch (source) {
    case "jira": return "--key";
    case "github": return "--number";
    case "gitlab": return "--iid";
    default: return "--key";
  }
}

export function useSessionLauncher(): UseSessionLauncherResult {
  const [launching, setLaunching] = useState(false);

  const launch = useCallback((issue: IssueBasic): LaunchResult => {
    setLaunching(true);
    try {
      if (!isCliAvailable("claude")) {
        return { success: false, error: "Claude CLI not found. Install from https://claude.ai/cli" };
      }

      // Check for existing session
      const existing = loadSessions();
      if (existing.some((s) => s.issueKey === issue.key && s.status === "running")) {
        return { success: false, error: `Session already running for ${issue.key}` };
      }

      // Generate branch name
      const branchName = generateBranchName({
        key: issue.key,
        description: issue.summary,
        issueType: issue.issueType,
      });

      // Compute worktree path
      const worktreePath = getDefaultWorktreePath(branchName);
      if (!worktreePath) {
        return { success: false, error: "Not in a git repository" };
      }

      // Create worktree (only if path doesn't exist)
      if (!existsSync(worktreePath)) {
        const result = spawnSync("git", ["worktree", "add", "-b", branchName, worktreePath], {
          encoding: "utf-8",
          stdio: "pipe",
        });

        if (result.status !== 0) {
          // Branch might already exist — try without -b
          if (result.stderr?.includes("already exists")) {
            const retry = spawnSync("git", ["worktree", "add", worktreePath, branchName], {
              encoding: "utf-8",
              stdio: "pipe",
            });
            if (retry.status !== 0) {
              return { success: false, error: retry.stderr || "Failed to create worktree" };
            }
          } else {
            return { success: false, error: result.stderr || "Failed to create worktree" };
          }
        }
      }

      // Build Claude prompt
      const trackerCmd = getTrackerCommand(issue.source);
      const issueFlag = getIssueGetFlag(issue.source);
      const prompt = `Implement issue ${issue.key}: ${issue.summary}. Run 'shiba ${trackerCmd} issue-get ${issueFlag} ${issue.key}' to fetch full details.`;

      // Write temp launch script
      const sessionId = randomUUID();
      const scriptPath = `/tmp/claude/shiba-session-${sessionId}.sh`;
      const scriptContent = `#!/bin/bash\ncd "${worktreePath}" && claude "${prompt.replace(/"/g, '\\"')}"\n`;
      writeFileSync(scriptPath, scriptContent, { mode: 0o755 });

      // Launch Terminal.app
      const child = spawn("open", ["-a", "Terminal", scriptPath], {
        detached: true,
        stdio: "ignore",
      });
      child.unref();

      // Save session
      addSession({
        issueKey: issue.key,
        issueSummary: issue.summary,
        source: issue.source,
        worktreePath,
        branch: branchName,
        startedAt: new Date().toISOString(),
        status: "running",
      });

      return { success: true, issueKey: issue.key };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
    } finally {
      setLaunching(false);
    }
  }, []);

  return { launch, launching };
}
