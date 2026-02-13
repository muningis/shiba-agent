import React, { useState, useEffect } from "react";
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
import { SessionSection } from "./components/SessionSection.js";
import { useIssues } from "./hooks/useIssues.js";
import { useFullIssue } from "./hooks/useFullIssue.js";
import { useFullGitHubIssue } from "./hooks/useFullGitHubIssue.js";
import { useFullGitLabIssue } from "./hooks/useFullGitLabIssue.js";
import { useSessionLauncher } from "./hooks/useSessionLauncher.js";
import type { IssueBasic, View, Section } from "./types.js";
import { nextSection, prevSection } from "./types.js";

export function App() {
  const { exit } = useApp();
  const [section, setSection] = useState<Section>("issues");
  const [view, setView] = useState<View>("list");
  const [selectedIssue, setSelectedIssue] = useState<IssueBasic | null>(null);

  const { groups, refresh } = useIssues();
  const { launch } = useSessionLauncher();
  const [launchFeedback, setLaunchFeedback] = useState<string | null>(null);

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

  // Only fetch full GitHub detail when viewing a GitHub issue
  const fullGitHubKey =
    section === "issues" && view === "detail" && selectedIssue?.source === "github"
      ? selectedIssue.key
      : null;

  const {
    issue: fullGitHubIssue,
    loading: loadingGitHub,
    error: errorGitHub,
    refresh: refreshGitHub,
  } = useFullGitHubIssue(fullGitHubKey);

  // Only fetch full GitLab detail when viewing a GitLab issue
  const fullGitLabKey =
    section === "issues" && view === "detail" && selectedIssue?.source === "gitlab"
      ? selectedIssue.key
      : null;

  const {
    issue: fullGitLabIssue,
    loading: loadingGitLab,
    error: errorGitLab,
    refresh: refreshGitLab,
  } = useFullGitLabIssue(fullGitLabKey);

  // Clear launch feedback after 3 seconds
  useEffect(() => {
    if (!launchFeedback) return;
    const timer = setTimeout(() => setLaunchFeedback(null), 3000);
    return () => clearTimeout(timer);
  }, [launchFeedback]);

  const handleLaunchSession = (issue: IssueBasic) => {
    const result = launch(issue);
    if (result.success) {
      setLaunchFeedback(`Session launched for ${issue.key}`);
    } else {
      setLaunchFeedback(`Error: ${result.error}`);
    }
  };

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
        } else if (view === "detail") {
          if (selectedIssue?.source === "jira") refreshFull();
          else if (selectedIssue?.source === "github") refreshGitHub();
          else if (selectedIssue?.source === "gitlab") refreshGitLab();
        }
      }
      if (input === "s" && view === "detail" && selectedIssue) {
        handleLaunchSession(selectedIssue);
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
              <IssueList
                groups={groups}
                onSelect={handleSelectIssue}
                onAction={(issue, action) => {
                  if (action === "launch-session") {
                    handleLaunchSession(issue);
                  }
                }}
              />
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
                ) : selectedIssue.source === "github" ? (
                  <>
                    {loadingGitHub && (
                      <Box padding={1}>
                        <Text color="yellow">
                          <Spinner type="dots" />
                          {" "}Loading issue details...
                        </Text>
                      </Box>
                    )}
                    {errorGitHub && (
                      <Box padding={1}>
                        <Text color="red">Error: {errorGitHub}</Text>
                      </Box>
                    )}
                    {!loadingGitHub && !errorGitHub && fullGitHubIssue && (
                      <IssueBasicDetail
                        issue={fullGitHubIssue}
                        description={fullGitHubIssue.description}
                        labels={fullGitHubIssue.labels}
                        assignees={fullGitHubIssue.assignees}
                        author={fullGitHubIssue.author}
                        comments={fullGitHubIssue.comments}
                      />
                    )}
                  </>
                ) : selectedIssue.source === "gitlab" ? (
                  <>
                    {loadingGitLab && (
                      <Box padding={1}>
                        <Text color="yellow">
                          <Spinner type="dots" />
                          {" "}Loading issue details...
                        </Text>
                      </Box>
                    )}
                    {errorGitLab && (
                      <Box padding={1}>
                        <Text color="red">Error: {errorGitLab}</Text>
                      </Box>
                    )}
                    {!loadingGitLab && !errorGitLab && fullGitLabIssue && (
                      <IssueBasicDetail
                        issue={fullGitLabIssue}
                        description={fullGitLabIssue.description}
                        labels={fullGitLabIssue.labels}
                        assignees={fullGitLabIssue.assignees}
                        author={fullGitLabIssue.author}
                      />
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

        {/* Sessions Section */}
        {section === "sessions" && (
          <SessionSection onViewChange={handleSubViewChange} />
        )}

        {/* Config Section */}
        {section === "config" && (
          <ConfigSection />
        )}

        {/* Launch feedback */}
        {launchFeedback && (
          <Box paddingX={1}>
            <Text color={launchFeedback.startsWith("Error") ? "red" : "green"}>
              {launchFeedback}
            </Text>
          </Box>
        )}
      </Box>

      <StatusBar
        view={view}
        section={section}
        refreshing={section === "issues" && groups.some((g) => g.loading)}
      />
    </Box>
  );
}
