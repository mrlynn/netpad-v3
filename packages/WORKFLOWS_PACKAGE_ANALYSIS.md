# Workflows Package Analysis: Learning from @netpad/forms

This document analyzes what `@netpad/forms` provides for developers and recommends similar assets for workflow capabilities.

---

## Summary of @netpad/forms Package

The `@netpad/forms` package provides three key assets for developers:

1. **React Component Library** (`FormRenderer`) - Client-side form rendering
2. **API Client** (`createNetPadClient`) - Type-safe API wrapper for NetPad REST API
3. **Utility Functions** - Validation, conditional logic, formulas, data manipulation

Plus comprehensive documentation:
- **README.md** - User guide with quick start, API reference, examples
- **ARCHITECTURE.md** - Technical deep dive for contributors
- **SHOWCASE.md** - Marketing/feature comparison document

---

## Workflow Capabilities: What Could Be Packaged?

### Option 1: Client-Side Workflow Builder Component (Similar to FormRenderer)

**What it would provide:**
- React component for visual workflow editor
- Drag-and-drop node palette
- Canvas-based workflow designer
- Similar to how `FormRenderer` renders forms from config

**Challenges:**
- Much more complex than form rendering
- Requires canvas library (React Flow, Cytoscape, etc.)
- State management for nodes/edges
- Visual editing is typically done in-platform, not embedded

**Recommendation:** ⚠️ **Lower Priority** - Workflows are typically built in-platform via the visual editor. Embedding a full workflow builder would be significantly more complex than a form renderer.

---

### Option 2: Workflow API Client (Most Similar to Forms Client)

**What it would provide:**
- Type-safe TypeScript client for NetPad workflow APIs
- Methods for:
  - Creating/updating workflows
  - Executing workflows (manual triggers)
  - Querying workflow execution status
  - Listing executions and logs
  - Managing workflow state (activate/pause/archive)

**APIs to wrap:**
```typescript
// Core workflow operations
GET    /api/workflows?orgId=xxx
POST   /api/workflows
GET    /api/workflows/[workflowId]
PATCH  /api/workflows/[workflowId]
DELETE /api/workflows/[workflowId]
PATCH  /api/workflows/[workflowId]/status

// Execution operations
POST   /api/workflows/[workflowId]/execute
GET    /api/workflows/[workflowId]/executions
GET    /api/workflows/[workflowId]/executions/[executionId]
GET    /api/executions/[executionId]
```

**Recommended structure:**
```typescript
import { createNetPadClient } from '@netpad/workflows';

const client = createNetPadClient({
  baseUrl: 'https://your-netpad-instance.com',
  apiKey: 'np_live_xxx',
  organizationId: 'org_123',
});

// List workflows
const { workflows, total } = await client.listWorkflows({
  status: 'active',
  tags: ['automation'],
  page: 1,
  pageSize: 20,
});

// Execute workflow
const execution = await client.executeWorkflow('workflow-123', {
  payload: { userId: 'user_456', action: 'onboard' },
});

// Check execution status
const status = await client.getExecutionStatus(execution.executionId);

// Get execution logs
const logs = await client.getExecutionLogs(execution.executionId);
```

**Recommendation:** ✅ **High Priority** - This is the most direct parallel to the forms client and would be very valuable for:
- Server-side workflow automation
- CI/CD integrations
- External systems triggering workflows
- Programmatic workflow management

---

### Option 3: Workflow Execution Utilities

