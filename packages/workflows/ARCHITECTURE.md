# @netpad/workflows Architecture Guide

This document explains the architecture and design of the `@netpad/workflows` package for engineers who want to understand, contribute to, or extend the codebase.

## Overview

`@netpad/workflows` is a TypeScript client library that enables developers to programmatically interact with NetPad's workflow APIs. It provides type-safe methods for managing workflows, executing them, and monitoring execution status.

### Core Capabilities

1. **Workflow Management** - Create, read, update, delete, and manage workflow status
2. **Workflow Execution** - Trigger workflow executions and monitor their progress
3. **Execution Management** - Get execution details, retry failed executions, cancel running executions
4. **Type Safety** - Full TypeScript support with exported types

---

## Package Structure

```
packages/workflows/
├── src/
│   ├── index.ts              # Main entry point (exports)
│   ├── client.ts             # API client implementation
│   └── types/
│       └── index.ts          # TypeScript type definitions
├── package.json
├── tsconfig.json
├── tsup.config.ts            # Build configuration
└── README.md                 # User documentation
```

---

## Core Concepts

### 1. Client Configuration

The client requires three configuration parameters:

```typescript
interface NetPadWorkflowClientConfig {
  baseUrl: string;           // NetPad API base URL
  apiKey: string;            // API key for authentication
  organizationId: string;    // Organization ID (required for most operations)
}
```

**Key points:**
- `baseUrl` should not include a trailing slash (automatically handled)
- `apiKey` format: `np_live_xxx` (production) or `np_test_xxx` (testing)
- `organizationId` is required for all workflow operations

### 2. API Request Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Method Call                       │
│  client.executeWorkflow('workflow-123', { payload })       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Build Request                              │
│  - Construct URL with workflow ID                           │
│  - Add query parameters (orgId, etc.)                       │
│  - Serialize request body                                   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  HTTP Request                               │
│  - Add Authorization header (Bearer token)                  │
│  - Set Content-Type: application/json                       │
│  - Send POST/PATCH/GET/DELETE request                       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Response Handling                          │
│  - Check response.ok                                        │
│  - Parse JSON response                                      │
│  - Handle errors (throw NetPadWorkflowError)                │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Return Typed Response                      │
│  ExecuteWorkflowResponse { executionId, status, ... }      │
└─────────────────────────────────────────────────────────────┘
```

### 3. Error Handling

The client uses a custom error class `NetPadWorkflowError`:

```typescript
export class NetPadWorkflowError extends Error {
  statusCode?: number;      // HTTP status code
  code?: string;            // API error code (e.g., 'LIMIT_EXCEEDED')
  name: 'NetPadWorkflowError';
}
```

**Error handling flow:**
1. API returns non-2xx status code
2. Client attempts to parse error response JSON
3. Throws `NetPadWorkflowError` with status code and error message
4. Caller can check `error.statusCode` and `error.code` for specific handling

---

## API Client Architecture

### Request Method

The private `request` method handles all HTTP communication:

```typescript
private async request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T>
```

**Features:**
- Prepends base URL
- Adds Authorization header
- Sets Content-Type header
- Handles JSON serialization/deserialization
- Throws `NetPadWorkflowError` on failure
- Returns typed response

### Query String Building

The `buildQueryString` helper method:

```typescript
private buildQueryString(params: Record<string, unknown>): string
```

**Features:**
- Filters out undefined/null values
- Handles array values (multiple query params with same key)
- Returns properly encoded query string

### Method Categories

The client methods are organized into categories:

1. **Workflow Management** - CRUD operations on workflows
2. **Workflow Execution** - Trigger and monitor executions
3. **Convenience Methods** - Helper methods (activate, pause, waitForExecution)

---

## API Endpoints

The client wraps the following NetPad API endpoints:

### Workflow Management

| Method | Endpoint | Client Method |
|--------|----------|---------------|
| GET | `/api/workflows?orgId=xxx` | `listWorkflows()` |
| POST | `/api/workflows` | `createWorkflow()` |
| GET | `/api/workflows/{id}?orgId=xxx` | `getWorkflow()` |
| PATCH | `/api/workflows/{id}` | `updateWorkflow()` |
| DELETE | `/api/workflows/{id}?orgId=xxx` | `deleteWorkflow()` |
| PATCH | `/api/workflows/{id}/status` | `updateWorkflowStatus()` |

### Workflow Execution

| Method | Endpoint | Client Method |
|--------|----------|---------------|
| POST | `/api/workflows/{id}/execute` | `executeWorkflow()` |
| GET | `/api/workflows/{id}/executions` | `listExecutions()` |
| GET | `/api/workflows/{id}/executions/{execId}` | `getExecution()` |
| POST | `/api/workflows/{id}/executions/{execId}` | `retryExecution()`, `cancelExecution()` |
| GET | `/api/executions/{execId}` | `getExecutionStatus()` |

---

## Types Architecture

### Type Definitions

Types are defined in `src/types/index.ts` and mirror the API request/response structures:

1. **Core Workflow Types** - `WorkflowDocument`, `WorkflowStatus`, `WorkflowCanvas`, etc.
2. **Node Types** - `WorkflowNode`, `WorkflowEdge`, etc.
3. **Execution Types** - `WorkflowExecution`, `ExecutionStatus`, `ExecutionLog`, etc.
4. **API Request/Response Types** - `ListWorkflowsOptions`, `ExecuteWorkflowResponse`, etc.

### Type Exports

Types are exported in two ways:

1. **Main export** - All types from `@netpad/workflows`
2. **Types-only export** - `@netpad/workflows/types` (for type-only imports)

This allows:
- Importing types without the client code
- Smaller bundles when only types are needed
- Sharing types between client and server code

---

## Build & Distribution

### Build Configuration (tsup)

The package uses `tsup` for building:

```typescript
// tsup.config.ts
export default defineConfig({
  entry: ['src/index.ts', 'src/types/index.ts'],
  format: ['cjs', 'esm'],    // CommonJS and ES Modules
  dts: true,                  // Generate .d.ts files
  sourcemap: true,            // Generate source maps
  clean: true,                // Clean output directory
  treeshake: true,            // Tree-shaking optimization
});
```

**Output:**
```
dist/
├── index.js          # CommonJS
├── index.mjs         # ES Module
├── index.d.ts        # TypeScript declarations
├── types/
│   ├── index.js
│   ├── index.mjs
│   └── index.d.ts
```

### Package Exports

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    },
    "./types": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/types/index.mjs",
      "require": "./dist/types/index.js"
    }
  }
}
```

