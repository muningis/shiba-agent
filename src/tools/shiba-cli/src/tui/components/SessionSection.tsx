import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import { SessionList } from "./SessionList.js";
import { SessionDetail } from "./SessionDetail.js";
import { useSessions } from "../hooks/useSessions.js";
import type { Session, View } from "../types.js";

interface SessionSectionProps {
  onViewChange: (view: View) => void;
}

export function SessionSection({ onViewChange }: SessionSectionProps) {
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const { sessions, loading, error, refresh, getSessionGitInfo, removeSession } = useSessions();

  useInput((_input, key) => {
    if (key.escape && selectedSession) {
      setSelectedSession(null);
      onViewChange("list");
    }
  });

  if (loading) {
    return (
      <Box padding={1}>
        <Text color="yellow"><Spinner type="dots" /> Loading sessions...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box padding={1}>
        <Text color="red">Error: {error}</Text>
      </Box>
    );
  }

  if (selectedSession) {
    const gitInfo = getSessionGitInfo(selectedSession);
    return <SessionDetail session={selectedSession} gitInfo={gitInfo} />;
  }

  return (
    <SessionList
      sessions={sessions}
      onSelect={(session) => {
        setSelectedSession(session);
        onViewChange("detail");
      }}
      onRemove={(session) => {
        removeSession(session.id);
      }}
      onRefresh={refresh}
    />
  );
}
