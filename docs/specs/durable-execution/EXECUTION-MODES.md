# NetPad Workflow Execution Modes

**Version:** 1.0.0
**Date:** January 26, 2025
**Status:** Canonical Reference

---

## Overview

NetPad supports **two distinct workflow execution modes**. This document is the definitive reference for understanding the differences, use cases, and implementation boundaries.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     NETPAD WORKFLOW EXECUTION                           │
├────────────────────────────────┬────────────────────────────────────────┤
│   SYNCHRONOUS EXECUTION        │      DURABLE EXECUTION                 │
│   (Open Source - Free)         │      (Cloud Premium - Team+)           │
├────────────────────────────────┼────────────────────────────────────────┤
│   Repository: netpad-3         │      Repository: netpad-cloud          │
│   License: MIT                 │      License: Proprietary              │
│   Cost: Free                   │      Cost: Team tier subscription      │
└────────────────────────────────┴────────────────────────────────────────┘
```

---

## Mode 1: Synchronous Execution (Open Source)

### What It Is

Synchronous execution is the **free, open-source** workflow engine included in NetPad. It executes workflows in a single process, holding state in memory until completion.

### Characteristics

| Attribute | Value |
|-----------|-------|
| **Repository** | `netpad-3` (public) |
| **License** | MIT (open source) |
| **Code Location** | `src/lib/workflow/` |
| **Execution Model** | Fire-and-forget |
| **State Storage** | Memory only |
| **Crash Behavior** | Execution lost |
| **Maximum Duration** | Limited by request timeout |
| **Human Approval** | Not supported |
| **Audit Trail** | Basic logging |

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│              SYNCHRONOUS EXECUTION FLOW                      │
│                                                              │
│  HTTP Request                                                │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  │ Trigger │───▶│ Node A  │───▶│ Node B  │───▶│ Node C  │  │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘  │
│                      │              │              │         │
│                      ▼              ▼              ▼         │
│                 [In Memory]    [In Memory]    [In Memory]   │
│                                                              │
│                                              │               │
│                                              ▼               │
│                                         Response             │
│                                                              │
│  Total time: Seconds to minutes                             │
│  State: Lost if server restarts                             │
└─────────────────────────────────────────────────────────────┘
```

### Best For

- **Form submission workflows**: Process data when a form is submitted
- **Webhook handlers**: React to incoming webhooks immediately
- **Data transformations**: Transform and route data between systems
- **Notification workflows**: Send emails/Slack messages on triggers
- **Simple automations**: Anything that completes in seconds/minutes
- **Self-hosted deployments**: Users who want full control

### Limitations

- Cannot wait for human approval
- Cannot pause for days/weeks
- Lost if server restarts during execution
- No audit trail for compliance
- Cannot scale across multiple workers

### Example Use Cases

| Use Case | Why Synchronous Works |
|----------|----------------------|
| Send welcome email on signup | Completes in seconds |
| Post to Slack when form submitted | Immediate action |
| Update CRM when lead captured | Quick API call |
| Generate PDF from form data | Fast processing |
| Sync data between MongoDB collections | Single operation |

---

## Mode 2: Durable Execution (Cloud Premium)

### What It Is

Durable execution is the **premium, cloud-only** workflow engine. It persists state to MongoDB after every node, enabling long-running workflows, human approvals, and crash recovery.

### Characteristics

