# Strategic Plan: Atlas Trigger Workflow Node

**Status:** Strategic Planning  
**Date:** 2026  
**Owner:** Engineering  
**Priority:** High (Recommended Entry Point)

## Executive Summary

Instead of implementing full Change Streams infrastructure, we can create a **workflow node type** (`atlas-trigger` or `mongodb-trigger`) that configures MongoDB Atlas Triggers through the UI. This provides a MongoDB-native, serverless solution that's easier to adopt and requires no additional infrastructure.

## The Opportunity

**Current State:**
- Workflows are triggered via explicit function calls
- Requires code changes to add triggers
- Tight coupling between form submission and workflows

**Proposed State:**
- Users configure Atlas Triggers through a workflow node
- Atlas Triggers watch MongoDB collections automatically
- Triggers call webhook endpoints to execute workflows
- Fully managed by MongoDB Atlas (serverless)

## Architecture Overview

### How It Works

```
1. User Configures Workflow Node
   ↓
2. Node Config Includes:
   - Collection to watch
   - Filter criteria (optional)
   - Operation type (insert, update, delete)
   ↓
3. When Workflow is Published/Activated:
   - Create Atlas Trigger via Atlas Admin API
   - Configure trigger to watch collection
   - Set webhook URL to workflow execution endpoint
   ↓
4. When Document is Inserted:
   - Atlas Trigger fires automatically
   - Calls webhook: POST /api/workflows/trigger/atlas
   - Webhook triggers workflow execution
   ↓
5. Workflow Executes:
   - Receives document as payload
   - Processes through workflow nodes
   - Returns result
```

### Key Components

#### 1. Workflow Node Type: `atlas-trigger`

**Node Configuration Schema:**
```typescript
interface AtlasTriggerNodeConfig {
  // Connection
  vaultId: string;              // Connection vault ID
  database: string;              // Database name
  collection: string;            // Collection to watch
  
  // Trigger Configuration
  operationType: 'insert' | 'update' | 'replace' | 'delete';
  filter?: Record<string, unknown>;  // Optional filter criteria
  
  // Workflow Integration
  workflowId: string;            // Workflow to trigger
  webhookSecret?: string;        // Optional webhook secret for security
}
```

**Node Definition:**
```typescript
const atlasTriggerNodeDefinition: NodeDefinition = {
  type: 'atlas-trigger',
  name: 'Atlas Database Trigger',
  description: 'Watches a MongoDB collection and triggers workflow on changes',
  category: 'triggers',
  icon: 'Cloud',
  color: '#00ED64',
  
  configSchema: {
    type: 'object',
    properties: {
      vaultId: { type: 'string' },
      database: { type: 'string' },
      collection: { type: 'string' },
      operationType: { 
        type: 'string',
        enum: ['insert', 'update', 'replace', 'delete'],
        default: 'insert'
      },
      filter: { type: 'object' },
    },
    required: ['vaultId', 'database', 'collection']
  },
  
  // This is a trigger node (source node)
  inputs: [],
  outputs: [{
    id: 'document',
    label: 'Document',
    type: 'object',
    description: 'The document that triggered the workflow'
  }],
};
```

#### 2. Atlas Trigger Management Service

**Purpose:** Create, update, and delete Atlas Triggers via Atlas Admin API

```typescript
// src/lib/atlas/triggers.ts

interface AtlasTriggerConfig {
  name: string;
  type: 'DATABASE';
  database: string;
  collection: string;
  operationTypes: ('INSERT' | 'UPDATE' | 'REPLACE' | 'DELETE')[];
  match?: Record<string, unknown>;
  project?: Record<string, unknown>;
  fullDocument?: boolean;
  fullDocumentBeforeChange?: boolean;
  eventProcessors: {
    AWS_EVENTBRIDGE?: any;
    FUNCTION?: {
      config?: {
        function_name?: string;
      };
    };
  };
}

export class AtlasTriggerService {
  async createTrigger(
    connectionString: string,
    config: AtlasTriggerConfig
  ): Promise<string> {
    // Use Atlas Admin API to create trigger
    // Returns trigger ID
  }
  
  async updateTrigger(
    connectionString: string,
    triggerId: string,
    config: AtlasTriggerConfig
  ): Promise<void> {
    // Update existing trigger
  }
  
  async deleteTrigger(
    connectionString: string,
    triggerId: string
  ): Promise<void> {
    // Delete trigger
  }
  
  async listTriggers(connectionString: string): Promise<AtlasTrigger[]> {
    // List all triggers for a cluster
  }
}
```

