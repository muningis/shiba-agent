import { getGitlabClient, successResponse } from "@shiba-agent/shared";

interface MRMergeOpts {
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
