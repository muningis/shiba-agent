import { getGitlabClient, successResponse } from "@shiba-agent/shared";
import type { GitlabMRSummary } from "@shiba-agent/shared";

interface MRCreateOpts {
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
