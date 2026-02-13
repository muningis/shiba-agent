import { useState, useEffect, useCallback } from "react";
import { existsSync } from "fs";
import { spawnSync } from "child_process";
import { loadSessions, saveSessions, removeSession as removeSessionFromStore } from "../../sessions/index.js";
import type { Session } from "../types.js";

export interface SessionGitInfo {
  recentCommits: string[];
  workingTreeStatus: string[];
}

interface UseSessionsResult {
  sessions: Session[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  getSession: (id: string) => Session | undefined;
  removeSession: (id: string) => void;
  getSessionGitInfo: (session: Session) => SessionGitInfo;
}

export function useSessions(): UseSessionsResult {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      const loaded = loadSessions();

      // Check worktree existence for running sessions
      let changed = false;
      for (const session of loaded) {
        if (session.status === "running" && !existsSync(session.worktreePath)) {
          session.status = "completed";
          changed = true;
        }
      }
      if (changed) {
        saveSessions(loaded);
      }

      setSessions(loaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const getSession = useCallback(
    (id: string) => sessions.find((s) => s.id === id),
    [sessions],
  );

  const handleRemoveSession = useCallback(
    (id: string) => {
      removeSessionFromStore(id);
      load();
    },
    [load],
  );

  const getSessionGitInfo = useCallback((session: Session): SessionGitInfo => {
    if (!existsSync(session.worktreePath)) {
      return { recentCommits: [], workingTreeStatus: [] };
    }

    const logResult = spawnSync("git", ["-C", session.worktreePath, "log", "--oneline", "-10"], {
      encoding: "utf-8",
      stdio: "pipe",
    });

    const statusResult = spawnSync("git", ["-C", session.worktreePath, "status", "--porcelain"], {
      encoding: "utf-8",
      stdio: "pipe",
    });

    return {
      recentCommits: logResult.status === 0
        ? logResult.stdout.trim().split("\n").filter(Boolean)
        : [],
      workingTreeStatus: statusResult.status === 0
        ? statusResult.stdout.trim().split("\n").filter(Boolean)
        : [],
    };
  }, []);

  return {
    sessions,
    loading,
    error,
    refresh: load,
    getSession,
    removeSession: handleRemoveSession,
    getSessionGitInfo,
  };
}
