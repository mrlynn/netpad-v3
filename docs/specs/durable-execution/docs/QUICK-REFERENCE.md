# Durable Workflow Execution - Quick Reference

## Collections

| Collection | Purpose |
|------------|---------|
| `workflow_executions` | Execution state & variables |
| `workflow_events` | Immutable audit log |
| `workflow_approvals` | Pending human decisions |
| `workflow_timers` | Scheduled wake-ups |

## Execution States

```
pending → running → completed
              ↓
           waiting → (resume) → running
              ↓
           failed
```

## Key APIs

| Endpoint | Purpose |
|----------|---------|
| `POST /workflows/:id/executions` | Start execution |
| `GET /executions/:id` | Get status |
| `GET /executions/:id/events` | Get audit log |
| `POST /executions/:id/cancel` | Cancel |
| `GET /approvals` | List pending |
| `POST /approvals/:id/respond` | Approve/reject |

## Event Types

- `EXECUTION_STARTED` / `COMPLETED` / `FAILED`
- `NODE_STARTED` / `COMPLETED` / `FAILED` / `RETRYING`
- `WAITING_FOR_APPROVAL` / `APPROVAL_RECEIVED` / `APPROVAL_REJECTED`
- `TIMER_SCHEDULED` / `TIMER_FIRED`

## Cloud-Only Nodes

These require Team+ subscription:
- `approval` - Human approval gate
- `wait_for_signal` - External event wait
- `long_delay` - Delays > 1 hour

## File Locations

```
src/lib/workflows/
├── execution/
│   ├── ExecutionEngine.ts      # Core loop
│   ├── DurableWorkflowExecutor.ts
│   ├── StateManager.ts         # Persistence
│   └── nodes/                  # Node executors
├── services/
│   ├── TimerService.ts
│   ├── ApprovalService.ts
│   └── EventLogger.ts
└── workers/
    ├── ExecutionWorker.ts
    └── TimerProcessor.ts
```

## Critical Rules

1. **Always persist state after node completion**
2. **Use optimistic locking (version field)**
3. **Log events for every state transition**
4. **Nodes with side effects must be idempotent**
5. **Never import MongoDB in client components**

## Performance Targets

| Metric | Target |
|--------|--------|
| Node overhead | <50ms |
| State persist | <20ms |
| Recovery | <30s |
| Concurrent | 1000+ |
