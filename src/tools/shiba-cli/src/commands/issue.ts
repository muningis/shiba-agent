import { successResponse, errorResponse } from "@shiba-agent/shared";
import {
  loadIssue,
  saveIssue,
  listIssues,
  addNote,
  addMergeRequest,
  addApiEndpoint,
  addContext,
  addFigma,
  updateProgress,
  setAnalysis,
  addRequirement,
  addBlocker,
  clearBlockers,
} from "../issues/index.js";
import type {
  IssueShowOpts,
  IssueAddNoteOpts,
  IssueAddMrOpts,
  IssueAddApiOpts,
  IssueAddContextOpts,
  IssueAddFigmaOpts,
  IssueUpdateProgressOpts,
  IssueSetAnalysisOpts,
  IssueAddRequirementOpts,
} from "../issues/index.js";

// ===== List tracked issues =====

export async function issueList(): Promise<void> {
  const keys = listIssues();
  const issues = keys
    .map((key) => {
      const issue = loadIssue(key);
      return issue
        ? {
            key: issue.issueKey,
            summary: issue.jira.summary,
            status: issue.jira.status,
            progress: issue.progress.status,
            percentComplete: issue.progress.percentComplete,
            mergeRequests: issue.mergeRequests.length,
            hasAnalysis: issue.analysis !== null,
          }
        : null;
    })
    .filter(Boolean);

  successResponse({ count: issues.length, issues });
}

// ===== Get full tracked issue =====

export async function issueShow(opts: IssueShowOpts): Promise<void> {
  const issue = loadIssue(opts.key);
  if (!issue) {
    errorResponse(
      "ISSUE_NOT_FOUND",
      `No tracked issue found for ${opts.key}. Run 'shiba jira issue-get --key ${opts.key}' first.`
    );
    return;
  }
  successResponse(issue);
}

// ===== Add note =====

export async function issueAddNote(opts: IssueAddNoteOpts): Promise<void> {
  const issue = loadIssue(opts.key);
  if (!issue) {
    errorResponse("ISSUE_NOT_FOUND", `No tracked issue found for ${opts.key}`);
    return;
  }

  const note = addNote(issue, opts.content, opts.category);
  saveIssue(issue);

  successResponse({ issueKey: opts.key, note });
}

// ===== Add merge request =====

export async function issueAddMr(opts: IssueAddMrOpts): Promise<void> {
  const issue = loadIssue(opts.key);
  if (!issue) {
    errorResponse("ISSUE_NOT_FOUND", `No tracked issue found for ${opts.key}`);
    return;
  }

  // If marking as primary, unset other primaries
  if (opts.primary) {
    issue.mergeRequests.forEach((mr) => (mr.isPrimary = false));
  }

  const mr = addMergeRequest(issue, {
    iid: opts.iid,
    projectPath: opts.project,
    isPrimary: opts.primary ?? false,
  });

  saveIssue(issue);
  successResponse({ issueKey: opts.key, mergeRequest: mr });
}

// ===== Add API endpoint =====

export async function issueAddApi(opts: IssueAddApiOpts): Promise<void> {
  const issue = loadIssue(opts.key);
  if (!issue) {
    errorResponse("ISSUE_NOT_FOUND", `No tracked issue found for ${opts.key}`);
    return;
  }

  const api = addApiEndpoint(issue, {
    method: opts.method,
    path: opts.path,
    description: opts.description,
    specSource: opts.spec,
  });

  saveIssue(issue);
  successResponse({ issueKey: opts.key, api });
}

// ===== Add context =====

export async function issueAddContext(opts: IssueAddContextOpts): Promise<void> {
  const issue = loadIssue(opts.key);
  if (!issue) {
    errorResponse("ISSUE_NOT_FOUND", `No tracked issue found for ${opts.key}`);
    return;
  }

  const context = addContext(issue, {
    type: opts.type,
    path: opts.path,
    description: opts.description,
    relevance: opts.relevance,
  });

  saveIssue(issue);
  successResponse({ issueKey: opts.key, context });
}

// ===== Add Figma reference =====

export async function issueAddFigma(opts: IssueAddFigmaOpts): Promise<void> {
  const issue = loadIssue(opts.key);
  if (!issue) {
    errorResponse("ISSUE_NOT_FOUND", `No tracked issue found for ${opts.key}`);
    return;
  }

  // Parse Figma URL for node ID
  const nodeIdMatch = opts.url.match(/node-id=([^&]+)/);

  const figma = addFigma(issue, {
    url: opts.url,
    name: opts.name,
    nodeId: nodeIdMatch ? nodeIdMatch[1] : undefined,
    description: opts.description,
  });

  saveIssue(issue);
  successResponse({ issueKey: opts.key, figma });
}

// ===== Update progress =====

export async function issueUpdateProgress(opts: IssueUpdateProgressOpts): Promise<void> {
  const issue = loadIssue(opts.key);
  if (!issue) {
    errorResponse("ISSUE_NOT_FOUND", `No tracked issue found for ${opts.key}`);
    return;
  }

  if (opts.blocker) {
    addBlocker(issue, opts.blocker);
  }
  if (opts.clearBlockers) {
    clearBlockers(issue);
  }

  updateProgress(issue, {
    ...(opts.status && { status: opts.status }),
    ...(opts.percent !== undefined && { percentComplete: opts.percent }),
  });

  saveIssue(issue);
  successResponse({ issueKey: opts.key, progress: issue.progress });
}

// ===== Set analysis =====

export async function issueSetAnalysis(opts: IssueSetAnalysisOpts): Promise<void> {
  const issue = loadIssue(opts.key);
  if (!issue) {
    errorResponse("ISSUE_NOT_FOUND", `No tracked issue found for ${opts.key}`);
    return;
  }

  setAnalysis(issue, opts.summary, {
    acceptanceCriteria: opts.acceptanceCriteria?.split(",").map((s) => s.trim()),
    outOfScope: opts.outOfScope?.split(",").map((s) => s.trim()),
    assumptions: opts.assumptions?.split(",").map((s) => s.trim()),
  });

  saveIssue(issue);
  successResponse({ issueKey: opts.key, analysis: issue.analysis });
}

// ===== Add requirement =====

export async function issueAddRequirement(opts: IssueAddRequirementOpts): Promise<void> {
  const issue = loadIssue(opts.key);
  if (!issue) {
    errorResponse("ISSUE_NOT_FOUND", `No tracked issue found for ${opts.key}`);
    return;
  }

  const requirement = addRequirement(issue, {
    title: opts.title,
    description: opts.description,
    type: opts.type,
    priority: opts.priority,
  });

  saveIssue(issue);
  successResponse({ issueKey: opts.key, requirement });
}
