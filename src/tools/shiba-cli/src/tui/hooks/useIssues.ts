import { useMemo } from "react";
import { loadGlobalConfig, isCliAvailable } from "@shiba-agent/shared";
import type { IssueBasic, IssueTracker, TrackerGroup } from "../types.js";
import { useJiraIssues } from "./useJiraIssues.js";
import { useGitHubIssues } from "./useGitHubIssues.js";
import { useGitLabIssues } from "./useGitLabIssues.js";

interface UseIssuesResult {
  groups: TrackerGroup[];
  refresh: () => void;
}

const TRACKER_LABELS: Record<IssueTracker, string> = {
  jira: "Jira",
  github: "GitHub",
  gitlab: "GitLab",
};

/**
 * Detect all available issue trackers based on config and CLI availability.
 */
function detectAvailableTrackers(): IssueTracker[] {
  const config = loadGlobalConfig();
  const trackers: IssueTracker[] = [];

  const hasJira = !!(
    (process.env.JIRA_HOST || config.jira?.host) &&
    (process.env.JIRA_EMAIL || config.jira?.email) &&
    (process.env.JIRA_API_TOKEN || config.jira?.token)
  );

  if (hasJira) {
    trackers.push("jira");
  }

  if (isCliAvailable("gh")) {
    trackers.push("github");
  }

  if (isCliAvailable("glab")) {
    trackers.push("gitlab");
  }

  return trackers;
}

/**
 * Unified hook that fetches issues from ALL available trackers and groups them.
 */
export function useIssues(): UseIssuesResult {
  const availableTrackers = useMemo(() => detectAvailableTrackers(), []);

  const jiraResult = useJiraIssues({ enabled: availableTrackers.includes("jira") });
  const githubResult = useGitHubIssues({ enabled: availableTrackers.includes("github") });
  const gitlabResult = useGitLabIssues({ enabled: availableTrackers.includes("gitlab") });

  const groups = useMemo(() => {
    const result: TrackerGroup[] = [];

    for (const tracker of availableTrackers) {
      if (tracker === "jira") {
        const issues: IssueBasic[] = jiraResult.issues.map((issue) => ({
          key: issue.key,
          id: issue.id,
          summary: issue.summary,
          status: issue.status,
          priority: issue.priority,
          issueType: issue.issueType,
          updated: issue.updated,
          source: "jira" as const,
        }));
        result.push({
          tracker,
          label: TRACKER_LABELS[tracker],
          issues,
          loading: jiraResult.loading,
          error: jiraResult.error,
        });
      } else if (tracker === "github") {
        result.push({
          tracker,
          label: TRACKER_LABELS[tracker],
          issues: githubResult.issues,
          loading: githubResult.loading,
          error: githubResult.error,
        });
      } else if (tracker === "gitlab") {
        result.push({
          tracker,
          label: TRACKER_LABELS[tracker],
          issues: gitlabResult.issues,
          loading: gitlabResult.loading,
          error: gitlabResult.error,
        });
      }
    }

    return result;
  }, [
    availableTrackers,
    jiraResult.issues, jiraResult.loading, jiraResult.error,
    githubResult.issues, githubResult.loading, githubResult.error,
    gitlabResult.issues, gitlabResult.loading, gitlabResult.error,
  ]);

  const refresh = () => {
    for (const tracker of availableTrackers) {
      if (tracker === "jira") jiraResult.refresh();
      else if (tracker === "github") githubResult.refresh();
      else if (tracker === "gitlab") gitlabResult.refresh();
    }
  };

  return { groups, refresh };
}
