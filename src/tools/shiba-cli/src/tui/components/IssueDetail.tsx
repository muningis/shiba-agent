import React from "react";
import { Box, Text } from "ink";
import type { JiraIssue } from "../types.js";

interface IssueDetailProps {
  issue: JiraIssue;
}

export function IssueDetail({ issue }: IssueDetailProps) {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">{issue.key}</Text>
      <Text>{issue.summary}</Text>
      <Box marginTop={1}>
        <Text dimColor>Status: </Text>
        <Text>{issue.status}</Text>
      </Box>
      <Box>
        <Text dimColor>Priority: </Text>
        <Text>{issue.priority}</Text>
      </Box>
      <Box>
        <Text dimColor>Type: </Text>
        <Text>{issue.issueType}</Text>
      </Box>
      <Box>
        <Text dimColor>Updated: </Text>
        <Text>{new Date(issue.updated).toLocaleString()}</Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Press Esc to go back</Text>
      </Box>
    </Box>
  );
}
