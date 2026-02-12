import { getJiraClient } from "@shiba-agent/shared";
import type {
  JiraIssueFull,
  JiraComment,
  JiraLinkedIssue,
} from "../tui/types.js";

export async function fetchFullIssue(key: string): Promise<JiraIssueFull> {
  const client = getJiraClient();

  const issue = await client.issues.getIssue({
    issueIdOrKey: key,
    fields: [
      "summary",
      "description",
      "status",
      "priority",
      "issuetype",
      "updated",
      "comment",
      "issuelinks",
    ],
  });

  const fields = issue.fields as Record<string, unknown>;

  // Parse comments
  const commentData = fields.comment as {
    comments?: Array<{
      author?: { displayName?: string };
      body?: unknown;
      created?: string;
    }>;
  } | undefined;

  const comments: JiraComment[] = (commentData?.comments ?? []).map((c) => ({
    author: c.author?.displayName ?? "Unknown",
    body: parseDescription(c.body) ?? "",
    created: c.created ?? "",
  }));

  // Parse linked issues
  const issueLinks = fields.issuelinks as Array<{
    type?: { name?: string; inward?: string; outward?: string };
    inwardIssue?: {
      key?: string;
      fields?: { summary?: string; status?: { name?: string } };
    };
    outwardIssue?: {
      key?: string;
      fields?: { summary?: string; status?: { name?: string } };
    };
  }> | undefined;

  const linkedIssues: JiraLinkedIssue[] = (issueLinks ?? []).map((link) => {
    const isInward = !!link.inwardIssue;
    const linkedIssue = isInward ? link.inwardIssue : link.outwardIssue;
    const linkType = isInward
      ? link.type?.inward ?? link.type?.name ?? "related to"
      : link.type?.outward ?? link.type?.name ?? "related to";

    return {
      type: linkType,
      key: linkedIssue?.key ?? "",
      summary: linkedIssue?.fields?.summary ?? "",
      status: linkedIssue?.fields?.status?.name ?? "",
    };
  });

  const status = fields.status as { name?: string } | undefined;
  const priority = fields.priority as { name?: string } | undefined;
  const issuetype = fields.issuetype as { name?: string } | undefined;

  return {
    key: issue.key ?? key,
    id: issue.id ?? "",
    summary: (fields.summary as string) ?? "",
    description: parseDescription(fields.description),
    status: status?.name ?? "",
    priority: priority?.name ?? "",
    issueType: issuetype?.name ?? "",
    updated: (fields.updated as string) ?? "",
    comments,
    linkedIssues,
  };
}

// Parse Jira description (can be ADF or plain text)
function parseDescription(desc: unknown): string | null {
  if (!desc) return null;

  // Plain text
  if (typeof desc === "string") {
    return desc;
  }

  // Atlassian Document Format (ADF)
  if (typeof desc === "object" && desc !== null && "content" in desc) {
    return extractTextFromAdf(desc as AdfNode);
  }

  return null;
}

interface AdfNode {
  type?: string;
  text?: string;
  content?: AdfNode[];
}

function extractTextFromAdf(node: AdfNode): string {
  if (node.text) {
    return node.text;
  }

  if (node.content) {
    return node.content
      .map((child) => extractTextFromAdf(child))
      .join(node.type === "paragraph" ? "\n" : "");
  }

  return "";
}
