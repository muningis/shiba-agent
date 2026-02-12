import { execCli, requireCli } from "@shiba-agent/shared";
import type {
  JiraIssueFull,
  JiraComment,
  JiraLinkedIssue,
} from "../tui/types.js";

const JIRA_CLI = "jira";
const JIRA_INSTALL_HINT = "brew install ankitpokhrel/jira-cli/jira-cli";

export async function fetchFullIssue(key: string): Promise<JiraIssueFull> {
  requireCli(JIRA_CLI, JIRA_INSTALL_HINT);

  const result = execCli(JIRA_CLI, ["issue", "view", key, "--comments", "10", "--raw"]);

  if (result.exitCode !== 0) {
    throw new Error(result.stderr || "Failed to fetch issue");
  }

  return parseJiraCliOutput(key, result.stdout);
}

// Parse jira-cli raw output into our JiraIssueFull format
function parseJiraCliOutput(key: string, raw: string): JiraIssueFull {
  const lines = raw.split("\n");

  let summary = "";
  let status = "";
  let issueType = "";
  let priority = "";
  let updated = "";
  const comments: JiraComment[] = [];
  const linkedIssues: JiraLinkedIssue[] = [];

  let inDescription = false;
  let inComments = false;
  const descLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("Summary:")) {
      summary = line.slice(8).trim();
      inDescription = false;
      inComments = false;
    } else if (line.startsWith("Status:")) {
      status = line.slice(7).trim();
      inDescription = false;
      inComments = false;
    } else if (line.startsWith("Type:")) {
      issueType = line.slice(5).trim();
      inDescription = false;
      inComments = false;
    } else if (line.startsWith("Priority:")) {
      priority = line.slice(9).trim();
      inDescription = false;
      inComments = false;
    } else if (line.startsWith("Updated:")) {
      updated = line.slice(8).trim();
      inDescription = false;
      inComments = false;
    } else if (line.startsWith("Description:")) {
      inDescription = true;
      inComments = false;
      const desc = line.slice(12).trim();
      if (desc) descLines.push(desc);
    } else if (line.startsWith("Comments:") || line.startsWith("# Comments")) {
      inDescription = false;
      inComments = true;
    } else if (inDescription && line.trim()) {
      descLines.push(line);
    } else if (inComments) {
      const commentMatch = line.match(/^\s*[-*]?\s*(.+?)\s*\((.+?)\):\s*(.+)$/);
      if (commentMatch) {
        comments.push({
          author: commentMatch[1].trim(),
          created: commentMatch[2].trim(),
          body: commentMatch[3].trim(),
        });
      }
    }
  }

  const description = descLines.join("\n").trim() || null;

  return {
    key,
    id: key,
    summary,
    description,
    status,
    priority,
    issueType,
    updated,
    comments,
    linkedIssues,
  };
}
