import type { GlobalConfig } from "@shiba-agent/shared";

export type { GlobalConfig };

// Basic issue for list view (fast fetch)
export interface JiraIssueBasic {
  key: string;
  id: string;
  summary: string;
  status: string;
  priority: string;
  issueType: string;
  updated: string;
}

// Full issue for detail view (fetched on demand)
export interface JiraIssueFull extends JiraIssueBasic {
  description: string | null;
  comments: JiraComment[];
  linkedIssues: JiraLinkedIssue[];
}

export interface JiraComment {
  author: string;
  body: string;
  created: string;
}

export interface JiraLinkedIssue {
  type: string; // "blocks", "is blocked by", "relates to", etc.
  key: string;
  summary: string;
  status: string;
}

// Cached task data with fetch timestamp
export interface CachedTask extends JiraIssueFull {
  fetchedAt: string;
}

export type View = "list" | "detail";
