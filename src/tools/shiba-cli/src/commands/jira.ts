import { execCli, requireCli, successResponse, errorResponse } from "@shiba-agent/shared";
import {
  loadIssue,
  saveIssue,
  createDefaultIssue,
  syncJiraData,
  type JiraData,
} from "../issues/index.js";
import { appendCommentSignature } from "../config/resolve.js";
import { parseJiraCliRawOutput } from "../utils/jira-parser.js";

const JIRA_CLI = "jira";
const JIRA_INSTALL_HINT = "brew install ankitpokhrel/jira-cli/jira-cli";

// Issue Get
export interface IssueGetOpts {
  key: string;
  noTrack?: boolean;
}

export async function issueGet(opts: IssueGetOpts): Promise<void> {
  requireCli(JIRA_CLI, JIRA_INSTALL_HINT);

  // Fetch issue with comments using jira-cli
  const result = execCli(JIRA_CLI, ["issue", "view", opts.key, "--comments", "10", "--raw"]);

  if (result.exitCode !== 0) {
    errorResponse("FETCH_FAILED", result.stderr || "Failed to fetch issue");
  }

  // Parse the raw output from jira-cli
  const jiraData = parseJiraCliOutput(opts.key, result.stdout);

  // Track issue in local file
  if (!opts.noTrack) {
    const tracked = loadIssue(opts.key) ?? createDefaultIssue(opts.key);
    syncJiraData(tracked, jiraData);
    saveIssue(tracked);
  }

  // Output analysis prompt to stderr (for Claude Code to see and act on)
  console.error(formatAnalysisPrompt(opts.key, jiraData));

  // Output JSON to stdout (for programmatic use)
  successResponse({ key: opts.key, ...jiraData });
}

// Convert jira-cli raw output into our JiraData format using shared parser
function parseJiraCliOutput(key: string, raw: string): JiraData {
  const parsed = parseJiraCliRawOutput(key, raw);
  return {
    id: parsed.id,
    summary: parsed.summary,
    status: parsed.status,
    issueType: parsed.issueType,
    priority: parsed.priority,
    assignee: parsed.assigneeName ? { name: parsed.assigneeName, email: "" } : null,
    reporter: parsed.reporterName ? { name: parsed.reporterName } : null,
    created: parsed.created,
    updated: parsed.updated,
    description: parsed.description,
    comments: parsed.comments,
    linkedIssues: parsed.linkedIssues,
  };
}

// Format analysis prompt for Claude Code
function formatAnalysisPrompt(key: string, data: JiraData): string {
  const lines: string[] = [
    "=== ANALYSIS TASK ===",
    "Analyze this Jira ticket. Identify:",
    "- What's clearly defined vs unclear",
    "- Technical considerations and dependencies",
    "- Questions to ask before starting",
    "- Suggested next steps (fetch linked tickets, check APIs, etc.)",
    "",
    "Ask me if you need clarification on any requirements.",
    "",
    `=== TICKET: ${key} ===`,
    `Summary: ${data.summary}`,
    `Type: ${data.issueType} | Status: ${data.status} | Priority: ${data.priority}`,
  ];

  if (data.assignee) {
    lines.push(`Assignee: ${data.assignee.name}`);
  }

  if (data.description) {
    lines.push("", "Description:", data.description);
  } else {
    lines.push("", "Description: (none provided)");
  }

  if (data.linkedIssues && data.linkedIssues.length > 0) {
    lines.push("", "Linked Issues:");
    for (const link of data.linkedIssues) {
      lines.push(`- ${link.key} (${link.type}): ${link.summary} [${link.status}]`);
    }
  }

  if (data.comments && data.comments.length > 0) {
    lines.push("", `Comments (${data.comments.length}):`);
    for (const c of data.comments.slice(-5)) {
      const date = c.created ? c.created.split("T")[0] : "";
      lines.push(`[${c.author} - ${date}]: ${c.body}`);
    }
  }

  lines.push("", "=== END ===");
  return lines.join("\n");
}

// Issue Create
export interface IssueCreateOpts {
  project: string;
  type: string;
  summary: string;
  description?: string;
  assignee?: string;
  priority?: string;
  labels?: string;
}

