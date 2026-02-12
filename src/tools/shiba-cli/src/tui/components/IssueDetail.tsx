import React from "react";
import { Box, Text } from "ink";
import type { JiraIssueFull } from "../types.js";

interface IssueDetailProps {
  issue: JiraIssueFull;
}

export function IssueDetail({ issue }: IssueDetailProps) {
  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Text bold color="cyan">{issue.key}</Text>
      <Text bold>{issue.summary}</Text>

      {/* Metadata */}
      <Box marginTop={1} flexDirection="row" gap={2}>
        <Box>
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
      </Box>
      <Box>
        <Text dimColor>Updated: </Text>
        <Text>{new Date(issue.updated).toLocaleString()}</Text>
      </Box>

      {/* Description */}
      {issue.description && (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="yellow">Description</Text>
          <Text wrap="wrap">{issue.description}</Text>
        </Box>
      )}

      {/* Linked Issues */}
      {issue.linkedIssues.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="yellow">Linked Issues ({issue.linkedIssues.length})</Text>
          {issue.linkedIssues.map((link) => (
            <Box key={`${link.type}-${link.key}`} marginLeft={1}>
              <Text dimColor>{link.type}: </Text>
              <Text color="cyan">{link.key}</Text>
              <Text> - {link.summary} </Text>
              <Text dimColor>[{link.status}]</Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Comments */}
      {issue.comments.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="yellow">Comments ({issue.comments.length})</Text>
          {issue.comments.slice(-5).map((comment, i) => (
            <Box key={i} marginTop={1} marginLeft={1} flexDirection="column">
              <Box>
                <Text bold>{comment.author}</Text>
                <Text dimColor> - {new Date(comment.created).toLocaleString()}</Text>
              </Box>
              <Text wrap="wrap">{comment.body}</Text>
            </Box>
          ))}
          {issue.comments.length > 5 && (
            <Box marginLeft={1}>
              <Text dimColor>...and {issue.comments.length - 5} more comments</Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
