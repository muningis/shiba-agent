import { useState, useEffect, useCallback } from "react";
import { fetchFullIssue } from "../../tasks/fetch.js";
import { loadIssue, saveIssue, createDefaultIssue, syncJiraData } from "../../issues/index.js";
import type { JiraIssueFull } from "../types.js";
import type { TrackedIssue } from "../../issues/index.js";

interface UseFullIssueResult {
  issue: JiraIssueFull | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

// Cache staleness threshold (5 minutes)
const CACHE_MAX_AGE_MS = 5 * 60 * 1000;

function isCacheStale(tracked: TrackedIssue): boolean {
  const syncedAt = new Date(tracked.jiraSyncedAt).getTime();
  const now = Date.now();
  return now - syncedAt > CACHE_MAX_AGE_MS;
}

// Convert TrackedIssue.jira to JiraIssueFull for TUI display
function toJiraIssueFull(tracked: TrackedIssue): JiraIssueFull {
  return {
    key: tracked.issueKey,
    id: tracked.jira.id,
    summary: tracked.jira.summary,
    status: tracked.jira.status,
    priority: tracked.jira.priority,
    issueType: tracked.jira.issueType,
    updated: tracked.jira.updated,
    description: tracked.jira.description,
    comments: tracked.jira.comments,
    linkedIssues: tracked.jira.linkedIssues,
  };
}

export function useFullIssue(key: string | null): UseFullIssueResult {
  const [issue, setIssue] = useState<JiraIssueFull | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIssue = useCallback(
    async (forceRefresh = false) => {
      if (!key) {
        setIssue(null);
        setLoading(false);
        setError(null);
        return;
      }

      // Check local issue store first (unless forcing refresh)
      if (!forceRefresh) {
        const tracked = loadIssue(key);
        if (tracked && !isCacheStale(tracked)) {
          setIssue(toJiraIssueFull(tracked));
          setLoading(false);
          setError(null);
          return;
        }
      }

      setLoading(true);
      setError(null);

      try {
        const fullIssue = await fetchFullIssue(key);

        // Save to new issues store
        const tracked = loadIssue(key) ?? createDefaultIssue(key);
        syncJiraData(tracked, {
          id: fullIssue.id,
          summary: fullIssue.summary,
          status: fullIssue.status,
          issueType: fullIssue.issueType,
          priority: fullIssue.priority,
          assignee: null,
          reporter: null,
          created: "",
          updated: fullIssue.updated,
          description: fullIssue.description,
          comments: fullIssue.comments,
          linkedIssues: fullIssue.linkedIssues,
        });
        saveIssue(tracked);

        setIssue(fullIssue);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch issue";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [key]
  );

  useEffect(() => {
    fetchIssue();
  }, [fetchIssue]);

  const refresh = useCallback(() => {
    fetchIssue(true);
  }, [fetchIssue]);

  return { issue, loading, error, refresh };
}
