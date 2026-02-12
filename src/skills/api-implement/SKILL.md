---
name: api-implement
description: "Guides API implementation using OpenAPI specs. Use when the user says 'implement endpoint', 'build API', 'scaffold from spec', 'create endpoint for', or wants to implement backend functionality from an OpenAPI specification."
version: 1.0.0
---

# API Implementation Workflow

You are implementing an API endpoint guided by OpenAPI specification.

## Step 1: Identify the Endpoint

Extract from user's message:
- HTTP method (GET, POST, PUT, DELETE, PATCH)
- Path pattern (e.g., `/api/users`, `/api/orders/{id}`)
- Operation description

If unclear, ask the user to specify.

## Step 2: Search OpenAPI Specs

List available specs:
```bash
shiba oapi list
```

Search for the endpoint:
```bash
shiba oapi path "<path-pattern>"
```

If multiple specs, specify:
```bash
shiba oapi path "<path-pattern>" --spec <spec-name>
```

## Step 3: Extract Endpoint Details

Get the full endpoint definition:
```bash
shiba oapi path "<exact-path>" --spec <spec-name>
```

This provides:
- HTTP method and path
- Operation ID
- Parameters (path, query, header)
- Request body schema
- Response schemas (by status code)
- Description and tags

## Step 4: Get Referenced Schemas

For request/response bodies, fetch the full schemas:
```bash
shiba oapi schema <SchemaName> --spec <spec-name>
```

Document in the tracked issue if one exists:
```bash
shiba issue add-api --key <KEY> \
  --method <METHOD> \
  --path "<path>" \
  --description "<from spec>"
```

## Step 5: Generate Type Definitions

From the schemas, create TypeScript interfaces:

```typescript
// Request body type (if applicable)
interface CreateUserRequest {
  name: string;
  email: string;
  role?: 'admin' | 'user';
}

// Response type
interface UserResponse {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

// Error response (if defined)
interface ErrorResponse {
  code: string;
  message: string;
}
```

## Step 6: Scaffold Endpoint

Based on project patterns, create the endpoint structure:

**Identify existing patterns**:
- Look for similar endpoints in the codebase
- Check routing setup (Express, Fastify, etc.)
- Find validation patterns
- Identify response formatting conventions

**Generate skeleton**:
```typescript
// Example Express pattern
router.post('/api/users',
  validateBody(CreateUserSchema),
  async (req, res) => {
    const body: CreateUserRequest = req.body;

    // TODO: Implement business logic

    res.status(201).json(response);
  }
);
```

## Step 7: Document Context

If working on a tracked issue, save the API context:
```bash
shiba issue add-api --key <KEY> \
  --method POST \
  --path "/api/users" \
  --description "Creates a new user account"

shiba issue add-context --key <KEY> \
  --type file \
  --path "src/routes/users.ts" \
  --description "User routes file" \
  --relevance "Add new endpoint here"
```

## Step 8: Implementation Guidance

Provide structured implementation steps:

1. **Types**: Create/update type definitions
2. **Validation**: Add request validation schema
3. **Handler**: Implement the endpoint handler
4. **Service**: Business logic in service layer
5. **Tests**: Add endpoint tests
6. **Documentation**: Update API docs if manual

## Step 9: Validate Against Spec

After implementation, verify:
- Request body matches schema
- Response matches defined schema
- All required parameters are handled
- Error responses follow spec format
- Status codes match spec

## Important Rules

- **Spec is source of truth** - Don't deviate without documenting why
- **Follow existing patterns** - Match project's code style
- **Type everything** - Generate proper TypeScript types
- **Validate inputs** - Never trust incoming data
- **Handle all status codes** - Spec defines expected responses
- **Document deviations** - If spec is wrong/incomplete, note it
