# NetPad Durable Workflow Execution
## Database Schema Specification

**Document:** 03-DATABASE-SCHEMA.md  
**Version:** 1.0.0  
**Status:** Sprint Ready  
**Last Updated:** January 26, 2025

---

## Table of Contents

1. [Overview](#1-overview)
2. [Collections](#2-collections)
3. [Indexes](#3-indexes)
4. [Relationships](#4-relationships)
5. [Migration Strategy](#5-migration-strategy)
6. [Data Retention](#6-data-retention)

---

## 1. Overview

### 1.1 New Collections

| Collection | Purpose | Growth Pattern |
|------------|---------|----------------|
| `workflow_executions` | Running execution state | Moderate (1 per execution) |
| `workflow_events` | Immutable audit log | High (5-20 per execution) |
| `workflow_approvals` | Pending human decisions | Low (subset of executions) |
| `workflow_timers` | Scheduled wake-ups | Low-Moderate |

### 1.2 Design Principles

- **Single-Document Atomicity**: Execution state in one document
- **Optimistic Concurrency**: Version field for safe updates
- **TTL Cleanup**: Automatic archival of old data
- **Embed Node States**: Avoid joins for common operations

---

## 2. Collections

### 2.1 workflow_executions

```typescript
interface WorkflowExecution {
  _id: ObjectId;
  executionId: string;              // UUID - public ID
  workflowId: ObjectId;
  workflowVersion: number;
  organizationId: ObjectId;
  projectId: ObjectId;
  
  trigger: {
    type: 'form_submission' | 'webhook' | 'schedule' | 'manual' | 'api';
    sourceId?: string;
    payload: Record<string, any>;
    timestamp: Date;
  };
  
  status: 'pending' | 'running' | 'paused' | 'waiting' | 'completed' | 'failed' | 'cancelled';
  currentNodeId: string | null;
  
  variables: Record<string, any>;
  nodeStates: Record<string, {
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    startedAt?: Date;
    completedAt?: Date;
    output?: Record<string, any>;
    error?: { code: string; message: string; };
    retryCount?: number;
  }>;
  
  waitingFor?: {
    type: 'approval' | 'signal' | 'timer' | 'retry';
    approvalId?: string;
    signalName?: string;
    resumeAt?: Date;
    timeoutAt?: Date;
  };
  
  error?: {
    nodeId: string;
    code: string;
    message: string;
    timestamp: Date;
  };
  
  version: number;
  lockedBy?: string;
  lockedUntil?: Date;
  
  priority: 'low' | 'normal' | 'high';
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  
  retryCount: number;
  parentExecutionId?: string;
}
```

**Example:**
```json
{
  "_id": "ObjectId(...)",
  "executionId": "exec_abc123xyz",
  "workflowId": "ObjectId(...)",
  "workflowVersion": 3,
  "organizationId": "ObjectId(...)",
  "projectId": "ObjectId(...)",
  "trigger": {
    "type": "form_submission",
    "sourceId": "form_expense_request",
    "payload": { "amount": 15000, "description": "Q1 Conference" },
    "timestamp": "2025-01-26T10:30:00Z"
  },
  "status": "waiting",
  "currentNodeId": "approval_manager",
  "variables": {
    "trigger": { "amount": 15000 },
    "filter_priority": { "output": { "path": "high" } }
  },
  "nodeStates": {
    "trigger_form": { "status": "completed", "completedAt": "2025-01-26T10:30:00.100Z" },
    "filter_priority": { "status": "completed", "completedAt": "2025-01-26T10:30:00.200Z" },
    "approval_manager": { "status": "running", "startedAt": "2025-01-26T10:30:00.300Z" }
  },
  "waitingFor": {
    "type": "approval",
    "approvalId": "appr_xyz789",
    "timeoutAt": "2025-01-28T10:30:00Z"
  },
  "version": 5,
  "priority": "normal",
  "startedAt": "2025-01-26T10:30:00Z",
  "updatedAt": "2025-01-26T10:30:00.500Z",
  "retryCount": 0
}
```

---

### 2.2 workflow_events

Immutable audit log of all execution events.

```typescript
interface WorkflowEvent {
  _id: ObjectId;
  eventId: string;                  // UUID
  executionId: string;
  workflowId: ObjectId;
  
  eventType: WorkflowEventType;
  sequenceNumber: number;           // Per-execution ordering
  
  nodeId?: string;
  
  payload: Record<string, any>;
  
  timestamp: Date;
  
  metadata?: {
    workerId?: string;
    traceId?: string;
    duration?: number;
  };
}

type WorkflowEventType =
  | 'EXECUTION_STARTED'
  | 'EXECUTION_COMPLETED'
  | 'EXECUTION_FAILED'
  | 'EXECUTION_CANCELLED'
  | 'NODE_SCHEDULED'
  | 'NODE_STARTED'
  | 'NODE_COMPLETED'
  | 'NODE_FAILED'
  | 'NODE_RETRYING'
  | 'WAITING_FOR_APPROVAL'
  | 'APPROVAL_RECEIVED'
  | 'APPROVAL_REJECTED'
  | 'APPROVAL_TIMEOUT'
  | 'TIMER_SCHEDULED'
  | 'TIMER_FIRED'
  | 'SIGNAL_RECEIVED'
  | 'VARIABLE_SET';
```

**Example:**
```json
{
  "_id": "ObjectId(...)",
  "eventId": "evt_001abc",
  "executionId": "exec_abc123xyz",
  "workflowId": "ObjectId(...)",
  "eventType": "NODE_COMPLETED",
  "sequenceNumber": 4,
  "nodeId": "filter_priority",
  "payload": {
    "output": { "path": "high", "matched": true },
    "duration": 45
  },
  "timestamp": "2025-01-26T10:30:00.200Z",
  "metadata": {
    "workerId": "worker_01",
    "traceId": "trace_xyz"
  }
}
```

---

### 2.3 workflow_approvals

Human approval requests.

```typescript
interface WorkflowApproval {
  _id: ObjectId;
  approvalId: string;               // UUID - public ID
  executionId: string;
  workflowId: ObjectId;
  nodeId: string;
  organizationId: ObjectId;
  
  requestType: 'approve_reject' | 'choose_option' | 'provide_input';
  
  title: string;
  description?: string;
  
  context: Record<string, any>;     // Data shown to approver
  
  options?: Array<{
    id: string;
    label: string;
    value: any;
  }>;
  
  inputFields?: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
  }>;
  
  assignedTo: {
    type: 'user' | 'role' | 'group';
    ids: string[];
  };
  
  status: 'pending' | 'approved' | 'rejected' | 'timeout' | 'cancelled';
  
  response?: {
    decision: 'approved' | 'rejected';
    selectedOption?: string;
    input?: Record<string, any>;
    comment?: string;
    respondedBy: string;
    respondedAt: Date;
  };
  
  notifications: Array<{
    channel: 'email' | 'slack' | 'in_app';
    sentAt: Date;
    status: 'sent' | 'delivered' | 'failed';
  }>;
  
  createdAt: Date;
  expiresAt?: Date;
}
```

**Example:**
```json
{
  "_id": "ObjectId(...)",
  "approvalId": "appr_xyz789",
  "executionId": "exec_abc123xyz",
  "workflowId": "ObjectId(...)",
  "nodeId": "approval_manager",
  "organizationId": "ObjectId(...)",
  "requestType": "approve_reject",
  "title": "Approve Expense Request: $15,000",
  "description": "Q1 Marketing Conference - Austin, TX",
  "context": {
    "requestedBy": "Sarah Chen",
    "department": "Marketing",
    "amount": 15000,
    "category": "Travel"
  },
  "assignedTo": {
    "type": "user",
    "ids": ["user_manager_1"]
  },
  "status": "pending",
  "notifications": [
    { "channel": "email", "sentAt": "2025-01-26T10:30:01Z", "status": "delivered" },
    { "channel": "slack", "sentAt": "2025-01-26T10:30:02Z", "status": "delivered" }
  ],
  "createdAt": "2025-01-26T10:30:00Z",
  "expiresAt": "2025-01-28T10:30:00Z"
}
```

---

### 2.4 workflow_timers

Scheduled wake-ups for delays and timeouts.

```typescript
interface WorkflowTimer {
  _id: ObjectId;
  timerId: string;                  // UUID
  executionId: string;
  workflowId: ObjectId;
  nodeId?: string;
  
  type: 'delay' | 'timeout' | 'retry' | 'schedule';
  
  fireAt: Date;
  status: 'scheduled' | 'fired' | 'cancelled';
  
  firedAt?: Date;
  
  payload?: Record<string, any>;    // Data to pass when firing
  
  recurrence?: {
    pattern: string;                // Cron expression
    maxCount?: number;
    currentCount: number;
  };
}
```

**Example:**
```json
{
  "_id": "ObjectId(...)",
  "timerId": "timer_abc123",
  "executionId": "exec_abc123xyz",
  "workflowId": "ObjectId(...)",
  "nodeId": "approval_manager",
  "type": "timeout",
  "fireAt": "2025-01-28T10:30:00Z",
  "status": "scheduled"
}
```

---

## 3. Indexes

### 3.1 workflow_executions Indexes

```javascript
// Primary lookup
db.workflow_executions.createIndex(
  { executionId: 1 },
  { unique: true, name: "idx_executionId" }
);

// Queue processing - find pending work
db.workflow_executions.createIndex(
  { status: 1, priority: -1, startedAt: 1 },
  { name: "idx_queue_processing" }
);

// Lock recovery - find stale locks
db.workflow_executions.createIndex(
  { status: 1, lockedUntil: 1 },
  { 
    partialFilterExpression: { lockedUntil: { $exists: true } },
    name: "idx_lock_recovery" 
  }
);

// Organization listing
db.workflow_executions.createIndex(
  { organizationId: 1, status: 1, startedAt: -1 },
  { name: "idx_org_status" }
);

// Workflow listing
db.workflow_executions.createIndex(
  { workflowId: 1, status: 1, startedAt: -1 },
  { name: "idx_workflow_status" }
);

// Approval lookup
db.workflow_executions.createIndex(
  { "waitingFor.approvalId": 1 },
  { 
    sparse: true,
    name: "idx_waiting_approval" 
  }
);

// Timer resume lookup
db.workflow_executions.createIndex(
  { "waitingFor.resumeAt": 1 },
  { 
    sparse: true,
    name: "idx_waiting_timer" 
  }
);

// Signal waiting
db.workflow_executions.createIndex(
  { "waitingFor.signalName": 1, executionId: 1 },
  { 
    sparse: true,
    name: "idx_waiting_signal" 
  }
);
```

### 3.2 workflow_events Indexes

```javascript
// Event retrieval by execution
db.workflow_events.createIndex(
  { executionId: 1, sequenceNumber: 1 },
  { name: "idx_execution_sequence" }
);

// Event type filtering
db.workflow_events.createIndex(
  { executionId: 1, eventType: 1, timestamp: 1 },
  { name: "idx_execution_eventtype" }
);

// Node-specific events
db.workflow_events.createIndex(
  { executionId: 1, nodeId: 1, timestamp: 1 },
  { 
    sparse: true,
    name: "idx_execution_node" 
  }
);

// Time-based queries
db.workflow_events.createIndex(
  { timestamp: 1 },
  { name: "idx_timestamp" }
);

// TTL for cleanup (90 days default)
db.workflow_events.createIndex(
  { timestamp: 1 },
  { 
    expireAfterSeconds: 7776000,  // 90 days
    name: "idx_ttl_cleanup" 
  }
);
```

### 3.3 workflow_approvals Indexes

```javascript
// Primary lookup
db.workflow_approvals.createIndex(
  { approvalId: 1 },
  { unique: true, name: "idx_approvalId" }
);

// Execution lookup
db.workflow_approvals.createIndex(
  { executionId: 1 },
  { name: "idx_executionId" }
);

// User's pending approvals
db.workflow_approvals.createIndex(
  { "assignedTo.ids": 1, status: 1, createdAt: -1 },
  { name: "idx_assignee_status" }
);

// Organization pending approvals
db.workflow_approvals.createIndex(
  { organizationId: 1, status: 1, createdAt: -1 },
  { name: "idx_org_status" }
);

// Expiration check
db.workflow_approvals.createIndex(
  { expiresAt: 1, status: 1 },
  { 
    partialFilterExpression: { status: "pending" },
    name: "idx_expiration" 
  }
);
```

### 3.4 workflow_timers Indexes

```javascript
// Timer processing - find ready timers
db.workflow_timers.createIndex(
  { fireAt: 1, status: 1 },
  { 
    partialFilterExpression: { status: "scheduled" },
    name: "idx_fire_ready" 
  }
);

// Execution timers
db.workflow_timers.createIndex(
  { executionId: 1 },
  { name: "idx_executionId" }
);

// Timer ID lookup
db.workflow_timers.createIndex(
  { timerId: 1 },
  { unique: true, name: "idx_timerId" }
);
```

---

## 4. Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                        workflows                                 │
│  (existing collection)                                          │
│                                                                 │
│  _id: ObjectId                                                  │
│  name, nodes, edges, etc.                                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ 1:N
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   workflow_executions                            │
│                                                                 │
│  _id, executionId                                               │
│  workflowId ─────────────────────────────────────────┐          │
│  waitingFor.approvalId ───────────────┐              │          │
│                                       │              │          │
└───────────────────────────────────────┼──────────────┼──────────┘
          │                             │              │
          │ 1:N                         │ 1:1          │
          ▼                             ▼              │
┌──────────────────────┐  ┌─────────────────────────┐ │
│   workflow_events    │  │  workflow_approvals     │ │
│                      │  │                         │ │
│  executionId         │  │  approvalId             │ │
│  eventType           │  │  executionId            │ │
│  sequenceNumber      │  │  status                 │ │
│                      │  │                         │ │
└──────────────────────┘  └─────────────────────────┘ │
                                                      │
          │                                           │
          │ 1:N                                       │
          ▼                                           │
┌──────────────────────┐                             │
│   workflow_timers    │◄────────────────────────────┘
│                      │
│  timerId             │
│  executionId         │
│  fireAt              │
│                      │
└──────────────────────┘
```

---

## 5. Migration Strategy

### 5.1 Phase 1: Create Collections

```javascript
// Migration script: 001_create_durable_execution_collections.js

// Create collections with validation
db.createCollection("workflow_executions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["executionId", "workflowId", "organizationId", "status", "trigger"],
      properties: {
        executionId: { bsonType: "string" },
        status: { enum: ["pending", "running", "paused", "waiting", "completed", "failed", "cancelled"] }
      }
    }
  }
});

db.createCollection("workflow_events", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["eventId", "executionId", "eventType", "timestamp"],
      properties: {
        eventId: { bsonType: "string" },
        eventType: { bsonType: "string" }
      }
    }
  }
});

