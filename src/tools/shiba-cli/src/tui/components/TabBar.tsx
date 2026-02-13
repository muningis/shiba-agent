import React from "react";
import { Box, Text } from "ink";
import { SECTIONS, type Section } from "../types.js";

interface TabBarProps {
  active: Section;
}

const SECTION_LABELS: Record<Section, string> = {
  issues: "Issues",
  data: "Data",
  cache: "Cache",
  sessions: "Sessions",
  config: "Config",
};

export function TabBar({ active }: TabBarProps) {
  return (
    <Box borderStyle="single" borderBottom borderTop={false} borderLeft={false} borderRight={false} paddingX={1}>
      <Text bold color="magenta">Shiba Agent</Text>
      <Text> </Text>
      {SECTIONS.map((section, i) => (
        <React.Fragment key={section}>
          {i > 0 && <Text dimColor> | </Text>}
          {section === active ? (
            <Text bold color="cyan">[{SECTION_LABELS[section]}]</Text>
          ) : (
            <Text dimColor> {SECTION_LABELS[section]} </Text>
          )}
        </React.Fragment>
      ))}
    </Box>
  );
}
