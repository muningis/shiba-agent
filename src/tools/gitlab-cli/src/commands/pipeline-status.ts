import { getGitlabClient, successResponse } from "@shiba-agent/shared";
import type { GitlabPipelineDetail, GitlabJobSummary } from "@shiba-agent/shared";

interface PipelineStatusOpts {
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