**Note:** Atlas Triggers actually use **Atlas Functions** (serverless functions), not webhooks. We'll need to either:
- Option A: Use Atlas Functions that call our webhook
- Option B: Use Atlas EventBridge (AWS) integration
- Option C: Use Atlas Webhooks (if available)

**Actually, let me check Atlas capabilities...**

Based on MongoDB Atlas documentation, **Atlas Triggers** support:
1. **Database Triggers** - Watch collections, trigger functions
2. **Atlas Functions** - Serverless functions (can make HTTP requests)
3. **EventBridge Integration** - AWS EventBridge (requires AWS)

For our use case, we'd use **Atlas Functions** that make HTTP requests to our webhook endpoint.

#### 3. Workflow Lifecycle Integration

**When Workflow is Published:**
```typescript
async function publishWorkflow(workflowId: string, orgId: string) {
  const workflow = await getWorkflowById(orgId, workflowId);
  
  // Find all atlas-trigger nodes
  const atlasTriggerNodes = workflow.canvas.nodes.filter(
    n => n.type === 'atlas-trigger' && n.enabled
  );
  
  // Create/update Atlas Triggers for each node
  for (const node of atlasTriggerNodes) {
    await createOrUpdateAtlasTrigger(workflow, node);
  }
  
  // Save workflow as published
  await savePublishedWorkflow(workflow);
}

async function createOrUpdateAtlasTrigger(
  workflow: WorkflowDocument,
  node: WorkflowNode
) {
  const config = node.config as AtlasTriggerNodeConfig;
  
  // Get connection credentials
  const credentials = await getDecryptedCredentials(
    workflow.organizationId,
    config.vaultId
  );
  
  // Build trigger configuration
  const triggerConfig: AtlasTriggerConfig = {
    name: `netpad-workflow-${workflow.id}-${node.id}`,
    type: 'DATABASE',
    database: config.database,
    collection: config.collection,
    operationTypes: [config.operationType.toUpperCase()],
    match: config.filter,
    eventProcessors: {
      FUNCTION: {
        config: {
          function_name: generateAtlasFunction(workflow, node),
        },
      },
    },
  };
  
  // Create or update trigger via Atlas API
  const triggerService = new AtlasTriggerService();
  await triggerService.createTrigger(
    connectionString,
    triggerConfig
  );
}
```

**When Workflow is Unpublished/Deleted:**
```typescript
async function unpublishWorkflow(workflowId: string, orgId: string) {
  // Find all Atlas Triggers for this workflow
  const triggers = await getAtlasTriggersForWorkflow(workflowId);
  
  // Delete all triggers
  for (const trigger of triggers) {
    await deleteAtlasTrigger(trigger.id);
  }
}
```

#### 4. Atlas Function Code

**Purpose:** Atlas Functions that call our webhook endpoint

```javascript
// Generated Atlas Function code (deployed to Atlas)
exports = async function(changeEvent) {
  const document = changeEvent.fullDocument;
  const operationType = changeEvent.operationType;
  
  // Call NetPad webhook
  const response = await context.http.post({
    url: 'https://netpad.io/api/workflows/trigger/atlas',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': context.values.get('webhookSecret'),
    },
    body: JSON.stringify({
      workflowId: context.values.get('workflowId'),
      nodeId: context.values.get('nodeId'),
      document: document,
      operationType: operationType,
      timestamp: new Date().toISOString(),
    }),
  });
  
  return response;
};
```

#### 5. Webhook Endpoint

**Purpose:** Receive trigger events from Atlas Functions

```typescript
// src/app/api/workflows/trigger/atlas/route.ts

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { workflowId, nodeId, document, operationType, timestamp } = body;
  
  // Verify webhook secret (optional security)
  const secret = request.headers.get('X-Webhook-Secret');
  if (secret && !verifyWebhookSecret(workflowId, secret)) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }
  
  // Get workflow
  const workflow = await getWorkflowById(orgId, workflowId);
  
  // Build trigger payload
  const triggerPayload: TriggerPayload = {
    type: 'atlas_trigger',
    payload: {
      document,
      operationType,
      timestamp,
    },
  };
  
  // Execute workflow
  const execution = await executeWorkflow(orgId, workflowId, triggerPayload);
  
  return NextResponse.json({
    success: true,
    executionId: execution.executionId,
  });
}
```

