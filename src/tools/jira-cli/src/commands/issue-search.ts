import { getJiraClient, successResponse } from "@shiba-agent/shared";
import type { JiraIssueSummary } from "@shiba-agent/shared";

interface IssueSearchOpts {
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
