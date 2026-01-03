# @netpad/workflows

> Programmatically trigger and manage NetPad workflows from your applications.

[![npm version](https://badge.fury.io/js/@netpad%2Fworkflows.svg)](https://www.npmjs.com/package/@netpad/workflows)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Why @netpad/workflows?

NetPad workflows automate complex business processes, but you often need to trigger them from external systems, CI/CD pipelines, or server-side code. `@netpad/workflows` provides a type-safe TypeScript client for managing workflows programmatically.

## Installation

```bash
npm install @netpad/workflows
```

## Quick Start

```typescript
import { createNetPadWorkflowClient } from '@netpad/workflows';

const client = createNetPadWorkflowClient({
  baseUrl: 'https://your-netpad-instance.com',
  apiKey: 'np_live_xxx',
  organizationId: 'org_123',
});

// Execute a workflow
const execution = await client.executeWorkflow('employee-onboarding', {
  payload: {
    employeeId: 'emp_123',
    department: 'engineering',
  },
});

// Check execution status
const status = await client.getExecutionStatus(execution.executionId);
console.log(`Status: ${status.execution.status}`); // 'completed' | 'running' | 'failed'

// Get execution logs
if (status.execution.status === 'completed') {
  const logs = await status.logs;
  console.log('Execution logs:', logs);
}
```

## Features

- **Type-Safe API Client** - Full TypeScript support with exported types
- **Workflow Management** - Create, update, delete, and manage workflow status
- **Execution Control** - Trigger workflows, monitor execution status, retry failed executions
- **Async Support** - Built-in polling and wait utilities
- **Error Handling** - Comprehensive error types and handling

## API Reference

### Client Initialization

```typescript
import { createNetPadWorkflowClient, NetPadWorkflowClientConfig } from '@netpad/workflows';

const config: NetPadWorkflowClientConfig = {
  baseUrl: 'https://your-netpad-instance.com',
  apiKey: 'np_live_xxx', // or np_test_xxx for testing
  organizationId: 'org_123',
};

const client = createNetPadWorkflowClient(config);
```

### Workflow Management

#### List Workflows

```typescript
const { workflows, total, page, pageSize } = await client.listWorkflows({
  status: 'active',
  tags: ['automation', 'onboarding'],
  page: 1,
  pageSize: 20,
  sortBy: 'updatedAt',
  sortOrder: 'desc',
});
```

#### Get Workflow

```typescript
const workflow = await client.getWorkflow('workflow-123');
console.log(workflow.name, workflow.status);
```

#### Create Workflow

```typescript
const workflow = await client.createWorkflow({
  name: 'New Workflow',
  description: 'Automated process',
  tags: ['automation'],
});
```

#### Update Workflow

```typescript
const updated = await client.updateWorkflow('workflow-123', {
  name: 'Updated Name',
  description: 'New description',
  // Can also update canvas, settings, variables, tags
});
```

#### Update Workflow Status

```typescript
// Activate a workflow
await client.activateWorkflow('workflow-123');

// Pause a workflow
await client.pauseWorkflow('workflow-123');

// Archive a workflow
await client.archiveWorkflow('workflow-123');

// Or use the generic method
await client.updateWorkflowStatus('workflow-123', 'active');
```

#### Delete Workflow

```typescript
await client.deleteWorkflow('workflow-123');
// Note: Cannot delete active workflows. Pause or archive first.
```

### Workflow Execution

#### Execute Workflow

```typescript
const execution = await client.executeWorkflow('workflow-123', {
  payload: {
    userId: 'user_456',
    action: 'onboard',
    metadata: {
      source: 'api',
      timestamp: new Date().toISOString(),
    },
  },
});

console.log('Execution ID:', execution.executionId);
console.log('Status:', execution.status); // 'pending'
```

#### Get Execution Status

```typescript
// Get basic status
const status = await client.getExecutionStatus('execution-123');

// Get status with logs
const statusWithLogs = await client.getExecutionStatus('execution-123', true);

console.log('Status:', status.execution.status);
console.log('Progress:', status.progress);
console.log('Logs:', statusWithLogs.logs);
```

#### List Executions

```typescript
const { executions, pagination } = await client.listExecutions('workflow-123', {
  status: 'completed',
  limit: 50,
  offset: 0,
  includeLogs: false,
  includeJobs: true,
});

executions.forEach((exec) => {
  console.log(`${exec.status}: ${exec._id}`);
});
```

#### Get Execution Details

```typescript
const details = await client.getExecution('workflow-123', 'execution-456', true);
console.log('Execution:', details.execution);
console.log('Job:', details.job);
console.log('Logs:', details.logs);
```

#### Wait for Execution

```typescript
// Wait for execution to complete (with default timeout of 5 minutes)
const result = await client.waitForExecution('execution-123');

// With custom options
const result = await client.waitForExecution('execution-123', {
  intervalMs: 2000,      // Poll every 2 seconds
  timeoutMs: 600000,     // 10 minute timeout
  includeLogs: true,     // Include logs in final response
});

if (result.execution.status === 'completed') {
  console.log('Success!', result.execution.result?.output);
} else {
  console.log('Failed:', result.execution.result?.error);
}
```

#### Retry Execution

```typescript
await client.retryExecution('workflow-123', 'execution-456');
```

#### Cancel Execution

```typescript
await client.cancelExecution('workflow-123', 'execution-456');
```

## Common Patterns

### Execute and Wait

```typescript
async function executeAndWait(
  client: NetPadWorkflowClient,
  workflowId: string,
  payload: Record<string, unknown>
) {
  // Start execution
  const execution = await client.executeWorkflow(workflowId, { payload });

  // Wait for completion
  const result = await client.waitForExecution(execution.executionId, {
    intervalMs: 1000,
    timeoutMs: 300000,
  });

  if (result.execution.status === 'completed') {
    return result.execution.result?.output;
  } else {
    throw new Error(
      `Workflow execution failed: ${result.execution.result?.error?.message}`
    );
  }
}
```

### Polling Execution Status

```typescript
async function pollExecution(
  client: NetPadWorkflowClient,
  executionId: string
) {
  let status = await client.getExecutionStatus(executionId);

  while (
    status.execution.status !== 'completed' &&
    status.execution.status !== 'failed' &&
    status.execution.status !== 'cancelled'
  ) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    status = await client.getExecutionStatus(executionId);
    console.log(`Status: ${status.execution.status}`);
  }

  return status;
}
```

### Error Handling

```typescript
import { NetPadWorkflowError } from '@netpad/workflows';

try {
  await client.executeWorkflow('workflow-123', { payload: {} });
} catch (error) {
  if (error instanceof NetPadWorkflowError) {
    if (error.statusCode === 404) {
      console.error('Workflow not found');
    } else if (error.statusCode === 429) {
      console.error('Rate limit exceeded:', error.code);
    } else {
      console.error('API error:', error.message, error.statusCode);
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Batch Execution

```typescript
async function executeBatch(
  client: NetPadWorkflowClient,
  workflowId: string,
  items: Array<Record<string, unknown>>
) {
  const executions = await Promise.all(
    items.map((item) =>
      client.executeWorkflow(workflowId, { payload: item })
    )
  );

  // Wait for all to complete
  const results = await Promise.all(
    executions.map((exec) => client.waitForExecution(exec.executionId))
  );

  return results.map((r) => r.execution.result?.output);
}
```

## TypeScript

All types are exported for use in your code:

```typescript
import type {
  WorkflowDocument,
  WorkflowStatus,
  WorkflowExecution,
  ExecutionStatus,
  ExecuteWorkflowResponse,
  GetExecutionResponse,
} from '@netpad/workflows';

function handleWorkflow(workflow: WorkflowDocument) {
  if (workflow.status === 'active') {
    // TypeScript knows workflow.status is 'active' here
  }
}
```

## Error Handling

The client throws `NetPadWorkflowError` for API errors:

```typescript
export class NetPadWorkflowError extends Error {
  statusCode?: number;
  code?: string;
}
```

Common error scenarios:

- **404** - Workflow or execution not found
- **400** - Invalid request (missing fields, invalid status transition, etc.)
- **401** - Unauthorized (invalid API key)
- **429** - Rate limit exceeded (check `error.code` for limit details)
- **500** - Server error

## Examples

See the [examples directory](../../examples/) for complete integration examples.

## License

Apache-2.0

---

**Questions?** [Open an issue](hhttps://github.com/mrlynn/netpad-v3/issues) or check the [Architecture Guide](./ARCHITECTURE.md).