## Benefits of This Approach

### ✅ Advantages Over Full Change Streams

1. **No Infrastructure Required**
   - Atlas Triggers are fully managed by MongoDB
   - No persistent connections to maintain
   - Serverless and scalable

2. **User-Friendly**
   - Configure through UI (workflow node)
   - No code changes required
   - Visual workflow builder integration

3. **MongoDB-Native**
   - Uses official Atlas capabilities
   - Aligned with MongoDB Platform
   - Leverages Atlas Functions

4. **Incremental Adoption**
   - Only available for Atlas users
   - Doesn't break existing workflows
   - Optional feature

5. **Lower Complexity**
   - No connection management
   - No reconnection logic needed
   - Atlas handles reliability

6. **Better Marketing**
   - "Configure MongoDB Atlas Triggers visually"
   - "Serverless workflow triggers"
   - "Powered by Atlas Functions"

### ⚠️ Limitations

1. **Atlas Only**
   - Only works with MongoDB Atlas
   - Not available for self-hosted MongoDB
   - Requires Atlas deployment

2. **Atlas Functions Required**
   - Need to generate and deploy Functions
   - Function code generation complexity
   - Atlas Functions API integration

3. **API Rate Limits**
   - Atlas API has rate limits
   - Need to handle throttling
   - Potential cost implications

4. **Trigger Management**
   - Need to track trigger lifecycle
   - Handle trigger updates/deletions
   - Sync with workflow state

## Implementation Strategy

### Phase 1: Foundation (Weeks 1-2)

**Goal:** Build core infrastructure for Atlas Trigger management

**Tasks:**
1. Create Atlas Trigger Service (Atlas Admin API integration)
2. Create Atlas Function generator
3. Create webhook endpoint
4. Add node type definition
5. Write unit tests

**Deliverables:**
- `src/lib/atlas/triggers.ts` - Trigger management service
- `src/lib/atlas/functions.ts` - Function code generator
- `src/app/api/workflows/trigger/atlas/route.ts` - Webhook endpoint
- `src/lib/workflow/nodeHandlers/atlasTrigger.ts` - Node handler (stub)
- Node definition in workflow system

**Success Criteria:**
- Can create Atlas Trigger via API
- Can generate Atlas Function code
- Webhook endpoint receives requests
- Node type appears in workflow editor

### Phase 2: UI Integration (Weeks 3-4)

**Goal:** Add Atlas Trigger node to workflow editor

**Tasks:**
1. Add node to NodePalette
2. Create node configuration panel
3. Add connection vault selector
4. Add collection/database selectors
5. Add operation type selector
6. Add filter builder (optional)

**Deliverables:**
- Node in workflow editor palette
- Configuration panel UI
- Connection selection
- Collection/database selection
- Operation type selection

**Success Criteria:**
- Users can add Atlas Trigger node to workflow
- Can configure all trigger options
- UI validates configuration

### Phase 3: Lifecycle Integration (Weeks 5-6)

**Goal:** Integrate trigger creation/deletion with workflow lifecycle

**Tasks:**
1. Hook into workflow publish/unpublish
2. Create triggers on publish
3. Delete triggers on unpublish
4. Update triggers on workflow changes
5. Handle errors gracefully

**Deliverables:**
- Workflow publish integration
- Workflow unpublish integration
- Trigger update logic
- Error handling

**Success Criteria:**
- Triggers created when workflow published
- Triggers deleted when workflow unpublished
- Triggers updated when workflow changed
- Errors handled gracefully

### Phase 4: Testing & Polish (Weeks 7-8)

**Goal:** Test, optimize, and document

**Tasks:**
1. End-to-end testing
2. Error scenario testing
3. Performance optimization
4. Documentation
5. Example workflows

**Deliverables:**
- Comprehensive tests
- Performance benchmarks
- Documentation
- Example workflows

**Success Criteria:**
- All tests passing
- Performance acceptable
- Documentation complete
- Examples available

## Technical Considerations

### Atlas Admin API Integration

