import { getJiraClient, successResponse, errorResponse } from "@shiba-agent/shared";
import type { JiraIssueCreated } from "@shiba-agent/shared";

interface IssueCreateOpts {
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
