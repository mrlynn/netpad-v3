# Durable Workflow Execution - Implementation Progress

**Started:** January 26, 2025
**Current Phase:** Phase 1 - Foundation
**Status:** 🟢 Phase 1 Core Complete

---

## NetPad Workflow Execution: Two Modes

NetPad implements **two distinct workflow execution modes**. Understanding this architecture is critical for all development work.

### Mode Comparison

| Aspect | Synchronous (Open Source) | Durable (Cloud Premium) |
|--------|--------------------------|-------------------------|
| **Repository** | `netpad-3` | `netpad-cloud` |
| **License** | MIT (open source) | Proprietary (private) |
| **Location** | `src/lib/workflow/` | `src/durable-execution/` |
| **Execution Model** | Fire-and-forget, in-memory | Persistent, resumable |
| **State Storage** | Memory only | MongoDB (after each node) |
| **Crash Behavior** | Execution lost | Automatic recovery |
| **Human Approval** | Not supported | Full support |
| **Long Delays** | Short only (< 1 hour) | Days/weeks/months |
| **Audit Trail** | Basic logging | Immutable event log |
| **Target Users** | Self-hosted, simple workflows | Enterprise, compliance |

### Why Two Modes?

1. **Open Source Value**: The synchronous mode provides a fully functional workflow engine for self-hosted users at no cost. It handles 90% of workflow use cases (form triggers, webhooks, simple automations).

2. **Premium Differentiation**: Durable execution addresses enterprise needs (compliance, long-running processes, human approval chains) that justify a paid tier.

3. **Clean Separation**: The two modes live in separate repositories, ensuring no accidental exposure of premium code in the open source release.

---

## ⚠️ CRITICAL: Repository Structure

**Durable Execution is a CLOUD-ONLY PREMIUM feature.**

All implementation code lives in the **PRIVATE** `netpad-cloud` repository.

```
netpad-3/           (PUBLIC - MIT License - Open Source Core)
├── docs/specs/durable-execution/   # Specifications only (public)
├── src/lib/workflow/               # SYNCHRONOUS execution engine
└── src/types/workflow.ts           # Shared workflow types

netpad-cloud/       (PRIVATE - Premium Features)
└── src/durable-execution/          # DURABLE execution engine
    ├── ExecutionEngine.ts
    ├── types.ts
    ├── index.ts
    ├── migrate-durable-execution.ts
    ├── services/
    │   ├── index.ts
    │   ├── EventLogger.ts
    │   ├── StateManager.ts
    │   ├── TimerService.ts
    │   └── ApprovalService.ts
    ├── executors/
    │   ├── index.ts
    │   ├── ApprovalExecutor.ts
    │   ├── DurableDelayExecutor.ts
    │   ├── HttpRequestExecutor.ts
    │   ├── TransformExecutor.ts
    │   ├── MongoDBQueryExecutor.ts
    │   └── MongoDBWriteExecutor.ts
    ├── api/                          # NEW - REST API handlers
    │   ├── index.ts
    │   ├── types.ts
    │   ├── executions.ts
    │   └── approvals.ts
    ├── worker/                       # NEW - Background workers
    │   ├── index.ts
    │   └── TimerWorker.ts
    └── interfaces/
        ├── index.ts
        └── NodeExecutor.ts
```

**NEVER** add durable execution implementation code to `netpad-3`.

---

## Progress Overview

| Phase | Status | Progress |
|-------|--------|----------|
| Phase 1: Foundation | 🟢 Complete | 100% |
| Phase 2: Durable Nodes | 🟢 Complete | 100% |
| Phase 3: Human-in-the-Loop | 🟢 Complete | 100% |
| Phase 4: Polish & Scale | 🟡 In Progress | 60% |

---

## What's in Each Repository

### netpad-3 (Open Source - Synchronous Execution)

The open source repository provides:

| Component | Location | Description |
|-----------|----------|-------------|
| Workflow Schema | `src/types/workflow.ts` | TypeScript types for workflow definitions |
| Workflow Editor | `src/components/WorkflowEditor/` | Visual drag-and-drop editor |
| Node Components | `src/components/WorkflowEditor/nodes/` | All 25+ node type UIs |
| Sync Execution | `src/lib/workflow/` | Fire-and-forget engine |
| API Routes | `src/app/api/workflows/` | REST endpoints |
| Specifications | `docs/specs/durable-execution/` | Design docs (public) |

**This execution mode:**
- Runs workflows synchronously in a single request
- Holds state in memory during execution
- Loses execution state on server restart
- Perfect for simple automations and webhooks

### netpad-cloud (Private - Durable Execution)

The private repository provides:

