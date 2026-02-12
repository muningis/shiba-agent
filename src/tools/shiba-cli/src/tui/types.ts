import type { GlobalConfig } from "../config/global.js";

export type { GlobalConfig };

export interface JiraIssue {
  key: string;
  id: string;
  summary: string;
  status: string;
  priority: string;
  issueType: string;
  updated: string;
}

export type View = "list" | "detail";
