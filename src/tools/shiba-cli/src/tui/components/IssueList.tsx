import React, { useState, useMemo, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import type { IssueBasic, IssueTracker, TrackerGroup } from "../types.js";

interface IssueListProps {
  groups: TrackerGroup[];
  onSelect: (issue: IssueBasic) => void;
  onAction?: (issue: IssueBasic, action: string) => void;
}

type Row =
  | { kind: "header"; label: string; tracker: IssueTracker; count: number }
  | { kind: "issue"; issue: IssueBasic }
  | { kind: "loading"; tracker: IssueTracker }
  | { kind: "error"; message: string }
  | { kind: "empty"; tracker: IssueTracker };

const TRACKER_COLORS: Record<IssueTracker, string> = {
  jira: "blue",
  github: "white",
  gitlab: "magenta",
};

export function IssueList({ groups, onSelect, onAction }: IssueListProps) {
  const [cursor, setCursor] = useState(0);

  const { rows, selectableIndices } = useMemo(() => {
    const rows: Row[] = [];
    const selectableIndices: number[] = [];

    for (const group of groups) {
      rows.push({
        kind: "header",
        label: group.label,
        tracker: group.tracker,
        count: group.issues.length,
      });

      if (group.loading && group.issues.length === 0) {
        // Initial load — no data yet, show spinner
        rows.push({ kind: "loading", tracker: group.tracker });
      } else if (group.error && group.issues.length === 0) {
        rows.push({ kind: "error", message: group.error });
      } else if (!group.loading && group.issues.length === 0) {
        rows.push({ kind: "empty", tracker: group.tracker });
      } else {
        for (const issue of group.issues) {
          selectableIndices.push(rows.length);
          rows.push({ kind: "issue", issue });
        }
      }
    }

    return { rows, selectableIndices };
  }, [groups]);

  useInput((input, key) => {
    if (selectableIndices.length === 0) return;

    if (key.upArrow) {
      setCursor((c) => Math.max(0, c - 1));
    } else if (key.downArrow) {
      setCursor((c) => Math.min(selectableIndices.length - 1, c + 1));
    } else if (key.return) {
      const rowIdx = selectableIndices[cursor];
      const row = rows[rowIdx];
      if (row?.kind === "issue") {
        onSelect(row.issue);
      }
    } else if (input === "s" && onAction) {
      const rowIdx = selectableIndices[cursor];
      const row = rows[rowIdx];
      if (row?.kind === "issue") {
        onAction(row.issue, "launch-session");
      }
    }
  });

  useEffect(() => {
    if (selectableIndices.length === 0) return;
    const max = selectableIndices.length - 1;
    if (cursor > max) {
      setCursor(max);
    }
  }, [selectableIndices.length, cursor]);

  if (groups.length === 0) {
    return (
      <Box padding={1}>
        <Text dimColor>No issue trackers configured.</Text>
      </Box>
    );
  }

  const clampedCursor = Math.min(cursor, Math.max(0, selectableIndices.length - 1));

  return (
    <Box flexDirection="column" padding={1}>
      {rows.map((row, idx) => {
        if (row.kind === "header") {
          const color = TRACKER_COLORS[row.tracker];
          const group = groups.find((g) => g.tracker === row.tracker);
          const isRefreshing = group?.loading && row.count > 0;
          return (
            <Box key={`h-${row.tracker}`} marginTop={idx > 0 ? 1 : 0}>
              <Text bold color={color}>
                {row.label}
                {!group?.loading && (
                  <Text dimColor> ({row.count})</Text>
                )}
                {isRefreshing && (
                  <Text color="yellow"> <Spinner type="dots" /></Text>
                )}
              </Text>
            </Box>
          );
        }

        if (row.kind === "loading") {
          return (
            <Box key={`l-${row.tracker}`} marginLeft={1}>
              <Text color="yellow">
                <Spinner type="dots" />
                {" "}Loading...
              </Text>
            </Box>
          );
        }

        if (row.kind === "error") {
          return (
            <Box key={`e-${idx}`} marginLeft={1}>
              <Text color="red">{row.message}</Text>
            </Box>
          );
        }

        if (row.kind === "empty") {
          return (
            <Box key={`n-${row.tracker}`} marginLeft={1}>
              <Text dimColor>No issues found.</Text>
            </Box>
          );
        }

        // issue row
        const selectableIdx = selectableIndices.indexOf(idx);
        const isSelected = selectableIdx === clampedCursor;

        return (
          <Box key={row.issue.key} marginLeft={1}>
            <Text color={isSelected ? "cyan" : undefined} bold={isSelected}>
              {isSelected ? "❯ " : "  "}
              {row.issue.key}
            </Text>
            <Text color={isSelected ? "cyan" : undefined}>
              {" - "}
              {row.issue.summary}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
