import { useState, useEffect, useCallback } from "react";
import { execCli } from "@shiba-agent/shared";
import type { GitLabIssueFull } from "../types.js";

interface UseFullGitLabIssueResult {
  issue: GitLabIssueFull | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useFullGitLabIssue(key: string | null): UseFullGitLabIssueResult {
  const [issue, setIssue] = useState<GitLabIssueFull | null>(null);
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
      const result = execCli("glab", [
        "issue", "view", number,
        "-F", "json",
      ]);

      if (result.exitCode !== 0) {
        throw new Error(result.stderr || "Failed to fetch GitLab issue");
      }

      const data = JSON.parse(result.stdout) as Record<string, unknown>;

      const assignees = Array.isArray(data.assignees)
        ? data.assignees.map((a: Record<string, unknown>) => (a.username as string) || (a.name as string) || "")
        : [];

      const labels = Array.isArray(data.labels)
        ? data.labels.map((l: unknown) => typeof l === "string" ? l : (l as Record<string, unknown>).name as string || "")
        : [];

      const authorObj = data.author as Record<string, unknown> | undefined;

      const full: GitLabIssueFull = {
        key: `#${data.iid}`,
        id: String(data.iid),
        summary: data.title as string,
        status: data.state as string,
        priority: "None",
        issueType: "Issue",
        updated: data.updated_at as string,
        source: "gitlab",
        url: data.web_url as string,
        description: (data.description as string) || null,
        labels,
        assignees,
        author: (authorObj?.username as string) || (authorObj?.name as string) || "unknown",
      };

      setIssue(full);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch GitLab issue");
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    fetchIssue();
  }, [fetchIssue]);

  return { issue, loading, error, refresh: fetchIssue };
}
