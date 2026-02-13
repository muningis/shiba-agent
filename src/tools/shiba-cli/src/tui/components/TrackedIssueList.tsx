import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import type { TrackedIssueSummary } from "../hooks/useTrackedIssues.js";

interface TrackedIssueListProps {
  issues: TrackedIssueSummary[];
  onSelect: (key: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  not_started: "gray",
  in_progress: "blue",
  blocked: "red",
  in_review: "yellow",
  completed: "green",
};

export function TrackedIssueList({ issues, onSelect }: TrackedIssueListProps) {
  if (issues.length === 0) {
    return (
      <Box padding={1}>
        <Text dimColor>No tracked issues. Issues are tracked when viewed via `shiba jira issue-get`.</Text>
      </Box>
    );
  }

  const items = issues.map((issue) => ({
    label: `${issue.key} - ${issue.summary}  [${issue.progressStatus} ${issue.percentComplete}%]`,
    value: issue.key,
    key: issue.key,
  }));

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Tracked Issues ({issues.length})</Text>
      <Box marginTop={1}>
        <SelectInput
          items={items}
          onSelect={(item) => onSelect(item.value)}
        />
      </Box>
    </Box>
  );
}
