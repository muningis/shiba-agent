import { getJiraClient, successResponse } from "@shiba-agent/shared";

interface IssueAssignOpts {
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
