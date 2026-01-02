# Workflow Integration Demo

An interactive demonstration of the `@netpad/workflows` TypeScript API client for programmatic workflow management.

## Overview

This example shows how to integrate NetPad workflows into your applications using the `@netpad/workflows` npm package. It demonstrates:

- **Client Initialization** - Connect to NetPad with API keys
- **Workflow Management** - List, view, and manage workflows
- **Execution Control** - Trigger workflows and pass custom payloads
- **Status Monitoring** - Poll for completion with `waitForExecution`
- **Error Handling** - Catch and handle `NetPadWorkflowError`
- **TypeScript Support** - Full type safety throughout

## Quick Start

```bash
# Install dependencies
npm install

# Start the demo (runs on port 3002)
npm run dev
```

Then open [http://localhost:3002](http://localhost:3002) in your browser.

## Configuration

Set these environment variables to connect to your NetPad instance:

```bash
NEXT_PUBLIC_NETPAD_URL=https://your-netpad-instance.com
NEXT_PUBLIC_NETPAD_API_KEY=np_live_xxx
NEXT_PUBLIC_NETPAD_ORG_ID=org_123
```

Or configure directly in the demo UI.

## Using @netpad/workflows

### Installation

```bash
npm install @netpad/workflows
```

### Initialize Client

```typescript
import { createNetPadWorkflowClient } from '@netpad/workflows';

const client = createNetPadWorkflowClient({
  baseUrl: 'https://your-netpad-instance.com',
  apiKey: 'np_live_xxx',
  organizationId: 'org_123',
});
```

### Execute a Workflow

```typescript
// Trigger execution with payload
const { executionId } = await client.executeWorkflow('workflow-123', {
  payload: {
    userId: 'user_456',
    action: 'process',
    data: { /* your data */ }
  },
});

// Wait for completion
const result = await client.waitForExecution(executionId, {
  timeout: 60000,      // 1 minute
  pollInterval: 2000,  // Poll every 2 seconds
});

console.log('Status:', result.status);  // 'completed' | 'failed'
console.log('Output:', result.output);
```

### List Workflows

```typescript
const { workflows, total, page } = await client.listWorkflows({
  status: 'active',
  limit: 20,
  page: 1,
});

workflows.forEach(wf => {
  console.log(`${wf.name} (${wf.workflowId}) - ${wf.status}`);
});
```

### Manage Workflow Lifecycle

```typescript
// Activate a workflow
await client.activateWorkflow('workflow-123');

// Pause a workflow
await client.pauseWorkflow('workflow-123');

// Archive a workflow
await client.archiveWorkflow('workflow-123');
```

### Query Execution History

```typescript
const { executions } = await client.listExecutions({
  workflowId: 'workflow-123',  // Optional filter
  status: 'completed',         // Optional filter
  limit: 50,
});

// Get specific execution details
const execution = await client.getExecution('exec_abc123');
```

### Error Handling

```typescript
import { NetPadWorkflowError } from '@netpad/workflows';

try {
  await client.executeWorkflow('workflow-123', { payload: {} });
} catch (error) {
  if (error instanceof NetPadWorkflowError) {
    console.error('API Error:', error.message);
    console.error('Status Code:', error.statusCode);
    console.error('Details:', error.details);
  } else {
    throw error;
  }
}
```

### Retry Failed Executions

```typescript
// Retry a failed execution
await client.retryExecution('exec_abc123');

// Cancel a running execution
await client.cancelExecution('exec_abc123');
```

## API Reference

### Client Methods

| Method | Description |
|--------|-------------|
| `listWorkflows(options?)` | List workflows with pagination and filters |
| `getWorkflow(id)` | Get workflow details by ID |
| `createWorkflow(data)` | Create a new workflow |
| `updateWorkflow(id, data)` | Update workflow properties |
| `deleteWorkflow(id)` | Delete a workflow |
| `activateWorkflow(id)` | Set workflow status to active |
| `pauseWorkflow(id)` | Set workflow status to paused |
| `archiveWorkflow(id)` | Set workflow status to archived |
| `executeWorkflow(id, options)` | Trigger workflow execution |
| `listExecutions(options?)` | List executions with filters |
| `getExecution(id)` | Get execution details |
| `getExecutionStatus(id)` | Get just the execution status |
| `waitForExecution(id, options?)` | Poll until execution completes |
| `retryExecution(id)` | Retry a failed execution |
| `cancelExecution(id)` | Cancel a running execution |

### Type Exports

```typescript
import type {
  // Core types
  WorkflowDocument,
  WorkflowStatus,
  WorkflowCanvas,
  WorkflowNode,
  WorkflowEdge,

  // Execution types
  WorkflowExecution,
  ExecutionStatus,
  ExecutionLog,

  // API types
  ListWorkflowsOptions,
  ExecuteWorkflowOptions,
  ListExecutionsOptions,
} from '@netpad/workflows';
```

## Use Cases

### Backend Automation

```typescript
// Trigger workflow from webhook
app.post('/webhook/order-created', async (req, res) => {
  const { orderId, customerId } = req.body;

  const { executionId } = await client.executeWorkflow('order-processing', {
    payload: { orderId, customerId },
  });

  res.json({ executionId });
});
```

### Scheduled Jobs

```typescript
// Cron job integration
cron.schedule('0 9 * * *', async () => {
  await client.executeWorkflow('daily-report', {
    payload: { date: new Date().toISOString() },
  });
});
```

### CI/CD Integration

```typescript
// Run workflow after deployment
async function postDeployHook(environment: string) {
  const result = await client.executeWorkflow('post-deploy-checks', {
    payload: { environment, timestamp: Date.now() },
  });

  const execution = await client.waitForExecution(result.executionId);

  if (execution.status === 'failed') {
    throw new Error('Post-deploy checks failed');
  }
}
```

## Demo Features

1. **Connection Panel** - Configure and test NetPad connection
2. **Workflows Tab** - Browse available workflows
3. **Execute Tab** - Trigger workflows with custom JSON payloads
4. **Executions Tab** - View execution history and retry failed runs
5. **Code Examples Tab** - Copy-paste code snippets

## Learn More

- [NetPad Documentation](https://netpad.io/docs)
- [@netpad/workflows on npm](https://www.npmjs.com/package/@netpad/workflows)
- [NetPad Workflow Builder](https://netpad.io/workflows)
