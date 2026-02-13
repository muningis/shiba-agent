/**
 * Parsed result from jira-cli raw output.
 * Generic shape that both commands/jira.ts and tasks/fetch.ts can use.
 */
export interface JiraCliParsedIssue {
  id: string;
  key: string;
  summary: string;
  status: string;
  issueType: string;
  priority: string;
  assigneeName: string;
  reporterName: string;
  created: string;
  updated: string;
  description: string | null;
  comments: JiraCliParsedComment[];
  linkedIssues: JiraCliParsedLinkedIssue[];
}

export interface JiraCliParsedComment {
  author: string;
  body: string;
  created: string;
}

export interface JiraCliParsedLinkedIssue {
  type: string;
  key: string;
  summary: string;
  status: string;
}

/**
 * Parse jira-cli `--raw` output into a structured object.
 *
 * The jira-cli `issue view KEY --raw` outputs key-value pairs like:
 *   Summary: Fix login bug
 *   Status: In Progress
 *   Description: (multiline block)
 *   Comments: (multiline block)
 *
 * This parser uses a state machine to handle multiline sections.
 */
export function parseJiraCliRawOutput(key: string, raw: string): JiraCliParsedIssue {
  const lines = raw.split("\n");

  let summary = "";
  let status = "Unknown";
  let issueType = "Unknown";
  let priority = "None";
  let assigneeName = "";
  let reporterName = "";
  let created = "";
  let updated = "";
  const comments: JiraCliParsedComment[] = [];
  const linkedIssues: JiraCliParsedLinkedIssue[] = [];

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
    } else if (line.startsWith("Assignee:")) {
      assigneeName = line.slice(9).trim();
      inDescription = false;
      inComments = false;
    } else if (line.startsWith("Reporter:")) {
      reporterName = line.slice(9).trim();
      inDescription = false;
      inComments = false;
    } else if (line.startsWith("Created:")) {
      created = line.slice(8).trim();
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
      // Parse comments — format varies by jira-cli version
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
    id: key,
    key,
    summary,
    status,
    issueType,
    priority,
    assigneeName,
    reporterName,
    created,
    updated,
    description,
    comments,
    linkedIssues,
  };
}
