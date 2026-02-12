import { getJiraClient, successResponse } from "@agent-tools/shared";
import type { JiraIssueSummary } from "@agent-tools/shared";

interface IssueGetOpts {
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
