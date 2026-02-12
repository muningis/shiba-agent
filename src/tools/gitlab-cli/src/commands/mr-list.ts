import { getGitlabClient, successResponse } from "@shiba-agent/shared";
import type { GitlabMRSummary } from "@shiba-agent/shared";

interface MRListOpts {
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
