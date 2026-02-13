// Jira REST API v3 response types

export interface JiraUser {
  accountId: string;
  emailAddress?: string;
  displayName: string;
  active: boolean;
  avatarUrls?: Record<string, string>;
}

export interface JiraStatus {
  id: string;
  name: string;
  statusCategory: {
    id: number;
    key: string;
    name: string;
  };
}

export interface JiraIssueType {
  id: string;
  name: string;
  subtask: boolean;
  iconUrl?: string;
}

export interface JiraPriority {
  id: string;
  name: string;
  iconUrl?: string;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
}

export interface JiraComment {
  id: string;
  author: JiraUser;
  body: AdfDocument;
  created: string;
  updated: string;
}

export interface JiraIssueLink {
  id: string;
  type: {
    id: string;
    name: string;
    inward: string;
    outward: string;
  };
  inwardIssue?: {
    key: string;
    fields: {
      summary: string;
      status: JiraStatus;
    };
  };
  outwardIssue?: {
    key: string;
    fields: {
      summary: string;
      status: JiraStatus;
    };
  };
}

export interface JiraIssueFields {
  summary: string;
  description?: AdfDocument;
  status: JiraStatus;
  issuetype: JiraIssueType;
  priority?: JiraPriority;
  project: JiraProject;
  assignee?: JiraUser;
  reporter?: JiraUser;
  created: string;
  updated: string;
  labels?: string[];
  comment?: {
    comments: JiraComment[];
    total: number;
  };
  issuelinks?: JiraIssueLink[];
  parent?: {
    key: string;
    fields: {
      summary: string;
      status: JiraStatus;
      issuetype: JiraIssueType;
    };
  };
}

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: JiraIssueFields;
}

export interface JiraTransition {
  id: string;
  name: string;
  to: JiraStatus;
}

export interface JiraSearchResult {
  expand: string;
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
}

// ADF (Atlassian Document Format) types
export interface AdfDocument {
  type: "doc";
  version: 1;
  content: AdfNode[];
}

export interface AdfNode {
  type: string;
  content?: AdfNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: AdfMark[];
}

export interface AdfMark {
  type: string;
  attrs?: Record<string, unknown>;
}

// Request types
export interface CreateIssueData {
  fields: {
    project: { key: string };
    summary: string;
    issuetype: { name: string };
    description?: AdfDocument;
    priority?: { name: string };
    labels?: string[];
    parent?: { key: string };
    assignee?: { accountId: string };
  };
}

export interface CreateIssueResponse {
  id: string;
  key: string;
  self: string;
}
