import { execSync } from "child_process";
import { successResponse, errorResponse, isCliAvailable } from "@shiba-agent/shared";
import { generateBranchName, getEffectivePreferences } from "../config/resolve.js";
import { issueTransition } from "./jira.js";

const JIRA_CLI = "jira";

export interface BranchOpts {
  key: string;
  description?: string;
  type?: string;
}

export async function branch(opts: BranchOpts): Promise<void> {
  if (!opts.key) {
    errorResponse("MISSING_KEY", "Issue key is required (--key)");
  }

  const branchName = generateBranchName({
    key: opts.key,
    description: opts.description,
    type: opts.type,
  });

  successResponse({ branch: branchName });
}

export interface BranchCreateOpts {
  key: string;
  description?: string;
  type?: string;
  noTransition?: boolean;
}

export async function branchCreate(opts: BranchCreateOpts): Promise<void> {
  if (!opts.key) {
    errorResponse("MISSING_KEY", "Issue key is required (--key)");
  }

  const branchName = generateBranchName({
    key: opts.key,
    description: opts.description,
    type: opts.type,
  });

  // Create the git branch
  try {
    execSync(`git checkout -b ${branchName}`, { encoding: "utf-8", stdio: "pipe" });
  } catch (err) {
    const error = err as { stderr?: string };
    errorResponse("GIT_FAILED", error.stderr || "Failed to create git branch");
  }

  // Transition Jira issue (if configured and jira-cli available)
  let jiraTransitioned = false;
  const prefs = getEffectivePreferences();

  if (!opts.noTransition && prefs.workflow.enabled && isCliAvailable(JIRA_CLI)) {
    const transition = prefs.workflow.transitions?.onBranchCreate ?? "In Progress";
    try {
      await issueTransition({ key: opts.key, transition });
      jiraTransitioned = true;
    } catch {
      // Non-fatal: log warning but don't fail branch creation
      console.error(`Warning: Failed to transition Jira issue to "${transition}"`);
    }
  }

  successResponse({
    branch: branchName,
    created: true,
    jiraTransitioned,
    key: opts.key,
  });
}
