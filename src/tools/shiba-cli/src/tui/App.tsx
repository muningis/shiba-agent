import React, { useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import Spinner from "ink-spinner";
import { IssueList } from "./components/IssueList.js";
import { IssueDetail } from "./components/IssueDetail.js";
import { StatusBar } from "./components/StatusBar.js";
import { useIssues } from "./hooks/useIssues.js";
import { useFullIssue } from "./hooks/useFullIssue.js";
import type { IssueBasic, View } from "./types.js";

export function App() {
  const { exit } = useApp();
  const [view, setView] = useState<View>("list");
  const [selectedIssueKey, setSelectedIssueKey] = useState<string | null>(null);

  const { issues, loading, error, refresh, source } = useIssues();
  const {
    issue: fullIssue,
    loading: loadingFull,
    error: errorFull,
    refresh: refreshFull,
  } = useFullIssue(view === "detail" ? selectedIssueKey : null);

  useInput((input, key) => {
    if (input === "q") {
      exit();
    }
    if (key.escape && view === "detail") {
      setView("list");
      setSelectedIssueKey(null);
    }
    if (input === "r") {
      if (view === "list") {
        refresh();
      } else if (view === "detail") {
        refreshFull();
      }
    }
  });

  const handleSelectIssue = (issue: IssueBasic) => {
    setSelectedIssueKey(issue.key);
    setView("detail");
  };

  // Format source name for display
  const sourceLabel = source === "jira" ? "Jira" : source === "github" ? "GitHub" : "GitLab";

  return (
    <Box flexDirection="column">
      <Box borderStyle="single" borderBottom borderTop={false} borderLeft={false} borderRight={false} paddingX={1}>
        <Text bold color="magenta">Shiba Agent</Text>
        <Text> - {sourceLabel} Issues</Text>
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

        {view === "detail" && (
          <>
            {loadingFull && (
              <Box padding={1}>
                <Text color="yellow">
                  <Spinner type="dots" />
                  {" "}Loading issue details...
                </Text>
              </Box>
            )}
            {errorFull && (
              <Box padding={1}>
                <Text color="red">Error: {errorFull}</Text>
              </Box>
            )}
            {!loadingFull && !errorFull && fullIssue && (
              <IssueDetail issue={fullIssue} />
            )}
          </>
        )}
      </Box>

      <StatusBar view={view} />
    </Box>
  );
}
