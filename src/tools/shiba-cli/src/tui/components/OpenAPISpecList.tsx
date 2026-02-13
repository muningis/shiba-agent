import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import type { OpenAPISpecSummary } from "../hooks/useOpenAPISpecs.js";

interface OpenAPISpecListProps {
  specs: OpenAPISpecSummary[];
  onSelect: (name: string) => void;
}

export function OpenAPISpecList({ specs, onSelect }: OpenAPISpecListProps) {
  if (specs.length === 0) {
    return (
      <Box padding={1}>
        <Text dimColor>No cached OpenAPI specs. Use `shiba oapi add` and `shiba oapi fetch` to cache specs.</Text>
      </Box>
    );
  }

  const items = specs.map((s) => ({
    label: `${s.name} - ${s.title} v${s.version}  (${s.pathCount} paths, ${s.schemaCount} schemas)`,
    value: s.name,
    key: s.name,
  }));

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Cached OpenAPI Specs ({specs.length})</Text>
      <Box marginTop={1}>
        <SelectInput
          items={items}
          onSelect={(item) => onSelect(item.value)}
        />
      </Box>
    </Box>
  );
}
