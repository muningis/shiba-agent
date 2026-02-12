import type { GlobalConfig } from "@shiba-agent/shared";

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