---

## Design Decisions

### Why Client-Side Only?

The client is designed for use in Node.js or browser environments:
- No React dependencies (unlike `@netpad/forms`)
- Uses standard `fetch` API (polyfill needed for Node < 18)
- Minimal dependencies (only TypeScript types)

### Why TypeScript-First?

- Type safety prevents common API usage errors
- IntelliSense/autocomplete improves developer experience
- Types serve as documentation

### Why No Utilities?

Unlike `@netpad/forms`, this package doesn't include utility functions:
- Workflows are executed server-side
- Variable substitution and validation happen server-side
- Client focuses on API communication only

### Why Polling for `waitForExecution`?

The `waitForExecution` method uses polling rather than WebSockets:
- Simpler implementation (no WebSocket dependencies)
- Works in all environments (Node.js, browser)
- Sufficient for most use cases
- Users can implement WebSocket-based polling if needed

---

## Extension Points

### Adding a New API Method

1. **Add the method to the client class:**
```typescript
async newMethod(param: string): Promise<ResponseType> {
  return this.request<ResponseType>(`/api/new-endpoint/${param}`);
}
```

2. **Add types if needed:**
```typescript
export interface NewMethodResponse {
  // ...
}
```

3. **Export types from index.ts:**
```typescript
export type { NewMethodResponse } from './types';
```

4. **Update documentation:**
- Add to README.md API Reference
- Add example usage

### Custom Error Handling

The client throws `NetPadWorkflowError` by default, but you can wrap methods:

```typescript
async function executeWithRetry(
  client: NetPadWorkflowClient,
  workflowId: string,
  options: ExecuteWorkflowOptions
) {
  let lastError;
  for (let i = 0; i < 3; i++) {
    try {
      return await client.executeWorkflow(workflowId, options);
    } catch (error) {
      lastError = error;
      if (error instanceof NetPadWorkflowError && error.statusCode === 429) {
        // Rate limited - wait and retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}
```

### Custom Request Interceptors

While the client doesn't support interceptors out of the box, you can extend it:

```typescript
class ExtendedClient extends NetPadWorkflowClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Add custom headers
    options.headers = {
      ...options.headers,
      'X-Custom-Header': 'value',
    };

    // Log requests
    console.log(`[Workflow API] ${options.method || 'GET'} ${endpoint}`);

    return super.request(endpoint, options);
  }
}
```

---

## Testing Considerations

When testing code that uses this client:

1. **Mock the client:**
```typescript
const mockClient = {
  executeWorkflow: jest.fn().mockResolvedValue({
    executionId: 'exec_123',
    status: 'pending',
  }),
  getExecutionStatus: jest.fn().mockResolvedValue({
    execution: { status: 'completed' },
  }),
};
```

2. **Test error handling:**
```typescript
import { NetPadWorkflowError } from '@netpad/workflows';

mockClient.executeWorkflow.mockRejectedValueOnce(
  new NetPadWorkflowError('Workflow not found', 404)
);
```

3. **Test async operations:**
```typescript
await expect(client.waitForExecution('exec_123')).resolves.toMatchObject({
  execution: { status: 'completed' },
});
```

---

## Common Patterns

### Execute and Monitor

```typescript
async function executeAndMonitor(
  client: NetPadWorkflowClient,
  workflowId: string,
  payload: Record<string, unknown>
) {
  const execution = await client.executeWorkflow(workflowId, { payload });
  
  // Poll until complete
  const result = await client.waitForExecution(execution.executionId, {
    intervalMs: 2000,
    timeoutMs: 600000,
  });
  
  return result.execution.result?.output;
}
```

### Batch Execution with Error Handling

```typescript
async function executeBatch(
  client: NetPadWorkflowClient,
  workflowId: string,
  items: Array<Record<string, unknown>>
) {
  const results = await Promise.allSettled(
    items.map(item => client.executeWorkflow(workflowId, { payload: item }))
  );
  
  const successful = results
    .filter((r): r is PromiseFulfilledResult<ExecuteWorkflowResponse> => 
      r.status === 'fulfilled'
    )
    .map(r => r.value);
  
  const failed = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(r => r.reason);
  
  return { successful, failed };
}
```

---

## Questions?

For questions or issues:
- Check the README.md for usage examples
- Review the type definitions in `src/types/index.ts`
- Open an issue in the NetPad repository
