import { useState, useEffect, useCallback } from "react";
import { execCli } from "@shiba-agent/shared";
import type { GitHubIssueFull } from "../types.js";

interface UseFullGitHubIssueResult {
  issue: GitHubIssueFull | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useFullGitHubIssue(key: string | null): UseFullGitHubIssueResult {
  const [issue, setIssue] = useState<GitHubIssueFull | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIssue = useCallback(() => {
    if (!key) {
      setIssue(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // key is like "#123", extract the number
      const number = key.replace("#", "");
      const result = execCli("gh", [
        "issue", "view", number,
        "--json", "number,title,state,body,author,assignees,labels,createdAt,updatedAt,url,comments",
      ]);

      if (result.exitCode !== 0) {
        throw new Error(result.stderr || "Failed to fetch GitHub issue");
      }

      const data = JSON.parse(result.stdout) as Record<string, unknown>;

      const assignees = Array.isArray(data.assignees)
        ? data.assignees.map((a: Record<string, unknown>) => (a.login as string) || (a.name as string) || "")
        : [];

      const labels = Array.isArray(data.labels)
        ? data.labels.map((l: Record<string, unknown>) => (l.name as string) || "")
        : [];

      const comments = Array.isArray(data.comments)
        ? data.comments.map((c: Record<string, unknown>) => ({
            author: ((c.author as Record<string, unknown>)?.login as string) || "unknown",
            body: (c.body as string) || "",
            created: (c.createdAt as string) || "",
          }))
        : [];

      const authorObj = data.author as Record<string, unknown> | undefined;

      const full: GitHubIssueFull = {
        key: `#${data.number}`,
        id: String(data.number),
        summary: data.title as string,
        status: data.state as string,
        priority: "None",
        issueType: "Issue",
        updated: data.updatedAt as string,
        source: "github",
        url: data.url as string,
        description: (data.body as string) || null,
        labels,
        assignees,
        author: (authorObj?.login as string) || "unknown",
        comments,
      };

      setIssue(full);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch GitHub issue");
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    fetchIssue();
  }, [fetchIssue]);

  return { issue, loading, error, refresh: fetchIssue };
}
