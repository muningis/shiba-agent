import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import type { View, Section } from "../types.js";

interface StatusBarProps {
  view: View;
  section: Section;
  refreshing?: boolean;
}

export function StatusBar({ view, section, refreshing }: StatusBarProps) {
  const hints: string[] = ["Tab Switch"];

  if (section === "issues") {
    if (view === "list") {
      hints.push("↑↓ Navigate", "Enter Select", "s Start Session", "r Refresh", "q Quit");
    } else {
      hints.push("Esc Back", "s Start Session", "q Quit");
    }
  } else if (section === "sessions") {
    if (view === "detail") {
      hints.push("Esc Back", "r Refresh", "q Quit");
    } else {
      hints.push("↑↓ Navigate", "Enter Details", "d Remove", "r Refresh", "q Quit");
    }
  } else if (section === "data" || section === "cache") {
    if (view === "detail") {
      hints.push("Esc Back", "q Quit");
    } else {
      hints.push("↑↓ Navigate", "Enter Select", "Esc Back", "q Quit");
    }
  } else {
    // config - single view
    hints.push("q Quit");
  }

  return (
    <Box borderStyle="single" borderTop borderBottom={false} borderLeft={false} borderRight={false} paddingX={1}>
      <Text dimColor>
        {hints.join(" · ")}
      </Text>
      {refreshing && (
        <Box marginLeft={1}>
          <Text color="yellow">
            <Spinner type="dots" />
            {" "}Refreshing…
          </Text>
        </Box>
      )}
    </Box>
  );
}
