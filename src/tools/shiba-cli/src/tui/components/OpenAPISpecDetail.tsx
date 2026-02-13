import React from "react";
import { Box, Text } from "ink";
import type { CachedSpec } from "../../openapi/types.js";

interface OpenAPISpecDetailProps {
  name: string;
  cached: CachedSpec;
}

export function OpenAPISpecDetail({ name, cached }: OpenAPISpecDetailProps) {
  const spec = cached.spec;
  const paths = Object.entries(spec.paths ?? {});
  const schemaNames = Object.keys(spec.components?.schemas ?? {});

  // Group paths by first tag
  const taggedPaths: Record<string, string[]> = {};
  for (const [path, item] of paths) {
    const methods = ["get", "post", "put", "patch", "delete", "options", "head"] as const;
    let tagged = false;
    for (const method of methods) {
      const op = item[method];
      if (op?.tags?.[0]) {
        const tag = op.tags[0];
        if (!taggedPaths[tag]) taggedPaths[tag] = [];
        if (!taggedPaths[tag].includes(path)) taggedPaths[tag].push(path);
        tagged = true;
      }
    }
    if (!tagged) {
      if (!taggedPaths["untagged"]) taggedPaths["untagged"] = [];
      taggedPaths["untagged"].push(path);
    }
  }

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Text bold color="cyan">{name}</Text>
      <Text bold>{spec.info.title} v{spec.info.version}</Text>
      {spec.info.description && (
        <Text dimColor wrap="wrap">{spec.info.description.substring(0, 200)}</Text>
      )}
      <Text dimColor>Fetched: {new Date(cached.fetchedAt).toLocaleString()}</Text>

      {/* Servers */}
      {spec.servers && spec.servers.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="yellow">Servers</Text>
          {spec.servers.map((server, i) => (
            <Box key={i} marginLeft={1}>
              <Text>{server.url}</Text>
              {server.description && <Text dimColor> - {server.description}</Text>}
            </Box>
          ))}
        </Box>
      )}

      {/* Paths by Tag */}
      <Box marginTop={1} flexDirection="column">
        <Text bold color="yellow">Paths ({paths.length})</Text>
        {Object.entries(taggedPaths).sort(([a], [b]) => a.localeCompare(b)).map(([tag, tagPaths]) => (
          <Box key={tag} marginLeft={1} flexDirection="column">
            <Text color="magenta">{tag}</Text>
            {tagPaths.slice(0, 10).map((path) => {
              const item = spec.paths[path];
              const methods = (["get", "post", "put", "patch", "delete"] as const)
                .filter((m) => item[m])
                .map((m) => m.toUpperCase());
              return (
                <Box key={path} marginLeft={1}>
                  <Text color="green">{methods.join(",")}</Text>
                  <Text> {path}</Text>
                </Box>
              );
            })}
            {tagPaths.length > 10 && (
              <Box marginLeft={1}>
                <Text dimColor>...and {tagPaths.length - 10} more</Text>
              </Box>
            )}
          </Box>
        ))}
      </Box>

      {/* Schemas */}
      {schemaNames.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="yellow">Schemas ({schemaNames.length})</Text>
          <Box marginLeft={1} flexDirection="column">
            {schemaNames.slice(0, 20).map((name) => (
              <Box key={name} marginLeft={1}>
                <Text color="cyan">{name}</Text>
              </Box>
            ))}
            {schemaNames.length > 20 && (
              <Box marginLeft={1}>
                <Text dimColor>...and {schemaNames.length - 20} more</Text>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}
