import { execCli, requireCli } from "@shiba-agent/shared";
import type { JiraIssueFull } from "../tui/types.js";
import { parseJiraCliRawOutput } from "../utils/jira-parser.js";

const JIRA_CLI = "jira";
const JIRA_INSTALL_HINT = "brew install ankitpokhrel/jira-cli/jira-cli";

export async function fetchFullIssue(key: string): Promise<JiraIssueFull> {
  requireCli(JIRA_CLI, JIRA_INSTALL_HINT);

  const result = execCli(JIRA_CLI, ["issue", "view", key, "--comments", "10", "--raw"]);

  if (result.exitCode !== 0) {
    throw new Error(result.stderr || "Failed to fetch issue");
  }

  const parsed = parseJiraCliRawOutput(key, result.stdout);

  return {
    key: parsed.key,
    id: parsed.id,
    summary: parsed.summary,
    description: parsed.description,
    status: parsed.status,
    priority: parsed.priority,
    issueType: parsed.issueType,
    updated: parsed.updated,
    comments: parsed.comments,
    linkedIssues: parsed.linkedIssues,
  };
}
