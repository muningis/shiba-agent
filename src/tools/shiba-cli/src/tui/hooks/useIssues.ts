import { useState, useEffect, useCallback } from "react";
import { loadGlobalConfig, isCliAvailable } from "@shiba-agent/shared";
import type { IssueBasic, IssueTracker } from "../types.js";
import { useJiraIssues } from "./useJiraIssues.js";
import { useGitHubIssues } from "./useGitHubIssues.js";
import { useGitLabIssues } from "./useGitLabIssues.js";

interface UseIssuesResult {
  issues: IssueBasic[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  source: IssueTracker;
}

/**
 * Detect which issue tracker to use based on config and availability.
 * Priority: configured preference > Jira (if configured) > GitHub (if available) > GitLab (if available)
 */
function detectIssueTracker(): IssueTracker {
  const config = loadGlobalConfig();
  const preference = config.preferences?.issueTracker;

  // If explicitly configured, use that
  if (preference) {
    return preference;
  }

  // Check if Jira is configured
  const hasJira = !!(
    (process.env.JIRA_HOST || config.jira?.host) &&
    (process.env.JIRA_EMAIL || config.jira?.email) &&
    (process.env.JIRA_API_TOKEN || config.jira?.token)
  );

  if (hasJira) {
    return "jira";
  }

  // Fallback to available CLIs
  if (isCliAvailable("gh")) {
    return "github";
  }

  if (isCliAvailable("glab")) {
    return "gitlab";
  }

  // Default to jira (will show config error)
  return "jira";
}

/**
 * Unified hook that uses the appropriate issue tracker based on configuration.
 */
export function useIssues(): UseIssuesResult {
  const [source] = useState<IssueTracker>(() => detectIssueTracker());

  const jiraResult = useJiraIssues();
  const githubResult = useGitHubIssues();
  const gitlabResult = useGitLabIssues();

  // Select the right result based on source
  const activeResult = source === "jira" ? jiraResult :
                       source === "github" ? githubResult :
                       gitlabResult;

  // Convert issues to IssueBasic format based on source
  let issues: IssueBasic[];
  if (source === "jira") {
    issues = jiraResult.issues.map(issue => ({
      key: issue.key,
      id: issue.id,
      summary: issue.summary,
      status: issue.status,
      priority: issue.priority,
      issueType: issue.issueType,
      updated: issue.updated,
      source: "jira" as const,
    }));
  } else if (source === "github") {
    issues = githubResult.issues;
  } else {
    issues = gitlabResult.issues;
  }

  return {
    issues,
    loading: activeResult.loading,
    error: activeResult.error,
    refresh: activeResult.refresh,
    source,
  };
}
