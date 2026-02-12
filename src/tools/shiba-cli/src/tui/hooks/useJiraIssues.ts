import { useState, useEffect, useCallback } from "react";
import { getJiraClient } from "@shiba-agent/shared";
import type { JiraIssue } from "../types.js";

interface UseJiraIssuesResult {
  issues: JiraIssue[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useJiraIssues(): UseJiraIssuesResult {
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const jira = getJiraClient();

      // Search for issues assigned to current user
      const results = await jira.issueSearch.searchForIssuesUsingJql({
        jql: "assignee = currentUser() AND resolution = Unresolved ORDER BY updated DESC",
        maxResults: 50,
        fields: ["summary", "status", "priority", "issuetype", "updated"],
      });

      const fetchedIssues: JiraIssue[] = (results.issues ?? []).map((issue) => ({
        key: issue.key ?? "",
        id: issue.id ?? "",
        summary: (issue.fields as Record<string, unknown>).summary as string,
        status: ((issue.fields as Record<string, unknown>).status as Record<string, unknown>)?.name as string ?? "Unknown",
        priority: ((issue.fields as Record<string, unknown>).priority as Record<string, unknown>)?.name as string ?? "None",
        issueType: ((issue.fields as Record<string, unknown>).issuetype as Record<string, unknown>)?.name as string ?? "Unknown",
        updated: (issue.fields as Record<string, unknown>).updated as string ?? "",
      }));

      setIssues(fetchedIssues);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch issues");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  return { issues, loading, error, refresh: fetchIssues };
}