| Component | Location | Description |
|-----------|----------|-------------|
| Execution Engine | `src/durable-execution/ExecutionEngine.ts` | Core durable engine |
| Type Definitions | `src/durable-execution/types.ts` | Durable-specific types |
| State Manager | `src/durable-execution/services/StateManager.ts` | Persistence + locking |
| Event Logger | `src/durable-execution/services/EventLogger.ts` | Audit trail |
| Timer Service | `src/durable-execution/services/TimerService.ts` | Long delays |
| Approval Service | `src/durable-execution/services/ApprovalService.ts` | Human approvals |
| Approval Executor | `src/durable-execution/executors/ApprovalExecutor.ts` | Approval node |
| Delay Executor | `src/durable-execution/executors/DurableDelayExecutor.ts` | Long delays |
| HTTP Request Executor | `src/durable-execution/executors/HttpRequestExecutor.ts` | External API calls |
| Transform Executor | `src/durable-execution/executors/TransformExecutor.ts` | Data transformation |
| MongoDB Query Executor | `src/durable-execution/executors/MongoDBQueryExecutor.ts` | DB read operations |
| MongoDB Write Executor | `src/durable-execution/executors/MongoDBWriteExecutor.ts` | DB write operations |
| Node Interface | `src/durable-execution/interfaces/NodeExecutor.ts` | Durable node contract |
| Migration | `src/durable-execution/migrate-durable-execution.ts` | DB setup |

**This execution mode:**
- Persists state to MongoDB after every node
- Recovers automatically from crashes
- Supports human-in-the-loop approvals
- Enables long delays (days/weeks)
- Provides immutable audit trails

---

## Implementation Progress (in netpad-cloud)

### Phase 1: Foundation - COMPLETE ✅

| Component | Location in netpad-cloud | Lines | Status |
|-----------|-------------------------|-------|--------|
| TypeScript Types | `src/durable-execution/types.ts` | ~780 | ✅ |
| Migration Script | `src/durable-execution/migrate-durable-execution.ts` | ~400 | ✅ |
| ExecutionEngine | `src/durable-execution/ExecutionEngine.ts` | ~550 | ✅ |
| EventLogger | `src/durable-execution/services/EventLogger.ts` | ~450 | ✅ |
| StateManager | `src/durable-execution/services/StateManager.ts` | ~500 | ✅ |
| NodeExecutor Interface | `src/durable-execution/interfaces/NodeExecutor.ts` | ~350 | ✅ |

### Phase 2: Durable Nodes - COMPLETE ✅

| Component | Location in netpad-cloud | Lines | Status |
|-----------|-------------------------|-------|--------|
| TimerService | `src/durable-execution/services/TimerService.ts` | ~400 | ✅ |
| DurableDelayExecutor | `src/durable-execution/executors/DurableDelayExecutor.ts` | ~280 | ✅ |
| TimerWorker | `src/durable-execution/worker/TimerWorker.ts` | ~380 | ✅ |

### Phase 3: Human-in-the-Loop - COMPLETE ✅

| Component | Location in netpad-cloud | Lines | Status |
|-----------|-------------------------|-------|--------|
| ApprovalService | `src/durable-execution/services/ApprovalService.ts` | ~520 | ✅ |
| ApprovalExecutor | `src/durable-execution/executors/ApprovalExecutor.ts` | ~300 | ✅ |
| Approval API | `src/durable-execution/api/approvals.ts` | ~350 | ✅ |

### Phase 4: Polish & Scale - IN PROGRESS 🟡

| Component | Location in netpad-cloud | Lines | Status |
|-----------|-------------------------|-------|--------|
| API Types | `src/durable-execution/api/types.ts` | ~350 | ✅ |
| Execution API | `src/durable-execution/api/executions.ts` | ~450 | ✅ |
| Approval API | `src/durable-execution/api/approvals.ts` | ~350 | ✅ |
| Timer Worker | `src/durable-execution/worker/TimerWorker.ts` | ~380 | ✅ |
| HTTP Request Executor | `src/durable-execution/executors/HttpRequestExecutor.ts` | ~420 | ✅ |
| Transform Executor | `src/durable-execution/executors/TransformExecutor.ts` | ~350 | ✅ |
| MongoDB Query Executor | `src/durable-execution/executors/MongoDBQueryExecutor.ts` | ~450 | ✅ |
| MongoDB Write Executor | `src/durable-execution/executors/MongoDBWriteExecutor.ts` | ~480 | ✅ |
| Unit tests | - | - | ⬜ |
| Integration tests | - | - | ⬜ |
| Performance benchmarks | - | - | ⬜ |

### Remaining Work

- Unit tests for all services
- Integration tests
- Performance benchmarks
- Notification system integration (email, Slack)
- UI components for approval inbox

---

## Integration Architecture

At deployment time, netpad-cloud features are integrated with netpad-3:

