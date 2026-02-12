import type {
  OpenAPISpec,
  PathItem,
  OperationObject,
  SchemaObject,
  ReferenceObject,
  ParameterObject,
  PathMatch,
  MethodSummary,
  ParameterSummary,
  SchemaSummary,
  PropertySummary,
  SearchResult,
} from "./types.js";

const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "options", "head"] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

/**
 * Find paths matching a pattern (supports * glob)
 */
export function findPathsByPattern(
  spec: OpenAPISpec,
  pattern: string,
  specName: string
): PathMatch[] {
  const regex = patternToRegex(pattern);
  const matches: PathMatch[] = [];

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    if (regex.test(path)) {
      const methods: Record<string, MethodSummary> = {};

      for (const method of HTTP_METHODS) {
        const operation = pathItem[method];
        if (operation) {
          methods[method] = operationToSummary(spec, operation, pathItem.parameters);
        }
      }

      if (Object.keys(methods).length > 0) {
        matches.push({ spec: specName, path, methods });
      }
    }
  }

  return matches;
}

/**
 * Find a schema by name
 */
export function findSchema(
  spec: OpenAPISpec,
  name: string,
  specName: string
): SchemaSummary | null {
  const schema = spec.components?.schemas?.[name];
  if (!schema) return null;

  return schemaToSummary(spec, name, schema, specName);
}

/**
 * List all schema names
 */
export function listSchemas(spec: OpenAPISpec, specName: string): string[] {
  return Object.keys(spec.components?.schemas ?? {});
}

/**
 * Search across paths and schemas
 */
export function searchSpec(
  spec: OpenAPISpec,
  query: string,
  specName: string,
  type?: "path" | "schema"
): SearchResult[] {
  const results: SearchResult[] = [];
  const lowerQuery = query.toLowerCase();

  // Search paths
  if (!type || type === "path") {
    for (const [path, pathItem] of Object.entries(spec.paths)) {
      // Match path itself
      if (path.toLowerCase().includes(lowerQuery)) {
        results.push({
          spec: specName,
          type: "path",
          name: path,
          match: path,
        });
        continue;
      }

      // Match operation details
      for (const method of HTTP_METHODS) {
        const operation = pathItem[method];
        if (!operation) continue;

        const matchText = findOperationMatch(operation, lowerQuery);
        if (matchText) {
          results.push({
            spec: specName,
            type: "path",
            name: `${method.toUpperCase()} ${path}`,
            match: matchText,
            context: operation.summary,
          });
        }
      }
    }
  }

  // Search schemas
  if (!type || type === "schema") {
    for (const [name, schema] of Object.entries(spec.components?.schemas ?? {})) {
      if (name.toLowerCase().includes(lowerQuery)) {
        results.push({
          spec: specName,
          type: "schema",
          name,
          match: name,
          context: (schema as SchemaObject).description,
        });
        continue;
      }

      const schemaObj = schema as SchemaObject;
      if (schemaObj.description?.toLowerCase().includes(lowerQuery)) {
        results.push({
          spec: specName,
          type: "schema",
          name,
          match: schemaObj.description,
        });
      }
    }
  }

  return results;
}

/**
 * Resolve a $ref to its target
 */
