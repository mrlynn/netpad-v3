# NetPad Durable Workflow Execution
## Sprint Plan

**Document:** 10-SPRINT-PLAN.md  
**Version:** 1.0.0  
**Status:** Sprint Ready  
**Last Updated:** January 26, 2025

---

## Executive Summary

This document outlines the phased implementation plan for NetPad's Durable Workflow Execution system. Total estimated duration: **7-11 weeks** depending on team velocity and scope refinements.

---

## Phase Overview

| Phase | Duration | Focus | Key Deliverables |
|-------|----------|-------|------------------|
| **Phase 1** | 2-3 weeks | Foundation | Collections, basic persistence, event logging |
| **Phase 2** | 2-3 weeks | Durable Nodes | Delays, retries, recovery |
| **Phase 3** | 2-3 weeks | Human-in-the-Loop | Approval nodes, notifications, UI |
| **Phase 4** | 1-2 weeks | Polish & Scale | Monitoring, performance, production hardening |

---

## Phase 1: Foundation

**Duration:** 2-3 weeks  
**Goal:** Establish the infrastructure for durable execution without breaking existing workflows

### Week 1: Database & Core Types

**Tasks:**

| Task | Assignee | Est. Hours | Priority |
|------|----------|------------|----------|
| Create `workflow_executions` collection with schema validation | Backend | 4 | P0 |
| Create `workflow_events` collection | Backend | 2 | P0 |
| Create `workflow_timers` collection | Backend | 2 | P0 |
| Create all indexes (see 03-DATABASE-SCHEMA.md) | Backend | 4 | P0 |
| Define TypeScript types for all execution entities | Backend | 6 | P0 |
| Create migration script for collection setup | Backend | 4 | P1 |
| Add feature flag: `DURABLE_EXECUTION_ENABLED` | Backend | 2 | P0 |

**Deliverables:**
- [ ] All 4 collections created with proper schema validation
- [ ] All indexes deployed
- [ ] TypeScript types exported from `src/types/durable-execution.ts`
- [ ] Feature flag controlling new execution path

### Week 2: Execution Engine Core

**Tasks:**

| Task | Assignee | Est. Hours | Priority |
|------|----------|------------|----------|
| Implement `ExecutionEngine` class (core loop) | Backend | 16 | P0 |
| Implement `EventLogger` service | Backend | 8 | P0 |
| Implement `StateManager` for persistence | Backend | 8 | P0 |
| Implement optimistic locking helpers | Backend | 4 | P0 |
| Create node executor interface and registry | Backend | 8 | P0 |
| Port existing node executors to new interface | Backend | 12 | P0 |
| Write unit tests for execution engine | Backend | 8 | P1 |

**Deliverables:**
- [ ] Execution engine processes simple linear workflows
- [ ] State persisted after each node completion
- [ ] Events logged for all transitions
- [ ] Optimistic locking prevents race conditions

### Week 3: Integration & Backwards Compatibility

**Tasks:**

| Task | Assignee | Est. Hours | Priority |
|------|----------|------------|----------|
| Implement `getExecutor()` to choose execution mode | Backend | 4 | P0 |
| Create API endpoint: `POST /workflows/:id/executions` | Backend | 8 | P0 |
| Create API endpoint: `GET /executions/:id` | Backend | 4 | P0 |
| Create API endpoint: `GET /executions/:id/events` | Backend | 4 | P0 |
| Update form trigger to use new execution system | Backend | 8 | P0 |
| Update webhook trigger to use new execution system | Backend | 6 | P1 |
| Integration tests: existing workflows still work | QA | 8 | P0 |
| Performance benchmark: overhead per node | QA | 4 | P1 |

**Deliverables:**
- [ ] Existing workflows function identically (via feature flag)
- [ ] New execution APIs functional
- [ ] Integration tests passing
- [ ] Baseline performance metrics captured

### Phase 1 Exit Criteria

- [ ] All collections and indexes deployed to staging
- [ ] Execution engine processes workflows end-to-end
- [ ] Events logged for all state transitions
- [ ] Existing workflows unaffected (backwards compatible)
- [ ] <50ms overhead per node execution
- [ ] 100% unit test coverage on execution engine

---

## Phase 2: Durable Nodes

**Duration:** 2-3 weeks  
**Goal:** Implement durable delay, retry logic, and crash recovery

### Week 4: Timer System

**Tasks:**

| Task | Assignee | Est. Hours | Priority |
|------|----------|------------|----------|
| Implement `TimerService` for scheduling | Backend | 8 | P0 |
| Implement `TimerProcessor` background worker | Backend | 12 | P0 |
| Update `delay` node to use timer system | Backend | 6 | P0 |
| Handle timer firing → execution resume | Backend | 8 | P0 |
| Add timer cancellation on execution cancel | Backend | 4 | P1 |
| Unit tests for timer service | Backend | 6 | P0 |
| Integration test: delay node survives restart | QA | 8 | P0 |

