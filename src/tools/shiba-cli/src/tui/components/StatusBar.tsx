import React from "react";
import { Box, Text } from "ink";
import type { View } from "../types.js";

interface StatusBarProps {
  view: View;
}

export function StatusBar({ view }: StatusBarProps) {
  return (
    <Box borderStyle="single" borderTop borderBottom={false} borderLeft={false} borderRight={false} paddingX={1}>
      <Text dimColor>
        {view === "list" ? (
          <>↑↓ Navigate · Enter Select · r Refresh · q Quit</>
        ) : (
          <>Esc Back · q Quit</>
        )}
      </Text>
    </Box>
  );
}
