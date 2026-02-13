import React from "react";
import { Box, Text } from "ink";
import { ScrollView } from "./ScrollView.js";
import type { CachedFigmaFile } from "../../figma/types.js";

interface FigmaCacheDetailProps {
  fileKey: string;
  cached: CachedFigmaFile;
}

export function FigmaCacheDetail({ fileKey, cached }: FigmaCacheDetailProps) {
  const file = cached.file;
  const components = Object.entries(file.components ?? {});
  const styles = Object.entries(file.styles ?? {});

  return (
    <ScrollView>
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Text bold color="cyan">{file.name}</Text>
      <Box flexDirection="row" gap={2}>
        <Box>
          <Text dimColor>Version: </Text>
          <Text>{file.version}</Text>
        </Box>
        <Box>
          <Text dimColor>Key: </Text>
          <Text>{fileKey}</Text>
        </Box>
      </Box>
      <Text dimColor>Fetched: {new Date(cached.fetchedAt).toLocaleString()}</Text>

      {/* Components */}
      <Box marginTop={1} flexDirection="column">
        <Text bold color="yellow">Components ({components.length})</Text>
        {components.length === 0 ? (
          <Box marginLeft={1}>
            <Text dimColor>No components</Text>
          </Box>
        ) : (
          <Box marginLeft={1} flexDirection="column">
            {components.slice(0, 20).map(([key, comp]) => (
              <Box key={key}>
                <Text color="cyan">{comp.name}</Text>
                {comp.description && <Text dimColor> - {comp.description.substring(0, 60)}</Text>}
              </Box>
            ))}
            {components.length > 20 && (
              <Box>
                <Text dimColor>...and {components.length - 20} more</Text>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Styles */}
      <Box marginTop={1} flexDirection="column">
        <Text bold color="yellow">Styles ({styles.length})</Text>
        {styles.length === 0 ? (
          <Box marginLeft={1}>
            <Text dimColor>No styles</Text>
          </Box>
        ) : (
          <Box marginLeft={1} flexDirection="column">
            {styles.slice(0, 20).map(([key, style]) => (
              <Box key={key}>
                <Text dimColor>[{style.styleType}] </Text>
                <Text>{style.name}</Text>
                {style.description && <Text dimColor> - {style.description.substring(0, 60)}</Text>}
              </Box>
            ))}
            {styles.length > 20 && (
              <Box>
                <Text dimColor>...and {styles.length - 20} more</Text>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
    </ScrollView>
  );
}
