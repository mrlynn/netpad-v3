# NetPad Durable Workflow Execution
## Testing Strategy

**Document:** 08-TESTING-STRATEGY.md  
**Version:** 1.0.0  
**Status:** Sprint Ready  
**Last Updated:** January 26, 2025

---

## Table of Contents

1. [Overview](#1-overview)
2. [Unit Testing](#2-unit-testing)
3. [Integration Testing](#3-integration-testing)
4. [End-to-End Testing](#4-end-to-end-testing)
5. [Performance Testing](#5-performance-testing)
6. [Chaos Engineering](#6-chaos-engineering)
7. [Test Data Management](#7-test-data-management)

---

## 1. Overview

### 1.1 Testing Pyramid

```
                    ┌───────────┐
                    │   E2E     │  (~10 tests)
                    │   Tests   │  • Complete user journeys
                   ─┴───────────┴─
                  ┌───────────────┐
                  │  Integration  │  (~50 tests)
                  │    Tests      │  • API + DB + Services
                 ─┴───────────────┴─
                ┌───────────────────┐
                │    Unit Tests     │  (~200+ tests)
                │                   │  • Functions, Classes
                └───────────────────┘
```

### 1.2 Coverage Targets

| Layer | Target Coverage | Rationale |
|-------|-----------------|-----------|
| Execution Engine | 95% | Core business logic, must be bulletproof |
| Node Executors | 90% | Critical path, many edge cases |
| State Management | 95% | Data integrity critical |
| API Endpoints | 85% | Request/response validation |
| UI Components | 70% | Behavior testing, not pixel-perfect |

---

## 2. Unit Testing

### 2.1 Execution Engine Tests

```typescript
// src/lib/workflows/execution/__tests__/ExecutionEngine.test.ts

describe('ExecutionEngine', () => {
  describe('processExecution', () => {
    it('should process a simple linear workflow to completion', async () => {
      const workflow = createTestWorkflow([
        { id: 'trigger', type: 'manual_trigger' },
        { id: 'email', type: 'email_send' }
      ]);
      
      const execution = await createTestExecution(workflow);
      const result = await engine.processExecution(execution.executionId);
      
      expect(result.status).toBe('completed');
      expect(result.stepsProcessed).toBe(2);
    });
    
    it('should persist state after each node', async () => {
      const workflow = createTestWorkflow([
        { id: 'trigger', type: 'manual_trigger' },
        { id: 'node1', type: 'transform' },
        { id: 'node2', type: 'transform' }
      ]);
      
      const execution = await createTestExecution(workflow);
      
      // Spy on state persistence
      const persistSpy = jest.spyOn(stateManager, 'persistNodeResult');
      
      await engine.processExecution(execution.executionId);
      
      expect(persistSpy).toHaveBeenCalledTimes(3); // trigger + 2 nodes
    });
    
    it('should stop processing when execution enters waiting state', async () => {
      const workflow = createTestWorkflow([
        { id: 'trigger', type: 'manual_trigger' },
        { id: 'delay', type: 'delay', config: { duration: 'PT1H' } },
        { id: 'email', type: 'email_send' }
      ]);
      
      const execution = await createTestExecution(workflow);
      const result = await engine.processExecution(execution.executionId);
      
      expect(result.status).toBe('waiting');
      expect(result.waitingFor.type).toBe('timer');
      expect(result.stepsProcessed).toBe(2); // trigger + delay
    });
    
    it('should handle node failure with retry', async () => {
      const workflow = createTestWorkflow([
        { id: 'trigger', type: 'manual_trigger' },
        { 
          id: 'http', 
          type: 'http_request',
          config: { 
            url: 'https://fail.test',
            retryPolicy: { maxAttempts: 3, initialDelay: 100 }
          }
        }
      ]);
      
      // Mock HTTP to fail then succeed
      httpService.request
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockResolvedValueOnce({ status: 200 });
      
      const execution = await createTestExecution(workflow);
      
      // First attempt fails, schedules retry
      const result1 = await engine.processExecution(execution.executionId);
      expect(result1.status).toBe('waiting');
      expect(result1.waitingFor.type).toBe('retry');
      
      // Simulate timer fire
      await timerService.fireTimer(execution.executionId);
      
      // Second attempt succeeds
      const result2 = await engine.processExecution(execution.executionId);
      expect(result2.status).toBe('completed');
    });
    
    it('should respect optimistic locking', async () => {
      const execution = await createTestExecution(simpleWorkflow);
      
      // Simulate concurrent modification
      await db.collection('workflow_executions').updateOne(
        { executionId: execution.executionId },
        { $inc: { version: 1 } }
      );
      
      await expect(
        engine.processExecution(execution.executionId)
      ).rejects.toThrow(ConcurrencyError);
    });
  });
  
  describe('determineNextNode', () => {
    it('should follow edges in correct order', async () => {
      // Test graph traversal
    });
    
    it('should handle conditional branches', async () => {
      // Test filter/switch node paths
    });
    
    it('should skip nodes on non-matching paths', async () => {
      // Test path exclusion
    });
  });
});
```

### 2.2 Timer Service Tests

```typescript
// src/lib/workflows/services/__tests__/TimerService.test.ts

describe('TimerService', () => {
  describe('schedule', () => {
    it('should create timer with correct fireAt time', async () => {
      const fireAt = new Date(Date.now() + 60000); // 1 minute
      
      const timer = await timerService.schedule({
        executionId: 'exec_123',
        nodeId: 'delay_1',
        type: 'delay',
        fireAt
      });
      
      expect(timer.timerId).toBeDefined();
      expect(timer.status).toBe('scheduled');
      expect(timer.fireAt).toEqual(fireAt);
    });
    
    it('should handle past fireAt by scheduling immediately', async () => {
      const pastTime = new Date(Date.now() - 1000);
      
      const timer = await timerService.schedule({
        executionId: 'exec_123',
        type: 'delay',
        fireAt: pastTime
      });
      
      // Should be marked for immediate processing
      expect(timer.fireAt.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });
  
  describe('cancel', () => {
    it('should mark timer as cancelled', async () => {
      const timer = await timerService.schedule({
        executionId: 'exec_123',
        type: 'delay',
        fireAt: new Date(Date.now() + 60000)
      });
      
      await timerService.cancel(timer.timerId);
      
      const updated = await db.collection('workflow_timers')
        .findOne({ timerId: timer.timerId });
      
      expect(updated.status).toBe('cancelled');
    });
    
    it('should not cancel already-fired timer', async () => {
      const timer = await createFiredTimer();
      
      await expect(
        timerService.cancel(timer.timerId)
      ).rejects.toThrow('Timer already fired');
    });
  });
});
```

### 2.3 Approval Service Tests

```typescript
// src/lib/workflows/services/__tests__/ApprovalService.test.ts

describe('ApprovalService', () => {
  describe('create', () => {
    it('should create approval with all required fields', async () => {
      const approval = await approvalService.create({
        executionId: 'exec_123',
        workflowId: new ObjectId(),
        nodeId: 'approval_1',
        organizationId: new ObjectId(),
        title: 'Test Approval',
        requestType: 'approve_reject',
        context: { amount: 1000 },
        assignedTo: { type: 'user', ids: ['user_1'] }
      });
      
      expect(approval.approvalId).toBeDefined();
      expect(approval.status).toBe('pending');
      expect(approval.createdAt).toBeDefined();
    });
    
    it('should resolve dynamic assignees', async () => {
      // Mock user lookup
      memberService.findByRole.mockResolvedValue([
        { userId: 'user_1' },
        { userId: 'user_2' }
      ]);
      
      const approval = await approvalService.create({
        // ...
        assignedTo: { type: 'role', role: 'finance_approver' }
      });
      
      expect(approval.assignedTo.ids).toEqual(['user_1', 'user_2']);
    });
  });
  
  describe('respond', () => {
    it('should update approval status on response', async () => {
      const approval = await createPendingApproval();
      
      await approvalService.respond(approval.approvalId, {
        decision: 'approved',
        respondedBy: 'user_1'
      });
      
      const updated = await db.collection('workflow_approvals')
        .findOne({ approvalId: approval.approvalId });
      
      expect(updated.status).toBe('approved');
      expect(updated.response.decision).toBe('approved');
      expect(updated.response.respondedBy).toBe('user_1');
    });
    
    it('should reject response from unauthorized user', async () => {
      const approval = await createPendingApproval({
        assignedTo: { type: 'user', ids: ['user_1'] }
      });
      
      await expect(
        approvalService.respond(approval.approvalId, {
          decision: 'approved',
          respondedBy: 'user_999' // Not assigned
        })
      ).rejects.toThrow('Not authorized');
    });
    
    it('should not allow response to expired approval', async () => {
      const approval = await createExpiredApproval();
      
      await expect(
        approvalService.respond(approval.approvalId, {
          decision: 'approved',
          respondedBy: 'user_1'
        })
      ).rejects.toThrow('Approval has expired');
    });
  });
});
```

---

## 3. Integration Testing

### 3.1 API Integration Tests

```typescript
// src/app/api/workflows/[workflowId]/executions/__tests__/route.test.ts

describe('POST /api/workflows/:workflowId/executions', () => {
  beforeEach(async () => {
    await setupTestDatabase();
    await createTestOrganization();
    await createTestWorkflow();
  });
  
  it('should start execution and return execution ID', async () => {
    const response = await request(app)
      .post('/api/workflows/wf_123/executions')
      .set('Authorization', `Bearer ${testApiKey}`)
      .send({
        trigger: {
          type: 'manual',
          payload: { test: 'data' }
        }
      });
    
    expect(response.status).toBe(201);
    expect(response.body.executionId).toBeDefined();
    expect(response.body.status).toBe('pending');
  });
  
  it('should require valid API key', async () => {
    const response = await request(app)
      .post('/api/workflows/wf_123/executions')
      .send({ trigger: { type: 'manual', payload: {} } });
    
    expect(response.status).toBe(401);
  });
  
  it('should validate trigger payload', async () => {
    const response = await request(app)
      .post('/api/workflows/wf_123/executions')
      .set('Authorization', `Bearer ${testApiKey}`)
      .send({ trigger: { type: 'invalid' } });
    
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
  
  it('should prevent duplicate execution with idempotency key', async () => {
    const payload = {
      trigger: { type: 'manual', payload: {} },
      idempotencyKey: 'unique_key_123'
    };
    
    const response1 = await request(app)
      .post('/api/workflows/wf_123/executions')
      .set('Authorization', `Bearer ${testApiKey}`)
      .send(payload);
    
    const response2 = await request(app)
      .post('/api/workflows/wf_123/executions')
      .set('Authorization', `Bearer ${testApiKey}`)
      .send(payload);
    
    expect(response1.status).toBe(201);
    expect(response2.status).toBe(409);
    expect(response2.body.error.code).toBe('DUPLICATE_EXECUTION');
  });
});

describe('POST /api/approvals/:approvalId/respond', () => {
  it('should accept valid approval response', async () => {
    const approval = await createTestApproval();
    
    const response = await request(app)
      .post(`/api/approvals/${approval.approvalId}/respond`)
      .set('Authorization', `Bearer ${assigneeApiKey}`)
      .send({
        decision: 'approved',
        comment: 'Looks good!'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('approved');
  });
  
  it('should resume execution after approval', async () => {
    const { approval, execution } = await createWaitingExecution();
    
    await request(app)
      .post(`/api/approvals/${approval.approvalId}/respond`)
      .set('Authorization', `Bearer ${assigneeApiKey}`)
      .send({ decision: 'approved' });
    
    // Wait for execution to resume
    await waitForStatus(execution.executionId, 'completed', 5000);
    
    const updatedExecution = await getExecution(execution.executionId);
    expect(updatedExecution.status).toBe('completed');
  });
});
```

### 3.2 Database Integration Tests

```typescript
// src/lib/workflows/__tests__/database.integration.test.ts

describe('Execution State Persistence', () => {
  it('should persist complete execution state', async () => {
    const execution = await runTestExecution(complexWorkflow);
    
    const persisted = await db.collection('workflow_executions')
      .findOne({ executionId: execution.executionId });
    
    expect(persisted.status).toBe('completed');
    expect(persisted.nodeStates).toBeDefined();
    expect(Object.keys(persisted.nodeStates).length).toBe(
      complexWorkflow.nodes.length
    );
  });
  
  it('should log all events for execution', async () => {
    const execution = await runTestExecution(complexWorkflow);
    
    const events = await db.collection('workflow_events')
      .find({ executionId: execution.executionId })
      .sort({ sequenceNumber: 1 })
      .toArray();
    
    // Should have: STARTED + (START + COMPLETE per node) + COMPLETED
    expect(events.length).toBeGreaterThan(complexWorkflow.nodes.length * 2);
    expect(events[0].eventType).toBe('EXECUTION_STARTED');
    expect(events[events.length - 1].eventType).toBe('EXECUTION_COMPLETED');
  });
  
  it('should maintain event sequence numbers', async () => {
    const execution = await runTestExecution(complexWorkflow);
    
    const events = await db.collection('workflow_events')
      .find({ executionId: execution.executionId })
      .sort({ sequenceNumber: 1 })
      .toArray();
    
    // Verify sequence numbers are consecutive
    for (let i = 1; i < events.length; i++) {
      expect(events[i].sequenceNumber).toBe(events[i-1].sequenceNumber + 1);
    }
  });
});
```

---

## 4. End-to-End Testing

### 4.1 Complete Workflow Journeys

```typescript
// e2e/workflows/expense-approval.test.ts

describe('Expense Approval Workflow E2E', () => {
  it('should complete full expense approval flow', async () => {
    // 1. Submit expense form
    const submission = await submitExpenseForm({
      amount: 5000,
      description: 'Conference travel',
      category: 'Travel'
    });
    
    // 2. Verify execution started
    await waitForStatus(submission.executionId, 'waiting', 10000);
    
    // 3. Verify approval created
    const approvals = await getApprovals({ assignedTo: managerUserId });
    expect(approvals.length).toBe(1);
    expect(approvals[0].title).toContain('$5,000');
    
    // 4. Manager approves
    await respondToApproval(approvals[0].approvalId, {
      decision: 'approved',
      comment: 'Approved for conference'
    });
    
    // 5. Verify execution completed
    await waitForStatus(submission.executionId, 'completed', 10000);
    
    // 6. Verify email was sent
    const emails = await getTestEmails();
    expect(emails).toContainEqual(
      expect.objectContaining({
        to: submitterEmail,
        subject: expect.stringContaining('approved')
      })
    );
  });
  
  it('should escalate on timeout', async () => {
    // 1. Submit expense
    const submission = await submitExpenseForm({ amount: 10000 });
    
    // 2. Wait for approval to be created
    await waitForApproval(submission.executionId);
    
    // 3. Fast-forward time past timeout
    await advanceTime('P2D'); // 2 days
    
    // 4. Trigger timeout processor
    await runTimeoutProcessor();
    
    // 5. Verify escalation
    const approvals = await getApprovals({ assignedTo: directorUserId });
    expect(approvals.length).toBe(1);
    expect(approvals[0].escalatedFrom).toBeDefined();
  });
  
  it('should handle rejection flow', async () => {
    const submission = await submitExpenseForm({ amount: 50000 });
    
    await waitForStatus(submission.executionId, 'waiting');
    
    const [approval] = await getApprovals({ assignedTo: managerUserId });
    
    await respondToApproval(approval.approvalId, {
      decision: 'rejected',
      comment: 'Budget constraints'
    });
    
    await waitForStatus(submission.executionId, 'completed');
    
    // Verify rejection notification sent
    const emails = await getTestEmails();
    expect(emails).toContainEqual(
      expect.objectContaining({
        to: submitterEmail,
        subject: expect.stringContaining('rejected')
      })
    );
  });
});
```

### 4.2 Recovery E2E Tests

```typescript
// e2e/workflows/recovery.test.ts

describe('Crash Recovery E2E', () => {
  it('should recover execution after server restart', async () => {
    // 1. Start execution
    const execution = await startExecution(longRunningWorkflow);
    
    // 2. Wait until mid-execution
    await waitForNodeComplete(execution.executionId, 'node_3');
    
    // 3. Simulate crash
    await simulateServerCrash();
    
    // 4. Restart server
    await restartServer();
    
    // 5. Verify execution resumes
    await waitForStatus(execution.executionId, 'completed', 60000);
    
    // 6. Verify no duplicate node executions
    const events = await getExecutionEvents(execution.executionId);
    const nodeStarts = events.filter(e => 
      e.eventType === 'NODE_STARTED' && e.nodeId === 'node_3'
    );
    expect(nodeStarts.length).toBe(1); // Not re-executed
  });
  
  it('should handle delay across restart', async () => {
    // 1. Start workflow with delay
    const execution = await startExecution(workflowWithDelay);
    
    // 2. Wait for delay node to pause
    await waitForStatus(execution.executionId, 'waiting');
    
    // 3. Restart server
    await restartServer();
    
    // 4. Fast-forward time
    await advanceTime('PT1H');
    
    // 5. Run timer processor
    await runTimerProcessor();
    
    // 6. Verify execution resumes
    await waitForStatus(execution.executionId, 'completed', 10000);
  });
});
```

---

## 5. Performance Testing

### 5.1 Load Tests

```typescript
// perf/load-test.ts

import { check, sleep } from 'k6';
import http from 'k6/http';

export const options = {
  stages: [
    { duration: '1m', target: 100 },  // Ramp up
    { duration: '5m', target: 100 },  // Sustain
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% under 500ms
    http_req_failed: ['rate<0.01'],    // <1% error rate
  },
};

export default function() {
  // Start execution
  const startRes = http.post(
    `${BASE_URL}/api/workflows/wf_load_test/executions`,
    JSON.stringify({
      trigger: { type: 'manual', payload: { iteration: __ITER } }
    }),
    { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` } }
  );
  
  check(startRes, {
    'start execution succeeded': (r) => r.status === 201,
    'has execution ID': (r) => r.json('executionId') !== undefined,
  });
  
  const executionId = startRes.json('executionId');
  
  // Poll for completion
  let status = 'pending';
  let attempts = 0;
  while (status !== 'completed' && status !== 'failed' && attempts < 30) {
    sleep(1);
    const statusRes = http.get(
      `${BASE_URL}/api/executions/${executionId}`,
      { headers: { 'Authorization': `Bearer ${API_KEY}` } }
    );
    status = statusRes.json('status');
    attempts++;
  }
  
  check(status, {
    'execution completed': (s) => s === 'completed',
  });
}
```

### 5.2 Benchmark Tests

```typescript
// perf/benchmarks.test.ts

describe('Performance Benchmarks', () => {
  it('should execute simple workflow under 100ms', async () => {
    const start = performance.now();
    
    await runTestExecution(simpleWorkflow);
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });
  
  it('should handle 1000 concurrent executions', async () => {
    const executions = Array(1000).fill(null).map(() => 
      startExecution(simpleWorkflow)
    );
    
    const results = await Promise.all(executions);
    
    // All should have started
    expect(results.every(r => r.executionId)).toBe(true);
    
    // Wait for all to complete
    await Promise.all(
      results.map(r => waitForStatus(r.executionId, 'completed', 60000))
    );
    
    // Verify all completed
    const statuses = await Promise.all(
      results.map(r => getExecution(r.executionId))
    );
    expect(statuses.every(s => s.status === 'completed')).toBe(true);
  });
  
  it('should persist state under 20ms', async () => {
    const execution = await createTestExecution(simpleWorkflow);
    const iterations = 100;
    const durations: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await stateManager.persistNodeResult(execution, testNode, testResult);
      durations.push(performance.now() - start);
    }
    
    const p95 = percentile(durations, 95);
    expect(p95).toBeLessThan(20);
  });
});
```

---

## 6. Chaos Engineering

### 6.1 Failure Injection Tests

```typescript
// chaos/failure-injection.test.ts

describe('Chaos Engineering', () => {
  describe('Database Failures', () => {
    it('should handle temporary database unavailability', async () => {
      const execution = await startExecution(simpleWorkflow);
      
      // Inject database failure
      await injectFault('mongodb', 'unavailable', { duration: '5s' });
      
      // Wait for recovery
      await sleep(10000);
      
      // Verify execution recovered
      await waitForStatus(execution.executionId, 'completed', 30000);
    });
    
    it('should handle write failures gracefully', async () => {
      // Make state persistence fail
      await injectFault('mongodb', 'write-error', { rate: 0.5 });
      
      const execution = await startExecution(workflowWithRetry);
      
      // Should eventually complete despite failures
      await waitForStatus(execution.executionId, 'completed', 60000);
      
      await removeFault('mongodb');
    });
  });
  
  describe('Worker Failures', () => {
    it('should recover from worker crash mid-execution', async () => {
      const execution = await startExecution(longRunningWorkflow);
      
      // Wait for execution to be in progress
      await waitForStatus(execution.executionId, 'running');
      
      // Kill the worker
      await killWorker('worker_1');
      
      // Verify execution recovers with new worker
      await waitForStatus(execution.executionId, 'completed', 60000);
    });
    
    it('should handle all workers crashing', async () => {
      const execution = await startExecution(simpleWorkflow);
      
      // Kill all workers
      await killAllWorkers();
      
      // Wait for lock to expire
      await sleep(35000);
      
      // Start new workers
      await startWorkers(2);
      
      // Verify execution completes
      await waitForStatus(execution.executionId, 'completed', 30000);
    });
  });
  
  describe('Network Partitions', () => {
    it('should handle network partition during approval', async () => {
      const execution = await startExecution(approvalWorkflow);
      
      await waitForStatus(execution.executionId, 'waiting');
      
      // Partition between app and notification service
      await injectFault('network', 'partition', { 
        from: 'app', 
        to: 'notification-service' 
      });
      
      // Approval should still work (just no notification)
      const [approval] = await getApprovals({ executionId: execution.executionId });
      await respondToApproval(approval.approvalId, { decision: 'approved' });
      
      await waitForStatus(execution.executionId, 'completed');
      
      await removeFault('network');
    });
  });
});
```

---

## 7. Test Data Management

### 7.1 Test Fixtures

```typescript
// test/fixtures/workflows.ts

export const simpleWorkflow: WorkflowDefinition = {
  _id: new ObjectId(),
  name: 'Test Simple Workflow',
  nodes: [
    { id: 'trigger', type: 'manual_trigger', position: { x: 0, y: 0 }, data: {} },
    { id: 'transform', type: 'transform', position: { x: 200, y: 0 }, data: {} },
    { id: 'end', type: 'variable_set', position: { x: 400, y: 0 }, data: {} }
  ],
  edges: [
    { id: 'e1', source: 'trigger', target: 'transform' },
    { id: 'e2', source: 'transform', target: 'end' }
  ]
};

export const approvalWorkflow: WorkflowDefinition = {
  // ... workflow with approval node
};

export const workflowWithDelay: WorkflowDefinition = {
  // ... workflow with delay node
};

export const complexWorkflow: WorkflowDefinition = {
  // ... workflow with branches, loops, etc.
};
```

### 7.2 Test Database Setup

```typescript
// test/setup.ts

beforeAll(async () => {
  // Connect to test database
  await connectToTestDatabase();
  
  // Create indexes
  await createIndexes();
});

beforeEach(async () => {
  // Clear collections
  await clearTestCollections();
  
  // Seed required data
  await seedTestOrganization();
  await seedTestUsers();
});

afterAll(async () => {
  await disconnectTestDatabase();
});
```

---

*End of Testing Strategy*
