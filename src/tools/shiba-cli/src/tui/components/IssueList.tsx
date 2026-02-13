import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import type { IssueBasic } from "../types.js";

interface IssueListProps {
  issues: IssueBasic[];
  onSelect: (issue: IssueBasic) => void;
}

export function IssueList({ issues, onSelect }: IssueListProps) {
  if (issues.length === 0) {
    return (
      <Box padding={1}>
        <Text dimColor>No issues assigned to you.</Text>
      </Box>
    );
  }

  const items = issues.map((issue) => ({
    label: `${issue.key} - ${issue.summary}`,
    value: issue,
    key: issue.key,
  }));

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Your Issues ({issues.length})</Text>
      <Box marginTop={1}>
        <SelectInput
          items={items}
          onSelect={(item) => onSelect(item.value)}
        />
      </Box>
    </Box>
  );
}
