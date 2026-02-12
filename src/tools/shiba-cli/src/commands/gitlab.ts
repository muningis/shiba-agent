import { getGitlabClient, successResponse } from "@shiba-agent/shared";
import type {
  GitlabMRSummary,
  GitlabPipelineDetail,
  GitlabPipelineSummary,
  GitlabJobSummary,
} from "@shiba-agent/shared";

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
  const gl = getGitlabClient();

  const title = opts.draft ? `Draft: ${opts.title}` : opts.title;

  const mr = await gl.MergeRequests.create(
    opts.project,
    opts.source,
    opts.target,
    title,
    {
      description: opts.description,
      assigneeIds: opts.assigneeIds ? opts.assigneeIds.split(",").map(Number) : undefined,
      reviewerIds: opts.reviewerIds ? opts.reviewerIds.split(",").map(Number) : undefined,
      labels: opts.labels,
    }
  );

  const summary: GitlabMRSummary = {
    id: mr.id,
    iid: mr.iid,
    title: mr.title,
    state: mr.state,
    sourceBranch: String(mr.source_branch),
    targetBranch: String(mr.target_branch),
    author: { name: mr.author?.name ?? "unknown", username: mr.author?.username ?? "unknown" },
    webUrl: String(mr.web_url),
    createdAt: String(mr.created_at ?? ""),
    updatedAt: String(mr.updated_at ?? ""),
    draft: mr.draft ?? false,
    mergeStatus: String(mr.merge_status ?? "unknown"),
  };

  successResponse(summary);
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
  const gl = getGitlabClient();

  const stateFilter = opts.state === "all" ? undefined : opts.state as "opened" | "closed" | "merged" | "locked";

  const mrs = await gl.MergeRequests.all({
    projectId: opts.project,
    state: stateFilter,
    perPage: parseInt(opts.limit, 10),
    ...(opts.author && { authorUsername: opts.author }),
    ...(opts.assignee && { assigneeUsername: opts.assignee }),
  });

  const summaries: GitlabMRSummary[] = mrs.map((mr) => ({
    id: mr.id,
    iid: mr.iid,
    title: mr.title,
    state: mr.state,
    sourceBranch: String(mr.source_branch),
    targetBranch: String(mr.target_branch),
    author: { name: mr.author?.name ?? "unknown", username: mr.author?.username ?? "unknown" },
    webUrl: String(mr.web_url),
    createdAt: String(mr.created_at ?? ""),
    updatedAt: String(mr.updated_at ?? ""),
    draft: mr.draft ?? false,
    mergeStatus: String(mr.merge_status ?? "unknown"),
  }));

  successResponse(summaries);
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
  const gl = getGitlabClient();
  const iid = parseInt(opts.iid, 10);

  const result = await gl.MergeRequests.merge(opts.project, iid, {
    squash: opts.squash,
    shouldRemoveSourceBranch: opts.deleteBranch,
    mergeWhenPipelineSucceeds: opts.whenPipelineSucceeds,
  });

  successResponse({
    iid: result.iid,
    state: result.state,
    mergeCommitSha: result.merge_commit_sha ?? null,
    webUrl: result.web_url,
  });
}

// MR Comment
export interface MRCommentOpts {
  project: string;
  iid: string;
  body: string;
}

export async function mrComment(opts: MRCommentOpts): Promise<void> {
  const gl = getGitlabClient();
  const iid = parseInt(opts.iid, 10);

  const note = await gl.MergeRequestNotes.create(opts.project, iid, opts.body);

  successResponse({
    noteId: note.id,
    body: note.body,
    author: { name: note.author?.name ?? "unknown", username: note.author?.username ?? "unknown" },
    createdAt: note.created_at,
  });
}

// Pipeline Status
export interface PipelineStatusOpts {
  project: string;
  pipelineId: string;
}

export async function pipelineStatus(opts: PipelineStatusOpts): Promise<void> {
  const gl = getGitlabClient();
  const pipelineId = parseInt(opts.pipelineId, 10);

  const [pipeline, jobs] = await Promise.all([
    gl.Pipelines.show(opts.project, pipelineId),
    gl.Jobs.all(opts.project, { pipelineId }),
  ]);

  const jobSummaries: GitlabJobSummary[] = (jobs as Array<Record<string, unknown>>).map((j) => ({
    id: j.id as number,
    name: j.name as string,
    stage: j.stage as string,
    status: j.status as string,
    webUrl: j.web_url as string,
  }));

  const detail: GitlabPipelineDetail = {
    id: pipeline.id,
    status: pipeline.status,
    ref: pipeline.ref,
    sha: pipeline.sha,
    webUrl: String(pipeline.web_url),
    jobs: jobSummaries,
  };

  successResponse(detail);
}

// Pipeline List
export interface PipelineListOpts {
  project: string;
  ref?: string;
  status?: string;
  limit: string;
}

export async function pipelineList(opts: PipelineListOpts): Promise<void> {
  const gl = getGitlabClient();

  const pipelines = await gl.Pipelines.all(opts.project, {
    perPage: parseInt(opts.limit, 10),
    ...(opts.ref && { ref: opts.ref }),
    ...(opts.status && { status: opts.status as "running" | "pending" | "success" | "failed" | "canceled" }),
  });

  const summaries: GitlabPipelineSummary[] = pipelines.map((p) => ({
    id: p.id,
    status: p.status,
    ref: p.ref,
    sha: p.sha,
    webUrl: String(p.web_url),
    createdAt: String(p.created_at ?? ""),
    updatedAt: String(p.updated_at ?? ""),
  }));

  successResponse(summaries);
}
