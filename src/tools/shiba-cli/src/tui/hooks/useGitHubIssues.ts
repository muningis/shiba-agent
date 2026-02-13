import { useState, useEffect, useCallback } from "react";
import { execCli } from "@shiba-agent/shared";
import type { IssueBasic } from "../types.js";

interface UseGitHubIssuesResult {
  issues: IssueBasic[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useGitHubIssues({ enabled = true }: { enabled?: boolean } = {}): UseGitHubIssuesResult {
  const [issues, setIssues] = useState<IssueBasic[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const fetchIssues = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    // Yield to the event loop so React can render the loading state
    // before the synchronous execCli blocks.
    await new Promise((r) => setTimeout(r, 0));

    try {
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
  }, [enabled]);

  useEffect(() => {
    if (enabled) fetchIssues();
  }, [fetchIssues, enabled]);

  return { issues, loading, error, refresh: fetchIssues };
}
