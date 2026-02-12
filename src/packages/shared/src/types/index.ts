// ── Standard CLI output envelope ──────────────────────────────────────

export interface CliSuccess<T> {
  success: true;
  data: T;
  timestamp: string;
}

export interface CliError {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode?: number;
    context?: Record<string, unknown>;
  };
  timestamp: string;
}

export type CliOutput<T> = CliSuccess<T> | CliError;

// ── GitLab types ─────────────────────────────────────────────────────

export interface GitlabMRSummary {
  id: number;
  iid: number;
  title: string;
  state: string;
  sourceBranch: string;
  targetBranch: string;
  author: { name: string; username: string };
  webUrl: string;
  createdAt: string;
  updatedAt: string;
  draft: boolean;
  mergeStatus: string;
}

export interface GitlabPipelineSummary {
  id: number;
  status: string;
  ref: string;
  sha: string;
  webUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface GitlabJobSummary {
  id: number;
  name: string;
  stage: string;
  status: string;
  webUrl: string;
}

export interface GitlabPipelineDetail {
  id: number;
  status: string;
  ref: string;
  sha: string;
  webUrl: string;
  jobs: GitlabJobSummary[];
}

// ── Jira types ───────────────────────────────────────────────────────

export interface JiraIssueSummary {
  key: string;
  id: string;
  summary: string;
  status: string;
  assignee: { name: string; email: string } | null;
  reporter: { name: string } | null;
  priority: string;
  issueType: string;
  created: string;
  updated: string;
}

export interface JiraIssueCreated {
  key: string;
  id: string;
  self: string;
}

export interface JiraTransitionResult {
  issueKey: string;
  newStatus: string;
}

export interface JiraComment {
  id: string;
  issueKey: string;
  body: string;
  created: string;
}
