import { useState, useEffect, useCallback } from "react";
import { execCli } from "@shiba-agent/shared";
import type { IssueBasic } from "../types.js";

interface UseGitLabIssuesResult {
  issues: IssueBasic[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useGitLabIssues({ enabled = true }: { enabled?: boolean } = {}): UseGitLabIssuesResult {
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
      const result = execCli("glab", [
        "issue", "list",
        "-F", "json",
        "-P", "50",
        "--state", "opened",
      ]);

      if (result.exitCode !== 0) {
        throw new Error(result.stderr || "Failed to fetch GitLab issues");
      }

      const glIssues = JSON.parse(result.stdout);
      const fetchedIssues: IssueBasic[] = (Array.isArray(glIssues) ? glIssues : []).map((issue: Record<string, unknown>) => ({
        key: `#${issue.iid}`,
        id: String(issue.iid),
        summary: issue.title as string,
        status: issue.state as string,
        priority: "None",
        issueType: "Issue",
        updated: issue.updated_at as string,
        source: "gitlab" as const,
        url: issue.web_url as string,
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
