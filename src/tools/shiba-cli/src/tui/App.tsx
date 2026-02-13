import React, { useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import Spinner from "ink-spinner";
import { TabBar } from "./components/TabBar.js";
import { IssueList } from "./components/IssueList.js";
import { IssueDetail } from "./components/IssueDetail.js";
import { IssueBasicDetail } from "./components/IssueBasicDetail.js";
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
  const [selectedIssue, setSelectedIssue] = useState<IssueBasic | null>(null);

  const { groups, refresh } = useIssues();

  // Only fetch full Jira detail when viewing a Jira issue
  const fullIssueKey =
    section === "issues" && view === "detail" && selectedIssue?.source === "jira"
      ? selectedIssue.key
      : null;

  const {
    issue: fullIssue,
    loading: loadingFull,
    error: errorFull,
    refresh: refreshFull,
  } = useFullIssue(fullIssueKey);

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
      setSelectedIssue(null);
      return;
    }

    // Section-specific keys
    if (section === "issues") {
      if (key.escape && view === "detail") {
        setView("list");
        setSelectedIssue(null);
      }
      if (input === "r") {
        if (view === "list") {
          refresh();
        } else if (view === "detail" && selectedIssue?.source === "jira") {
          refreshFull();
        }
      }
    }
    // Data and Cache sections handle their own Escape via useInput in their components
  });

  const handleSelectIssue = (issue: IssueBasic) => {
    setSelectedIssue(issue);
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
            {view === "list" && (
              <IssueList groups={groups} onSelect={handleSelectIssue} />
            )}

            {view === "detail" && selectedIssue && (
              <>
                {selectedIssue.source === "jira" ? (
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
                ) : (
                  <IssueBasicDetail issue={selectedIssue} />
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
