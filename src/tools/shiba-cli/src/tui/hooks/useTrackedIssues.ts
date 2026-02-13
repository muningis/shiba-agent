import { useState, useEffect, useCallback } from "react";
import { listIssues, loadIssue } from "../../issues/index.js";
import type { TrackedIssue } from "../../issues/index.js";

export interface TrackedIssueSummary {
  key: string;
  summary: string;
  status: string;
  progressStatus: string;
  percentComplete: number;
  noteCount: number;
  mrCount: number;
  updatedAt: string;
}

interface UseTrackedIssuesResult {
  issues: TrackedIssueSummary[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  getFullIssue: (key: string) => TrackedIssue | null;
}

function toSummary(issue: TrackedIssue): TrackedIssueSummary {
  return {
    key: issue.issueKey,
    summary: issue.jira.summary || "(no summary)",
    status: issue.jira.status || "unknown",
    progressStatus: issue.progress.status,
    percentComplete: issue.progress.percentComplete,
    noteCount: issue.notes.length,
    mrCount: issue.mergeRequests.length,
    updatedAt: issue.updatedAt,
  };
}

export function useTrackedIssues(): UseTrackedIssuesResult {
  const [issues, setIssues] = useState<TrackedIssueSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      const keys = listIssues();
      const summaries: TrackedIssueSummary[] = [];
      for (const key of keys) {
        const issue = loadIssue(key);
        if (issue) {
          summaries.push(toSummary(issue));
        }
      }
      summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setIssues(summaries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tracked issues");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const getFullIssue = useCallback((key: string): TrackedIssue | null => {
    return loadIssue(key);
  }, []);

  return { issues, loading, error, refresh: load, getFullIssue };
}
