import { createJiraClient, getJiraConfig, parseAdfToText } from "@shiba-agent/shared";
import type { JiraIssueFull } from "../tui/types.js";

export async function fetchFullIssue(key: string): Promise<JiraIssueFull> {
  const config = getJiraConfig();
  const client = createJiraClient(config);

  const issue = await client.getIssue(key);
  const fields = issue.fields;

  return {
    key: issue.key,
    id: issue.id,
    summary: fields.summary,
    description: fields.description ? parseAdfToText(fields.description) : null,
    status: fields.status.name,
    priority: fields.priority?.name ?? "None",
    issueType: fields.issuetype.name,
    updated: fields.updated,
    comments: fields.comment?.comments.map((c) => ({
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