db.createCollection("workflow_approvals");
db.createCollection("workflow_timers");
```

### 5.2 Phase 2: Create Indexes

```javascript
// Migration script: 002_create_indexes.js
// (Execute all index creation commands from Section 3)
```

### 5.3 Phase 3: Feature Flag

```typescript
// No data migration needed - new executions use new system
// Controlled by feature flag:
const DURABLE_EXECUTION_ENABLED = process.env.DURABLE_EXECUTION_ENABLED === 'true';
```

---

## 6. Data Retention

### 6.1 Retention Policies

| Data Type | Active Retention | Archive | Delete |
|-----------|------------------|---------|--------|
| Executions (completed) | 30 days | 1 year | After archive |
| Executions (failed) | 90 days | 1 year | After archive |
| Events | 90 days (TTL) | N/A | Automatic |
| Approvals (completed) | 30 days | 1 year | After archive |
| Timers (fired) | 7 days | N/A | Automatic |

### 6.2 Archive Strategy

```typescript
// Daily archive job
async function archiveCompletedExecutions() {
  const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const executions = await db.collection('workflow_executions').find({
    status: { $in: ['completed', 'cancelled'] },
    completedAt: { $lt: cutoffDate }
  }).toArray();
  
  // Move to archive collection
  if (executions.length > 0) {
    await db.collection('workflow_executions_archive').insertMany(
      executions.map(e => ({ ...e, archivedAt: new Date() }))
    );
    
    await db.collection('workflow_executions').deleteMany({
      executionId: { $in: executions.map(e => e.executionId) }
    });
  }
}
```

---

## 7. TypeScript Type Exports

```typescript
// src/types/durable-execution.ts

