import type { OpenAPISpecConfig } from "@shiba-agent/shared";
import yaml from "yaml";
import type { OpenAPISpec } from "./types.js";

export async function fetchSpec(config: OpenAPISpecConfig): Promise<OpenAPISpec> {
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
  const contentType = response.headers.get("content-type") ?? "";

  // Determine if YAML or JSON based on content-type or URL
  const isYaml =
    contentType.includes("yaml") ||
    config.url.endsWith(".yaml") ||
    config.url.endsWith(".yml");

  if (isYaml) {
    return yaml.parse(text) as OpenAPISpec;
  }

  return JSON.parse(text) as OpenAPISpec;
}
