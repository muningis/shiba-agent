import type { OpenAPISpecConfig } from "@shiba-agent/shared";
import { dereference, validate } from "@scalar/openapi-parser";
import type { OpenAPISpec } from "./types.js";

export interface FetchResult {
  spec: OpenAPISpec;
  valid: boolean;
  errors?: string[];
}

export async function fetchSpec(config: OpenAPISpecConfig): Promise<OpenAPISpec> {
  const result = await fetchAndValidateSpec(config);
  return result.spec;
}

export async function fetchAndValidateSpec(config: OpenAPISpecConfig): Promise<FetchResult> {
  const headers: Record<string, string> = {
    Accept: "application/json, application/yaml, text/yaml, */*",
  };

  if (config.auth) {
    switch (config.auth.type) {
      case "bearer":
        if (config.auth.token) {
          headers["Authorization"] = `Bearer ${config.auth.token}`;
        }
        break;
      case "basic":
        if (config.auth.username && config.auth.password) {
          const encoded = Buffer.from(
            `${config.auth.username}:${config.auth.password}`
          ).toString("base64");
          headers["Authorization"] = `Basic ${encoded}`;
        }
        break;
      case "apikey":
        if (config.auth.token) {
          const headerName = config.auth.headerName ?? "X-API-Key";
          headers[headerName] = config.auth.token;
        }
        break;
    }
  }

  const response = await fetch(config.url, { headers });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch spec: ${response.status} ${response.statusText}`
    );
  }

  const text = await response.text();

  // Use @scalar/openapi-parser for validation and dereferencing
  // It handles both JSON and YAML automatically
  const validation = await validate(text);

  const errors = validation.errors?.map((e) => e.message) ?? [];

  // Dereference to resolve all $ref pointers
  const { schema } = await dereference(text);

  return {
    spec: schema as unknown as OpenAPISpec,
    valid: validation.valid,
    errors: errors.length > 0 ? errors : undefined,
  };
}