export async function issueCreate(opts: IssueCreateOpts): Promise<void> {
  requireCli(JIRA_CLI, JIRA_INSTALL_HINT);

  const args = ["issue", "create", "-t", opts.type, "-s", opts.summary, "--no-input"];

  if (opts.description) args.push("-b", opts.description);
  if (opts.priority) args.push("-y", opts.priority);
  if (opts.labels) args.push("-l", opts.labels);
  if (opts.assignee) args.push("-a", opts.assignee);

  const result = execCli(JIRA_CLI, args);

  if (result.exitCode !== 0) {
    errorResponse("CREATE_FAILED", result.stderr || "Failed to create issue");
  }

  // Parse issue key from output (format: "Issue ABC-123 created")
  const keyMatch = result.stdout.match(/([A-Z]+-\d+)/);
  const key = keyMatch?.[1] ?? "unknown";

  successResponse({
    key,
    self: "",
    id: "",
  });
}

// Issue Transition
export interface IssueTransitionOpts {
  key: string;
  transition: string;
  comment?: string;
}

export async function issueTransition(opts: IssueTransitionOpts): Promise<void> {
  requireCli(JIRA_CLI, JIRA_INSTALL_HINT);

  const args = ["issue", "move", opts.key, opts.transition];

  if (opts.comment) {
    args.push("--comment", opts.comment);
  }

  const result = execCli(JIRA_CLI, args);

  if (result.exitCode !== 0) {
    errorResponse("TRANSITION_FAILED", result.stderr || `Failed to transition issue to ${opts.transition}`);
  }

  successResponse({
    issueKey: opts.key,
    newStatus: opts.transition,
  });
}

// Issue Comment
export interface IssueCommentOpts {
  key: string;
  body: string;
}

export async function issueComment(opts: IssueCommentOpts): Promise<void> {
  requireCli(JIRA_CLI, JIRA_INSTALL_HINT);

  const signedBody = appendCommentSignature(opts.body);
  const result = execCli(JIRA_CLI, ["issue", "comment", "add", opts.key, "-b", signedBody]);

  if (result.exitCode !== 0) {
    errorResponse("COMMENT_FAILED", result.stderr || "Failed to add comment");
  }

  successResponse({
    id: "",
    issueKey: opts.key,
    body: signedBody,
    created: new Date().toISOString(),
  });
}

// Issue Search
export interface IssueSearchOpts {
  jql: string;
  maxResults: string;
}

export async function issueSearch(opts: IssueSearchOpts): Promise<void> {
  requireCli(JIRA_CLI, JIRA_INSTALL_HINT);

  const args = ["issue", "list", "-q", opts.jql, "--plain"];

  const limit = parseInt(opts.maxResults, 10);
  if (limit && limit > 0) {
    args.push("--paginate", String(limit));
  }

  const result = execCli(JIRA_CLI, args);

  if (result.exitCode !== 0) {
    errorResponse("SEARCH_FAILED", result.stderr || "Failed to search issues");
  }

  // Parse plain text output - each line is typically: KEY    Summary    Status    Assignee
  const lines = result.stdout.trim().split("\n").filter(Boolean);
  const issues = lines.slice(1).map((line) => {
    const parts = line.split(/\s{2,}/); // Split by 2+ spaces
    return {
      key: parts[0] ?? "",
      summary: parts[1] ?? "",
      status: parts[2] ?? "",
      assignee: parts[3] ? { name: parts[3], email: "" } : null,
    };
  });

  successResponse({ total: issues.length, issues });
}

// Issue Assign
export interface IssueAssignOpts {
  key: string;
  assignee: string;
}

export async function issueAssign(opts: IssueAssignOpts): Promise<void> {
  requireCli(JIRA_CLI, JIRA_INSTALL_HINT);

  // jira-cli uses "x" for unassigned
  const assignee = opts.assignee === "unassigned" ? "x" : opts.assignee;

  const result = execCli(JIRA_CLI, ["issue", "assign", opts.key, assignee]);

  if (result.exitCode !== 0) {
    errorResponse("ASSIGN_FAILED", result.stderr || "Failed to assign issue");
  }

  successResponse({
    issueKey: opts.key,
    assignee: opts.assignee,
  });
}
