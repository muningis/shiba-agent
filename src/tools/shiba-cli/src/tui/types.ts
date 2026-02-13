import type { GlobalConfig, IssueTracker } from "@shiba-agent/shared";

export type { GlobalConfig, IssueTracker };

// Generic issue for TUI list view (works with Jira, GitHub, GitLab)
export interface IssueBasic {
  key: string;        // Jira key (PROJ-123), GitHub/GitLab number as string
  id: string;         // Unique ID
  summary: string;    // Title
  status: string;     // Status/state
  priority: string;   // Priority (or "None" for GitHub/GitLab)
  issueType: string;  // Type (or "Issue" for GitHub/GitLab)
  updated: string;    // Last updated timestamp
  source: IssueTracker; // Which tracker this came from
  url?: string;       // Web URL for the issue
}

// Basic issue for list view (fast fetch) - legacy alias
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

// Group of issues from a single tracker
export interface TrackerGroup {
  tracker: IssueTracker;
  label: string;        // "Jira", "GitHub", "GitLab"
  issues: IssueBasic[];
  loading: boolean;
  error: string | null;
}

// Cached task data with fetch timestamp
export interface CachedTask extends JiraIssueFull {
  fetchedAt: string;
}

export type View = "list" | "detail";

// Section navigation
export type Section = "issues" | "data" | "cache" | "config";
export type DataEntity = "tracked-issues" | "ticket-notes";
export type CacheEntity = "openapi" | "figma";

export const SECTIONS: Section[] = ["issues", "data", "cache", "config"];

export function nextSection(current: Section): Section {
  const idx = SECTIONS.indexOf(current);
  return SECTIONS[(idx + 1) % SECTIONS.length];
}

export function prevSection(current: Section): Section {
  const idx = SECTIONS.indexOf(current);
  return SECTIONS[(idx - 1 + SECTIONS.length) % SECTIONS.length];
}
