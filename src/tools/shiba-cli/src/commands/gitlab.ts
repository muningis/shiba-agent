import { execCli, requireCli, successResponse, errorResponse } from "@shiba-agent/shared";
import { appendCommentSignature } from "../config/resolve.js";

const GLAB_CLI = "glab";
const GLAB_INSTALL_HINT = "brew install glab";

// MR Create
export interface MRCreateOpts {
  project: string;
  source: string;
  target: string;
  title: string;
  description?: string;
  draft: boolean;
  assigneeIds?: string;
  reviewerIds?: string;
  labels?: string;
}

export async function mrCreate(opts: MRCreateOpts): Promise<void> {
  requireCli(GLAB_CLI, GLAB_INSTALL_HINT);

  const args = ["mr", "create", "-s", opts.source, "-b", opts.target, "-t", opts.title, "-y"];

  if (opts.description) args.push("-d", opts.description);
  if (opts.draft) args.push("--draft");
  if (opts.assigneeIds) args.push("-a", opts.assigneeIds);
  if (opts.reviewerIds) args.push("--reviewer", opts.reviewerIds);
  if (opts.labels) args.push("-l", opts.labels);

  // Set repo if provided
  if (opts.project) args.push("-R", opts.project);

  const result = execCli(GLAB_CLI, args);

  if (result.exitCode !== 0) {
    errorResponse("CREATE_FAILED", result.stderr || "Failed to create merge request");
  }

  // Parse MR URL from output
  const urlMatch = result.stdout.match(/https?:\/\/[^\s]+/);
  const iidMatch = result.stdout.match(/!(\d+)/);

  successResponse({
    iid: iidMatch ? parseInt(iidMatch[1], 10) : 0,
    webUrl: urlMatch?.[0] ?? "",
    title: opts.title,
    sourceBranch: opts.source,
    targetBranch: opts.target,
    draft: opts.draft,
  });
}

// MR List
export interface MRListOpts {
  project: string;
  state: string;
  limit: string;
  author?: string;
  assignee?: string;
}

export async function mrList(opts: MRListOpts): Promise<void> {
  requireCli(GLAB_CLI, GLAB_INSTALL_HINT);

  const args = ["mr", "list", "-F", "json"];

  if (opts.state && opts.state !== "all") {
    args.push("--state", opts.state);
  }

  const limit = parseInt(opts.limit, 10);
  if (limit && limit > 0) {
    args.push("-P", String(limit));
  }

  if (opts.author) args.push("--author", opts.author);
  if (opts.assignee) args.push("--assignee", opts.assignee);
  if (opts.project) args.push("-R", opts.project);

  const result = execCli(GLAB_CLI, args);

  if (result.exitCode !== 0) {
    errorResponse("LIST_FAILED", result.stderr || "Failed to list merge requests");
  }

  try {
    const mrs = JSON.parse(result.stdout);
    // glab returns array of MR objects
    const summaries = (Array.isArray(mrs) ? mrs : []).map((mr: Record<string, unknown>) => ({
      id: mr.id as number,
      iid: mr.iid as number,
      title: mr.title as string,
      state: mr.state as string,
      sourceBranch: mr.source_branch as string,
      targetBranch: mr.target_branch as string,
      author: mr.author ? { name: (mr.author as Record<string, string>).name ?? "unknown", username: (mr.author as Record<string, string>).username ?? "unknown" } : { name: "unknown", username: "unknown" },
      webUrl: mr.web_url as string,
      createdAt: mr.created_at as string,
      updatedAt: mr.updated_at as string,
      draft: mr.draft as boolean ?? false,
      mergeStatus: mr.merge_status as string ?? "unknown",
    }));
    successResponse(summaries);
  } catch {
    // If JSON parsing fails, return empty array
    successResponse([]);
  }
}

// MR Merge
export interface MRMergeOpts {
  project: string;
  iid: string;
  squash: boolean;
  deleteBranch: boolean;
  whenPipelineSucceeds: boolean;
}

