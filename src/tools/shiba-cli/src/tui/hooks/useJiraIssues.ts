import { useState, useEffect, useCallback } from "react";
import { createJiraClient, getJiraConfig, loadGlobalConfig } from "@shiba-agent/shared";
import type { JiraIssueBasic } from "../types.js";

interface UseJiraIssuesResult {
  issues: JiraIssueBasic[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useJiraIssues({ enabled = true }: { enabled?: boolean } = {}): UseJiraIssuesResult {
  const [issues, setIssues] = useState<JiraIssueBasic[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const fetchIssues = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const config = getJiraConfig();
      const client = createJiraClient(config);

      // Get default JQL from preferences or use sensible default
      const globalConfig = loadGlobalConfig();
      const defaultJql = globalConfig.preferences?.defaultJql ||
        "assignee = currentUser() AND status != Done ORDER BY updated DESC";

      const result = await client.searchJql(defaultJql, 50);

      const fetchedIssues: JiraIssueBasic[] = result.issues.map((issue) => ({
        key: issue.key,
        id: issue.id,
        summary: issue.fields.summary,
        status: issue.fields.status.name,
        priority: issue.fields.priority?.name ?? "None",
        issueType: issue.fields.issuetype.name,
        updated: issue.fields.updated,
      }));

      setIssues(fetchedIssues);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch issues");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) fetchIssues();
  }, [fetchIssues, enabled]);

  return { issues, loading, error, refresh: fetchIssues };
}
