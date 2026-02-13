import React from "react";
import { Box, Text } from "ink";
import { ScrollView } from "./ScrollView.js";
import type { IssueBasic, IssueComment } from "../types.js";


interface IssueBasicDetailProps {
  issue: IssueBasic;
  description?: string | null;
  labels?: string[];
  assignees?: string[];
  author?: string;
  comments?: IssueComment[];
}

export function IssueBasicDetail({
  issue,
  description,
  labels,
  assignees,
  author,
  comments,
}: IssueBasicDetailProps) {
  const sourceLabel = issue.source === "github" ? "GitHub" : "GitLab";
  const hasEnrichedData = description !== undefined;

  return (
    <ScrollView>
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
      <Box flexDirection="row" gap={2}>
        <Box>
          <Text dimColor>Updated: </Text>
          <Text>{new Date(issue.updated).toLocaleString()}</Text>
        </Box>
        {author && (
          <Box>
            <Text dimColor>Author: </Text>
            <Text>{author}</Text>
          </Box>
        )}
      </Box>

      {/* Assignees */}
      {assignees && assignees.length > 0 && (
        <Box>
          <Text dimColor>Assignees: </Text>
          <Text>{assignees.join(", ")}</Text>
        </Box>
      )}

      {/* Labels */}
      {labels && labels.length > 0 && (
        <Box marginTop={1} flexDirection="row" gap={1} flexWrap="wrap">
          <Text dimColor>Labels: </Text>
          {labels.map((label) => (
            <Text key={label} color="magenta">[{label}]</Text>
          ))}
        </Box>
      )}

      {/* Description */}
      {hasEnrichedData && description && (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="yellow">Description</Text>
          <Text wrap="wrap">{description}</Text>
        </Box>
      )}

      {/* Comments (GitHub only) */}
      {comments && comments.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="yellow">Comments ({comments.length})</Text>
          {comments.slice(-5).map((comment, i) => (
            <Box key={i} marginTop={1} marginLeft={1} flexDirection="column">
              <Box>
                <Text bold>{comment.author}</Text>
                <Text dimColor> - {new Date(comment.created).toLocaleString()}</Text>
              </Box>
              <Text wrap="wrap">{comment.body}</Text>
            </Box>
          ))}
          {comments.length > 5 && (
            <Box marginLeft={1}>
              <Text dimColor>...and {comments.length - 5} more comments</Text>
            </Box>
          )}
        </Box>
      )}

      {/* URL */}
      {issue.url && (
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>URL: </Text>
          <Text color="blue">{issue.url}</Text>
        </Box>
      )}

      {/* Fallback text when no enriched data */}
      {!hasEnrichedData && (
        <Box marginTop={1}>
          <Text dimColor>Full details available at the URL above.</Text>
        </Box>
      )}
    </Box>
    </ScrollView>
  );
}
