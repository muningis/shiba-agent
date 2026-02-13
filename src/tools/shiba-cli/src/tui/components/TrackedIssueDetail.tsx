import React from "react";
import { Box, Text } from "ink";
import type { TrackedIssue } from "../../issues/index.js";

interface TrackedIssueDetailProps {
  issue: TrackedIssue;
}

const PROGRESS_COLORS: Record<string, string> = {
  not_started: "gray",
  in_progress: "blue",
  blocked: "red",
  in_review: "yellow",
  completed: "green",
};

const NOTE_COLORS: Record<string, string> = {
  decision: "magenta",
  todo: "yellow",
  warning: "red",
  info: "blue",
  question: "cyan",
};

export function TrackedIssueDetail({ issue }: TrackedIssueDetailProps) {
  const progressColor = PROGRESS_COLORS[issue.progress.status] ?? "white";

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Text bold color="cyan">{issue.issueKey}</Text>
      <Text bold>{issue.jira.summary || "(no summary)"}</Text>

      {/* Jira Metadata */}
      <Box marginTop={1} flexDirection="row" gap={2}>
        <Box>
          <Text dimColor>Status: </Text>
          <Text>{issue.jira.status || "unknown"}</Text>
        </Box>
        <Box>
          <Text dimColor>Priority: </Text>
          <Text>{issue.jira.priority || "none"}</Text>
        </Box>
        <Box>
          <Text dimColor>Type: </Text>
          <Text>{issue.jira.issueType || "unknown"}</Text>
        </Box>
      </Box>

      {/* Progress */}
      <Box marginTop={1} flexDirection="column">
        <Text bold color="yellow">Progress</Text>
        <Box marginLeft={1} flexDirection="row" gap={2}>
          <Box>
            <Text dimColor>Status: </Text>
            <Text color={progressColor}>{issue.progress.status}</Text>
          </Box>
          <Box>
            <Text dimColor>Complete: </Text>
            <Text>{issue.progress.percentComplete}%</Text>
          </Box>
        </Box>
        {issue.progress.blockers.length > 0 && (
          <Box marginLeft={1} flexDirection="column">
            <Text color="red">Blockers:</Text>
            {issue.progress.blockers.map((b, i) => (
              <Box key={i} marginLeft={1}>
                <Text color="red">- {b}</Text>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Analysis */}
      {issue.analysis && (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="yellow">Analysis</Text>
          {issue.analysis.summary && (
            <Box marginLeft={1}>
              <Text wrap="wrap">{issue.analysis.summary}</Text>
            </Box>
          )}
          {issue.analysis.acceptanceCriteria.length > 0 && (
            <Box marginLeft={1} flexDirection="column">
              <Text dimColor>Acceptance Criteria:</Text>
              {issue.analysis.acceptanceCriteria.map((ac, i) => (
                <Box key={i} marginLeft={1}>
                  <Text>- {ac}</Text>
                </Box>
              ))}
            </Box>
          )}
          {issue.analysis.requirements.length > 0 && (
            <Box marginLeft={1}>
              <Text dimColor>Requirements: {issue.analysis.requirements.length} </Text>
              <Text>({issue.analysis.requirements.filter((r) => r.completed).length} done)</Text>
            </Box>
          )}
        </Box>
      )}

      {/* Notes */}
      {issue.notes.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="yellow">Notes ({issue.notes.length})</Text>
          {issue.notes.slice(-5).map((note) => (
            <Box key={note.id} marginLeft={1}>
              <Text color={NOTE_COLORS[note.category] ?? "white"}>[{note.category}]</Text>
              <Text> {note.content.length > 80 ? note.content.substring(0, 80) + "..." : note.content}</Text>
              {note.resolvedAt && <Text dimColor> (resolved)</Text>}
            </Box>
          ))}
          {issue.notes.length > 5 && (
            <Box marginLeft={1}>
              <Text dimColor>...and {issue.notes.length - 5} more</Text>
            </Box>
          )}
        </Box>
      )}

      {/* Merge Requests */}
      {issue.mergeRequests.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="yellow">Merge Requests ({issue.mergeRequests.length})</Text>
          {issue.mergeRequests.map((mr) => (
            <Box key={mr.id} marginLeft={1}>
              <Text color="cyan">!{mr.iid}</Text>
              <Text> {mr.title || mr.projectPath}</Text>
              <Text dimColor> [{mr.state}]</Text>
              {mr.isPrimary && <Text color="green"> (primary)</Text>}
            </Box>
          ))}
        </Box>
      )}

      {/* APIs */}
      {issue.apis.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="yellow">APIs ({issue.apis.length})</Text>
          {issue.apis.map((api) => (
            <Box key={api.id} marginLeft={1}>
              <Text color="green">{api.method}</Text>
              <Text> {api.path}</Text>
              {api.implemented && <Text color="green"> ✓</Text>}
            </Box>
          ))}
        </Box>
      )}

      {/* Contexts */}
      {issue.contexts.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="yellow">Contexts ({issue.contexts.length})</Text>
          {issue.contexts.map((ctx) => (
            <Box key={ctx.id} marginLeft={1}>
              <Text dimColor>[{ctx.type}] </Text>
              <Text>{ctx.path}</Text>
              {ctx.reviewed && <Text color="green"> ✓</Text>}
            </Box>
          ))}
        </Box>
      )}

      {/* Figma */}
      {issue.figma.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="yellow">Figma ({issue.figma.length})</Text>
          {issue.figma.map((fig) => (
            <Box key={fig.id} marginLeft={1}>
              <Text>{fig.name}</Text>
              {fig.implemented && <Text color="green"> ✓</Text>}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