export interface WorkflowExecution {
  _id: ObjectId;
  executionId: string;
  workflowId: ObjectId;
  workflowVersion: number;
  organizationId: ObjectId;
  projectId: ObjectId;
  
  trigger: ExecutionTrigger;
  status: ExecutionStatus;
  currentNodeId: string | null;
  
  variables: Record<string, any>;
  nodeStates: Record<string, NodeState>;
  
  waitingFor?: WaitingState;
  error?: ExecutionError;
  
  version: number;
  lockedBy?: string;
  lockedUntil?: Date;
  
  priority: ExecutionPriority;
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  
  retryCount: number;
  parentExecutionId?: string;
}

export type ExecutionStatus = 
  | 'pending' 
  | 'running' 
  | 'paused' 
  | 'waiting' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export type ExecutionPriority = 'low' | 'normal' | 'high';

export interface ExecutionTrigger {
  type: 'form_submission' | 'webhook' | 'schedule' | 'manual' | 'api';
  sourceId?: string;
  payload: Record<string, any>;
  timestamp: Date;
}

export interface NodeState {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  output?: Record<string, any>;
  error?: { code: string; message: string };
  retryCount?: number;
}

export interface WaitingState {
  type: 'approval' | 'signal' | 'timer' | 'retry';
  approvalId?: string;
  signalName?: string;
  resumeAt?: Date;
  timeoutAt?: Date;
}

