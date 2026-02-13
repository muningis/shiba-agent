import { execCli, requireCli, successResponse, errorResponse } from "@shiba-agent/shared";
import { appendCommentSignature } from "../config/resolve.js";

const GH_CLI = "gh";
const GH_INSTALL_HINT = "brew install gh";

// PR Create
export interface PrCreateOpts {
  title: string;
  body?: string;
  base?: string;
  head?: string;
  draft: boolean;
  assignees?: string;
  reviewers?: string;
  labels?: string;
  repo?: string;
}

export async function prCreate(opts: PrCreateOpts): Promise<void> {
  requireCli(GH_CLI, GH_INSTALL_HINT);

  const args = ["pr", "create", "--title", opts.title];

  if (opts.body) args.push("--body", appendCommentSignature(opts.body));
  if (opts.base) args.push("--base", opts.base);
  if (opts.head) args.push("--head", opts.head);
  if (opts.draft) args.push("--draft");
  if (opts.assignees) args.push("--assignee", opts.assignees);
  if (opts.reviewers) args.push("--reviewer", opts.reviewers);
  if (opts.labels) args.push("--label", opts.labels);
  if (opts.repo) args.push("--repo", opts.repo);

  const result = execCli(GH_CLI, args);

  if (result.exitCode !== 0) {
    errorResponse("CREATE_FAILED", result.stderr || "Failed to create pull request");
  }

  // Parse PR URL and number from output
  const urlMatch = result.stdout.match(/https?:\/\/[^\s]+/);
  const prMatch = result.stdout.match(/#(\d+)/) ?? urlMatch?.[0]?.match(/\/pull\/(\d+)/);

  successResponse({
    number: prMatch ? parseInt(prMatch[1], 10) : 0,
    url: urlMatch?.[0] ?? "",
    title: opts.title,
    draft: opts.draft,
  });
}

// PR List
export interface PrListOpts {
  state: string;
  limit: string;
  author?: string;
  assignee?: string;
  base?: string;
  repo?: string;
}

export async function prList(opts: PrListOpts): Promise<void> {
  requireCli(GH_CLI, GH_INSTALL_HINT);

  const args = ["pr", "list", "--json", "number,title,state,headRefName,baseRefName,author,url,createdAt,updatedAt,isDraft"];

  if (opts.state && opts.state !== "all") {
    args.push("--state", opts.state);
  }

  const limit = parseInt(opts.limit, 10);
  if (limit && limit > 0) {
    args.push("--limit", String(limit));
  }

  if (opts.author) args.push("--author", opts.author);
  if (opts.assignee) args.push("--assignee", opts.assignee);
  if (opts.base) args.push("--base", opts.base);
  if (opts.repo) args.push("--repo", opts.repo);

  const result = execCli(GH_CLI, args);

  if (result.exitCode !== 0) {
    errorResponse("LIST_FAILED", result.stderr || "Failed to list pull requests");
  }

  try {
    const prs = JSON.parse(result.stdout);
    const summaries = (Array.isArray(prs) ? prs : []).map((pr: Record<string, unknown>) => ({
      number: pr.number as number,
      title: pr.title as string,
      state: pr.state as string,
      headRefName: pr.headRefName as string,
      baseRefName: pr.baseRefName as string,
      author: pr.author ? { login: (pr.author as Record<string, string>).login ?? "unknown" } : { login: "unknown" },
      url: pr.url as string,
      createdAt: pr.createdAt as string,
      updatedAt: pr.updatedAt as string,
      draft: Boolean(pr.isDraft),
    }));
    successResponse(summaries);
  } catch (err) {
    process.stderr.write(`[shiba] Warning: Failed to parse gh pr list output: ${err}\n`);
    errorResponse("PARSE_FAILED", "Failed to parse pull request list from gh");
  }
}

// PR Merge
export interface PrMergeOpts {
  number: string;
  squash: boolean;
  deleteBranch: boolean;
  auto: boolean;
  repo?: string;
}

export async function prMerge(opts: PrMergeOpts): Promise<void> {
  requireCli(GH_CLI, GH_INSTALL_HINT);

  const args = ["pr", "merge", opts.number];

  if (opts.squash) args.push("--squash");
  if (opts.deleteBranch) args.push("--delete-branch");
  if (opts.auto) args.push("--auto");
  if (opts.repo) args.push("--repo", opts.repo);

  const result = execCli(GH_CLI, args);

  if (result.exitCode !== 0) {
    errorResponse("MERGE_FAILED", result.stderr || "Failed to merge PR");
  }

  successResponse({
    number: parseInt(opts.number, 10),
    state: "merged",
  });
}

// PR Comment
export interface PrCommentOpts {
  number: string;
  body: string;
  repo?: string;
}

export async function prComment(opts: PrCommentOpts): Promise<void> {
  requireCli(GH_CLI, GH_INSTALL_HINT);

  const signedBody = appendCommentSignature(opts.body);
  const args = ["pr", "comment", opts.number, "--body", signedBody];
  if (opts.repo) args.push("--repo", opts.repo);

  const result = execCli(GH_CLI, args);

  if (result.exitCode !== 0) {
    errorResponse("COMMENT_FAILED", result.stderr || "Failed to add comment");
  }

  successResponse({
    number: parseInt(opts.number, 10),
    body: signedBody,
    createdAt: new Date().toISOString(),
  });
}

// Issue Get
export interface GhIssueGetOpts {
  number: string;
  repo?: string;
}

export async function ghIssueGet(opts: GhIssueGetOpts): Promise<void> {
  requireCli(GH_CLI, GH_INSTALL_HINT);

  const args = ["issue", "view", opts.number, "--json", "number,title,state,body,author,assignees,labels,createdAt,updatedAt,url,comments"];
  if (opts.repo) args.push("--repo", opts.repo);

  const result = execCli(GH_CLI, args);

  if (result.exitCode !== 0) {
    errorResponse("FETCH_FAILED", result.stderr || "Failed to fetch issue");
  }

  try {
    const issue = JSON.parse(result.stdout);
    successResponse({
      number: issue.number,
      title: issue.title,
      state: issue.state,
      body: issue.body,
      author: issue.author?.login ?? "unknown",
      assignees: (issue.assignees ?? []).map((a: Record<string, string>) => a.login),
      labels: (issue.labels ?? []).map((l: Record<string, string>) => l.name),
      url: issue.url,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      comments: (issue.comments ?? []).map((c: Record<string, unknown>) => ({
        author: (c.author as Record<string, string>)?.login ?? "unknown",
        body: c.body as string,
        createdAt: c.createdAt as string,
      })),
    });
  } catch {
    errorResponse("PARSE_FAILED", "Failed to parse issue response");
  }
}

// Issue Create
export interface GhIssueCreateOpts {
  title: string;
  body?: string;
  assignees?: string;
  labels?: string;
  repo?: string;
}

export async function ghIssueCreate(opts: GhIssueCreateOpts): Promise<void> {
  requireCli(GH_CLI, GH_INSTALL_HINT);

  // Always include --body to satisfy gh CLI in non-interactive mode
  const args = ["issue", "create", "--title", opts.title, "--body", opts.body ?? ""];

  if (opts.assignees) args.push("--assignee", opts.assignees);
  if (opts.labels) args.push("--label", opts.labels);
  if (opts.repo) args.push("--repo", opts.repo);

  const result = execCli(GH_CLI, args);

  if (result.exitCode !== 0) {
    errorResponse("CREATE_FAILED", result.stderr || "Failed to create issue");
  }

  // Parse issue URL and number from output
  const urlMatch = result.stdout.match(/https?:\/\/[^\s]+/);
  const issueMatch = result.stdout.match(/#(\d+)/) ?? urlMatch?.[0]?.match(/\/issues\/(\d+)/);

  successResponse({
    number: issueMatch ? parseInt(issueMatch[1], 10) : 0,
    url: urlMatch?.[0] ?? "",
    title: opts.title,
  });
}

// Issue List
export interface GhIssueListOpts {
  state: string;
  limit: string;
  author?: string;
  assignee?: string;
  labels?: string;
  repo?: string;
}

export async function ghIssueList(opts: GhIssueListOpts): Promise<void> {
  requireCli(GH_CLI, GH_INSTALL_HINT);

  const args = ["issue", "list", "--json", "number,title,state,author,assignees,labels,createdAt,updatedAt,url"];

  if (opts.state && opts.state !== "all") {
    args.push("--state", opts.state);
  }

  const limit = parseInt(opts.limit, 10);
  if (limit && limit > 0) {
    args.push("--limit", String(limit));
  }

  if (opts.author) args.push("--author", opts.author);
  if (opts.assignee) args.push("--assignee", opts.assignee);
  if (opts.labels) args.push("--label", opts.labels);
  if (opts.repo) args.push("--repo", opts.repo);

  const result = execCli(GH_CLI, args);

  if (result.exitCode !== 0) {
    errorResponse("LIST_FAILED", result.stderr || "Failed to list issues");
  }

  try {
    const issues = JSON.parse(result.stdout);
    const summaries = (Array.isArray(issues) ? issues : []).map((issue: Record<string, unknown>) => ({
      number: issue.number as number,
      title: issue.title as string,
      state: issue.state as string,
      author: (issue.author as Record<string, string>)?.login ?? "unknown",
      assignees: ((issue.assignees as Record<string, string>[]) ?? []).map(a => a.login),
      labels: ((issue.labels as Record<string, string>[]) ?? []).map(l => l.name),
      url: issue.url as string,
      createdAt: issue.createdAt as string,
      updatedAt: issue.updatedAt as string,
    }));
    successResponse(summaries);
  } catch (err) {
    process.stderr.write(`[shiba] Warning: Failed to parse gh issue list output: ${err}\n`);
    errorResponse("PARSE_FAILED", "Failed to parse issue list from gh");
  }
}

// Issue Comment
export interface GhIssueCommentOpts {
  number: string;
  body: string;
  repo?: string;
}

export async function ghIssueComment(opts: GhIssueCommentOpts): Promise<void> {
  requireCli(GH_CLI, GH_INSTALL_HINT);

  const signedBody = appendCommentSignature(opts.body);
  const args = ["issue", "comment", opts.number, "--body", signedBody];
  if (opts.repo) args.push("--repo", opts.repo);

  const result = execCli(GH_CLI, args);

  if (result.exitCode !== 0) {
    errorResponse("COMMENT_FAILED", result.stderr || "Failed to add comment");
  }

  successResponse({
    number: parseInt(opts.number, 10),
    body: signedBody,
    createdAt: new Date().toISOString(),
  });
}