export async function mrMerge(opts: MRMergeOpts): Promise<void> {
  requireCli(GLAB_CLI, GLAB_INSTALL_HINT);

  const args = ["mr", "merge", opts.iid, "-y"];

  if (opts.squash) args.push("-s");
  if (opts.deleteBranch) args.push("-d");
  if (opts.whenPipelineSucceeds) args.push("--auto-merge");
  if (opts.project) args.push("-R", opts.project);

  const result = execCli(GLAB_CLI, args);

  if (result.exitCode !== 0) {
    errorResponse("MERGE_FAILED", result.stderr || "Failed to merge MR");
  }

  // Parse merge commit SHA from output if available
  const shaMatch = result.stdout.match(/([a-f0-9]{40})/);

  successResponse({
    iid: parseInt(opts.iid, 10),
    state: "merged",
    mergeCommitSha: shaMatch?.[0] ?? null,
    webUrl: "",
  });
}

// MR Comment
export interface MRCommentOpts {
  project: string;
  iid: string;
  body: string;
}

export async function mrComment(opts: MRCommentOpts): Promise<void> {
  requireCli(GLAB_CLI, GLAB_INSTALL_HINT);

  const signedBody = appendCommentSignature(opts.body);
  const args = ["mr", "note", opts.iid, "-m", signedBody];
  if (opts.project) args.push("-R", opts.project);

  const result = execCli(GLAB_CLI, args);

  if (result.exitCode !== 0) {
    errorResponse("COMMENT_FAILED", result.stderr || "Failed to add comment");
  }

  successResponse({
    noteId: 0,
    body: signedBody,
    author: { name: "unknown", username: "unknown" },
    createdAt: new Date().toISOString(),
  });
}

// Pipeline Status
export interface PipelineStatusOpts {
  project: string;
  pipelineId: string;
}

export async function pipelineStatus(opts: PipelineStatusOpts): Promise<void> {
  requireCli(GLAB_CLI, GLAB_INSTALL_HINT);

  const args = ["ci", "view", opts.pipelineId];
  if (opts.project) args.push("-R", opts.project);

  const result = execCli(GLAB_CLI, args);

  if (result.exitCode !== 0) {
    errorResponse("FETCH_FAILED", result.stderr || "Failed to get pipeline status");
  }

  // Parse pipeline info from text output
  // glab ci view outputs a formatted table, we'll extract what we can
  const lines = result.stdout.split("\n");
  let status = "unknown";
  let ref = "";
  let sha = "";

  for (const line of lines) {
    if (line.includes("Status:")) {
      status = line.split(":")[1]?.trim() ?? "unknown";
    } else if (line.includes("Ref:")) {
      ref = line.split(":")[1]?.trim() ?? "";
    } else if (line.includes("SHA:")) {
      sha = line.split(":")[1]?.trim() ?? "";
    }
  }

  successResponse({
    id: parseInt(opts.pipelineId, 10),
    status,
    ref,
    sha,
    webUrl: "",
    jobs: [], // glab ci view doesn't provide JSON, would need separate call
  });
}

// Pipeline List
export interface PipelineListOpts {
  project: string;
  ref?: string;
  status?: string;
  limit: string;
}

export async function pipelineList(opts: PipelineListOpts): Promise<void> {
  requireCli(GLAB_CLI, GLAB_INSTALL_HINT);

  const args = ["ci", "list", "-F", "json"];

  const limit = parseInt(opts.limit, 10);
  if (limit && limit > 0) {
    args.push("-P", String(limit));
  }

  if (opts.status) args.push("--status", opts.status);
  if (opts.project) args.push("-R", opts.project);

  const result = execCli(GLAB_CLI, args);

  if (result.exitCode !== 0) {
    errorResponse("LIST_FAILED", result.stderr || "Failed to list pipelines");
  }

  try {
    const pipelines = JSON.parse(result.stdout);
    const summaries = (Array.isArray(pipelines) ? pipelines : []).map((p: Record<string, unknown>) => ({
      id: p.id as number,
      status: p.status as string,
      ref: p.ref as string,
      sha: p.sha as string,
      webUrl: p.web_url as string,
      createdAt: p.created_at as string,
      updatedAt: p.updated_at as string,
    }));
    successResponse(summaries);
  } catch {
    successResponse([]);
  }
}
