import { useState, useEffect, useCallback } from "react";
import { listCachedSpecs, getCachedSpec } from "../../openapi/cache.js";
import type { CachedSpec } from "../../openapi/types.js";

export interface OpenAPISpecSummary {
  name: string;
  title: string;
  version: string;
  pathCount: number;
  schemaCount: number;
  fetchedAt: string;
}

interface UseOpenAPISpecsResult {
  specs: OpenAPISpecSummary[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  getFullSpec: (name: string) => CachedSpec | null;
}

export function useOpenAPISpecs(): UseOpenAPISpecsResult {
  const [specs, setSpecs] = useState<OpenAPISpecSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      const names = listCachedSpecs();
      const items: OpenAPISpecSummary[] = [];
      for (const name of names) {
        const cached = getCachedSpec(name);
        if (cached) {
          const pathCount = Object.keys(cached.spec.paths ?? {}).length;
          const schemaCount = Object.keys(cached.spec.components?.schemas ?? {}).length;
          items.push({
            name,
            title: cached.spec.info.title,
            version: cached.spec.info.version,
            pathCount,
            schemaCount,
            fetchedAt: cached.fetchedAt,
          });
        }
      }
      items.sort((a, b) => a.name.localeCompare(b.name));
      setSpecs(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load OpenAPI specs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const getFullSpec = useCallback((name: string): CachedSpec | null => {
    return getCachedSpec(name);
  }, []);

  return { specs, loading, error, refresh: load, getFullSpec };
}