| Attribute | Value |
|-----------|-------|
| **Repository** | `netpad-cloud` (private) |
| **License** | Proprietary |
| **Code Location** | `src/durable-execution/` |
| **Execution Model** | Persistent, resumable |
| **State Storage** | MongoDB (after each node) |
| **Crash Behavior** | Automatic recovery |
| **Maximum Duration** | Unlimited (months/years) |
| **Human Approval** | Full support |
| **Audit Trail** | Immutable event log |

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                DURABLE EXECUTION FLOW                        │
│                                                              │
│  Trigger                                                     │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────┐                                                │
│  │ Node A  │───────────────────────┐                        │
│  └─────────┘                       │                        │
│       │                            ▼                        │
│       │                    ┌──────────────┐                 │
│       │                    │   MongoDB    │                 │
│       │                    │ (persisted)  │                 │
│       ▼                    └──────────────┘                 │
│  ┌─────────┐                       │                        │
│  │ Node B  │◀──────────────────────┘                        │
│  │(Approval)│                                               │
│  └─────────┘                                                │
│       │                                                      │
│       ▼                                                      │
│  [WAITING FOR HUMAN]  ◀─── Can wait days/weeks/months       │
│       │                                                      │
│       │  (Manager approves via UI or email)                 │
│       ▼                                                      │
│  ┌─────────┐                                                │
│  │ Node C  │                                                │
│  └─────────┘                                                │
│       │                                                      │
│       ▼                                                      │
│  ┌──────────────┐                                           │
│  │   MongoDB    │  ◀─── Full audit trail preserved          │
│  │ (completed)  │                                           │
│  └──────────────┘                                           │
│                                                              │
│  Server can restart at ANY point - execution resumes        │
└─────────────────────────────────────────────────────────────┘
```

### Best For

- **Approval workflows**: Expense reports, purchase orders, leave requests
- **Multi-day processes**: Employee onboarding, vendor qualification
- **Compliance requirements**: Healthcare, finance, legal workflows
- **Mission-critical processes**: Cannot afford to lose execution state
- **SLA tracking**: Need visibility into workflow progress
- **Enterprise deployments**: Teams with regulatory requirements

### Capabilities

| Capability | Description |
|------------|-------------|
| **State Persistence** | Saved to MongoDB after every node |
| **Crash Recovery** | Automatic resume from last checkpoint |
| **Human-in-the-Loop** | Pause for approvals with notifications |
| **Long Delays** | Wait days, weeks, or months |
| **Timeouts** | Auto-escalate or fail on timeout |
| **Audit Trail** | Immutable log of every action |
| **Multi-Worker** | Horizontal scaling across servers |
| **Retry Logic** | Exponential backoff on failures |

### Example Use Cases

| Use Case | Why Durable Required |
|----------|---------------------|
| Expense approval chain | Waits for manager, then finance |
| Patient intake process | Spans multiple appointments over weeks |
| Contract review workflow | Legal review takes days |
| Employee onboarding | 30-day process with multiple steps |
| Vendor qualification | Compliance checks over weeks |
| Regulatory filing | Must have audit trail |

---

## Feature Comparison Matrix

| Feature | Synchronous (Free) | Durable (Premium) |
|---------|-------------------|-------------------|
| Workflow Editor | ✅ Full access | ✅ Full access |
| All Node Types (UI) | ✅ All 25+ | ✅ All 25+ |
| Form Triggers | ✅ | ✅ |
| Webhook Triggers | ✅ | ✅ |
| Scheduled Triggers | ✅ | ✅ |
| Condition Nodes | ✅ | ✅ |
| Transform Nodes | ✅ | ✅ |
| HTTP Request Nodes | ✅ | ✅ |
| Email Nodes | ✅ | ✅ |
| MongoDB Nodes | ✅ | ✅ |
| **State Persistence** | ❌ | ✅ |
| **Crash Recovery** | ❌ | ✅ |
| **Approval Nodes (Backend)** | ❌ | ✅ |
| **Long Delays (>1 hour)** | ❌ | ✅ |
| **Audit Trail** | ❌ | ✅ |
| **Execution History** | ❌ | ✅ |
| **Multi-Worker Scaling** | ❌ | ✅ |
| **SLA Tracking** | ❌ | ✅ |

---

## Repository Boundaries

### CRITICAL: Never Mix Premium Code with Open Source

```
netpad-3/                         netpad-cloud/
(PUBLIC - MIT License)            (PRIVATE - Proprietary)