**Deliverables:**
- [ ] Delay nodes persist timer to database
- [ ] Timer processor fires timers on schedule
- [ ] Executions resume correctly after delay
- [ ] Delay survives server restart

### Week 5: Retry Logic & Error Handling

**Tasks:**

| Task | Assignee | Est. Hours | Priority |
|------|----------|------------|----------|
| Implement retry policy configuration | Backend | 4 | P0 |
| Implement `shouldRetry()` decision logic | Backend | 6 | P0 |
| Implement exponential backoff with jitter | Backend | 4 | P0 |
| Create retry timer scheduling | Backend | 6 | P0 |
| Update error handling to support retries | Backend | 8 | P0 |
| Add retry count tracking per node | Backend | 4 | P0 |
| Unit tests for retry logic | Backend | 6 | P0 |
| Integration test: transient failure recovery | QA | 8 | P0 |

**Deliverables:**
- [ ] Nodes with retry policy automatically retry on failure
- [ ] Exponential backoff prevents thundering herd
- [ ] Retry count visible in execution state
- [ ] Max retries respected, then fail

### Week 6: Crash Recovery

**Tasks:**

| Task | Assignee | Est. Hours | Priority |
|------|----------|------------|----------|
| Implement `ExecutionWorker` with lock management | Backend | 12 | P0 |
| Implement lock refresh during long processing | Backend | 6 | P0 |
| Implement orphan execution recovery on startup | Backend | 8 | P0 |
| Add worker health monitoring | Backend | 6 | P1 |
| Test: crash mid-execution recovery | QA | 8 | P0 |
| Test: multiple worker coordination | QA | 8 | P0 |
| Document recovery procedures | Docs | 4 | P1 |

**Deliverables:**
- [ ] Workers claim executions with time-limited locks
- [ ] Lock refresh prevents false recovery
- [ ] Orphaned executions recovered within 30 seconds
- [ ] Multiple workers don't process same execution

### Phase 2 Exit Criteria

- [ ] Delay nodes work for durations up to 7 days
- [ ] Retry logic handles transient failures gracefully
- [ ] Server restart doesn't lose execution state
- [ ] Lock contention handled correctly
- [ ] Recovery time after crash < 30 seconds

---

## Phase 3: Human-in-the-Loop

**Duration:** 2-3 weeks  
**Goal:** Implement approval nodes with full notification and timeout support

### Week 7: Approval Node Backend

**Tasks:**

| Task | Assignee | Est. Hours | Priority |
|------|----------|------------|----------|
| Create `workflow_approvals` collection | Backend | 4 | P0 |
| Implement `ApprovalService` | Backend | 12 | P0 |
| Implement `ApprovalExecutor` node | Backend | 10 | P0 |
| Implement approval creation with context | Backend | 8 | P0 |
| Create API: `GET /approvals` (list pending) | Backend | 4 | P0 |
| Create API: `GET /approvals/:id` | Backend | 4 | P0 |
| Create API: `POST /approvals/:id/respond` | Backend | 8 | P0 |
| Handle approval response → execution resume | Backend | 8 | P0 |

**Deliverables:**
- [ ] Approval node pauses execution
- [ ] Approval record created with full context
- [ ] API allows listing and responding to approvals
- [ ] Execution resumes on approval response

### Week 8: Notifications & Timeouts

**Tasks:**

| Task | Assignee | Est. Hours | Priority |
|------|----------|------------|----------|
| Implement `NotificationService` interface | Backend | 4 | P0 |
| Implement email notifications | Backend | 8 | P0 |
| Implement Slack notifications | Backend | 8 | P1 |
| Implement in-app notifications | Backend | 6 | P1 |
| Implement timeout timer creation | Backend | 6 | P0 |
| Implement `TimeoutHandler` worker | Backend | 8 | P0 |
| Implement escalation logic | Backend | 6 | P1 |
| Test: full approval flow with notifications | QA | 8 | P0 |

**Deliverables:**
- [ ] Email notifications sent on approval creation
- [ ] Slack notifications (if configured)
- [ ] Timeout fires and executes configured action
- [ ] Escalation reassigns approval

### Week 9: Approval UI

**Tasks:**

| Task | Assignee | Est. Hours | Priority |
|------|----------|------------|----------|
| Create `PendingApprovalsList` component | Frontend | 8 | P0 |
| Create `ApprovalDetail` page | Frontend | 12 | P0 |
| Create `ApprovalResponseForm` component | Frontend | 10 | P0 |
| Add approval badge to navigation | Frontend | 4 | P0 |
| Implement real-time approval notifications | Frontend | 8 | P1 |
| Add approval history view | Frontend | 6 | P1 |
| Mobile-responsive approval UI | Frontend | 6 | P1 |
| E2E test: complete approval flow | QA | 8 | P0 |

