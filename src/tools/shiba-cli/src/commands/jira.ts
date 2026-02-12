import { getJiraClient, successResponse, errorResponse } from "@shiba-agent/shared";
import type {
  JiraIssueSummary,
  JiraIssueCreated,
  JiraTransitionResult,
  JiraComment,
} from "@shiba-agent/shared";

// Issue Get
export interface IssueGetOpts {
  key: string;
}

export async function issueGet(opts: IssueGetOpts): Promise<void> {
  const jira = getJiraClient();

  const issue = await jira.issues.getIssue({
    issueIdOrKey: opts.key,
    fields: ["summary", "status", "assignee", "reporter", "priority", "issuetype", "created", "updated", "description"],
  });

  const summary: JiraIssueSummary = {
    key: issue.key,
    id: issue.id,
    summary: issue.fields.summary,
    status: issue.fields.status?.name ?? "Unknown",
    assignee: issue.fields.assignee
      ? { name: issue.fields.assignee.displayName ?? "Unknown", email: issue.fields.assignee.emailAddress ?? "" }
      : null,
    reporter: issue.fields.reporter ? { name: issue.fields.reporter.displayName ?? "Unknown" } : null,
    priority: issue.fields.priority?.name ?? "None",
    issueType: issue.fields.issuetype?.name ?? "Unknown",
    created: issue.fields.created ?? "",
    updated: issue.fields.updated ?? "",
  };

  successResponse(summary);
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
  const jira = getJiraClient();

  const result = await jira.issues.createIssue({
    fields: {
      summary: opts.summary,
      project: { key: opts.project },
      issuetype: { name: opts.type },
      ...(opts.description && {
        description: {
          type: "doc",
          version: 1,
          content: [{ type: "paragraph", content: [{ type: "text", text: opts.description }] }],
        },
      }),
      ...(opts.assignee && { assignee: { accountId: opts.assignee } }),
      ...(opts.priority && { priority: { name: opts.priority } }),
      ...(opts.labels && { labels: opts.labels.split(",").map((l) => l.trim()) }),
    },
  });

  const resultAny = result as unknown as Record<string, unknown>;
  if (!resultAny.key) {
    errorResponse("CREATE_FAILED", "Jira did not return an issue key.");
  }

  const created: JiraIssueCreated = {
    key: String(resultAny.key),
    id: String(resultAny.id ?? ""),
    self: String(resultAny.self ?? ""),
  };

  successResponse(created);
}

// Issue Transition
export interface IssueTransitionOpts {
  key: string;
  transition: string;
  comment?: string;
}

export async function issueTransition(opts: IssueTransitionOpts): Promise<void> {
  const jira = getJiraClient();

  // Fetch available transitions
  const { transitions } = await jira.issues.getTransitions({ issueIdOrKey: opts.key });

  if (!transitions || transitions.length === 0) {
    errorResponse("NO_TRANSITIONS", `No transitions available for issue ${opts.key}.`, { issueKey: opts.key });
  }

  // Match transition by name (case-insensitive)
  const match = transitions!.find(
    (t) => t.name?.toLowerCase() === opts.transition.toLowerCase()
  );

  if (!match) {
    const available = transitions!.map((t) => t.name).join(", ");
    errorResponse("INVALID_TRANSITION", `Transition "${opts.transition}" not found. Available: ${available}`, {
      issueKey: opts.key,
      available,
    });
  }

  // Execute transition
  const transitionPayload: Record<string, unknown> = {
    transition: { id: match!.id },
  };

  if (opts.comment) {
    transitionPayload.update = {
      comment: [
        {
          add: {
            body: {
              type: "doc",
              version: 1,
              content: [{ type: "paragraph", content: [{ type: "text", text: opts.comment }] }],
            },
          },
        },
      ],
    };
  }

  await jira.issues.doTransition({
    issueIdOrKey: opts.key,
    ...transitionPayload,
  });

  const result: JiraTransitionResult = {
    issueKey: opts.key,
    newStatus: match!.name ?? opts.transition,
  };

  successResponse(result);
}

// Issue Comment
export interface IssueCommentOpts {
  key: string;
  body: string;
}

export async function issueComment(opts: IssueCommentOpts): Promise<void> {
  const jira = getJiraClient();

  // Create ADF body for the comment
  const adfBody = {
    type: "doc",
    version: 1,
    content: [{ type: "paragraph", content: [{ type: "text", text: opts.body }] }],
  };

  // Use type assertion to handle jira.js typing quirks
  const result = (await jira.issueComments.addComment({
    issueIdOrKey: opts.key,
    ...({ body: adfBody } as Record<string, unknown>),
  } as Parameters<typeof jira.issueComments.addComment>[0])) as unknown as Record<string, unknown>;

  const comment: JiraComment = {
    id: String(result?.id ?? ""),
    issueKey: opts.key,
    body: opts.body,
    created: String(result?.created ?? new Date().toISOString()),
  };

  successResponse(comment);
}

// Issue Search
export interface IssueSearchOpts {
  jql: string;
  maxResults: string;
}

export async function issueSearch(opts: IssueSearchOpts): Promise<void> {
  const jira = getJiraClient();

  const results = await jira.issueSearch.searchForIssuesUsingJql({
    jql: opts.jql,
    maxResults: parseInt(opts.maxResults, 10),
    fields: ["summary", "status", "assignee", "reporter", "priority", "issuetype", "created", "updated"],
  });

  const issues: JiraIssueSummary[] = (results.issues ?? []).map((issue) => ({
    key: issue.key ?? "",
    id: issue.id ?? "",
    summary: issue.fields.summary,
    status: issue.fields.status?.name ?? "Unknown",
    assignee: issue.fields.assignee
      ? { name: issue.fields.assignee.displayName ?? "Unknown", email: issue.fields.assignee.emailAddress ?? "" }
      : null,
    reporter: issue.fields.reporter ? { name: issue.fields.reporter.displayName ?? "Unknown" } : null,
    priority: issue.fields.priority?.name ?? "None",
    issueType: issue.fields.issuetype?.name ?? "Unknown",
    created: issue.fields.created ?? "",
    updated: issue.fields.updated ?? "",
  }));

  successResponse({ total: results.total ?? 0, issues });
}

// Issue Assign
export interface IssueAssignOpts {
  key: string;
  assignee: string;
}

export async function issueAssign(opts: IssueAssignOpts): Promise<void> {
  const jira = getJiraClient();

  const accountId = opts.assignee === "unassigned" ? null : opts.assignee;

  await jira.issues.assignIssue({
    issueIdOrKey: opts.key,
    accountId: accountId as string,
  });

  successResponse({
    issueKey: opts.key,
    assignee: accountId ?? "unassigned",
  });
}