```
Build Process (Cloud Deployment):
1. Clone netpad-3 (open source)
2. Clone netpad-cloud (private)
3. Merge netpad-cloud into deployment
4. Set NETPAD_DEPLOYMENT_MODE=cloud
5. Durable execution becomes available
```

Self-hosted deployments only get netpad-3 (fire-and-forget execution).

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Separate repos | Legal clarity, no risk of exposing premium code |
| Specs in open source | Transparency about what premium offers |
| Clean interfaces | Open source defines contracts, cloud implements |
| Build-time merge | Simple deployment, no runtime complexity |

---

## For Developers

### Working on Durable Execution

1. Clone both repos
2. Work in `netpad-cloud/src/durable-execution/`
3. Test locally with both repos
4. **NEVER** commit durable execution code to netpad-3

### Checking What's Premium

Premium features are identified by:
- Anything in `netpad-cloud` repo
- Node types: `approval`, `wait_for_signal`, `manual_task`
- Long delays (> 1 hour)
- Execution recovery/persistence

---

---

## Current Session Summary

**Session Date:** January 26, 2025

### Completed This Session

1. **TimerService** (`services/TimerService.ts`) - ~400 lines
   - Schedule timers for delays, timeouts, retries
   - Atomic timer claiming for workers
   - Timer cancellation
   - Recurrence support (cron patterns)
   - Statistics and monitoring

2. **ApprovalService** (`services/ApprovalService.ts`) - ~520 lines
   - Create approval requests
   - Track pending approvals
   - Process approve/reject responses
   - Timeout handling with escalation
   - Notification tracking

3. **ApprovalExecutor** (`executors/ApprovalExecutor.ts`) - ~300 lines
   - Execute approval nodes in workflows
   - Create approval requests
   - Resume on approval response
   - Handle timeout/escalation outcomes

4. **DurableDelayExecutor** (`executors/DurableDelayExecutor.ts`) - ~280 lines
   - Execute delay nodes with durable support
   - Short delays: synchronous execution
   - Long delays (>1 hour): schedule timer and pause
   - Resume when timer fires

5. **Updated exports and indexes**
   - Services index with all services
   - Executors index
   - Main module index

5. **REST API Handlers** (`api/`) - ~1,150 lines
   - `types.ts` - Request/response types (~350 lines)
   - `executions.ts` - Execution CRUD operations (~450 lines)
   - `approvals.ts` - Approval operations (~350 lines)

6. **Timer Worker** (`worker/TimerWorker.ts`) - ~380 lines
   - Process due timers (delays, timeouts, retries)
   - Resume waiting executions
   - Handle approval timeouts
   - Vercel Cron compatible

7. **HTTP Request Executor** (`executors/HttpRequestExecutor.ts`) - ~420 lines
   - Full HTTP method support (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
   - Authentication (Basic, Bearer, API Key)
   - Request body types (JSON, form, text, binary)
   - Timeout and retry handling
   - Response parsing

8. **Transform Executor** (`executors/TransformExecutor.ts`) - ~350 lines
   - Expression mode (JavaScript evaluation)
   - Mapping mode (field-to-field with transforms)
   - Template mode (object passthrough)
   - Variable resolution

9. **MongoDB Query Executor** (`executors/MongoDBQueryExecutor.ts`) - ~450 lines
   - Operations: find, findOne, aggregate, count, distinct
   - Connection caching for performance
   - Query/pipeline parsing from JSON strings
   - Full projection, sort, limit, skip support

10. **MongoDB Write Executor** (`executors/MongoDBWriteExecutor.ts`) - ~480 lines
    - Operations: insertOne, insertMany, updateOne, updateMany, deleteOne, deleteMany, replaceOne
    - Automatic update operator wrapping ($set)
    - Document preparation (createdAt, updatedAt)
    - Retryable error detection

### Total Lines of Code (Premium)

| Category | Lines |
|----------|-------|
| Types | ~780 |
| Services | ~1,870 |
| Executors | ~2,280 |
| Engine | ~550 |
| Interfaces | ~350 |
| Migration | ~400 |
| API | ~1,150 |
| Worker | ~380 |
| **Total** | **~7,760** |

---

## API Endpoints Implemented

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/workflows/{id}/executions` | POST | Start new execution |
| `/executions/{id}` | GET | Get execution details |
| `/workflows/{id}/executions` | GET | List executions |
| `/executions/{id}/cancel` | POST | Cancel execution |
| `/executions/{id}/retry` | POST | Retry failed execution |
| `/executions/{id}/events` | GET | Get event history |
| `/approvals` | GET | List pending approvals |
| `/approvals/{id}` | GET | Get approval details |
| `/approvals/{id}/respond` | POST | Submit approval response |
| `/approvals/{id}/remind` | POST | Send reminder |

---

**Last Updated:** 2025-01-26