**Deliverables:**
- [ ] Users can view pending approvals
- [ ] Users can respond with approve/reject
- [ ] Context displayed clearly
- [ ] Real-time notification of new approvals

### Phase 3 Exit Criteria

- [ ] Approval node fully functional
- [ ] Email notifications working
- [ ] Timeout handling working
- [ ] UI allows complete approval workflow
- [ ] E2E test covering approval → resume → complete

---

## Phase 4: Polish & Production Ready

**Duration:** 1-2 weeks  
**Goal:** Monitoring, performance optimization, and production hardening

### Week 10: Monitoring & Observability

**Tasks:**

| Task | Assignee | Est. Hours | Priority |
|------|----------|------------|----------|
| Create `ExecutionMonitor` UI component | Frontend | 12 | P0 |
| Add execution timeline visualization | Frontend | 8 | P1 |
| Implement execution statistics API | Backend | 6 | P0 |
| Add queue health monitoring endpoint | Backend | 4 | P1 |
| Create admin dashboard for executions | Frontend | 8 | P1 |
| Add metrics instrumentation | Backend | 6 | P1 |
| Create runbook for operations | Docs | 6 | P0 |

**Deliverables:**
- [ ] Execution progress visible in UI
- [ ] Queue depth and health metrics exposed
- [ ] Admin can view all executions
- [ ] Operations runbook documented

### Week 11: Performance & Hardening

**Tasks:**

| Task | Assignee | Est. Hours | Priority |
|------|----------|------------|----------|
| Load test: 1000 concurrent executions | QA | 12 | P0 |
| Optimize hot paths based on profiling | Backend | 12 | P0 |
| Implement execution archival job | Backend | 8 | P1 |
| Add rate limiting to execution APIs | Backend | 4 | P1 |
| Security review of approval system | Security | 8 | P0 |
| Chaos engineering: random failures | QA | 8 | P1 |
| Documentation review and finalization | Docs | 8 | P0 |

**Deliverables:**
- [ ] System handles 1000+ concurrent executions
- [ ] <50ms overhead maintained under load
- [ ] Old executions archived automatically
- [ ] Security review passed
- [ ] Documentation complete

### Phase 4 Exit Criteria

- [ ] Performance targets met under load
- [ ] Monitoring dashboard functional
- [ ] Security review completed
- [ ] Documentation ready for GA
- [ ] Chaos tests passed

---

## Resource Requirements

### Team Composition

| Role | Allocation | Focus Areas |
|------|------------|-------------|
| Backend Engineer (Senior) | 100% | Execution engine, state management |
| Backend Engineer | 100% | Node executors, timers, workers |
| Frontend Engineer | 50% (Phase 3-4) | Approval UI, monitoring |
| QA Engineer | 50% | Integration tests, load tests |
| DevOps | 20% | Infrastructure, monitoring |

### Infrastructure

| Resource | Purpose | Phase |
|----------|---------|-------|
| MongoDB Atlas (M30+) | Higher IOPS for execution writes | Phase 1+ |
| Worker instances (2-4) | Background processing | Phase 2+ |
| Redis (optional) | Real-time notifications | Phase 3+ |

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Performance regression | Medium | High | Benchmark every phase, feature flag rollout |
| Complex edge cases in recovery | Medium | Medium | Extensive integration tests, chaos engineering |
| Approval UI complexity | Low | Medium | Start with MVP, iterate based on feedback |
| Integration with existing workflows | Medium | High | Backwards-compatible design, phased migration |

---

## Success Metrics

### Phase 1
- [ ] 0 regressions in existing workflow tests
- [ ] <50ms execution overhead per node

### Phase 2  
- [ ] 100% recovery rate after simulated crash
- [ ] Delay accuracy within ±1 second

### Phase 3
- [ ] Approval → Resume cycle <5 seconds
- [ ] 100% notification delivery rate

### Phase 4
- [ ] 1000+ concurrent executions supported
- [ ] <100ms P95 API latency
- [ ] Zero data loss in chaos tests

---

## Go-Live Checklist

### Pre-Launch
- [ ] All phases complete and tested
- [ ] Load testing passed
- [ ] Security review completed
- [ ] Documentation published
- [ ] Monitoring alerts configured
- [ ] Runbook reviewed by on-call team

### Launch
- [ ] Feature flag enabled for beta customers
- [ ] Monitoring dashboards active
- [ ] On-call engineer briefed
- [ ] Customer support trained

### Post-Launch
- [ ] 24-hour stability monitoring
- [ ] Customer feedback collection
- [ ] Performance metrics review
- [ ] Bug triage and prioritization

---

## Appendix: Sprint Ceremonies

### Daily Standups
- 15 minutes, async-first (Slack updates)
- Sync call only for blockers

### Weekly Reviews
- Friday: Demo completed work
- Review metrics and adjust next week

### Phase Retrospectives
- End of each phase
- What worked, what didn't
- Carry learnings forward

---

*End of Sprint Plan*
