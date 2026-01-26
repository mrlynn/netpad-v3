# NetPad Durable Workflow Execution
## Architecture Specification

**Document:** 01-ARCHITECTURE-SPECIFICATION.md  
**Version:** 1.0.0  
**Status:** Sprint Ready  
**Last Updated:** January 26, 2025

---

## Table of Contents

1. [Overview](#1-overview)
2. [Design Principles](#2-design-principles)
3. [System Architecture](#3-system-architecture)
4. [Component Breakdown](#4-component-breakdown)
5. [Data Flow](#5-data-flow)
6. [Open Source vs Cloud Boundary](#6-open-source-vs-cloud-boundary)
7. [Execution Model](#7-execution-model)
8. [State Management](#8-state-management)
9. [Error Handling](#9-error-handling)
10. [Scalability Considerations](#10-scalability-considerations)

---

## 1. Overview

### 1.1 What is Durable Execution?

Durable execution ensures that workflow code **survives failures and restarts**. Unlike traditional request-response execution where a crash means lost work, durable execution persists state after each step, enabling recovery.

**Traditional (Fire-and-Forget):**
```
Request → Node 1 → Node 2 → Node 3 → Response
                      ↓
                   (crash)
                      ↓
              Lost forever ❌
```

**Durable Execution:**
```
Request → Node 1 [SAVE] → Node 2 [SAVE] → ...
                              ↓
                           (crash)
                              ↓
                 Restart → Load state → Resume at Node 3 ✅
```

### 1.2 Core Capabilities

| Capability | Description |
|------------|-------------|
| **State Persistence** | Every node completion saves state to MongoDB |
| **Event Logging** | Every action recorded as immutable event |
| **Idempotent Execution** | Safe retries without duplicate side effects |
| **Human-in-the-Loop** | Workflows can pause indefinitely for human input |
| **Timer Management** | Scheduled wake-ups with persistence |
| **Automatic Recovery** | Crashed executions resume on restart |

### 1.3 What We're NOT Building

To maintain scope, we explicitly exclude:

- **Full Event Sourcing**: We log events but don't rebuild state from them
- **CQRS**: Single model for reads and writes
- **Distributed Transactions**: MongoDB single-document atomicity is sufficient
- **Real-time Collaboration**: Single executor per execution at a time
- **Workflow Versioning During Execution**: Executions use workflow version at start

---

## 2. Design Principles

### 2.1 MongoDB-Native

Every design decision assumes MongoDB as the persistence layer:

- **Single-document atomicity**: Use MongoDB's transactional guarantees on documents
- **Optimistic concurrency**: Version fields prevent lost updates
- **Index-driven queries**: Design collections for efficient querying
- **No external dependencies**: No Redis, RabbitMQ, or other infrastructure

### 2.2 Failure as Normal Operation

The system assumes failures happen constantly:

- Workers can crash mid-execution
- Network partitions occur
- MongoDB may be temporarily unavailable
- User sessions timeout

Every operation is designed to be safely resumable.

### 2.3 Horizontal Scalability

The architecture supports scaling:

- Multiple workers can process different executions
- No single point of contention
- Work distribution via atomic claims
- Stateless workers (all state in MongoDB)

### 2.4 Observable Operations

Every action is traceable:

- Events log all state transitions
- Execution status always queryable
- Performance metrics at each stage
- Debugging information preserved

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        NetPad Cloud Platform                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ Form Submit │  │   Webhook   │  │  Schedule   │  │   Manual    │   │
│  │   Trigger   │  │   Trigger   │  │   Trigger   │  │   Trigger   │   │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │
│         │                │                │                │           │
│         └────────────────┴────────────────┴────────────────┘           │
│                                   │                                     │
│                                   ▼                                     │
│                    ┌──────────────────────────────┐                    │
│                    │    Workflow Scheduler        │                    │
│                    │    (API Route Layer)         │                    │
│                    │                              │                    │
│                    │  • Validates trigger         │                    │
│                    │  • Creates execution record  │                    │
│                    │  • Logs EXECUTION_STARTED    │                    │
│                    │  • Enqueues for processing   │                    │
│                    └──────────────┬───────────────┘                    │
│                                   │                                     │
│                                   ▼                                     │
│                    ┌──────────────────────────────┐                    │
│                    │      Execution Queue         │                    │
│                    │   (MongoDB Collection)       │                    │
│                    │                              │                    │
│                    │  • Pending executions        │                    │
│                    │  • Priority ordering         │                    │
│                    │  • Lock management           │                    │
│                    └──────────────┬───────────────┘                    │
│                                   │                                     │
│              ┌────────────────────┼────────────────────┐               │
│              │                    │                    │               │
│              ▼                    ▼                    ▼               │
│    ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │
│    │   Worker 1      │  │   Worker 2      │  │   Worker N      │      │
│    │                 │  │                 │  │                 │      │
│    │  ┌───────────┐  │  │  ┌───────────┐  │  │  ┌───────────┐  │      │
│    │  │ Execution │  │  │  │ Execution │  │  │  │ Execution │  │      │
│    │  │  Engine   │  │  │  │  Engine   │  │  │  │  Engine   │  │      │
│    │  └───────────┘  │  │  └───────────┘  │  │  └───────────┘  │      │
│    └────────┬────────┘  └────────┬────────┘  └────────┬────────┘      │
│             │                    │                    │               │
│             └────────────────────┴────────────────────┘               │
│                                   │                                     │
│                                   ▼                                     │
│    ┌─────────────────────────────────────────────────────────────┐    │
│    │                     MongoDB Atlas                            │    │
│    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │    │
│    │  │ workflow_   │  │ workflow_   │  │ workflow_   │          │    │
│    │  │ executions  │  │ events      │  │ approvals   │          │    │
│    │  └─────────────┘  └─────────────┘  └─────────────┘          │    │
│    │  ┌─────────────┐  ┌─────────────┐                           │    │
│    │  │ workflow_   │  │ workflows   │  (existing)               │    │
│    │  │ timers      │  │             │                           │    │
│    │  └─────────────┘  └─────────────┘                           │    │
│    └─────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  Background Services:                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│  │ Timer Processor │  │ Timeout Handler │  │ Cleanup Service │        │
│  │ (every 1s)      │  │ (every 30s)     │  │ (daily)         │        │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Interaction Flow

```
┌──────────┐      ┌───────────┐      ┌────────────┐      ┌──────────┐
│ Trigger  │─────▶│ Scheduler │─────▶│   Queue    │─────▶│  Worker  │
└──────────┘      └───────────┘      └────────────┘      └──────────┘
                                                               │
                                                               ▼
                                                        ┌──────────┐
                                                        │ Executor │
                                                        └──────────┘
                                                               │
     ┌─────────────────────────────────────────────────────────┤
     │                         │                               │
     ▼                         ▼                               ▼
┌──────────┐            ┌──────────┐                    ┌──────────┐
│  State   │            │  Events  │                    │  Nodes   │
│  Store   │            │   Log    │                    │ Executor │
└──────────┘            └──────────┘                    └──────────┘
```

---

## 4. Component Breakdown

### 4.1 Workflow Scheduler

**Location:** `src/app/api/workflows/[workflowId]/executions/route.ts`

**Responsibilities:**
- Receive trigger events (form submission, webhook, schedule, manual)
- Validate trigger payload against workflow expectations
- Create execution record with initial state
- Log `EXECUTION_STARTED` event
- Enqueue execution for worker processing

**Key Operations:**
```typescript
async function scheduleExecution(
  workflow: WorkflowDefinition,
  trigger: TriggerPayload,
  context: ExecutionContext
): Promise<ExecutionHandle> {
  // 1. Generate execution ID
  const executionId = generateExecutionId();
  
  // 2. Create execution record
  const execution = await createExecutionRecord({
    executionId,
    workflowId: workflow._id,
    organizationId: context.organizationId,
    projectId: context.projectId,
    trigger,
    status: 'pending',
    variables: { trigger: trigger.payload },
    startedAt: new Date(),
  });
  
  // 3. Log start event
  await logEvent(executionId, 'EXECUTION_STARTED', { trigger });
  
  // 4. Enqueue for processing
  await enqueueExecution(executionId);
  
  return { executionId, status: 'queued' };
}
```

### 4.2 Execution Queue

**Implementation:** MongoDB-based queue using `workflow_executions` collection

**Design Decisions:**
- No external queue service (Redis, SQS) - MongoDB is sufficient
- Atomic claim using `findOneAndUpdate` with version check
- Lock expiration for worker failure recovery
- Priority support via index on `priority` field

**Queue Operations:**
```typescript
// Enqueue
await db.collection('workflow_executions').updateOne(
  { executionId },
  { $set: { status: 'pending', queuedAt: new Date() } }
);

// Claim (atomic)
const claimed = await db.collection('workflow_executions').findOneAndUpdate(
  { 
    status: 'pending',
    $or: [
      { lockedUntil: { $exists: false } },
      { lockedUntil: { $lt: new Date() } }
    ]
  },
  { 
    $set: { 
      status: 'running',
      lockedBy: workerId,
      lockedUntil: new Date(Date.now() + LOCK_DURATION_MS)
    },
    $inc: { version: 1 }
  },
  { sort: { priority: -1, queuedAt: 1 } }
);
```

### 4.3 Execution Worker

**Location:** `src/lib/workflows/execution/ExecutionWorker.ts`

**Responsibilities:**
- Poll for pending work
- Claim executions atomically
- Process steps until completion or waiting state
- Refresh locks for long-running executions
- Release locks on completion or failure

**Lifecycle:**
```
start() → poll() → claim() → process() → release() → poll() ...
              ↓
          (no work)
              ↓
           sleep(100ms)
```

### 4.4 Execution Engine

**Location:** `src/lib/workflows/execution/ExecutionEngine.ts`

**Responsibilities:**
- Determine next node to execute
- Execute individual nodes
- Persist state after each node
- Log events for all transitions
- Handle errors and retries
- Manage waiting states (approval, timer)

**Core Algorithm:**
```typescript
async function processExecution(executionId: string): Promise<ProcessResult> {
  while (true) {
    // 1. Load current state
    const execution = await loadExecution(executionId);
    
    // 2. Check terminal states
    if (['completed', 'failed', 'cancelled'].includes(execution.status)) {
      return { status: execution.status };
    }
    
    // 3. Check waiting states
    if (['paused', 'waiting'].includes(execution.status)) {
      return { status: 'waiting', waitingFor: execution.waitingFor };
    }
    
    // 4. Determine next node
    const nextNode = determineNextNode(execution);
    if (!nextNode) {
      await completeExecution(execution);
      return { status: 'completed' };
    }
    
    // 5. Execute node
    const result = await executeNode(nextNode, execution);
    
    // 6. Handle result
    if (result.waiting) {
      return { status: 'waiting', waitingFor: result.waitingFor };
    }
    
    // Loop continues to next node
  }
}
```

### 4.5 Node Executors

**Location:** `src/lib/workflows/execution/nodes/`

Each node type has a dedicated executor:

| Node Type | Executor | Special Handling |
|-----------|----------|------------------|
| `form_trigger` | `FormTriggerExecutor` | Entry point only |
| `filter` | `FilterExecutor` | Evaluates condition, sets output path |
| `delay` | `DelayExecutor` | Creates timer, pauses execution |
| `email_send` | `EmailSendExecutor` | Calls email service |
| `approval` | `ApprovalExecutor` | Creates approval, pauses execution |
| `mongodb_query` | `MongoQueryExecutor` | Executes query against user's connection |
| `llm_generate` | `LLMGenerateExecutor` | Calls AI service |

**Executor Interface:**
```typescript
interface NodeExecutor {
  execute(
    node: WorkflowNode,
    execution: WorkflowExecution,
    context: ExecutionContext
  ): Promise<NodeExecutionResult>;
}

interface NodeExecutionResult {
  status: 'completed' | 'waiting' | 'failed';
  output?: Record<string, any>;
  error?: string;
  waitingFor?: WaitingState;
  nextPath?: string; // For conditional nodes
}
```

### 4.6 Background Services

**Timer Processor** (`src/lib/workflows/workers/TimerProcessor.ts`)
- Runs every 1 second
- Finds timers where `fireAt <= now` and `status = 'scheduled'`
- Marks timer as fired (atomic)
- Resumes associated execution

**Timeout Handler** (`src/lib/workflows/workers/TimeoutHandler.ts`)
- Runs every 30 seconds
- Finds approvals where `expiresAt <= now` and `status = 'pending'`
- Executes timeout action (reject, approve, escalate, fail)

**Cleanup Service** (`src/lib/workflows/workers/CleanupService.ts`)
- Runs daily
- Archives completed executions older than retention period
- Purges events for archived executions
- Frees up indexes for active queries

---

## 5. Data Flow

### 5.1 Happy Path: Simple Workflow

```
Form Submit → Trigger → Filter → Email → Complete

┌────────────────────────────────────────────────────────────────────────┐
│ Timeline                                                                │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│ T+0ms    Form submitted                                                │
│          └─ API receives form data                                     │
│          └─ Scheduler creates execution (status: pending)              │
│          └─ Event: EXECUTION_STARTED                                   │
│                                                                        │
│ T+50ms   Worker claims execution                                       │
│          └─ Status: pending → running                                  │
│          └─ Event: NODE_STARTED (trigger)                              │
│                                                                        │
│ T+60ms   Trigger node completes                                        │
│          └─ State saved: nodeStates.trigger = { status: completed }    │
│          └─ Event: NODE_COMPLETED (trigger)                            │
│                                                                        │
│ T+70ms   Filter node starts                                            │
│          └─ Event: NODE_STARTED (filter)                               │
│          └─ Evaluates condition                                        │
│          └─ State saved: nodeStates.filter = { output: { path: 'yes' }}│
│          └─ Event: NODE_COMPLETED (filter)                             │
│                                                                        │
│ T+80ms   Email node starts                                             │
│          └─ Event: NODE_STARTED (email)                                │
│          └─ Sends email via service                                    │
│          └─ State saved: nodeStates.email = { status: completed }      │
│          └─ Event: NODE_COMPLETED (email)                              │
│                                                                        │
│ T+100ms  Execution completes                                           │
│          └─ Status: running → completed                                │
│          └─ Event: EXECUTION_COMPLETED                                 │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Approval Path: Human-in-the-Loop

```
Form Submit → Trigger → Approval → [WAIT] → Email → Complete

┌────────────────────────────────────────────────────────────────────────┐
│ Timeline                                                                │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│ T+0ms    Form submitted                                                │
│          └─ Execution created, trigger completes                       │
│                                                                        │
│ T+100ms  Approval node starts                                          │
│          └─ Event: NODE_STARTED (approval)                             │
│          └─ Creates approval record in workflow_approvals              │
│          └─ Schedules timeout timer                                    │
│          └─ Sends notification (email/slack)                           │
│          └─ Event: WAITING_FOR_APPROVAL                                │
│          └─ Status: running → waiting                                  │
│          └─ Worker releases lock, moves to next execution              │
│                                                                        │
│ T+2hrs   Manager receives notification, opens approval UI              │
│          └─ Sees approval details, context, options                    │
│                                                                        │
│ T+2.1hrs Manager clicks "Approve"                                      │
│          └─ API: POST /api/approvals/{id} { decision: 'approved' }     │
│          └─ Approval record updated (status: approved)                 │
│          └─ Event: APPROVAL_RECEIVED                                   │
│          └─ Timeout timer cancelled                                    │
│          └─ Execution re-enqueued (status: pending)                    │
│                                                                        │
│ T+2.1hrs Worker claims execution                                       │
│ +50ms    └─ Status: pending → running                                  │
│          └─ State includes approval result                             │
│          └─ Event: NODE_COMPLETED (approval)                           │
│          └─ Email node executes                                        │
│          └─ Execution completes                                        │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Failure and Recovery Path

```
┌────────────────────────────────────────────────────────────────────────┐
│ Timeline                                                                │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│ T+0ms    Execution starts, completes Node 1, Node 2                    │
│                                                                        │
│ T+200ms  Server crashes during Node 3 execution                        │
│          └─ State in MongoDB: Node 1 ✓, Node 2 ✓, Node 3 (no state)   │
│          └─ Lock expires after LOCK_DURATION (30s)                     │
│                                                                        │
│ T+30s    Server restarts                                               │
│          └─ Worker starts polling                                      │
│          └─ Finds execution with expired lock, status: running         │
│          └─ Claims execution                                           │
│                                                                        │
│ T+30s    Recovery logic:                                               │
│ +50ms    └─ Loads execution state                                      │
│          └─ Sees Node 1, Node 2 completed                              │
│          └─ Determines next node: Node 3 (never persisted completion)  │
│          └─ Re-executes Node 3 (idempotency required!)                 │
│          └─ Continues to Node 4, completes                             │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Open Source vs Cloud Boundary

### 6.1 Boundary Definition

The clean separation between open source and cloud components:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    OPEN SOURCE (MIT License)                            │
│                    Repository: netpad-3, packages/*                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  packages/workflows/                                                    │
│  ├── src/                                                              │
│  │   ├── types/                                                        │
│  │   │   ├── WorkflowDefinition.ts    ← Schema for workflows          │
│  │   │   ├── NodeTypes.ts             ← ALL node type definitions     │
│  │   │   └── ExecutionTypes.ts        ← Execution status types        │
│  │   ├── execution/                                                    │
│  │   │   ├── ExecutorInterface.ts     ← Interface contract            │
│  │   │   └── SimpleExecutor.ts        ← Fire-and-forget impl          │
│  │   └── validation/                                                   │
│  │       └── validateWorkflow.ts      ← Workflow validation           │
│  └── package.json                                                      │
│                                                                         │
│  packages/workflow-renderer/           ← Visual rendering              │
│                                                                         │
│  src/components/WorkflowEditor/        ← Editor UI (all node types)   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    CLOUD ONLY (Proprietary)                             │
│                    Location: src/lib/workflows/                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  src/lib/workflows/                                                    │
│  ├── execution/                                                        │
│  │   ├── DurableWorkflowExecutor.ts   ← Full durable implementation   │
│  │   ├── ExecutionEngine.ts           ← Core processing loop          │
│  │   ├── ApprovalService.ts           ← HITL backend                  │
│  │   ├── TimerService.ts              ← Scheduled wake-ups            │
│  │   ├── EventLogger.ts               ← Immutable audit log           │
│  │   ├── StateManager.ts              ← Persistence layer             │
│  │   └── getExecutor.ts               ← Chooses executor by context   │
│  ├── workers/                                                          │
│  │   ├── ExecutionWorker.ts           ← Queue processor               │
│  │   ├── TimerProcessor.ts            ← Timer wake-up service         │
│  │   └── TimeoutHandler.ts            ← Approval timeout handling     │
│  └── nodes/                                                            │
│      └── ApprovalExecutor.ts          ← Approval node backend         │
│                                                                         │
│  src/app/api/                                                          │
│  ├── workflows/[workflowId]/executions/  ← Execution APIs             │
│  └── approvals/                          ← Approval APIs              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Integration Point

The boundary is managed by `getExecutor()`:

```typescript
// src/lib/workflows/execution/getExecutor.ts

import { WorkflowExecutor } from '@netpad/workflows';
import { SimpleWorkflowExecutor } from '@netpad/workflows/execution';
import { DurableWorkflowExecutor } from './DurableWorkflowExecutor';

export function getWorkflowExecutor(
  context: ExecutionContext
): WorkflowExecutor {
  // Self-hosted always gets simple executor
  if (process.env.NETPAD_DEPLOYMENT_MODE === 'self-hosted') {
    return new SimpleWorkflowExecutor();
  }
  
  // Check if workflow requires durable features
  if (requiresDurableExecution(context.workflow)) {
    // Check subscription tier
    if (!hasDurableWorkflowsAccess(context.organization)) {
      throw new UpgradeRequiredError(
        'Durable workflow execution requires Team or Enterprise plan.'
      );
    }
    
    return new DurableWorkflowExecutor(context);
  }
  
  // Simple workflows use simple executor even in cloud
  return new SimpleWorkflowExecutor();
}

function requiresDurableExecution(workflow: WorkflowDefinition): boolean {
  return workflow.nodes.some(node => 
    DURABLE_ONLY_NODES.includes(node.type) ||
    node.data.config?.retryPolicy !== undefined ||
    isLongDelay(node)
  );
}

const DURABLE_ONLY_NODES = [
  'approval',
  'wait_for_signal',
  'manual_task'
];

function isLongDelay(node: WorkflowNode): boolean {
  if (node.type !== 'delay') return false;
  const duration = parseDuration(node.data.config?.duration);
  return duration > 60 * 60 * 1000; // > 1 hour
}
```

### 6.3 UI Handling

Node palette indicates cloud-only features:

```typescript
// Node configuration in workflow editor
const nodeRegistry = {
  approval: {
    type: 'approval',
    label: 'Approval Gate',
    category: 'human-in-the-loop',
    cloudOnly: true,           // ← Requires cloud
    minimumTier: 'team',       // ← Requires Team+
    icon: ApprovalIcon,
  },
  delay: {
    type: 'delay',
    label: 'Delay',
    category: 'flow',
    cloudOnly: false,          // ← Works everywhere
    // But long delays require cloud (handled at runtime)
  },
  // ...
};
```

---

## 7. Execution Model

### 7.1 Execution Lifecycle

```
                    ┌─────────┐
                    │ pending │ ◄─────────────────────────────┐
                    └────┬────┘                               │
                         │ worker claims                       │
                         ▼                                     │
                    ┌─────────┐                               │
           ┌───────│ running │◄──────────────────────────┐   │
           │       └────┬────┘                            │   │
           │            │                                 │   │
           │            ├── node waiting ──┐              │   │
           │            │                  ▼              │   │
           │            │            ┌──────────┐         │   │
           │            │            │ waiting  │─────────┘   │
           │            │            └────┬─────┘             │
           │            │                 │                   │
           │            │                 │ timer/approval    │
           │            │                 └───────────────────┘
           │            │
           │            ├── manual pause ──┐
           │            │                  ▼
           │            │            ┌──────────┐
           │            │            │  paused  │──── resume ──┐
           │            │            └──────────┘              │
           │            │                                      │
           │            │◄─────────────────────────────────────┘
           │            │
           │            ├── all nodes done
           │            ▼
           │       ┌───────────┐
           │       │ completed │
           │       └───────────┘
           │
           ├── unrecoverable error
           ▼
      ┌─────────┐
      │ failed  │
      └─────────┘
           │
           │ manual cancel
           ▼
      ┌───────────┐
      │ cancelled │
      └───────────┘
```

### 7.2 Status Definitions

| Status | Description | Transitions To |
|--------|-------------|----------------|
| `pending` | Queued, waiting for worker | `running` |
| `running` | Worker actively processing | `waiting`, `paused`, `completed`, `failed` |
| `waiting` | Paused for timer or approval | `pending` (on resume) |
| `paused` | Manually paused by user | `pending` (on resume), `cancelled` |
| `completed` | All nodes executed successfully | (terminal) |
| `failed` | Unrecoverable error occurred | (terminal) |
| `cancelled` | Manually cancelled | (terminal) |

### 7.3 Concurrency Model

**Single Executor Per Execution**: Only one worker processes an execution at a time.

**Enforced By**:
1. Atomic claim using `findOneAndUpdate`
2. Lock expiration for worker failure
3. Version field for optimistic concurrency

```typescript
// Claiming an execution (atomic)
const claimed = await db.collection('workflow_executions').findOneAndUpdate(
  { 
    executionId,
    status: { $in: ['pending', 'running'] },
    version: knownVersion,
    $or: [
      { lockedBy: null },
      { lockedBy: workerId },
      { lockedUntil: { $lt: new Date() } }
    ]
  },
  { 
    $set: { 
      lockedBy: workerId,
      lockedUntil: new Date(Date.now() + LOCK_DURATION_MS),
      status: 'running'
    },
    $inc: { version: 1 }
  },
  { returnDocument: 'after' }
);

if (!claimed) {
  throw new ConcurrencyError('Execution claimed by another worker');
}
```

---

## 8. State Management

### 8.1 State Persistence Strategy

State is persisted **after each node completion**, not during:

```typescript
async function executeNode(node: WorkflowNode, execution: WorkflowExecution) {
  // 1. Log start
  await logEvent(execution.executionId, 'NODE_STARTED', { nodeId: node.id });
  
  // 2. Execute (may have external side effects)
  const result = await nodeExecutor.execute(node, execution);
  
  // 3. Persist state (CRITICAL - this is the durability point)
  await saveNodeResult(execution, node, result);
  
  // 4. Log completion
  await logEvent(execution.executionId, 'NODE_COMPLETED', { 
    nodeId: node.id, 
    output: result.output 
  });
  
  return result;
}

async function saveNodeResult(
  execution: WorkflowExecution, 
  node: WorkflowNode, 
  result: NodeExecutionResult
) {
  await db.collection('workflow_executions').updateOne(
    { executionId: execution.executionId, version: execution.version },
    {
      $set: {
        [`nodeStates.${node.id}`]: {
          status: result.status,
          output: result.output,
          completedAt: new Date()
        },
        [`variables.${node.id}_output`]: result.output,
        currentNodeId: determineNextNodeId(execution, node, result),
        updatedAt: new Date()
      },
      $inc: { version: 1 }
    }
  );
}
```

### 8.2 Variable Scoping

Variables are scoped to the execution and accessed by path:

```typescript
interface ExecutionVariables {
  // Trigger data
  trigger: {
    type: string;
    payload: Record<string, any>;
    timestamp: Date;
  };
  
  // Node outputs (auto-populated)
  [nodeId: string]: {
    output: Record<string, any>;
  };
  
  // User-defined variables (from variable_set nodes)
  [variableName: string]: any;
  
  // Approval results
  [`approval_${nodeId}`]: {
    decision: 'approved' | 'rejected';
    respondedBy: string;
    respondedAt: Date;
    comment?: string;
  };
}
```

**Accessing Variables in Expressions:**
```javascript
// In node configuration
"{{trigger.payload.email}}"
"{{filter_1.output.matched}}"
"{{approval_manager.decision}}"
```

### 8.3 Idempotency Requirements

Nodes that have external side effects MUST be idempotent:

| Node Type | Side Effect | Idempotency Strategy |
|-----------|-------------|---------------------|
| `email_send` | Sends email | Include execution+node ID in email headers; email service dedupes |
| `slack_send` | Posts message | Include idempotency key in Slack API call |
| `mongodb_insert` | Inserts document | Include execution ID in document; use upsert with unique constraint |
| `webhook_call` | HTTP request | Include idempotency header; webhook endpoint should dedupe |
| `llm_generate` | AI API call | Cache results by execution+node ID; return cached on retry |

---

## 9. Error Handling

### 9.1 Error Classification

| Error Type | Retryable | Action |
|------------|-----------|--------|
| Network timeout | Yes | Retry with backoff |
| Rate limit (429) | Yes | Retry after delay |
| Authentication failure | No | Fail immediately |
| Invalid configuration | No | Fail immediately |
| External service error (5xx) | Yes | Retry with backoff |
| User connection failure | Yes | Retry, then fail |

### 9.2 Retry Policy

Configurable per-node retry policy:

```typescript
interface RetryPolicy {
  maxAttempts: number;       // Default: 3
  initialDelay: number;      // Default: 1000ms
  maxDelay: number;          // Default: 60000ms
  backoffMultiplier: number; // Default: 2
  retryableErrors?: string[];// Error codes to retry
}

// Example configuration in node data
{
  type: 'webhook_call',
  data: {
    config: {
      url: 'https://api.example.com/notify',
      retryPolicy: {
        maxAttempts: 5,
        initialDelay: 2000,
        backoffMultiplier: 2
      }
    }
  }
}
```

### 9.3 Retry Implementation

```typescript
async function executeWithRetry(
  node: WorkflowNode,
  execution: WorkflowExecution,
  policy: RetryPolicy
): Promise<NodeExecutionResult> {
  let lastError: Error;
  let delay = policy.initialDelay;
  
  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    try {
      return await nodeExecutor.execute(node, execution);
    } catch (error) {
      lastError = error;
      
      // Check if retryable
      if (!isRetryable(error, policy)) {
        throw error;
      }
      
      // Log retry
      await logEvent(execution.executionId, 'NODE_RETRYING', {
        nodeId: node.id,
        attempt,
        error: error.message,
        nextAttemptIn: delay
      });
      
      // Schedule retry (creates timer, pauses execution)
      if (attempt < policy.maxAttempts) {
        return {
          status: 'waiting',
          waitingFor: {
            type: 'retry',
            retryAt: new Date(Date.now() + delay),
            attempt
          }
        };
      }
      
      delay = Math.min(delay * policy.backoffMultiplier, policy.maxDelay);
    }
  }
  
  throw lastError;
}
```

### 9.4 Error Propagation

When a node fails permanently:

```typescript
async function handleNodeFailure(
  execution: WorkflowExecution,
  node: WorkflowNode,
  error: Error
): Promise<void> {
  // 1. Log failure event
  await logEvent(execution.executionId, 'NODE_FAILED', {
    nodeId: node.id,
    error: error.message,
    stack: error.stack
  });
  
  // 2. Update execution state
  await db.collection('workflow_executions').updateOne(
    { executionId: execution.executionId },
    {
      $set: {
        status: 'failed',
        error: {
          nodeId: node.id,
          message: error.message,
          code: error.code,
          timestamp: new Date()
        },
        completedAt: new Date()
      }
    }
  );
  
  // 3. Log execution failure
  await logEvent(execution.executionId, 'EXECUTION_FAILED', {
    nodeId: node.id,
    error: error.message
  });
  
  // 4. Send failure notification (if configured)
  if (execution.workflow.failureNotification) {
    await sendFailureNotification(execution, node, error);
  }
}
```

---

## 10. Scalability Considerations

### 10.1 Horizontal Scaling

**Workers**: Stateless, can scale horizontally
- Each worker has unique ID
- Claims work atomically
- No coordination required between workers

**Recommended Starting Point**:
- 1 worker per 100 concurrent executions
- Workers are lightweight (Node.js event loop)
- Scale based on queue depth metrics

### 10.2 MongoDB Considerations

**Write Patterns**:
- Execution updates: ~3-10 writes per execution
- Event logging: ~2-4 writes per node
- Timer creates/fires: 1-2 writes per timer

**Index Strategy** (see Database Schema doc):
- Compound indexes for common queries
- Partial indexes for status-specific queries
- TTL indexes for automatic cleanup

**Sharding** (future, if needed):
- Shard key: `organizationId` (locality)
- Alternative: `executionId` (distribution)

### 10.3 Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Node execution overhead | <50ms | Excluding node's actual work |
| State persistence | <20ms | Single document update |
| Event logging | <10ms | Append-only write |
| Queue claim | <30ms | findOneAndUpdate with index |
| Timer precision | ±1s | Background processor interval |

### 10.4 Monitoring Points

```typescript
// Metrics to track
const metrics = {
  // Throughput
  'executions.started': counter,
  'executions.completed': counter,
  'executions.failed': counter,
  'nodes.executed': counter,
  
  // Latency
  'node.execution.duration': histogram,
  'state.persistence.duration': histogram,
  'queue.claim.duration': histogram,
  
  // Queue health
  'queue.depth': gauge,
  'queue.oldest.age': gauge,
  
  // Approvals
  'approvals.pending': gauge,
  'approvals.response.duration': histogram,
  
  // Errors
  'errors.retryable': counter,
  'errors.permanent': counter,
};
```

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Execution** | A single run of a workflow with specific trigger data |
| **Node** | A single step in a workflow (filter, email, approval, etc.) |
| **Edge** | Connection between nodes defining flow |
| **Event** | Immutable record of something that happened |
| **Timer** | Scheduled future wake-up for an execution |
| **Approval** | Human decision point that pauses execution |
| **Worker** | Process that claims and processes executions |
| **Claim** | Atomic acquisition of exclusive processing rights |
| **Lock** | Time-limited exclusive access to an execution |

---

## Appendix B: Related Documents

- `02-API-SPECIFICATION.md` - REST API contracts
- `03-DATABASE-SCHEMA.md` - MongoDB collections and indexes
- `04-EXECUTION-ENGINE.md` - Core algorithms
- `05-APPROVAL-SYSTEM.md` - Human-in-the-loop details
- `06-BACKGROUND-WORKERS.md` - Timer and queue processing
- `07-UI-COMPONENTS.md` - Frontend specifications
- `08-TESTING-STRATEGY.md` - Test approach
- `09-MIGRATION-GUIDE.md` - Upgrade path
- `10-SPRINT-PLAN.md` - Implementation phases

---

*End of Architecture Specification*