export interface ExecutionError {
  nodeId: string;
  code: string;
  message: string;
  timestamp: Date;
}

export interface WorkflowEvent {
  _id: ObjectId;
  eventId: string;
  executionId: string;
  workflowId: ObjectId;
  eventType: WorkflowEventType;
  sequenceNumber: number;
  nodeId?: string;
  payload: Record<string, any>;
  timestamp: Date;
  metadata?: EventMetadata;
}

export type WorkflowEventType =
  | 'EXECUTION_STARTED'
  | 'EXECUTION_COMPLETED'
  | 'EXECUTION_FAILED'
  | 'EXECUTION_CANCELLED'
  | 'NODE_SCHEDULED'
  | 'NODE_STARTED'
  | 'NODE_COMPLETED'
  | 'NODE_FAILED'
  | 'NODE_RETRYING'
  | 'WAITING_FOR_APPROVAL'
  | 'APPROVAL_RECEIVED'
  | 'APPROVAL_REJECTED'
  | 'APPROVAL_TIMEOUT'
  | 'TIMER_SCHEDULED'
  | 'TIMER_FIRED'
  | 'SIGNAL_RECEIVED'
  | 'VARIABLE_SET';

export interface WorkflowApproval {
  _id: ObjectId;
  approvalId: string;
  executionId: string;
  workflowId: ObjectId;
  nodeId: string;
  organizationId: ObjectId;
  
  requestType: 'approve_reject' | 'choose_option' | 'provide_input';
  title: string;
  description?: string;
  context: Record<string, any>;
  
  options?: ApprovalOption[];
  inputFields?: ApprovalInputField[];
  
  assignedTo: ApprovalAssignment;
  status: ApprovalStatus;
  response?: ApprovalResponse;
  
  notifications: ApprovalNotification[];
  createdAt: Date;
  expiresAt?: Date;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'timeout' | 'cancelled';

export interface WorkflowTimer {
  _id: ObjectId;
  timerId: string;
  executionId: string;
  workflowId: ObjectId;
  nodeId?: string;
  type: 'delay' | 'timeout' | 'retry' | 'schedule';
  fireAt: Date;
  status: 'scheduled' | 'fired' | 'cancelled';
  firedAt?: Date;
  payload?: Record<string, any>;
}
```

---

*End of Database Schema Specification*
