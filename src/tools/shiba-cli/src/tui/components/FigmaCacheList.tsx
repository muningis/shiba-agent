import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import type { FigmaCacheSummary } from "../hooks/useFigmaCache.js";

interface FigmaCacheListProps {
  files: FigmaCacheSummary[];
  onSelect: (fileKey: string) => void;
}

export function FigmaCacheList({ files, onSelect }: FigmaCacheListProps) {
  if (files.length === 0) {
    return (
      <Box padding={1}>
        <Text dimColor>No cached Figma files. Files are cached when fetched via `shiba` Figma commands.</Text>
      </Box>
    );
  }

  const items = files.map((f) => ({
    label: `${f.name} (${f.componentCount} components, ${f.styleCount} styles)`,
    value: f.fileKey,
    key: f.fileKey,
  }));

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Cached Figma Files ({files.length})</Text>
      <Box marginTop={1}>
        <SelectInput
          items={items}
          onSelect={(item) => onSelect(item.value)}
        />
      </Box>
    </Box>
  );
}
