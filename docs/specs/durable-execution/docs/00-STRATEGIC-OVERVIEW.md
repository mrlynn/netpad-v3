# NetPad Durable Workflow Execution
## Strategic Overview & Sprint Kickoff Package

**Version:** 1.1.0
**Status:** Sprint Ready
**Author:** Michael (Founder) with AI Strategic Assistance
**Date:** January 26, 2025
**Classification:** Internal Engineering Documentation

---

## Executive Summary

This document package establishes the strategic foundation and technical specifications for implementing **Durable Workflow Execution** as a premium, cloud-only feature for NetPad. This capability represents NetPad's most significant competitive differentiator in the enterprise workflow automation market.

---

## Two Execution Modes: The Core Architecture Decision

NetPad supports **two distinct workflow execution modes**, each serving different use cases and deployment scenarios. This is a fundamental architectural decision that shapes the entire platform.

### Execution Mode Comparison

| Aspect | Synchronous Execution | Durable Execution |
|--------|----------------------|-------------------|
| **Availability** | Open Source (MIT) | Cloud Premium (Team+) |
| **Repository** | `netpad-3` | `netpad-cloud` |
| **Execution Model** | Fire-and-forget, in-memory | Persistent, resumable |
| **State Persistence** | None (runs to completion) | After every node |
| **Crash Recovery** | Lost on restart | Automatic resume |
| **Human Approval** | Not supported | Full support |
| **Long Delays** | Short only (< 1 hour) | Days/weeks/months |
| **Audit Trail** | Basic logging | Immutable event log |
| **Horizontal Scaling** | Single process | Multi-worker |
| **Use Cases** | Simple automations, webhooks | Enterprise workflows, compliance |

### Mode 1: Synchronous Execution (Open Source)

**Location:** `netpad-3/src/lib/workflow/`

The open source execution mode is designed for:
- **Simple automations**: Form submission triggers, data transformations
- **Webhook handling**: Process incoming data immediately
- **Quick tasks**: Operations that complete in seconds/minutes
- **Self-hosted deployments**: Full functionality without cloud dependency

**Characteristics:**
```
┌─────────────────────────────────────────────────────────────┐
│                 SYNCHRONOUS EXECUTION                        │
│                                                              │
│  Trigger → Node A → Node B → Node C → Complete              │
│                                                              │
│  • Runs in single request/process                           │
│  • State held in memory only                                │
│  • If server restarts, execution is lost                    │
│  • Simple, fast, no overhead                                │
│  • Perfect for 90% of workflow use cases                    │
└─────────────────────────────────────────────────────────────┘
```

**What's Included:**
- Full workflow definition schema
- Visual workflow editor with all node types
- All 25+ node type UI components
- Basic execution engine
- Form integration and triggers
- API endpoints for workflow management

### Mode 2: Durable Execution (Cloud Premium)

**Location:** `netpad-cloud/src/durable-execution/`

The premium durable execution mode is designed for:
- **Enterprise workflows**: Multi-day/week processes
- **Human-in-the-loop**: Approval chains, manual reviews
- **Compliance requirements**: Full audit trails
- **Mission-critical processes**: Cannot lose execution state

**Characteristics:**
```
┌─────────────────────────────────────────────────────────────┐
│                   DURABLE EXECUTION                          │
│                                                              │
│  Trigger → Node A → [PERSIST] → Node B → [PERSIST] →        │
│            ↓                      ↓                          │
│      [MongoDB]              [MongoDB]                        │
│                                                              │
│  • State persisted after EVERY node                         │
│  • Server restart? Resume exactly where left off            │
│  • Wait days for human approval? No problem                 │
│  • Full audit trail of every action                         │
│  • Multiple workers can process in parallel                 │
└─────────────────────────────────────────────────────────────┘
```

**What's Included (Cloud Only):**
- Durable execution engine with state persistence
- Optimistic concurrency control
- Worker lock management with crash recovery
- Approval nodes with notifications
- Long delays (days/weeks/months)
- Timer service for scheduled wake-ups
- Immutable event log for audit trails
- Execution recovery and retry logic

---

## Repository Structure (Critical)

