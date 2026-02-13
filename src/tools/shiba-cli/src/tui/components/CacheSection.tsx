import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import { useOpenAPISpecs } from "../hooks/useOpenAPISpecs.js";
import { useFigmaCache } from "../hooks/useFigmaCache.js";
import { OpenAPISpecList } from "./OpenAPISpecList.js";
import { OpenAPISpecDetail } from "./OpenAPISpecDetail.js";
import { FigmaCacheList } from "./FigmaCacheList.js";
import { FigmaCacheDetail } from "./FigmaCacheDetail.js";
import type { CacheEntity } from "../types.js";
import type { CachedSpec } from "../../openapi/types.js";
import type { CachedFigmaFile } from "../../figma/types.js";

interface CacheSectionProps {
  onViewChange: (view: "list" | "detail") => void;
}

const ENTITY_ITEMS = [
  { label: "OpenAPI Specs", value: "openapi" as CacheEntity, key: "openapi" },
  { label: "Figma Files", value: "figma" as CacheEntity, key: "figma" },
];

export function CacheSection({ onViewChange }: CacheSectionProps) {
  const [entity, setEntity] = useState<CacheEntity | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [detailSpec, setDetailSpec] = useState<CachedSpec | null>(null);
  const [detailFigma, setDetailFigma] = useState<CachedFigmaFile | null>(null);

  const oapiSpecs = useOpenAPISpecs();
  const figmaCache = useFigmaCache();

  useInput((_input, key) => {
    if (key.escape) {
      if (selectedKey) {
        setSelectedKey(null);
        setDetailSpec(null);
        setDetailFigma(null);
        onViewChange("list");
      } else if (entity) {
        setEntity(null);
        onViewChange("list");
      }
    }
  });

  // Entity menu
  if (!entity) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>Cache Browser</Text>
        <Box marginTop={1}>
          <SelectInput
            items={ENTITY_ITEMS}
            onSelect={(item) => {
              setEntity(item.value);
              onViewChange("list");
            }}
          />
        </Box>
      </Box>
    );
  }

  // OpenAPI
  if (entity === "openapi") {
    if (selectedKey && detailSpec) {
      return <OpenAPISpecDetail name={selectedKey} cached={detailSpec} />;
    }

    if (oapiSpecs.loading) {
      return (
        <Box padding={1}>
          <Text color="yellow"><Spinner type="dots" /> Loading OpenAPI specs...</Text>
        </Box>
      );
    }

    if (oapiSpecs.error) {
      return (
        <Box padding={1}>
          <Text color="red">Error: {oapiSpecs.error}</Text>
        </Box>
      );
    }

    return (
      <OpenAPISpecList
        specs={oapiSpecs.specs}
        onSelect={(name) => {
          const full = oapiSpecs.getFullSpec(name);
          if (full) {
            setSelectedKey(name);
            setDetailSpec(full);
            onViewChange("detail");
          }
        }}
      />
    );
  }

  // Figma
  if (entity === "figma") {
    if (selectedKey && detailFigma) {
      return <FigmaCacheDetail fileKey={selectedKey} cached={detailFigma} />;
    }

    if (figmaCache.loading) {
      return (
        <Box padding={1}>
          <Text color="yellow"><Spinner type="dots" /> Loading Figma cache...</Text>
        </Box>
      );
    }

    if (figmaCache.error) {
      return (
        <Box padding={1}>
          <Text color="red">Error: {figmaCache.error}</Text>
        </Box>
      );
    }

    return (
      <FigmaCacheList
        files={figmaCache.files}
        onSelect={(fileKey) => {
          const full = figmaCache.getFullFile(fileKey);
          if (full) {
            setSelectedKey(fileKey);
            setDetailFigma(full);
            onViewChange("detail");
          }
        }}
      />
    );
  }

  return null;
}
