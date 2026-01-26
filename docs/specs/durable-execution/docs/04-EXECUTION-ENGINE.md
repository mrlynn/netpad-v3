# NetPad Durable Workflow Execution
## Execution Engine Specification

**Document:** 04-EXECUTION-ENGINE.md  
**Version:** 1.0.0  
**Status:** Sprint Ready  
**Last Updated:** January 26, 2025

---

## Table of Contents

1. [Overview](#1-overview)
2. [Core Processing Loop](#2-core-processing-loop)
3. [State Machine](#3-state-machine)
4. [Node Execution](#4-node-execution)
5. [Variable Resolution](#5-variable-resolution)
6. [Retry Logic](#6-retry-logic)
7. [Concurrency Control](#7-concurrency-control)
8. [Recovery Procedures](#8-recovery-procedures)

---

## 1. Overview

The Execution Engine is the core component that processes workflow executions step-by-step, managing state persistence, error handling, and waiting states.

### 1.1 Key Responsibilities

- Process pending executions from the queue
- Execute nodes in correct order based on edges
- Persist state after each node completion
- Handle errors with retry logic
- Manage waiting states (approvals, timers)
- Log events for audit trail

### 1.2 Design Goals

| Goal | Target |
|------|--------|
| Overhead per node | < 50ms |
| State persistence | < 20ms |
| Recovery time after crash | < 30s |
| Concurrent executions per worker | 100+ |

---

## 2. Core Processing Loop

### 2.1 Main Processing Algorithm

```typescript
// src/lib/workflows/execution/ExecutionEngine.ts

export class ExecutionEngine {
  constructor(
    private db: Db,
    private eventLogger: EventLogger,
    private nodeExecutors: Map<string, NodeExecutor>,
    private timerService: TimerService,
    private approvalService: ApprovalService
  ) {}

  /**
   * Process an execution until completion, waiting state, or failure
   */
  async processExecution(executionId: string): Promise<ProcessResult> {
    const startTime = Date.now();
    let stepsProcessed = 0;

    try {
      while (true) {
        // 1. Load current state with lock validation
        const execution = await this.loadExecution(executionId);
        
        // 2. Check if we should stop processing
        if (this.shouldStopProcessing(execution)) {
          return {
            status: execution.status,
            stepsProcessed,
            duration: Date.now() - startTime
          };
        }

        // 3. Determine next node to execute
        const nextNode = await this.determineNextNode(execution);
        
        // 4. No more nodes = completed
        if (!nextNode) {
          await this.completeExecution(execution);
          return {
            status: 'completed',
            stepsProcessed,
            duration: Date.now() - startTime
          };
        }

        // 5. Execute the node
        const result = await this.executeNode(nextNode, execution);
        stepsProcessed++;

        // 6. Handle waiting states
        if (result.waiting) {
          return {
            status: 'waiting',
            waitingFor: result.waitingFor,
            stepsProcessed,
            duration: Date.now() - startTime
          };
        }

        // Loop continues to next node
      }
    } catch (error) {
      await this.handleExecutionError(executionId, error);
      throw error;
    }
  }

  private shouldStopProcessing(execution: WorkflowExecution): boolean {
    return ['completed', 'failed', 'cancelled', 'paused', 'waiting']
      .includes(execution.status);
  }
}
```

### 2.2 Node Execution Flow

```typescript
private async executeNode(
  node: WorkflowNode,
  execution: WorkflowExecution
): Promise<NodeResult> {
  const nodeId = node.id;

  // 1. Mark node as started
  await this.updateNodeState(execution, nodeId, { 
    status: 'running', 
    startedAt: new Date() 
  });
  
  await this.eventLogger.log(execution.executionId, 'NODE_STARTED', {
    nodeId,
    nodeType: node.type
  });

  try {
    // 2. Check for waiting nodes (approval, delay, signal)
    if (this.isWaitingNode(node)) {
      return await this.handleWaitingNode(node, execution);
    }

    // 3. Get the appropriate executor
    const executor = this.nodeExecutors.get(node.type);
    if (!executor) {
      throw new Error(`No executor found for node type: ${node.type}`);
    }

    // 4. Build execution context
    const context = await this.buildNodeContext(node, execution);

    // 5. Execute the node
    const result = await executor.execute(node, context);

    // 6. Persist the result (CRITICAL DURABILITY POINT)
    await this.persistNodeResult(execution, node, result);

    // 7. Log completion
    await this.eventLogger.log(execution.executionId, 'NODE_COMPLETED', {
      nodeId,
      output: result.output,
      duration: Date.now() - context.startTime
    });

    return { completed: true, output: result.output };

  } catch (error) {
    return await this.handleNodeError(node, execution, error);
  }
}
```

### 2.3 State Persistence

```typescript
private async persistNodeResult(
  execution: WorkflowExecution,
  node: WorkflowNode,
  result: NodeExecutionResult
): Promise<void> {
  const now = new Date();
  const nextNodeId = this.calculateNextNode(execution, node, result);

  // Atomic update with optimistic lock
  const updateResult = await this.db.collection('workflow_executions').updateOne(
    { 
      executionId: execution.executionId, 
      version: execution.version 
    },
    {
      $set: {
        // Update node state
        [`nodeStates.${node.id}`]: {
          status: 'completed',
          startedAt: execution.nodeStates[node.id]?.startedAt,
          completedAt: now,
          output: result.output
        },
        // Store output in variables for reference
        [`variables.${node.id}_output`]: result.output,
        // Update current position
        currentNodeId: nextNodeId,
        updatedAt: now
      },
      $inc: { version: 1 }
    }
  );

  if (updateResult.modifiedCount === 0) {
    throw new ConcurrencyError(
      `Failed to persist node result - execution modified by another worker`
    );
  }
}
```

---

## 3. State Machine

### 3.1 Execution State Transitions

```
                         ┌───────────────────────────────────────────┐
                         │                                           │
                         ▼                                           │
┌─────────┐    claim   ┌─────────┐                                  │
│ pending │───────────▶│ running │◀─────────────────────────────────┤
└─────────┘            └────┬────┘                                  │
     ▲                      │                                        │
     │                      │                                        │
     │              ┌───────┼───────┐                               │
     │              │       │       │                               │
     │              ▼       │       ▼                               │
     │        ┌─────────┐   │  ┌─────────┐                          │
     │        │ waiting │───┘  │ paused  │──────── resume ──────────┘
     │        └────┬────┘      └────┬────┘
     │             │                │
     │             │                │ cancel
     │             │                ▼
     │             │           ┌───────────┐
     │             │           │ cancelled │
     │             │           └───────────┘
     │             │
     │     approval/timer/signal
     │             │
     └─────────────┘
                │
                │ all nodes done
                ▼
          ┌───────────┐
          │ completed │
          └───────────┘

          ┌─────────┐
          │ failed  │  (from any state via unrecoverable error)
          └─────────┘
```

### 3.2 State Transition Rules

```typescript
const STATE_TRANSITIONS: Record<ExecutionStatus, ExecutionStatus[]> = {
  pending:   ['running', 'cancelled'],
  running:   ['waiting', 'paused', 'completed', 'failed', 'cancelled'],
  waiting:   ['pending', 'failed', 'cancelled'],  // pending = resume
  paused:    ['pending', 'cancelled'],            // pending = resume
  completed: [],  // terminal
  failed:    [],  // terminal
  cancelled: []   // terminal
};

function canTransition(from: ExecutionStatus, to: ExecutionStatus): boolean {
  return STATE_TRANSITIONS[from].includes(to);
}
```

### 3.3 Node State Machine

```
┌─────────┐    start    ┌─────────┐
│ pending │────────────▶│ running │
└─────────┘             └────┬────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
                ▼            ▼            ▼
          ┌───────────┐ ┌─────────┐ ┌─────────┐
          │ completed │ │ failed  │ │ skipped │
          └───────────┘ └─────────┘ └─────────┘
```

---

## 4. Node Execution

### 4.1 Node Executor Interface

```typescript
// src/lib/workflows/execution/NodeExecutor.ts

export interface NodeExecutor {
  /**
   * Execute a single node
   */
  execute(
    node: WorkflowNode,
    context: NodeExecutionContext
  ): Promise<NodeExecutionResult>;

  /**
   * Validate node configuration
   */
  validate?(node: WorkflowNode): ValidationResult;

  /**
   * Check if node is idempotent
   */
  isIdempotent?: boolean;
}

export interface NodeExecutionContext {
  execution: WorkflowExecution;
  variables: Record<string, any>;
  services: {
    email: EmailService;
    slack: SlackService;
    mongodb: MongoDBService;
    ai: AIService;
    http: HTTPService;
  };
  organization: Organization;
  startTime: number;
}

export interface NodeExecutionResult {
  status: 'completed' | 'failed';
  output?: Record<string, any>;
  error?: string;
  nextPath?: string;  // For conditional nodes
}
```

### 4.2 Node Type Implementations

#### Filter Node
```typescript
// src/lib/workflows/execution/nodes/FilterExecutor.ts

export class FilterExecutor implements NodeExecutor {
  isIdempotent = true;

  async execute(
    node: WorkflowNode,
    context: NodeExecutionContext
  ): Promise<NodeExecutionResult> {
    const { condition } = node.data.config;
    
    // Evaluate condition against variables
    const result = this.evaluateCondition(condition, context.variables);
    
    return {
      status: 'completed',
      output: { matched: result },
      nextPath: result ? 'true' : 'false'
    };
  }

  private evaluateCondition(
    condition: FilterCondition,
    variables: Record<string, any>
  ): boolean {
    const leftValue = this.resolveValue(condition.left, variables);
    const rightValue = this.resolveValue(condition.right, variables);
    
    switch (condition.operator) {
      case 'equals': return leftValue === rightValue;
      case 'not_equals': return leftValue !== rightValue;
      case 'greater_than': return leftValue > rightValue;
      case 'less_than': return leftValue < rightValue;
      case 'contains': return String(leftValue).includes(String(rightValue));
      case 'starts_with': return String(leftValue).startsWith(String(rightValue));
      case 'is_empty': return !leftValue || leftValue === '';
      case 'is_not_empty': return !!leftValue && leftValue !== '';
      default: return false;
    }
  }
}
```

#### Email Send Node
```typescript
// src/lib/workflows/execution/nodes/EmailSendExecutor.ts

export class EmailSendExecutor implements NodeExecutor {
  isIdempotent = false;  // Has side effects

  async execute(
    node: WorkflowNode,
    context: NodeExecutionContext
  ): Promise<NodeExecutionResult> {
    const { to, subject, body, cc, bcc } = node.data.config;
    
    // Resolve template variables
    const resolvedTo = this.resolveTemplate(to, context.variables);
    const resolvedSubject = this.resolveTemplate(subject, context.variables);
    const resolvedBody = this.resolveTemplate(body, context.variables);
    
    // Generate idempotency key for deduplication
    const idempotencyKey = `${context.execution.executionId}_${node.id}`;
    
    // Send email
    const result = await context.services.email.send({
      to: resolvedTo,
      subject: resolvedSubject,
      body: resolvedBody,
      cc: cc ? this.resolveTemplate(cc, context.variables) : undefined,
      bcc: bcc ? this.resolveTemplate(bcc, context.variables) : undefined,
      idempotencyKey
    });
    
    return {
      status: 'completed',
      output: {
        messageId: result.messageId,
        sentAt: new Date().toISOString()
      }
    };
  }
}
```

#### MongoDB Query Node
```typescript
// src/lib/workflows/execution/nodes/MongoQueryExecutor.ts

export class MongoQueryExecutor implements NodeExecutor {
  isIdempotent = true;  // Read-only

  async execute(
    node: WorkflowNode,
    context: NodeExecutionContext
  ): Promise<NodeExecutionResult> {
    const { connectionId, database, collection, operation, query, options } = 
      node.data.config;
    
    // Get user's MongoDB connection
    const connection = await context.services.mongodb.getConnection(
      connectionId,
      context.organization._id
    );
    
    // Resolve query variables
    const resolvedQuery = this.resolveQueryVariables(query, context.variables);
    
    // Execute query
    let result;
    switch (operation) {
      case 'find':
        result = await connection
          .db(database)
          .collection(collection)
          .find(resolvedQuery)
          .limit(options?.limit || 100)
          .toArray();
        break;
      case 'findOne':
        result = await connection
          .db(database)
          .collection(collection)
          .findOne(resolvedQuery);
        break;
      case 'count':
        result = await connection
          .db(database)
          .collection(collection)
          .countDocuments(resolvedQuery);
        break;
      case 'aggregate':
        result = await connection
          .db(database)
          .collection(collection)
          .aggregate(resolvedQuery)
          .toArray();
        break;
    }
    
    return {
      status: 'completed',
      output: { result, count: Array.isArray(result) ? result.length : 1 }
    };
  }
}
```

### 4.3 Waiting Node Handling

```typescript
private async handleWaitingNode(
  node: WorkflowNode,
  execution: WorkflowExecution
): Promise<NodeResult> {
  switch (node.type) {
    case 'delay':
      return await this.handleDelayNode(node, execution);
    case 'approval':
      return await this.handleApprovalNode(node, execution);
    case 'wait_for_signal':
      return await this.handleSignalNode(node, execution);
    default:
      throw new Error(`Unknown waiting node type: ${node.type}`);
  }
}

private async handleDelayNode(
  node: WorkflowNode,
  execution: WorkflowExecution
): Promise<NodeResult> {
  const { duration } = node.data.config;
  const resumeAt = this.calculateResumeTime(duration);
  
  // Create timer
  const timer = await this.timerService.schedule({
    executionId: execution.executionId,
    nodeId: node.id,
    type: 'delay',
    fireAt: resumeAt
  });
  
  // Update execution to waiting state
  await this.db.collection('workflow_executions').updateOne(
    { executionId: execution.executionId },
    {
      $set: {
        status: 'waiting',
        waitingFor: {
          type: 'timer',
          resumeAt
        },
        [`nodeStates.${node.id}.status`]: 'running'
      },
      $inc: { version: 1 }
    }
  );
  
  await this.eventLogger.log(execution.executionId, 'TIMER_SCHEDULED', {
    nodeId: node.id,
    timerId: timer.timerId,
    fireAt: resumeAt
  });
  
  return { waiting: true, waitingFor: { type: 'timer', resumeAt } };
}

private async handleApprovalNode(
  node: WorkflowNode,
  execution: WorkflowExecution
): Promise<NodeResult> {
  const config = node.data.config as ApprovalNodeConfig;
  
  // Resolve dynamic values
  const title = this.resolveTemplate(config.title, execution.variables);
  const assignees = await this.resolveAssignees(config.assignTo, execution);
  const context = this.buildApprovalContext(config, execution);
  
  // Calculate timeout
  const expiresAt = config.timeout 
    ? this.calculateTimeout(config.timeout.duration)
    : undefined;
  
  // Create approval request
  const approval = await this.approvalService.create({
    executionId: execution.executionId,
    workflowId: execution.workflowId,
    nodeId: node.id,
    organizationId: execution.organizationId,
    title,
    description: config.description,
    requestType: config.approvalType,
    context,
    options: config.options,
    inputFields: config.inputFields,
    assignedTo: assignees,
    expiresAt
  });
  
  // Schedule timeout timer if configured
  if (expiresAt) {
    await this.timerService.schedule({
      executionId: execution.executionId,
      nodeId: node.id,
      type: 'timeout',
      fireAt: expiresAt,
      payload: { 
        approvalId: approval.approvalId,
        action: config.timeout.action 
      }
    });
  }
  
  // Send notifications
  await this.approvalService.sendNotifications(approval, config.notifications);
  
  // Update execution state
  await this.db.collection('workflow_executions').updateOne(
    { executionId: execution.executionId },
    {
      $set: {
        status: 'waiting',
        waitingFor: {
          type: 'approval',
          approvalId: approval.approvalId,
          timeoutAt: expiresAt
        },
        [`nodeStates.${node.id}.status`]: 'running'
      },
      $inc: { version: 1 }
    }
  );
  
  await this.eventLogger.log(execution.executionId, 'WAITING_FOR_APPROVAL', {
    nodeId: node.id,
    approvalId: approval.approvalId,
    assignedTo: assignees,
    expiresAt
  });
  
  return { 
    waiting: true, 
    waitingFor: { 
      type: 'approval', 
      approvalId: approval.approvalId 
    } 
  };
}
```

---

## 5. Variable Resolution

### 5.1 Variable Path Syntax

```typescript
// Variable references use dot notation with optional array access
// {{trigger.payload.customer.name}}
// {{filter_1.output.items[0].id}}
// {{approval_manager.decision}}

export function resolveVariablePath(
  path: string,
  variables: Record<string, any>
): any {
  const parts = path.split('.');
  let current = variables;
  
  for (const part of parts) {
    if (current === undefined || current === null) {
      return undefined;
    }
    
    // Handle array access: items[0]
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      current = current[key]?.[parseInt(index)];
    } else {
      current = current[part];
    }
  }
  
  return current;
}
```

### 5.2 Template Resolution

```typescript
// Templates use {{variable.path}} syntax
// "Hello {{trigger.payload.name}}, your request #{{request_id}} is approved"

export function resolveTemplate(
  template: string,
  variables: Record<string, any>
): string {
  return template.replace(
    /\{\{([^}]+)\}\}/g,
    (match, path) => {
      const value = resolveVariablePath(path.trim(), variables);
      if (value === undefined) {
        return match; // Keep original if not found
      }
      return String(value);
    }
  );
}
```

### 5.3 Expression Evaluation

```typescript
// For filter conditions and computed values
// Supports: ==, !=, >, <, >=, <=, &&, ||, !, contains, startsWith, endsWith

export function evaluateExpression(
  expression: string,
  variables: Record<string, any>
): any {
  // Create safe evaluation context
  const context = {
    ...variables,
    // Helper functions
    contains: (str: string, search: string) => str?.includes(search),
    startsWith: (str: string, search: string) => str?.startsWith(search),
    endsWith: (str: string, search: string) => str?.endsWith(search),
    isEmpty: (val: any) => val === null || val === undefined || val === '',
    isNotEmpty: (val: any) => val !== null && val !== undefined && val !== '',
    length: (val: any) => Array.isArray(val) ? val.length : String(val).length,
    lower: (str: string) => str?.toLowerCase(),
    upper: (str: string) => str?.toUpperCase(),
    now: () => new Date(),
    today: () => new Date().toISOString().split('T')[0]
  };
  
  // Use safe expression evaluator (no eval!)
  return safeEvaluate(expression, context);
}
```

---

## 6. Retry Logic

### 6.1 Retry Policy Configuration

```typescript
interface RetryPolicy {
  maxAttempts: number;        // Default: 3
  initialDelay: number;       // Default: 1000ms
  maxDelay: number;           // Default: 60000ms
  backoffMultiplier: number;  // Default: 2
  retryableErrors?: string[]; // Error codes to retry
  nonRetryableErrors?: string[]; // Error codes to NOT retry
}

const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 60000,
  backoffMultiplier: 2
};
```

### 6.2 Retry Decision Logic

```typescript
function shouldRetry(
  error: Error,
  attempt: number,
  policy: RetryPolicy
): { shouldRetry: boolean; delay?: number } {
  // Check max attempts
  if (attempt >= policy.maxAttempts) {
    return { shouldRetry: false };
  }
  
  // Check if error is retryable
  const errorCode = getErrorCode(error);
  
  // Explicit non-retryable
  if (policy.nonRetryableErrors?.includes(errorCode)) {
    return { shouldRetry: false };
  }
  
  // Explicit retryable
  if (policy.retryableErrors && !policy.retryableErrors.includes(errorCode)) {
    return { shouldRetry: false };
  }
  
  // Default retryable errors
  const defaultRetryable = [
    'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ESOCKETTIMEDOUT',
    'RATE_LIMIT', 'SERVICE_UNAVAILABLE', 'GATEWAY_TIMEOUT'
  ];
  
  if (!defaultRetryable.includes(errorCode) && !policy.retryableErrors) {
    return { shouldRetry: false };
  }
  
  // Calculate delay with exponential backoff
  const delay = Math.min(
    policy.initialDelay * Math.pow(policy.backoffMultiplier, attempt - 1),
    policy.maxDelay
  );
  
  // Add jitter (±10%)
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  
  return { 
    shouldRetry: true, 
    delay: Math.round(delay + jitter) 
  };
}
```

### 6.3 Retry Implementation

```typescript
private async handleNodeError(
  node: WorkflowNode,
  execution: WorkflowExecution,
  error: Error
): Promise<NodeResult> {
  const policy = node.data.config?.retryPolicy || DEFAULT_RETRY_POLICY;
  const currentRetry = execution.nodeStates[node.id]?.retryCount || 0;
  
  const { shouldRetry: retry, delay } = shouldRetry(
    error,
    currentRetry + 1,
    policy
  );
  
  if (retry && delay) {
    // Schedule retry
    const retryAt = new Date(Date.now() + delay);
    
    await this.timerService.schedule({
      executionId: execution.executionId,
      nodeId: node.id,
      type: 'retry',
      fireAt: retryAt
    });
    
    // Update state
    await this.db.collection('workflow_executions').updateOne(
      { executionId: execution.executionId },
      {
        $set: {
          status: 'waiting',
          waitingFor: { type: 'retry', resumeAt: retryAt },
          [`nodeStates.${node.id}.retryCount`]: currentRetry + 1,
          [`nodeStates.${node.id}.lastError`]: {
            code: getErrorCode(error),
            message: error.message,
            timestamp: new Date()
          }
        },
        $inc: { version: 1 }
      }
    );
    
    await this.eventLogger.log(execution.executionId, 'NODE_RETRYING', {
      nodeId: node.id,
      attempt: currentRetry + 1,
      maxAttempts: policy.maxAttempts,
      delay,
      error: error.message
    });
    
    return { waiting: true, waitingFor: { type: 'retry', resumeAt: retryAt } };
  }
  
  // No more retries - fail the node
  await this.eventLogger.log(execution.executionId, 'NODE_FAILED', {
    nodeId: node.id,
    error: error.message,
    attempts: currentRetry + 1
  });
  
  throw error; // Propagate to fail execution
}
```

---

## 7. Concurrency Control

### 7.1 Optimistic Locking

```typescript
async function updateWithOptimisticLock<T>(
  collection: Collection,
  filter: Filter<Document>,
  update: UpdateFilter<Document>,
  expectedVersion: number
): Promise<T | null> {
  const result = await collection.findOneAndUpdate(
    { ...filter, version: expectedVersion },
    { ...update, $inc: { version: 1 } },
    { returnDocument: 'after' }
  );
  
  if (!result) {
    throw new ConcurrencyError(
      'Document was modified by another process'
    );
  }
  
  return result as T;
}
```

### 7.2 Worker Lock Management

```typescript
const LOCK_DURATION_MS = 30000; // 30 seconds
const LOCK_REFRESH_INTERVAL_MS = 10000; // 10 seconds

async function claimExecution(
  workerId: string
): Promise<WorkflowExecution | null> {
  const now = new Date();
  
  return await db.collection('workflow_executions').findOneAndUpdate(
    {
      status: 'pending',
      $or: [
        { lockedBy: null },
        { lockedUntil: { $lt: now } } // Expired lock
      ]
    },
    {
      $set: {
        status: 'running',
        lockedBy: workerId,
        lockedUntil: new Date(now.getTime() + LOCK_DURATION_MS)
      },
      $inc: { version: 1 }
    },
    {
      sort: { priority: -1, startedAt: 1 }, // High priority, oldest first
      returnDocument: 'after'
    }
  );
}

async function refreshLock(
  executionId: string,
  workerId: string
): Promise<boolean> {
  const result = await db.collection('workflow_executions').updateOne(
    { executionId, lockedBy: workerId },
    {
      $set: {
        lockedUntil: new Date(Date.now() + LOCK_DURATION_MS)
      }
    }
  );
  
  return result.modifiedCount > 0;
}

async function releaseLock(
  executionId: string,
  workerId: string
): Promise<void> {
  await db.collection('workflow_executions').updateOne(
    { executionId, lockedBy: workerId },
    {
      $unset: { lockedBy: '', lockedUntil: '' }
    }
  );
}
```

---

## 8. Recovery Procedures

### 8.1 Startup Recovery

```typescript
// Run on worker startup to recover orphaned executions
async function recoverOrphanedExecutions(): Promise<void> {
  const orphaned = await db.collection('workflow_executions').find({
    status: 'running',
    lockedUntil: { $lt: new Date() }
  }).toArray();
  
  for (const execution of orphaned) {
    logger.info(`Recovering orphaned execution: ${execution.executionId}`);
    
    // Reset to pending for reprocessing
    await db.collection('workflow_executions').updateOne(
      { executionId: execution.executionId },
      {
        $set: { status: 'pending' },
        $unset: { lockedBy: '', lockedUntil: '' },
        $inc: { version: 1 }
      }
    );
    
    await eventLogger.log(execution.executionId, 'EXECUTION_RECOVERED', {
      previousStatus: 'running',
      recoveredAt: new Date()
    });
  }
}
```

### 8.2 Resume from Waiting State

```typescript
// Called when timer fires or approval received
async function resumeExecution(
  executionId: string,
  resumeData?: Record<string, any>
): Promise<void> {
  const execution = await db.collection('workflow_executions').findOneAndUpdate(
    { 
      executionId, 
      status: 'waiting' 
    },
    {
      $set: {
        status: 'pending',
        waitingFor: null,
        ...(resumeData && { [`variables.resume_data`]: resumeData })
      },
      $unset: { lockedBy: '', lockedUntil: '' },
      $inc: { version: 1 }
    },
    { returnDocument: 'after' }
  );
  
  if (!execution) {
    throw new Error(`Cannot resume execution ${executionId} - not in waiting state`);
  }
  
  await eventLogger.log(executionId, 'EXECUTION_RESUMED', {
    previousWaitingFor: execution.waitingFor,
    resumeData
  });
}
```

### 8.3 Node Idempotency Verification

```typescript
// Check if node was already executed (for recovery scenarios)
function wasNodeExecuted(
  execution: WorkflowExecution,
  nodeId: string
): boolean {
  const nodeState = execution.nodeStates[nodeId];
  return nodeState?.status === 'completed';
}

// During recovery, skip already-completed nodes
async function processNodeWithIdempotencyCheck(
  node: WorkflowNode,
  execution: WorkflowExecution
): Promise<NodeResult> {
  if (wasNodeExecuted(execution, node.id)) {
    logger.debug(`Skipping already-executed node: ${node.id}`);
    return {
      completed: true,
      output: execution.nodeStates[node.id].output
    };
  }
  
  return await this.executeNode(node, execution);
}
```

---

## Appendix: Node Executor Registry

```typescript
// src/lib/workflows/execution/nodeRegistry.ts

export const nodeExecutors = new Map<string, NodeExecutor>([
  // Triggers
  ['form_trigger', new FormTriggerExecutor()],
  ['webhook_trigger', new WebhookTriggerExecutor()],
  ['schedule_trigger', new ScheduleTriggerExecutor()],
  ['manual_trigger', new ManualTriggerExecutor()],
  
  // Logic
  ['filter', new FilterExecutor()],
  ['switch', new SwitchExecutor()],
  ['delay', new DelayExecutor()],
  ['loop', new LoopExecutor()],
  ['parallel', new ParallelExecutor()],
  ['merge', new MergeExecutor()],
  
  // Data
  ['mongodb_query', new MongoQueryExecutor()],
  ['mongodb_insert', new MongoInsertExecutor()],
  ['mongodb_update', new MongoUpdateExecutor()],
  ['mongodb_delete', new MongoDeleteExecutor()],
  ['transform', new TransformExecutor()],
  
  // Actions
  ['email_send', new EmailSendExecutor()],
  ['slack_send', new SlackSendExecutor()],
  ['webhook_call', new WebhookCallExecutor()],
  ['http_request', new HttpRequestExecutor()],
  ['function', new FunctionExecutor()],
  
  // AI
  ['llm_generate', new LLMGenerateExecutor()],
  ['llm_classify', new LLMClassifyExecutor()],
  ['llm_extract', new LLMExtractExecutor()],
  ['llm_summarize', new LLMSummarizeExecutor()],
  
  // Human-in-the-Loop (Cloud Only)
  ['approval', new ApprovalExecutor()],
  ['wait_for_signal', new WaitForSignalExecutor()],
  ['manual_task', new ManualTaskExecutor()],
  
  // Utility
  ['variable_set', new VariableSetExecutor()],
  ['variable_get', new VariableGetExecutor()],
  ['note', new NoteExecutor()],  // No-op, just documentation
]);
```

---

*End of Execution Engine Specification*