├── src/                          ├── src/
│   ├── lib/                      │   ├── durable-execution/  ← ALL durable code
│   │   └── workflow/  ← SYNC     │   │   ├── ExecutionEngine.ts
│   │       ├── executor.ts       │   │   ├── types.ts
│   │       ├── nodes/            │   │   ├── services/
│   │       └── triggers/         │   │   └── interfaces/
│   │                             │   │
│   └── types/                    │   └── types.ts  ← Premium features
│       └── workflow.ts  ← SHARED │
│                                 │
└── docs/specs/                   └── (no specs - implementation only)
    └── durable-execution/  ← SPECS ONLY (public)
```

### Rules

1. **Durable execution code** → `netpad-cloud` ONLY
2. **Synchronous execution code** → `netpad-3`
3. **Workflow types/schemas** → `netpad-3` (shared)
4. **Specification documents** → `netpad-3` (public transparency)
5. **Node UI components** → `netpad-3` (all users see all nodes)

---

## Deployment Scenarios

### Scenario 1: Self-Hosted (Open Source Only)

```
User deploys netpad-3 → Gets synchronous execution only
                     → No durable features
                     → Full workflow editor
                     → All node types (UI)
                     → Free forever
```

### Scenario 2: NetPad Cloud (Free Tier)

```
User signs up for cloud → Gets synchronous execution
                       → Can upgrade to Team for durable
                       → Same as self-hosted functionally
```

### Scenario 3: NetPad Cloud (Team+ Tier)

```
User upgrades to Team → Gets BOTH execution modes
                     → Durable execution enabled
                     → Approval nodes work
                     → Long delays work
                     → Full audit trail
                     → Crash recovery
```

---

## Decision Guide: Which Mode Do I Need?

### Choose Synchronous (Free) If:

- [ ] Workflows complete in seconds/minutes
- [ ] No human approval steps required
- [ ] Server restart losing state is acceptable
- [ ] No compliance/audit requirements
- [ ] Self-hosted deployment
- [ ] Cost is a primary concern

### Choose Durable (Premium) If:

- [ ] Workflows span hours/days/weeks
- [ ] Human approval steps are required
- [ ] Cannot lose execution state on restart
- [ ] Compliance requires audit trails
- [ ] Need visibility into long-running processes
- [ ] Enterprise/team deployment

---

## Technical Implementation Notes

### Synchronous Execution (netpad-3)

```typescript
// src/lib/workflow/executor.ts
export async function executeWorkflow(
  workflow: WorkflowDocument,
  triggerData: Record<string, unknown>
): Promise<ExecutionResult> {
  // Runs synchronously in memory
  // State lost if process crashes
  // Returns when complete
}
```

### Durable Execution (netpad-cloud)

```typescript
// src/durable-execution/ExecutionEngine.ts
export class DurableExecutionEngine {
  async executeStep(executionId: string): Promise<StepResult> {
    // 1. Load state from MongoDB
    // 2. Execute single node
    // 3. Persist state to MongoDB
    // 4. Return (may pause for approval/timer)
  }
}
```

---

## FAQ

### Can I use approval nodes in the free version?

The approval node **UI component** is available in the free version (you can add it to workflows in the editor). However, the **backend execution** that makes approvals work requires durable execution, which is cloud-premium only.

### What happens if I design a workflow with approval nodes and run it self-hosted?

The workflow will execute synchronously. When it reaches an approval node, it will either skip it or fail (depending on configuration), as there's no durable engine to pause and wait.

### Can I upgrade from synchronous to durable later?

Yes. If you're on NetPad Cloud and upgrade to Team tier, your existing workflows will automatically gain access to durable execution features. You may need to re-trigger workflows that were running synchronously.

### Is the workflow schema different between modes?

No. The workflow definition schema is identical. The same workflow JSON/document can be executed by either engine. The difference is in how the execution engine processes it.

---

**This document is the canonical reference for NetPad execution modes.**

*Last updated: January 26, 2025*
