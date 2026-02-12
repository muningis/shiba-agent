import { getJiraClient, successResponse } from "@shiba-agent/shared";
import type { JiraComment } from "@shiba-agent/shared";

interface IssueCommentOpts {
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
