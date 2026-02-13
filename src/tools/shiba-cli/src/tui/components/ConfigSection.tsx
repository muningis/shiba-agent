import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { useEnvironmentInfo } from "../hooks/useEnvironmentInfo.js";

export function ConfigSection() {
  const { info, loading } = useEnvironmentInfo();

  if (loading) {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
          {" "}Loading configuration...
        </Text>
      </Box>
    );
  }

  if (!info) {
    return (
      <Box padding={1}>
        <Text color="red">Failed to load configuration.</Text>
      </Box>
    );
  }

  const prefs = info.config.preferences;
  const specNames = Object.keys(info.config.openapi?.specs ?? {});

  return (
    <Box flexDirection="column" padding={1}>
      {/* Environment */}
      <Text bold color="yellow">Environment</Text>
      <Box marginLeft={1} flexDirection="column">
        <Box>
          <Text dimColor>Current: </Text>
          <Text>{info.environment ?? "none"}</Text>
        </Box>
        <Box>
          <Text dimColor>Data initialized: </Text>
          <Text color={info.dataInitialized ? "green" : "red"}>
            {info.dataInitialized ? "yes" : "no"}
          </Text>
        </Box>
      </Box>

      {/* Auth Status */}
      <Box marginTop={1} flexDirection="column">
        <Text bold color="yellow">Authentication</Text>
        <Box marginLeft={1} flexDirection="column">
          <Box>
            <Text dimColor>Jira: </Text>
            <Text color={info.jiraConfigured ? "green" : "red"}>
              {info.jiraConfigured ? "configured" : "not configured"}
            </Text>
            {info.jiraConfigured && info.config.jira?.host && (
              <Text dimColor> ({info.config.jira.host})</Text>
            )}
          </Box>
          <Box>
            <Text dimColor>GitHub CLI (gh): </Text>
            <Text color={info.cliStatus.gh ? "green" : "red"}>
              {info.cliStatus.gh ? "available" : "not found"}
            </Text>
          </Box>
          <Box>
            <Text dimColor>GitLab CLI (glab): </Text>
            <Text color={info.cliStatus.glab ? "green" : "red"}>
              {info.cliStatus.glab ? "available" : "not found"}
            </Text>
          </Box>
          <Box>
            <Text dimColor>Figma: </Text>
            <Text color={info.figmaConfigured ? "green" : "red"}>
              {info.figmaConfigured ? "configured" : "not configured"}
            </Text>
          </Box>
        </Box>
      </Box>

      {/* Preferences */}
      <Box marginTop={1} flexDirection="column">
        <Text bold color="yellow">Preferences</Text>
        <Box marginLeft={1} flexDirection="column">
          <Box>
            <Text dimColor>Issue tracker: </Text>
            <Text>{prefs?.issueTracker ?? "auto-detect"}</Text>
          </Box>
          <Box>
            <Text dimColor>Branch pattern: </Text>
            <Text>{prefs?.branchNaming?.pattern ?? "{key}/{description}"}</Text>
          </Box>
          <Box>
            <Text dimColor>Commit style: </Text>
            <Text>{prefs?.commitMessage?.style ?? "conventional"}</Text>
          </Box>
          <Box>
            <Text dimColor>Shiba signature: </Text>
            <Text>{prefs?.signatures?.shibaSignature ? "on" : "off"}</Text>
          </Box>
          <Box>
            <Text dimColor>Workflow: </Text>
            <Text>{prefs?.workflow?.enabled ? "enabled" : "disabled"}</Text>
          </Box>
          {prefs?.defaultJql && (
            <Box>
              <Text dimColor>Default JQL: </Text>
              <Text>{prefs.defaultJql}</Text>
            </Box>
          )}
        </Box>
      </Box>

      {/* OpenAPI Sources */}
      <Box marginTop={1} flexDirection="column">
        <Text bold color="yellow">OpenAPI Sources ({specNames.length})</Text>
        {specNames.length === 0 ? (
          <Box marginLeft={1}>
            <Text dimColor>No specs configured. Use `shiba oapi add` to add one.</Text>
          </Box>
        ) : (
          <Box marginLeft={1} flexDirection="column">
            {specNames.map((name) => {
              const spec = info.config.openapi!.specs![name];
              return (
                <Box key={name}>
                  <Text color="cyan">{name}</Text>
                  <Text dimColor> - {spec.url}</Text>
                  {spec.auth && <Text dimColor> ({spec.auth.type})</Text>}
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}
