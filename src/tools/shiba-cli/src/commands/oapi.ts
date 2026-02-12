import {
  loadGlobalConfig,
  saveGlobalConfig,
  successResponse,
  errorResponse,
  type OpenAPISpecConfig,
} from "@shiba-agent/shared";
import { getCachedSpec, cacheSpec, listCachedSpecs } from "../openapi/cache.js";
import { fetchSpec } from "../openapi/fetch.js";
import {
  findPathsByPattern,
  findSchema,
  listSchemas,
  searchSpec,
} from "../openapi/query.js";
import type { PathMatch, SchemaSummary, SearchResult } from "../openapi/types.js";

export async function oapiList(): Promise<void> {
  const config = loadGlobalConfig();
  const specs = config.openapi?.specs ?? {};
  const cached = listCachedSpecs();

  const result = Object.entries(specs).map(([name, cfg]) => ({
    name,
    url: cfg.url,
    hasAuth: !!cfg.auth,
    cached: cached.includes(name),
  }));

  successResponse({ specs: result });
}

export interface OapiAddOpts {
  name: string;
  url: string;
  authToken?: string;
  authType?: "bearer" | "basic" | "apikey";
  authHeader?: string;
}

export async function oapiAdd(opts: OapiAddOpts): Promise<void> {
  const config = loadGlobalConfig();

  if (!config.openapi) {
    config.openapi = { specs: {} };
  }
  if (!config.openapi.specs) {
    config.openapi.specs = {};
  }

  const specConfig: OpenAPISpecConfig = { url: opts.url };

  if (opts.authToken) {
    specConfig.auth = {
      type: opts.authType ?? "bearer",
      token: opts.authToken,
    };
    if (opts.authType === "apikey" && opts.authHeader) {
      specConfig.auth.headerName = opts.authHeader;
    }
  }

  config.openapi.specs[opts.name] = specConfig;
  saveGlobalConfig(config);

  successResponse({
    message: `Added OpenAPI spec '${opts.name}'`,
    name: opts.name,
    url: opts.url,
  });
}

export interface OapiFetchOpts {
  name?: string;
  all?: boolean;
}

