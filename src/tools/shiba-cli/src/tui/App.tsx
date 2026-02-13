import React, { useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import Spinner from "ink-spinner";
import { TabBar } from "./components/TabBar.js";
import { IssueList } from "./components/IssueList.js";
import { IssueDetail } from "./components/IssueDetail.js";
import { StatusBar } from "./components/StatusBar.js";
import { DataSection } from "./components/DataSection.js";
import { CacheSection } from "./components/CacheSection.js";
import { ConfigSection } from "./components/ConfigSection.js";
import { useIssues } from "./hooks/useIssues.js";
import { useFullIssue } from "./hooks/useFullIssue.js";
import type { IssueBasic, View, Section } from "./types.js";
import { nextSection, prevSection } from "./types.js";

export function App() {
  const { exit } = useApp();
  const [section, setSection] = useState<Section>("issues");
  const [view, setView] = useState<View>("list");
  const [selectedIssueKey, setSelectedIssueKey] = useState<string | null>(null);

  const { issues, loading, error, refresh, source } = useIssues();
  const {
    issue: fullIssue,
    loading: loadingFull,
    error: errorFull,
    refresh: refreshFull,
  } = useFullIssue(section === "issues" && view === "detail" ? selectedIssueKey : null);

  useInput((input, key) => {
    if (input === "q") {
      exit();
    }

    // Tab / Shift+Tab to switch sections
    if (key.tab) {
      if (key.shift) {
        setSection((s) => prevSection(s));
      } else {
        setSection((s) => nextSection(s));
      }
      // Reset sub-state on section switch
      setView("list");
      setSelectedIssueKey(null);
      return;
    }

    // Section-specific keys
    if (section === "issues") {
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
    }
    // Data and Cache sections handle their own Escape via useInput in their components
  });

  const handleSelectIssue = (issue: IssueBasic) => {
    setSelectedIssueKey(issue.key);
    setView("detail");
  };

  const handleSubViewChange = (v: View) => {
    setView(v);
  };

  return (
    <Box flexDirection="column">
      <TabBar active={section} />

      <Box flexDirection="column" minHeight={10}>
        {/* Issues Section */}
        {section === "issues" && (
          <>
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
          </>
        )}

        {/* Data Section */}
        {section === "data" && (
          <DataSection onViewChange={handleSubViewChange} />
        )}

        {/* Cache Section */}
        {section === "cache" && (
          <CacheSection onViewChange={handleSubViewChange} />
        )}

        {/* Config Section */}
        {section === "config" && (
          <ConfigSection />
        )}
      </Box>

      <StatusBar view={view} section={section} />
    </Box>
  );
}
