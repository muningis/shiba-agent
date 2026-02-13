import { useState, useEffect, useCallback } from "react";
import { execCli, isCliAvailable } from "@shiba-agent/shared";
import type { IssueBasic } from "../types.js";

interface UseGitHubIssuesResult {
  issues: IssueBasic[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useGitHubIssues(): UseGitHubIssuesResult {
  const [issues, setIssues] = useState<IssueBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!isCliAvailable("gh")) {
        throw new Error("GitHub CLI (gh) not installed. Run: brew install gh");
      }

      const result = execCli("gh", [
        "issue", "list",
        "--json", "number,title,state,author,assignees,labels,createdAt,updatedAt,url",
        "--limit", "50",
        "--state", "open",
      ]);

      if (result.exitCode !== 0) {
        throw new Error(result.stderr || "Failed to fetch GitHub issues");
      }

      const ghIssues = JSON.parse(result.stdout);
      const fetchedIssues: IssueBasic[] = (Array.isArray(ghIssues) ? ghIssues : []).map((issue: Record<string, unknown>) => ({
        key: `#${issue.number}`,
        id: String(issue.number),
        summary: issue.title as string,
        status: issue.state as string,
        priority: "None",
        issueType: "Issue",
        updated: issue.updatedAt as string,
        source: "github" as const,
        url: issue.url as string,
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
