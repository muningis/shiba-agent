import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import type { Session } from "../types.js";

interface SessionListProps {
  sessions: Session[];
  onSelect: (session: Session) => void;
  onRemove: (session: Session) => void;
  onRefresh: () => void;
}

const STATUS_COLORS: Record<Session["status"], string> = {
  running: "blue",
  completed: "green",
  error: "red",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function SessionList({ sessions, onSelect, onRemove, onRefresh }: SessionListProps) {
  const [cursor, setCursor] = useState(0);

  useInput((input, key) => {
    if (sessions.length === 0) return;

    if (key.upArrow) {
      setCursor((c) => Math.max(0, c - 1));
    } else if (key.downArrow) {
      setCursor((c) => Math.min(sessions.length - 1, c + 1));
    } else if (key.return) {
      onSelect(sessions[cursor]);
    } else if (input === "d") {
      onRemove(sessions[cursor]);
    } else if (input === "r") {
      onRefresh();
    }
  });

  if (sessions.length === 0) {
    return (
      <Box padding={1}>
        <Text dimColor>No sessions. Press 's' on an issue to start one.</Text>
      </Box>
    );
  }

  const clampedCursor = Math.min(cursor, sessions.length - 1);
  if (clampedCursor !== cursor) {
    setCursor(clampedCursor);
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Sessions ({sessions.length})</Text>
      <Box marginTop={1} flexDirection="column">
        {sessions.map((session, idx) => {
          const isSelected = idx === clampedCursor;
          const statusColor = STATUS_COLORS[session.status];

          return (
            <Box key={session.id}>
              <Text color={isSelected ? "cyan" : undefined} bold={isSelected}>
                {isSelected ? "❯ " : "  "}
                {session.issueKey}
              </Text>
              <Text color={isSelected ? "cyan" : undefined}>
                {" - "}
                {session.issueSummary.length > 50
                  ? session.issueSummary.substring(0, 50) + "..."
                  : session.issueSummary}
              </Text>
              <Text> </Text>
              <Text color={statusColor}>[{session.status}]</Text>
              <Text dimColor> {timeAgo(session.startedAt)}</Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