export function resolveRef(spec: OpenAPISpec, ref: string): unknown {
  if (!ref.startsWith("#/")) {
    return null; // External refs not supported
  }

  const parts = ref.slice(2).split("/");
  let current: unknown = spec;

  for (const part of parts) {
    if (current === null || typeof current !== "object") {
      return null;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Get schema name from $ref
 */
export function getRefName(ref: string): string {
  const parts = ref.split("/");
  return parts[parts.length - 1];
}

// Helper functions

function patternToRegex(pattern: string): RegExp {
  // Escape regex special chars except *
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  // Convert * to .*
  const regexPattern = escaped.replace(/\*/g, ".*");
  return new RegExp(`^${regexPattern}$`);
}

function operationToSummary(
  spec: OpenAPISpec,
  operation: OperationObject,
  pathParams?: ParameterObject[]
): MethodSummary {
  const allParams = [...(pathParams ?? []), ...(operation.parameters ?? [])];

  const parameters: ParameterSummary[] = allParams.map((p) => ({
    name: p.name,
    in: p.in,
    required: p.required ?? false,
    type: getSchemaType(spec, p.schema),
    description: p.description,
  }));

  let requestBody = undefined;
  if (operation.requestBody) {
    const body = isRef(operation.requestBody)
      ? (resolveRef(spec, operation.requestBody.$ref) as typeof operation.requestBody)
      : operation.requestBody;

    if (body && "content" in body) {
      const contentType = Object.keys(body.content)[0] ?? "application/json";
      const mediaType = body.content[contentType];
      requestBody = {
        required: body.required ?? false,
        contentType,
        schema: getSchemaType(spec, mediaType?.schema),
      };
    }
  }

  const responses: Record<string, { description: string; contentType?: string; schema?: string }> = {};
  for (const [code, response] of Object.entries(operation.responses)) {
    const resp = isRef(response) ? (resolveRef(spec, response.$ref) as typeof response) : response;
    if (resp && "description" in resp) {
      const contentType = resp.content ? Object.keys(resp.content)[0] : undefined;
      const mediaType = contentType ? resp.content?.[contentType] : undefined;
      responses[code] = {
        description: resp.description,
        contentType,
        schema: mediaType ? getSchemaType(spec, mediaType.schema) : undefined,
      };
    }
  }

  return {
    summary: operation.summary,
    description: operation.description,
    operationId: operation.operationId,
    parameters,
    requestBody,
    responses,
  };
}

function schemaToSummary(
  spec: OpenAPISpec,
  name: string,
  schema: SchemaObject | ReferenceObject,
  specName: string
): SchemaSummary {
  if (isRef(schema)) {
    const resolved = resolveRef(spec, schema.$ref) as SchemaObject;
    return schemaToSummary(spec, getRefName(schema.$ref), resolved, specName);
  }

  const properties: Record<string, PropertySummary> = {};
  const requiredSet = new Set(schema.required ?? []);

  for (const [propName, propSchema] of Object.entries(schema.properties ?? {})) {
    const prop = isRef(propSchema)
      ? (resolveRef(spec, propSchema.$ref) as SchemaObject)
      : propSchema;

    properties[propName] = {
      type: getSchemaType(spec, propSchema),
      format: prop?.format,
      description: prop?.description,
      required: requiredSet.has(propName),
    };
  }

  return {
    spec: specName,
    name,
    type: schema.type,
    description: schema.description,
    properties: Object.keys(properties).length > 0 ? properties : undefined,
    required: schema.required,
  };
}

function getSchemaType(
  spec: OpenAPISpec,
  schema?: SchemaObject | ReferenceObject
): string | undefined {
  if (!schema) return undefined;

  if (isRef(schema)) {
    return getRefName(schema.$ref);
  }

  if (schema.type === "array" && schema.items) {
    const itemType = getSchemaType(spec, schema.items);
    return itemType ? `${itemType}[]` : "array";
  }

  if (schema.allOf) {
    return schema.allOf.map((s) => getSchemaType(spec, s)).join(" & ");
  }

  if (schema.oneOf) {
    return schema.oneOf.map((s) => getSchemaType(spec, s)).join(" | ");
  }

  return schema.type;
}

function isRef(obj: unknown): obj is ReferenceObject {
  return typeof obj === "object" && obj !== null && "$ref" in obj;
}

function findOperationMatch(operation: OperationObject, query: string): string | null {
  if (operation.summary?.toLowerCase().includes(query)) {
    return operation.summary;
  }
  if (operation.description?.toLowerCase().includes(query)) {
    return operation.description;
  }
  if (operation.operationId?.toLowerCase().includes(query)) {
    return operation.operationId;
  }
  return null;
}