**What it could provide:**
- Variable substitution utilities (similar to forms' conditional logic utils)
- Workflow validation helpers
- Node configuration builders
- Execution context helpers
- Type definitions for workflows

**Utilities:**
```typescript
import {
  substituteVariables,
  validateWorkflow,
  buildExecutionContext,
  WorkflowConfiguration,
  WorkflowNode,
} from '@netpad/workflows';

// Validate workflow structure
const errors = validateWorkflow(workflowConfig);

// Substitute variables in node configs
const resolvedConfig = substituteVariables(
  node.config,
  { variables: { userId: '123' }, nodeOutputs: {...} }
);

// Build execution context
const context = buildExecutionContext(workflow, trigger);
```

**Recommendation:** ⚠️ **Medium Priority** - Useful for developers building workflow integrations, but less critical than the API client. Could be part of the client package.

---

### Option 4: Workflow Node Handler SDK

**What it could provide:**
- Type definitions for building custom node handlers
- Base classes/interfaces for node handlers
- Utilities for common node handler patterns
- Testing utilities

**Example:**
```typescript
import { NodeHandler, ExtendedNodeContext, NodeExecutionResult } from '@netpad/workflows';

class CustomNodeHandler implements NodeHandler {
  async execute(context: ExtendedNodeContext): Promise<NodeExecutionResult> {
    // Custom node logic
    return {
      success: true,
      output: { result: 'processed' },
    };
  }
}
```

**Recommendation:** ⚠️ **Low Priority** - Custom node handlers are advanced use cases, likely only needed by platform integrators. This could be a separate `@netpad/workflows-node-handlers` package later.

---

## Recommended Package Structure: @netpad/workflows

Based on the forms package pattern, here's what we should create:

```
packages/workflows/
├── src/
│   ├── index.ts              # Main exports
│   ├── client.ts             # API client (similar to forms/client.ts)
│   ├── types/
│   │   └── index.ts          # TypeScript types
│   └── utils/
│       ├── validation.ts     # Workflow validation
│       ├── variables.ts      # Variable substitution
│       └── index.ts
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── README.md                 # User guide
├── ARCHITECTURE.md           # Technical deep dive
└── SHOWCASE.md              # Feature comparison (optional)
```

### Package Exports

```typescript
// API Client
export { NetPadWorkflowClient, createNetPadWorkflowClient } from './client';
export type { NetPadWorkflowClientConfig } from './client';

// Types
export type {
  WorkflowDocument,
  WorkflowConfiguration,
  WorkflowNode,
  WorkflowEdge,
  WorkflowExecution,
  WorkflowStatus,
  WorkflowTrigger,
  ExecutionStatus,
  // ... etc
} from './types';

// Utilities (if included)
export {
  validateWorkflow,
  substituteVariables,
  buildExecutionContext,
} from './utils';
```

---

## Documentation Structure (Mirroring Forms)

### README.md - User Guide

**Should include:**
1. **Introduction**
   - What is @netpad/workflows?
   - Why use it?
   - Link to examples

2. **Installation**
   ```bash
   npm install @netpad/workflows
   ```

3. **Quick Start**
   - Basic client setup
   - Execute a workflow
   - Check execution status

4. **API Reference**
   - Client methods with examples
   - Request/response types
   - Error handling

5. **Common Patterns**
   - Triggering workflows from external systems
   - Polling for execution status
   - Error handling and retries
   - Webhook-based workflow execution

6. **TypeScript Support**
   - Exported types
   - Type-safe configuration

7. **Examples**
   - Link to example projects
   - Integration patterns

### ARCHITECTURE.md - Technical Deep Dive

**Should include:**
1. **Package Structure**
   - File organization
   - Entry points

2. **Client Architecture**
   - How the API client works
   - Authentication flow
   - Request/response handling
   - Error handling

3. **Core Concepts**
   - Workflow configuration structure
   - Execution lifecycle
   - Node types and configuration
   - Variable substitution

4. **API Endpoints**
   - Which endpoints are used
   - Request/response formats
   - Error codes

5. **Utilities** (if included)
   - Variable substitution algorithm
   - Validation rules
   - Execution context building

6. **Extension Points**
   - How to extend the client
   - Adding custom methods
   - Error handling customization

7. **Design Decisions**
   - Why client-side only
   - TypeScript-first approach
   - Error handling strategy

### SHOWCASE.md - Feature Comparison (Optional)

Could compare:
- Manual workflow management vs. API client
- Using @netpad/workflows vs. raw HTTP calls
- Integration patterns

---

## Key Differences from Forms Package

| Aspect | @netpad/forms | @netpad/workflows |
|--------|---------------|-------------------|
| **Main Component** | `FormRenderer` (React component) | API Client only (no UI component) |
| **Use Case** | Embed forms in external apps | Trigger/manage workflows from code |
| **Complexity** | Medium (form rendering logic) | Lower (HTTP client wrapper) |
| **Dependencies** | React, Material-UI | None (or minimal) |
| **Target Audience** | Frontend developers | Backend/integration developers |

---

## Implementation Priority

1. ✅ **API Client** (`@netpad/workflows`)
   - Highest value, direct parallel to forms client
   - Enables programmatic workflow management
   - Relatively straightforward to implement

2. ⚠️ **Documentation** (README.md, ARCHITECTURE.md)
   - Critical for adoption
   - Should be created alongside the client

3. ⚠️ **Utility Functions** (optional)
   - Can be added incrementally
   - May not be needed in v1

4. ❌ **Visual Builder Component** (not recommended)
   - Too complex
   - Workflows are typically built in-platform
   - Would require significant UI dependencies

---

## Next Steps

1. **Create package structure** in `packages/workflows/`
2. **Implement API client** wrapping workflow endpoints
3. **Export TypeScript types** from workflow definitions
4. **Write README.md** with quick start and API reference
5. **Write ARCHITECTURE.md** for technical documentation
6. **Create example project** showing workflow integration patterns
7. **Publish to npm** as `@netpad/workflows`

---

## Example: What a Workflows Package README Might Look Like

```markdown
# @netpad/workflows

> Programmatically trigger and manage NetPad workflows from your applications.

[![npm version](https://badge.fury.io/js/@netpad%2Fworkflows.svg)](https://www.npmjs.com/package/@netpad/workflows)

## Why @netpad/workflows?

NetPad workflows automate complex business processes, but you often need to trigger them from external systems, CI/CD pipelines, or server-side code. `@netpad/workflows` provides a type-safe TypeScript client for managing workflows programmatically.

## Installation

\`\`\`bash
npm install @netpad/workflows
\`\`\`

## Quick Start

\`\`\`typescript
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
console.log(`Status: ${status.status}`); // 'completed' | 'running' | 'failed'

// Get execution logs
if (status.status === 'completed') {
  const logs = await client.getExecutionLogs(execution.executionId);
  console.log('Execution logs:', logs);
}
\`\`\`

## API Reference

### Client Methods

#### `executeWorkflow(workflowId, options)`
Trigger a workflow execution.

#### `getExecutionStatus(executionId)`
Get the current status of a workflow execution.

#### `listWorkflows(options)`
List workflows in your organization.

#### `getWorkflow(workflowId)`
Get workflow configuration.

[... more methods ...]

## Examples

See [examples/workflow-integration](../../examples/workflow-integration/) for complete integration examples.

## License

Apache-2.0
```

---

## Questions to Consider

1. **Should utilities (variable substitution, validation) be included?**
   - Forms package includes utilities because they're useful client-side
   - Workflow utilities are more server-side focused
   - **Recommendation:** Start with API client only, add utilities if needed

2. **Should we provide a workflow configuration builder?**
   - Forms package doesn't provide a builder (config is declarative)
   - Workflow configs are complex (nodes, edges, variables)
   - **Recommendation:** No builder initially, focus on API client

3. **Do we need a separate types package?**
   - Forms has `@netpad/forms/types` for type-only imports
   - Could be useful for server-side code that only needs types
   - **Recommendation:** Consider adding types export later if needed

4. **Should we create example projects?**
   - Forms has employee-onboarding-demo
   - Could create workflow-integration-demo
   - **Recommendation:** Yes, create at least one example showing common patterns