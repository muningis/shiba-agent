import { useState, useEffect, useCallback } from "react";
import { execCli, requireCli } from "@shiba-agent/shared";
import type { JiraIssueBasic } from "../types.js";

const JIRA_CLI = "jira";
const JIRA_INSTALL_HINT = "brew install ankitpokhrel/jira-cli/jira-cli";

interface UseJiraIssuesResult {
  issues: JiraIssueBasic[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useJiraIssues(): UseJiraIssuesResult {
  const [issues, setIssues] = useState<JiraIssueBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      requireCli(JIRA_CLI, JIRA_INSTALL_HINT);

      // Use jira-cli to list issues assigned to current user
      const result = execCli(JIRA_CLI, [
        "issue",
        "list",
        "-a$(jira me)",
        "-sopen",
        "--plain",
        "--columns",
        "KEY,SUMMARY,STATUS,PRIORITY,TYPE,UPDATED",
      ]);

      if (result.exitCode !== 0) {
        throw new Error(result.stderr || "Failed to fetch issues");
      }

      // Parse plain text output
      const lines = result.stdout.trim().split("\n").filter(Boolean);
      const fetchedIssues: JiraIssueBasic[] = lines.slice(1).map((line) => {
        const parts = line.split(/\t|\s{2,}/); // Split by tab or 2+ spaces
        return {
          key: parts[0] ?? "",
          id: parts[0] ?? "",
          summary: parts[1] ?? "",
          status: parts[2] ?? "Unknown",
          priority: parts[3] ?? "None",
          issueType: parts[4] ?? "Unknown",
          updated: parts[5] ?? "",
        };
      });

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
