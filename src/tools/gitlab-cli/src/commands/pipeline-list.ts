import { getGitlabClient, successResponse } from "@agent-tools/shared";
import type { GitlabPipelineSummary } from "@agent-tools/shared";

interface PipelineListOpts {
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