**Required Endpoints:**
- `POST /api/atlas/v1.0/groups/{groupId}/triggers` - Create trigger
- `PUT /api/atlas/v1.0/groups/{groupId}/triggers/{triggerId}` - Update trigger
- `DELETE /api/atlas/v1.0/groups/{groupId}/triggers/{triggerId}` - Delete trigger
- `GET /api/atlas/v1.0/groups/{groupId}/triggers` - List triggers

**Authentication:**
- Use Atlas API keys from connection vault
- Store credentials securely (encrypted)
- Handle API key rotation

### Atlas Functions

**Function Deployment:**
- Functions are deployed via Atlas Admin API
- Need to generate Function code dynamically
- Store Function code in workflow definition (for reference)

**Function Code:**
- JavaScript/TypeScript code
- Runs in Atlas serverless environment
- Can make HTTP requests
- Access to change event data

### Webhook Security

**Options:**
1. **Webhook Secret** - Shared secret in Function config
2. **API Key** - Atlas API key validation
3. **JWT Token** - Signed token per workflow
4. **IP Allowlist** - Atlas IP ranges only

**Recommendation:** Use webhook secret (simplest, most flexible)

### Trigger Naming

**Pattern:** `netpad-{workflowId}-{nodeId}`

**Constraints:**
- Atlas trigger names must be unique per cluster
- Limited to 64 characters
- Alphanumeric and hyphens only

### Error Handling

**Scenarios:**
1. Atlas API failure
2. Function deployment failure
3. Webhook timeout
4. Workflow execution failure
5. Trigger deletion failure

**Strategies:**
- Retry logic for transient errors
- Dead letter queue for failed triggers
- Alerting for persistent failures
- Manual retry capability

## Migration Strategy

### Approach: Feature Flag

**Enable for:**
- Specific organizations (beta)
- Atlas users only
- Opt-in via workflow settings

**Rollout:**
1. Enable for internal testing
2. Beta organizations
3. All Atlas users
4. Document limitations

### Backward Compatibility

**Existing Workflows:**
- Continue using explicit function calls
- No breaking changes
- Atlas Trigger node is optional

**Dual Mode:**
- Can use both explicit calls and Atlas Triggers
- Different workflows can use different triggers
- User choice

## Success Metrics

**Adoption:**
- % of workflows using Atlas Trigger node
- Number of Atlas Triggers created
- Active triggers per organization

**Performance:**
- Trigger latency (insert to workflow trigger)
- Function execution time
- Webhook response time

**Reliability:**
- Trigger creation success rate
- Function execution success rate
- Webhook delivery rate

## Comparison with Full Change Streams

| Aspect | Atlas Trigger Node | Full Change Streams |
|--------|-------------------|---------------------|
| **Infrastructure** | None (managed) | Dedicated service |
| **Deployment** | Simple | Complex |
| **Atlas Required** | Yes | No |
| **User Configuration** | UI (node) | Code/config |
| **Scalability** | Managed | Manual |
| **Reliability** | Atlas handles | Manual |
| **Cost** | Atlas Functions cost | Infrastructure cost |
| **Complexity** | Low | High |
| **Time to Market** | 8 weeks | 12+ weeks |

## Recommendation

**✅ Proceed with Atlas Trigger Node approach**

**Why:**
1. Faster to implement (8 vs 12+ weeks)
2. Lower complexity (no infrastructure)
3. Better user experience (UI configuration)
4. Fully managed (Atlas handles reliability)
5. MongoDB-native (uses official capabilities)
6. Better marketing story ("Configure Atlas Triggers visually")

**When Full Change Streams Makes Sense:**
- Self-hosted MongoDB users
- Need multi-database watching
- Custom filtering beyond Atlas capabilities
- Future enhancement after Atlas Trigger Node

## Next Steps

1. ✅ Review and approve approach
2. ⏳ Allocate engineering resources
3. ⏳ Set up Atlas development environment
4. ⏳ Begin Phase 1 (Foundation)
5. ⏳ Create proof of concept

## Questions for Discussion

1. **Atlas Functions Availability:** Confirm Atlas Functions API availability and capabilities
2. **Pricing:** What's the cost model for Atlas Functions?
3. **Rate Limits:** What are Atlas API rate limits?
4. **Function Limits:** Any limits on number of Functions per cluster?
5. **Alternative Approaches:** Consider EventBridge integration if available?

---

**Full Change Streams Plan:** See `CHANGE-STREAMS-IMPLEMENTATION.md` for comparison
