import { useState, useEffect, useCallback } from "react";
import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { getFigmaDir } from "@shiba-agent/shared";
import type { CachedFigmaFile } from "../../figma/types.js";

export interface FigmaCacheSummary {
  fileKey: string;
  name: string;
  version: string;
  componentCount: number;
  styleCount: number;
  fetchedAt: string;
}

interface UseFigmaCacheResult {
  files: FigmaCacheSummary[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  getFullFile: (fileKey: string) => CachedFigmaFile | null;
}

function listCachedFigmaFiles(): string[] {
  const dir = getFigmaDir();
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""));
}

function loadCachedFigmaFile(fileKey: string): CachedFigmaFile | null {
  const path = join(getFigmaDir(), `${fileKey}.json`);
  if (!existsSync(path)) return null;

  try {
    const content = readFileSync(path, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export function useFigmaCache(): UseFigmaCacheResult {
  const [files, setFiles] = useState<FigmaCacheSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      const keys = listCachedFigmaFiles();
      const items: FigmaCacheSummary[] = [];
      for (const fileKey of keys) {
        const cached = loadCachedFigmaFile(fileKey);
        if (cached) {
          items.push({
            fileKey,
            name: cached.file.name,
            version: cached.file.version,
            componentCount: Object.keys(cached.file.components ?? {}).length,
            styleCount: Object.keys(cached.file.styles ?? {}).length,
            fetchedAt: cached.fetchedAt,
          });
        }
      }
      items.sort((a, b) => a.name.localeCompare(b.name));
      setFiles(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Figma cache");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const getFullFile = useCallback((fileKey: string): CachedFigmaFile | null => {
    return loadCachedFigmaFile(fileKey);
  }, []);

  return { files, loading, error, refresh: load, getFullFile };
}