```
netpad-3/                     (PUBLIC - MIT License)
├── src/lib/workflow/         ← Synchronous execution engine
├── src/types/workflow.ts     ← Shared workflow types
├── src/components/           ← All workflow UI components
└── docs/specs/               ← Specifications (including this)

netpad-cloud/                 (PRIVATE - Premium Features)
└── src/durable-execution/    ← Durable execution engine
    ├── ExecutionEngine.ts
    ├── types.ts
    ├── services/
    └── interfaces/
```

**The separation is absolute:** Premium execution code NEVER goes in the open source repo.

---

## What We're Building (Durable Mode)

A production-grade durable execution engine that:
- **Survives failures**: Workflows resume exactly where they left off after server restarts
- **Supports human-in-the-loop**: Workflows can pause indefinitely waiting for human approval
- **Provides audit trails**: Every action is logged as an immutable event
- **Scales horizontally**: Multiple workers can process executions in parallel
- **Integrates natively with MongoDB**: No external orchestration dependencies

### Why Durable Execution Matters

| Capability | Synchronous (Open Source) | Durable (Cloud Premium) |
|------------|---------------------------|------------------------|
| Expense approval workflow | ❌ Cannot wait for manager response | ✅ Pauses for days, resumes on approval |
| Patient intake process | ❌ Must complete in single session | ✅ Spans multiple interactions over weeks |
| Vendor onboarding | ❌ No visibility into progress | ✅ Full audit trail, SLA tracking |
| Server restart during execution | ❌ Workflow lost forever | ✅ Automatic recovery and continuation |
| Compliance/audit requirements | ❌ Basic logging only | ✅ Immutable event history |

### Business Model Alignment

| Layer | Open Source (MIT) | Cloud Premium |
|-------|-------------------|---------------|
| Workflow Definition Schema | ✅ | ✅ |
| Visual Workflow Editor | ✅ | ✅ |
| All 25+ Node Types (UI) | ✅ | ✅ |
| Synchronous Execution | ✅ | ✅ |
| **Durable Execution Engine** | ❌ | ✅ Team+ |
| **Approval Nodes (Backend)** | ❌ | ✅ Team+ |
| **Long Delays (days/weeks)** | ❌ | ✅ Team+ |
| **Execution Recovery** | ❌ | ✅ Team+ |
| **Audit Trail & Compliance** | ❌ | ✅ Team+ |

---

## Document Package Contents

This sprint package contains the following documents:

| Document | Purpose | Audience |
|----------|---------|----------|
| `00-STRATEGIC-OVERVIEW.md` | This document - executive summary and navigation | All |
| `01-ARCHITECTURE-SPECIFICATION.md` | Complete technical architecture and data models | Engineering Lead, Senior Engineers |
| `02-API-SPECIFICATION.md` | REST API contracts and endpoint definitions | Backend Engineers |
| `03-DATABASE-SCHEMA.md` | MongoDB collections, indexes, and migrations | Backend Engineers, DBA |
| `04-EXECUTION-ENGINE.md` | Core execution engine algorithms and state machine | Backend Engineers |
| `05-APPROVAL-SYSTEM.md` | Human-in-the-loop implementation details | Full Stack Engineers |
| `06-BACKGROUND-WORKERS.md` | Timer processing, queue management, scaling | Backend Engineers, DevOps |
| `07-UI-COMPONENTS.md` | Frontend components and user experience | Frontend Engineers |
| `08-TESTING-STRATEGY.md` | Test cases, integration tests, chaos engineering | QA, All Engineers |
| `09-MIGRATION-GUIDE.md` | Backwards compatibility and upgrade path | Engineering Lead |
| `10-SPRINT-PLAN.md` | Phase breakdown, milestones, and dependencies | Engineering Lead, PM |

---

## Key Strategic Decisions

### Decision 1: Build Native vs. Use Temporal

**Decision: Build Native**

| Consideration | Temporal | Build Native |
|---------------|----------|--------------|
| Time to market | Faster | Slower but controlled |
| Operational complexity | Higher (another service) | Lower (just MongoDB) |
| MongoDB integration | External state store | Native integration |
| Lock-in concerns | Temporal dependency | Full ownership |
| Differentiation | "Uses Temporal" | "MongoDB-native durable workflows" |

