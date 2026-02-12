import { useState, useEffect, useCallback } from "react";
import { fetchFullIssue } from "../../tasks/fetch.js";
import { cacheTask, loadCachedTask, isCacheStale } from "../../tasks/cache.js";
import type { JiraIssueFull } from "../types.js";

interface UseFullIssueResult {
  issue: JiraIssueFull | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
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

      // Check cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cached = loadCachedTask(key);
        if (cached && !isCacheStale(cached)) {
          setIssue(cached);
          setLoading(false);
          setError(null);
          return;
        }
      }

      setLoading(true);
      setError(null);

      try {
        const fullIssue = await fetchFullIssue(key);
        cacheTask(fullIssue);
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