export async function oapiFetch(opts: OapiFetchOpts): Promise<void> {
  const config = loadGlobalConfig();
  const specs = config.openapi?.specs ?? {};

  if (Object.keys(specs).length === 0) {
    errorResponse("NO_SPECS", "No OpenAPI specs configured.", {
      hint: "Use 'shiba oapi add --name <name> --url <url>' to add a spec.",
    });
  }

  const toFetch: [string, OpenAPISpecConfig][] = [];

  if (opts.all) {
    toFetch.push(...Object.entries(specs));
  } else if (opts.name) {
    const specConfig = specs[opts.name];
    if (!specConfig) {
      errorResponse("SPEC_NOT_FOUND", `OpenAPI spec '${opts.name}' not found.`, {
        available: Object.keys(specs),
      });
    }
    toFetch.push([opts.name, specConfig]);
  } else {
    errorResponse("MISSING_OPTION", "Specify --name or --all.", {
      hint: "Use --name <name> to fetch a specific spec or --all to fetch all.",
    });
  }

  const results: Array<{ name: string; success: boolean; error?: string }> = [];

  for (const [name, specConfig] of toFetch) {
    try {
      const spec = await fetchSpec(specConfig);
      cacheSpec(name, spec);
      results.push({ name, success: true });
    } catch (err) {
      results.push({
        name,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  successResponse({ fetched: results });
}

export interface OapiPathOpts {
  pattern: string;
  spec?: string;
}

export async function oapiPath(opts: OapiPathOpts): Promise<void> {
  const matches: PathMatch[] = [];
  const specs = getSpecsToQuery(opts.spec);

  for (const [name, cached] of specs) {
    const pathMatches = findPathsByPattern(cached.spec, opts.pattern, name);
    matches.push(...pathMatches);
  }

  if (matches.length === 0) {
    successResponse({
      matches: [],
      message: `No paths matching '${opts.pattern}' found.`,
    });
    return;
  }

  successResponse({ matches });
}

export interface OapiSchemaOpts {
  name?: string;
  list?: boolean;
  spec?: string;
}

export async function oapiSchema(opts: OapiSchemaOpts): Promise<void> {
  const specs = getSpecsToQuery(opts.spec);

  if (opts.list) {
    const schemas: Array<{ spec: string; schemas: string[] }> = [];

    for (const [name, cached] of specs) {
      schemas.push({
        spec: name,
        schemas: listSchemas(cached.spec, name),
      });
    }

    successResponse({ schemas });
    return;
  }

  if (!opts.name) {
    errorResponse("MISSING_NAME", "Specify a schema name or use --list.", {
      hint: "Use 'shiba oapi schema User' or 'shiba oapi schema --list'.",
    });
  }

  const results: SchemaSummary[] = [];

  for (const [specName, cached] of specs) {
    const schema = findSchema(cached.spec, opts.name, specName);
    if (schema) {
      results.push(schema);
    }
  }

  if (results.length === 0) {
    successResponse({
      schemas: [],
      message: `Schema '${opts.name}' not found.`,
    });
    return;
  }

  successResponse({ schemas: results });
}

export interface OapiSearchOpts {
  query: string;
  type?: "path" | "schema";
  spec?: string;
}

export async function oapiSearch(opts: OapiSearchOpts): Promise<void> {
  const specs = getSpecsToQuery(opts.spec);
  const results: SearchResult[] = [];

  for (const [name, cached] of specs) {
    const searchResults = searchSpec(cached.spec, opts.query, name, opts.type);
    results.push(...searchResults);
  }

  successResponse({
    query: opts.query,
    type: opts.type ?? "all",
    results,
  });
}

export interface OapiRemoveOpts {
  name: string;
}

export async function oapiRemove(opts: OapiRemoveOpts): Promise<void> {
  const config = loadGlobalConfig();

  if (!config.openapi?.specs?.[opts.name]) {
    errorResponse("SPEC_NOT_FOUND", `OpenAPI spec '${opts.name}' not found.`);
  }

  delete config.openapi!.specs![opts.name];
  saveGlobalConfig(config);

  successResponse({
    message: `Removed OpenAPI spec '${opts.name}'`,
    name: opts.name,
  });
}

// Helper to get specs to query
function getSpecsToQuery(specName?: string) {
  const config = loadGlobalConfig();
  const configuredSpecs = config.openapi?.specs ?? {};
  const cachedNames = listCachedSpecs();

  const specsToQuery: Array<[string, ReturnType<typeof getCachedSpec>]> = [];

  if (specName) {
    if (!configuredSpecs[specName]) {
      errorResponse("SPEC_NOT_FOUND", `OpenAPI spec '${specName}' not found.`, {
        available: Object.keys(configuredSpecs),
      });
    }

    const cached = getCachedSpec(specName);
    if (!cached) {
      errorResponse("SPEC_NOT_CACHED", `OpenAPI spec '${specName}' not cached.`, {
        hint: `Run 'shiba oapi fetch --name ${specName}' to fetch it.`,
      });
    }

    specsToQuery.push([specName, cached]);
  } else {
    // Query all cached specs
    for (const name of cachedNames) {
      if (configuredSpecs[name]) {
        const cached = getCachedSpec(name);
        if (cached) {
          specsToQuery.push([name, cached]);
        }
      }
    }

    if (specsToQuery.length === 0) {
      errorResponse("NO_CACHED_SPECS", "No cached OpenAPI specs available.", {
        hint: "Run 'shiba oapi fetch --all' to fetch configured specs.",
      });
    }
  }

  return specsToQuery as Array<[string, NonNullable<ReturnType<typeof getCachedSpec>>]>;
}