**Rationale**: NetPad's positioning as MongoDB-native platform is strengthened by building natively. Temporal adds operational complexity and a dependency that conflicts with our "no lock-in" philosophy.

### Decision 2: Cloud-Only vs. Open Source

**Decision: Cloud-Only Premium Feature**

The execution engine (proprietary) is cleanly separated from workflow definitions (MIT-licensed). This allows:
- Self-hosted users get full workflow editor and fire-and-forget execution
- Cloud users get durable execution as upgrade incentive
- No code duplication or maintenance burden

### Decision 3: Event Sourcing Depth

**Decision: Pragmatic Event Logging (Not Full CQRS)**

We implement:
- ✅ Immutable event log for audit and debugging
- ✅ State snapshots for quick recovery
- ✅ Optimistic concurrency for safe updates

We do NOT implement:
- ❌ Full event sourcing with projections
- ❌ CQRS (Command Query Responsibility Segregation)
- ❌ Event replay for state reconstruction

**Rationale**: 80% of benefits with 20% of complexity. Full event sourcing is over-engineering for our use case.

---

## Success Criteria

### Phase 1 Success (Foundation)
- [ ] Workflows with `delay` nodes survive server restart
- [ ] Execution state persisted in MongoDB after each node
- [ ] Event log captures all state transitions
- [ ] Existing workflows continue to work (backwards compatible)

### Phase 2 Success (Durable Nodes)
- [ ] Retry logic with exponential backoff working
- [ ] Long delays (hours/days) execute correctly
- [ ] Failed executions show clear error states and can be retried

### Phase 3 Success (Human-in-the-Loop)
- [ ] Approval node pauses workflow and sends notification
- [ ] Approver can approve/reject from UI or email
- [ ] Timeout handling works (escalate, auto-approve, fail)
- [ ] Workflow resumes correctly after approval

### Phase 4 Success (Production Ready)
- [ ] Execution monitor shows real-time workflow progress
- [ ] Audit trail meets basic compliance requirements
- [ ] Performance: <100ms overhead per node execution
- [ ] Scale: 1000+ concurrent executions per worker

---

## Target Timeline

| Phase | Duration | Focus |
|-------|----------|-------|
| Phase 1: Foundation | 2-3 weeks | Collections, basic persistence, event logging |
| Phase 2: Durable Nodes | 2-3 weeks | Delays, retries, recovery |
| Phase 3: Human-in-the-Loop | 2-3 weeks | Approval nodes, notifications, timeouts |
| Phase 4: Polish | 1-2 weeks | UI, monitoring, performance |

**Total: 7-11 weeks**

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Performance regression in existing workflows | Medium | High | Comprehensive benchmarking, feature flag rollout |
| MongoDB write contention at scale | Low | Medium | Optimistic locking, sharding strategy |
| Complex edge cases in approval timeouts | Medium | Medium | Extensive test coverage, chaos engineering |
| User confusion about cloud-only features | Medium | Low | Clear UI badges, helpful error messages |

---

## Quick Reference: Core Concepts

### Execution States

```
pending → running → completed
              ↓         ↑
           paused ──────┘
              ↓
           waiting → (timer fires / approval received) → running
              ↓
           failed
              ↓
          cancelled
```

### Key Collections

| Collection | Purpose |
|------------|---------|
| `workflow_executions` | Running execution state and variables |
| `workflow_events` | Immutable audit log |
| `workflow_approvals` | Pending human decisions |
| `workflow_timers` | Scheduled wake-ups |

### Critical Algorithms

1. **Step Processing**: Load state → Execute node → Persist result → Determine next → Repeat
2. **Approval Flow**: Create approval → Pause execution → Notify → Wait → Resume on response
3. **Timer Flow**: Schedule timer → Execution waits → Timer fires → Resume execution

---

## Getting Started

1. **Read this document** for strategic context
2. **Review `01-ARCHITECTURE-SPECIFICATION.md`** for technical foundation
3. **Study `03-DATABASE-SCHEMA.md`** for data model understanding
4. **Examine `10-SPRINT-PLAN.md`** for your specific phase assignments

For questions or clarifications, contact Michael directly.

---

*This document package represents the strategic foundation for NetPad's premium workflow capabilities. Execute with precision.*
