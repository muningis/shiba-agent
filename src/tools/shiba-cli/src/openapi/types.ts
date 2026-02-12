// Simplified OpenAPI 3.x types for our use case

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, SchemaObject>;
    parameters?: Record<string, ParameterObject>;
    requestBodies?: Record<string, RequestBodyObject>;
    responses?: Record<string, ResponseObject>;
  };
}

export interface PathItem {
  summary?: string;
  description?: string;
  get?: OperationObject;
  post?: OperationObject;
  put?: OperationObject;
  patch?: OperationObject;
  delete?: OperationObject;
  options?: OperationObject;
  head?: OperationObject;
  parameters?: ParameterObject[];
}

export interface OperationObject {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: ParameterObject[];
  requestBody?: RequestBodyObject | ReferenceObject;
  responses: Record<string, ResponseObject | ReferenceObject>;
  deprecated?: boolean;
}

export interface ParameterObject {
  name: string;
  in: "query" | "header" | "path" | "cookie";
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  schema?: SchemaObject | ReferenceObject;
}

export interface RequestBodyObject {
  description?: string;
  required?: boolean;
  content: Record<string, MediaTypeObject>;
}

export interface ResponseObject {
  description: string;
  content?: Record<string, MediaTypeObject>;
}

export interface MediaTypeObject {
  schema?: SchemaObject | ReferenceObject;
}

export interface SchemaObject {
  type?: string;
  format?: string;
  description?: string;
  properties?: Record<string, SchemaObject | ReferenceObject>;
  items?: SchemaObject | ReferenceObject;
  required?: string[];
  enum?: unknown[];
  allOf?: Array<SchemaObject | ReferenceObject>;
  oneOf?: Array<SchemaObject | ReferenceObject>;
  anyOf?: Array<SchemaObject | ReferenceObject>;
  $ref?: string;
}

export interface ReferenceObject {
  $ref: string;
}

// Query result types
export interface PathMatch {
  spec: string;
  path: string;
  methods: Record<string, MethodSummary>;
}

export interface MethodSummary {
  summary?: string;
  description?: string;
  operationId?: string;
  parameters: ParameterSummary[];
  requestBody?: RequestBodySummary;
  responses: Record<string, ResponseSummary>;
}

export interface ParameterSummary {
  name: string;
  in: string;
  required: boolean;
  type?: string;
  description?: string;
}

export interface RequestBodySummary {
  required: boolean;
  contentType: string;
  schema?: string; // Schema name or inline type description
}

export interface ResponseSummary {
  description: string;
  contentType?: string;
  schema?: string;
}

export interface SchemaSummary {
  spec: string;
  name: string;
  type?: string;
  description?: string;
  properties?: Record<string, PropertySummary>;
  required?: string[];
}

export interface PropertySummary {
  type?: string;
  format?: string;
  description?: string;
  required: boolean;
}

export interface SearchResult {
  spec: string;
  type: "path" | "schema";
  name: string;
  match: string; // The text that matched
  context?: string; // Additional context
}

// Cached spec with metadata
export interface CachedSpec {
  spec: OpenAPISpec;
  fetchedAt: string;
}
