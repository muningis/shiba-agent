import React from "react";
import { Box, Text } from "ink";
import type { View, Section } from "../types.js";

interface StatusBarProps {
  view: View;
  section: Section;
}

export function StatusBar({ view, section }: StatusBarProps) {
  const hints: string[] = ["Tab Switch"];

  if (section === "issues") {
    if (view === "list") {
      hints.push("↑↓ Navigate", "Enter Select", "r Refresh", "q Quit");
    } else {
      hints.push("Esc Back", "q Quit");
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
    </Box>
  );
}
