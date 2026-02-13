import React from "react";
import { Box, Text } from "ink";
import type { Session } from "../types.js";
import type { SessionGitInfo } from "../hooks/useSessions.js";

interface SessionDetailProps {
  session: Session;
  gitInfo: SessionGitInfo;
}

const STATUS_COLORS: Record<Session["status"], string> = {
  running: "blue",
  completed: "green",
  error: "red",
};

const SOURCE_LABELS: Record<string, string> = {
  jira: "Jira",
  github: "GitHub",
  gitlab: "GitLab",
};

export function SessionDetail({ session, gitInfo }: SessionDetailProps) {
  const statusColor = STATUS_COLORS[session.status];

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Text bold color="cyan">{session.issueKey}</Text>
      <Text bold>{session.issueSummary}</Text>

      {/* Metadata */}
      <Box marginTop={1} flexDirection="row" gap={2}>
        <Box>
          <Text dimColor>Source: </Text>
          <Text>{SOURCE_LABELS[session.source] ?? session.source}</Text>
        </Box>
        <Box>
          <Text dimColor>Status: </Text>
          <Text color={statusColor}>{session.status}</Text>
        </Box>
      </Box>

      <Box flexDirection="row" gap={2}>
        <Box>
          <Text dimColor>Branch: </Text>
          <Text color="green">{session.branch}</Text>
        </Box>
      </Box>

      <Box flexDirection="column">
        <Box>
          <Text dimColor>Worktree: </Text>
          <Text>{session.worktreePath}</Text>
        </Box>
        <Box>
          <Text dimColor>Started: </Text>
          <Text>{new Date(session.startedAt).toLocaleString()}</Text>
        </Box>
      </Box>

      {/* Git Activity */}
      <Box marginTop={1} flexDirection="column">
        <Text bold color="yellow">Recent Commits</Text>
        {gitInfo.recentCommits.length > 0 ? (
          gitInfo.recentCommits.map((commit, i) => (
            <Box key={i} marginLeft={1}>
              <Text>{commit}</Text>
            </Box>
          ))
        ) : (
          <Box marginLeft={1}>
            <Text dimColor>No commits yet</Text>
          </Box>
        )}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold color="yellow">Working Tree</Text>
        {gitInfo.workingTreeStatus.length > 0 ? (
          gitInfo.workingTreeStatus.map((line, i) => (
            <Box key={i} marginLeft={1}>
              <Text>{line}</Text>
            </Box>
          ))
        ) : (
          <Box marginLeft={1}>
            <Text dimColor>Clean</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
