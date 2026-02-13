import React from "react";
import { Box, Text } from "ink";
import type { IssueBasic } from "../types.js";

interface IssueBasicDetailProps {
  issue: IssueBasic;
}

export function IssueBasicDetail({ issue }: IssueBasicDetailProps) {
  const sourceLabel = issue.source === "github" ? "GitHub" : "GitLab";

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Text bold color="cyan">{issue.key}</Text>
      <Text bold>{issue.summary}</Text>

      {/* Metadata */}
      <Box marginTop={1} flexDirection="row" gap={2}>
        <Box>
          <Text dimColor>Source: </Text>
          <Text>{sourceLabel}</Text>
        </Box>
        <Box>
          <Text dimColor>Status: </Text>
          <Text>{issue.status}</Text>
        </Box>
        <Box>
          <Text dimColor>Type: </Text>
          <Text>{issue.issueType}</Text>
        </Box>
      </Box>
      <Box>
        <Text dimColor>Updated: </Text>
        <Text>{new Date(issue.updated).toLocaleString()}</Text>
      </Box>

      {/* URL */}
      {issue.url && (
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>URL: </Text>
          <Text color="blue">{issue.url}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>Full details available at the URL above.</Text>
      </Box>
    </Box>
  );
}
