import {
  successResponse,
  errorResponse,
  createJiraClient,
  getJiraConfig,
  JiraApiError,
  parseAdfToText,
  type JiraIssue,
  type JiraComment,
  type JiraIssueLink,
  type JiraTransition,
  type CreateIssueData,
} from "@shiba-agent/shared";
import {
  loadIssue,
  saveIssue,
  createDefaultIssue,
  syncJiraData,
  type JiraData,
} from "../issues/index.js";
import { appendCommentSignature } from "../config/resolve.js";

// Helper to get configured client
function getClient() {
  try {
    const config = getJiraConfig();
    return createJiraClient(config);
  } catch (e) {
    if (e instanceof Error) {
      errorResponse("JIRA_NOT_CONFIGURED", e.message);
    }
    throw e;
  }
}

// Helper to handle API errors
function handleApiError(e: unknown, operation: string): never {
  if (e instanceof JiraApiError) {
    const detail = e.body && typeof e.body === "object" && "errorMessages" in e.body
      ? (e.body as { errorMessages?: string[] }).errorMessages?.join(", ")
      : e.statusText;
    errorResponse(`${operation}_FAILED`, `${e.status}: ${detail || e.statusText}`);
  }
  if (e instanceof Error) {
    errorResponse(`${operation}_FAILED`, e.message);
  }
  throw e;
}

// Convert API response to our JiraData format
function toJiraData(issue: JiraIssue): JiraData {
  const fields = issue.fields;

  return {
    id: issue.id,
    summary: fields.summary,
    status: fields.status.name,
    issueType: fields.issuetype.name,
    priority: fields.priority?.name ?? "None",
    assignee: fields.assignee
      ? { name: fields.assignee.displayName, email: fields.assignee.emailAddress ?? "" }
      : null,
    reporter: fields.reporter
      ? { name: fields.reporter.displayName }
      : null,
    created: fields.created,
    updated: fields.updated,
    description: fields.description ? parseAdfToText(fields.description) : null,
    comments: fields.comment?.comments.map((c) => ({
      id: c.id,
      author: c.author.displayName,
      body: parseAdfToText(c.body) ?? "",
      created: c.created,
    })) ?? [],
    linkedIssues: fields.issuelinks?.map((link) => {
      const linked = link.inwardIssue || link.outwardIssue;
      const direction = link.inwardIssue ? link.type.inward : link.type.outward;
      return {
        key: linked?.key ?? "",
        type: direction,
        summary: linked?.fields.summary ?? "",
        status: linked?.fields.status.name ?? "",
      };
    }) ?? [],
  };
}

// Issue Get
export interface IssueGetOpts {
  key: string;
  noTrack?: boolean;
}

export async function issueGet(opts: IssueGetOpts): Promise<void> {
  const client = getClient();

  try {
    const issue = await client.getIssue(opts.key);
    const jiraData = toJiraData(issue);

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
  } catch (e) {
    handleApiError(e, "FETCH");
  }
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
  const client = getClient();

  const data: CreateIssueData = {
    fields: {
      project: { key: opts.project },
      summary: opts.summary,
      issuetype: { name: opts.type },
    },
  };

  if (opts.description) {
    data.fields.description = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: opts.description }],
        },
      ],
    };
  }

  if (opts.priority) {
    data.fields.priority = { name: opts.priority };
  }

  if (opts.labels) {
    data.fields.labels = opts.labels.split(",").map((l) => l.trim());
  }

  // Note: assignee requires accountId, not username
  // For now, skip - user can assign after creation

  try {
    const result = await client.createIssue(data);
    successResponse({
      key: result.key,
      id: result.id,
      self: result.self,
    });
  } catch (e) {
    handleApiError(e, "CREATE");
  }
}

// Issue Transition
export interface IssueTransitionOpts {
  key: string;
  transition: string;
  comment?: string;
}

export async function issueTransition(opts: IssueTransitionOpts): Promise<void> {
  const client = getClient();

  try {
    // Get available transitions
    const { transitions } = await client.getTransitions(opts.key);

    // Find matching transition by name (case-insensitive)
    const transition = transitions.find(
      (t) => t.name.toLowerCase() === opts.transition.toLowerCase()
    );

    if (!transition) {
      const available = transitions.map((t) => t.name).join(", ");
      errorResponse(
        "TRANSITION_NOT_FOUND",
        `Transition "${opts.transition}" not available. Available: ${available}`
      );
    }

    // Do the transition
    await client.doTransition(opts.key, transition.id);

    // Add comment if provided
    if (opts.comment) {
      await client.addComment(opts.key, opts.comment);
    }

    successResponse({
      issueKey: opts.key,
      newStatus: transition.name,
    });
  } catch (e) {
    handleApiError(e, "TRANSITION");
  }
}

// Issue Comment
export interface IssueCommentOpts {
  key: string;
  body: string;
}

export async function issueComment(opts: IssueCommentOpts): Promise<void> {
  const client = getClient();

  const signedBody = appendCommentSignature(opts.body);

  try {
    const result = await client.addComment(opts.key, signedBody);
    successResponse({
      id: result.id,
      issueKey: opts.key,
      body: signedBody,
      created: new Date().toISOString(),
    });
  } catch (e) {
    handleApiError(e, "COMMENT");
  }
}

// Issue Search
export interface IssueSearchOpts {
  jql: string;
  maxResults: string;
}

export async function issueSearch(opts: IssueSearchOpts): Promise<void> {
  const client = getClient();

  const maxResults = parseInt(opts.maxResults, 10) || 50;

  try {
    const result = await client.searchJql(opts.jql, maxResults);

    const issues = result.issues.map((issue) => ({
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status.name,
      assignee: issue.fields.assignee
        ? { name: issue.fields.assignee.displayName, email: issue.fields.assignee.emailAddress ?? "" }
        : null,
      issueType: issue.fields.issuetype.name,
      priority: issue.fields.priority?.name ?? "None",
    }));

    successResponse({ total: result.total, issues });
  } catch (e) {
    handleApiError(e, "SEARCH");
  }
}

// Issue Assign
export interface IssueAssignOpts {
  key: string;
  assignee: string;
}

export async function issueAssign(opts: IssueAssignOpts): Promise<void> {
  const client = getClient();

  try {
    // Handle unassign
    if (opts.assignee === "unassigned" || opts.assignee === "x" || opts.assignee === "") {
      await client.assignIssue(opts.key, null);
      successResponse({
        issueKey: opts.key,
        assignee: null,
      });
      return;
    }

    // Search for user by name/email to get accountId
    const users = await client.searchUsers(opts.assignee);

    if (users.length === 0) {
      errorResponse("USER_NOT_FOUND", `No user found matching "${opts.assignee}"`);
    }

    // Use first match
    const user = users[0];
    await client.assignIssue(opts.key, user.accountId);

    successResponse({
      issueKey: opts.key,
      assignee: user.displayName,
      accountId: user.accountId,
    });
  } catch (e) {
    handleApiError(e, "ASSIGN");
  }
}
