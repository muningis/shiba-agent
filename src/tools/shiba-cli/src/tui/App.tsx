import React, { useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import Spinner from "ink-spinner";
import { IssueList } from "./components/IssueList.js";
import { IssueDetail } from "./components/IssueDetail.js";
import { StatusBar } from "./components/StatusBar.js";
import { useJiraIssues } from "./hooks/useJiraIssues.js";
import type { JiraIssue, View } from "./types.js";

export function App() {
  const { exit } = useApp();
  const [view, setView] = useState<View>("list");
  const [selectedIssue, setSelectedIssue] = useState<JiraIssue | null>(null);

  const { issues, loading, error, refresh } = useJiraIssues();

  useInput((input, key) => {
    if (input === "q") {
      exit();
    }
    if (key.escape && view === "detail") {
      setView("list");
      setSelectedIssue(null);
    }
    if (input === "r" && view === "list") {
      refresh();
    }
  });

  const handleSelectIssue = (issue: JiraIssue) => {
    setSelectedIssue(issue);
    setView("detail");
  };

  return (
    <Box flexDirection="column">
      <Box borderStyle="single" borderBottom borderTop={false} borderLeft={false} borderRight={false} paddingX={1}>
        <Text bold color="magenta">Shiba Agent</Text>
        <Text> - Jira Issues</Text>
      </Box>

      <Box flexDirection="column" minHeight={10}>
        {loading && (
          <Box padding={1}>
            <Text color="yellow">
              <Spinner type="dots" />
              {" "}Loading issues...
            </Text>
          </Box>
        )}

        {error && (
          <Box padding={1}>
            <Text color="red">Error: {error}</Text>
          </Box>
        )}

        {!loading && !error && view === "list" && (
          <IssueList issues={issues} onSelect={handleSelectIssue} />
        )}

        {view === "detail" && selectedIssue && (
          <IssueDetail issue={selectedIssue} />
        )}
      </Box>

      <StatusBar view={view} />
    </Box>
  );
}
