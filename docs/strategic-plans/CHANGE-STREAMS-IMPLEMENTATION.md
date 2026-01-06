# Strategic Plan: MongoDB Change Streams for Workflow Triggering

**Status:** Draft - Strategic Planning  
**Date:** 2024  
**Owner:** Engineering  
**Priority:** Medium

## Executive Summary

This document outlines a strategic plan to implement MongoDB Change Streams for triggering workflows in NetPad, moving from explicit function calls to event-driven architecture. This would improve alignment with MongoDB Platform capabilities, increase decoupling, and enable real-time workflow execution.

## Current State Analysis

### Architecture Overview

**Current Flow:**
```
Form Submission API
  ↓
Save to MongoDB (explicit insertOne)
  ↓
Explicit function call: triggerFormWorkflowsAsync()
  ↓
Query MongoDB for workflows configured for formId
  ↓
Queue workflow jobs in MongoDB job queue collection
  ↓
Job processor (cron/API) claims and executes jobs
```

### Current Implementation Details

**Submission Storage Locations:**
1. **Platform Database:**
   - `submissions_{orgId}` - Organization-specific submissions
   - `global_submissions` - Legacy global submissions
   - `form_submissions` - Legacy session-based submissions

2. **User Databases:**
   - User's own MongoDB collections (if connectionString configured)
   - Stored in user's database/collection from form config

**Workflow Triggering:**
- Explicit function call after form submission
- Synchronous code path (though async wrapper)
- Tight coupling between submission handler and workflow system
- Query-based workflow discovery

**Job Processing:**
- MongoDB job queue collection
- Cron job or API endpoint processes queue
- Distributed locking for job claiming
- Retry logic built into executor

### Current Pain Points

1. **Tight Coupling:** Form submission handler must know about workflows
2. **Code Complexity:** Multiple code paths for different submission types
3. **Missed Events:** If function call fails, workflows never trigger
4. **Not MongoDB-Native:** Doesn't leverage MongoDB's reactive capabilities
5. **Platform Alignment:** Less aligned with MongoDB Platform messaging

## Proposed Architecture

### Change Streams-Based Flow

```
Form Submission API
  ↓
Save to MongoDB (insertOne)
  ↓
[MongoDB Change Stream watches for insert]
  ↓
Change Stream event received
  ↓
Query workflows for formId (or use cached registry)
  ↓
Queue workflow jobs
  ↓
Job processor executes workflows
```

### Key Components

#### 1. Change Stream Watcher Service

**Purpose:** Long-running service that watches submission collections for new documents

**Implementation Options:**

**Option A: Dedicated Service (Recommended for Production)**
```typescript
// src/lib/workflow/changeStreamWatcher.ts
export class ChangeStreamWatcher {
  private changeStream: ChangeStream | null = null;
  private isRunning = false;
  
  async start() {
    // Watch organization-specific submission collections
    // Handle reconnection logic
    // Process change events
  }
  
  async stop() {
    // Close change stream gracefully
  }
}
```

**Option B: Next.js API Route with Long Polling**
```typescript
// src/app/api/workflows/watch/route.ts
// Serverless-friendly but requires periodic polling
```

**Option C: MongoDB Atlas Triggers (Future)**
- Use Atlas Triggers (Functions) to execute workflows
- Fully serverless and managed
- Requires Atlas deployment

#### 2. Event Handler

**Purpose:** Process change stream events and trigger workflows

```typescript
interface ChangeStreamEvent {
  operationType: 'insert' | 'update' | 'replace';
  fullDocument: PlatformFormSubmission;
  documentKey: { _id: ObjectId };
}

async function handleSubmissionInsert(event: ChangeStreamEvent) {
  const submission = event.fullDocument;
  
  // Extract form ID
  const formId = submission.formId;
  const orgId = submission.organizationId;
  
  // Find workflows (can cache for performance)
  const workflows = await findWorkflowsForForm(orgId, formId);
  
  // Queue workflow jobs
  for (const workflow of workflows) {
    await queueWorkflowExecution(workflow, submission);
  }
}
```

#### 3. Workflow Registry Cache

**Purpose:** Cache workflow configurations to reduce query load

```typescript
// In-memory cache of formId -> workflowIds mapping
// Refreshed when workflows are created/updated/deleted
class WorkflowRegistry {
  private cache: Map<string, string[]> = new Map();
  
  async refresh(orgId: string) {
    // Load all active workflows and build formId -> workflowIds map
  }
  
  getWorkflowIds(formId: string): string[] {
    return this.cache.get(formId) || [];
  }
}
```

## Benefits Analysis

### Advantages

1. **True Decoupling**
   - Form submission handler doesn't need to know about workflows
   - Workflows trigger automatically from database events
   - Easier to add new event types in future

2. **MongoDB Platform Alignment**
   - Leverages native MongoDB capabilities
   - Better messaging: "Powered by MongoDB Change Streams"
   - Demonstrates advanced MongoDB usage

3. **Reliability**
   - Even if code path fails, Change Streams will catch the insert
   - Automatic retry on connection failures
   - MongoDB handles event delivery guarantees

4. **Real-Time Execution**
   - Immediate triggering when documents are inserted
   - Lower latency than polling-based systems
   - True event-driven architecture

5. **Scalability**
   - Can handle high submission volumes
   - Distributed across multiple watchers
   - Built-in MongoDB scalability

6. **Flexibility**
   - Can watch multiple collections
   - Can filter by document structure
   - Can handle updates, not just inserts

7. **Monitoring**
   - Change Streams provide built-in metrics
   - Can track lag, events processed, etc.
   - Better observability

### Tradeoffs

1. **Deployment Complexity**
   - Requires persistent connection (problematic for serverless)
   - Need dedicated service or long-running process
   - More complex deployment architecture

2. **Connection Management**
   - Must handle reconnection logic
   - Connection failures need retry logic
   - Resource consumption (persistent connections)

3. **Error Handling**
   - Change Streams can't retry failed processing
   - Need separate error handling mechanism
   - Dead letter queue for failed events

4. **Development Complexity**
   - More complex than explicit function calls
   - Harder to debug (async event processing)
   - Requires understanding Change Streams

5. **Cost**
   - Change Streams consume resources
   - May need dedicated infrastructure
   - MongoDB oplog usage

6. **Testing**
   - Harder to test event-driven flows
   - Need to set up Change Streams in tests
   - Integration tests more complex

## Implementation Strategy

### Phase 1: Foundation (Weeks 1-2)

**Goal:** Build Change Stream infrastructure without disrupting current system

**Tasks:**
1. Create Change Stream watcher service
2. Implement reconnection logic
3. Add monitoring and logging
4. Create workflow registry cache
5. Write comprehensive tests

**Deliverables:**
- `src/lib/workflow/changeStreamWatcher.ts`
- `src/lib/workflow/workflowRegistry.ts`
- Unit tests
- Integration tests
- Documentation

**Success Criteria:**
- Change Stream watcher can watch a collection
- Handles reconnection gracefully
- Logs events for monitoring

### Phase 2: Parallel Implementation (Weeks 3-4)

**Goal:** Run Change Streams alongside current system

**Tasks:**
1. Deploy Change Stream watcher as separate service
2. Watch submission collections
3. Trigger workflows via Change Streams
4. Keep explicit function calls as fallback
5. Compare results (both should trigger)

**Deliverables:**
- Deployed Change Stream watcher
- Dual-trigger system (both explicit and Change Streams)
- Comparison metrics
- Error handling

**Success Criteria:**
- Both systems trigger workflows
- No duplicate executions
- Metrics show Change Streams working

### Phase 3: Migration (Weeks 5-6)

**Goal:** Transition to Change Streams as primary mechanism

**Tasks:**
1. Remove explicit function calls from submission handlers
2. Keep as optional fallback flag
3. Monitor error rates
4. Optimize performance
5. Update documentation

**Deliverables:**
- Submission handlers updated
- Feature flag for fallback
- Migration documentation
- Performance benchmarks

**Success Criteria:**
- All workflows triggered via Change Streams
- Error rate < 0.1%
- Performance equal or better
- Documentation updated

### Phase 4: Optimization (Weeks 7-8)

**Goal:** Optimize and enhance Change Streams implementation

**Tasks:**
1. Implement workflow registry cache
2. Add Change Stream filtering
3. Optimize query patterns
4. Add advanced monitoring
5. Performance tuning

**Deliverables:**
- Cached workflow registry
- Filtered Change Streams
- Performance improvements
- Enhanced monitoring

**Success Criteria:**
- 50% reduction in database queries
- <100ms latency from insert to workflow trigger
- Comprehensive monitoring dashboard

## Technical Considerations

### Deployment Model

**Challenge:** Change Streams require persistent connections, which conflicts with serverless architectures

**Solutions:**

1. **Dedicated Service (Recommended)**
   - Separate Node.js service for Change Stream watcher
   - Deploy as long-running container/service
   - Can use Kubernetes, Docker Compose, or VM
   - Pros: Simple, reliable, persistent connection
   - Cons: Additional infrastructure to manage

2. **Next.js API Route with Keep-Alive**
   - Use serverless functions with longer timeouts
   - Keep connection alive between requests
   - Pros: No additional infrastructure
   - Cons: Less reliable, connection resets

3. **MongoDB Atlas Triggers (Future)**
   - Use Atlas Functions (serverless)
   - Triggers execute on Change Streams
   - Pros: Fully managed, serverless
   - Cons: Vendor lock-in, cost, limited to Atlas

4. **Edge Functions (Future)**
   - Use Vercel Edge Functions or similar
   - WebSocket-based connection
   - Pros: Serverless, scalable
   - Cons: Complex, experimental

**Recommendation:** Start with Option 1 (dedicated service) for reliability, migrate to Option 3 (Atlas Triggers) when available.

### Reconnection Logic

**Requirements:**
- Automatic reconnection on connection loss
- Exponential backoff
- Maximum retry attempts
- Health check endpoint

**Implementation:**
```typescript
class ChangeStreamWatcher {
  private maxRetries = 10;
  private retryDelay = 1000;
  
  async reconnect(attempt = 0) {
    try {
      await this.start();
    } catch (error) {
      if (attempt < this.maxRetries) {
        await sleep(this.retryDelay * Math.pow(2, attempt));
        return this.reconnect(attempt + 1);
      }
      throw error;
    }
  }
}
```

### Error Handling

**Requirements:**
- Dead letter queue for failed events
- Retry mechanism for transient errors
- Alerting for persistent failures
- Manual retry capability

**Implementation:**
```typescript
async function handleChangeEvent(event: ChangeStreamEvent) {
  try {
    await processSubmissionEvent(event);
  } catch (error) {
    if (isTransientError(error)) {
      await retryEvent(event);
    } else {
      await deadLetterQueue.add(event);
      await alertOnCall();
    }
  }
}
```

### Performance Optimization

**Strategies:**
1. **Workflow Registry Cache**
   - Cache formId -> workflowIds mapping
   - Refresh on workflow changes
   - Reduces database queries

2. **Change Stream Filtering**
   - Filter at MongoDB level
   - Only watch for inserts (not updates)
   - Filter by organizationId

3. **Batch Processing**
   - Batch multiple events
   - Process in parallel
   - Reduce overhead

4. **Connection Pooling**
   - Reuse MongoDB connections
   - Optimize connection pool size
   - Monitor connection usage

### Monitoring & Observability

**Metrics to Track:**
- Change Stream lag (delay from insert to processing)
- Events processed per second
- Error rate
- Reconnection count
- Workflow trigger latency
- Queue depth

**Implementation:**
```typescript
// Metrics collection
metrics.increment('change_stream.events.received');
metrics.timing('change_stream.processing.latency', duration);
metrics.gauge('change_stream.lag', lagMs);
```

## Migration Strategy

### Approach: Gradual Rollout

1. **Phase 1: Proof of Concept**
   - Single organization
   - Monitor closely
   - Compare with explicit calls

2. **Phase 2: Beta Organizations**
   - Select beta organizations
   - Gather feedback
   - Fix issues

3. **Phase 3: Full Rollout**
   - Enable for all organizations
   - Remove explicit calls (keep as fallback)
   - Monitor error rates

4. **Phase 4: Cleanup**
   - Remove explicit trigger code
   - Remove fallback mechanisms
   - Update documentation

### Feature Flag Strategy

```typescript
const USE_CHANGE_STREAMS = process.env.USE_CHANGE_STREAMS === 'true';
const CHANGE_STREAMS_ORG_IDS = process.env.CHANGE_STREAMS_ORG_IDS?.split(',') || [];

function shouldUseChangeStreams(orgId: string): boolean {
  if (!USE_CHANGE_STREAMS) return false;
  if (CHANGE_STREAMS_ORG_IDS.length > 0) {
    return CHANGE_STREAMS_ORG_IDS.includes(orgId);
  }
  return true;
}
```

### Rollback Plan

**If Issues Arise:**
1. Disable Change Streams via feature flag
2. Re-enable explicit function calls
3. Investigate issues
4. Fix and re-enable Change Streams

**Rollback Triggers:**
- Error rate > 1%
- Latency increase > 500ms
- Connection stability issues
- Data loss detected

## Success Metrics

### Performance Metrics

1. **Latency**
   - Target: <100ms from insert to workflow trigger
   - Current: ~50ms (explicit call) to ~200ms (job queue)

2. **Throughput**
   - Target: Handle 1000+ submissions/second
   - Current: Limited by job queue processing

3. **Reliability**
   - Target: 99.9% event delivery
   - Current: 99.5% (explicit calls can fail)

### Business Metrics

1. **Code Complexity**
   - Target: 30% reduction in submission handler complexity
   - Measure: Lines of code, cyclomatic complexity

2. **Developer Experience**
   - Target: Easier to add new workflow triggers
   - Measure: Time to add new trigger type

3. **Platform Alignment**
   - Target: 100% MongoDB-native features
   - Measure: Marketing messaging accuracy

## Risks & Mitigation

### Risk 1: Connection Stability

**Risk:** Change Streams require persistent connections, which can fail in serverless environments

**Mitigation:**
- Use dedicated service for Change Stream watcher
- Implement robust reconnection logic
- Monitor connection health
- Fallback to explicit calls if Change Streams unavailable

### Risk 2: Event Processing Failures

**Risk:** Events may be processed multiple times or lost

**Mitigation:**
- Implement idempotency in workflow execution
- Use dead letter queue for failed events
- Monitor event processing metrics
- Manual retry mechanism

### Risk 3: Performance Degradation

**Risk:** Change Streams may add latency or consume resources

**Mitigation:**
- Benchmark before/after performance
- Optimize Change Stream filtering
- Use workflow registry cache
- Monitor resource usage

### Risk 4: Deployment Complexity

**Risk:** Additional infrastructure to manage

**Mitigation:**
- Start with simple deployment (single service)
- Use container orchestration (Kubernetes, Docker Compose)
- Document deployment process
- Consider managed services (Atlas Triggers) for future

### Risk 5: Testing Complexity

**Risk:** Harder to test event-driven architecture

**Mitigation:**
- Comprehensive integration tests
- Test Change Streams in CI/CD
- Mock Change Streams for unit tests
- End-to-end testing with real MongoDB

## Future Enhancements

### Short Term (3-6 months)

1. **Atlas Triggers Integration**
   - Migrate to Atlas Functions
   - Fully serverless
   - Managed by MongoDB

2. **Advanced Filtering**
   - Filter by form fields
   - Conditional workflow triggering
   - Multi-collection watching

3. **Performance Optimization**
   - Workflow registry caching
   - Batch event processing
   - Connection pooling

### Long Term (6-12 months)

1. **Multi-Event Support**
   - Watch for updates (not just inserts)
   - Support document updates triggering workflows
   - Track document lifecycle events

2. **Cross-Collection Triggers**
   - Watch multiple collections
   - Aggregate events
   - Complex event processing

3. **Real-Time Dashboard**
   - Change Stream metrics dashboard
   - Event flow visualization
   - Performance monitoring

## Conclusion

Implementing MongoDB Change Streams for workflow triggering would:

✅ **Improve Architecture:** True event-driven, decoupled system  
✅ **Platform Alignment:** Better alignment with MongoDB Platform  
✅ **Reliability:** More robust event delivery  
✅ **Scalability:** Better handling of high volumes  
✅ **Marketing:** Compelling MongoDB-native story  

**Recommendation:** Proceed with Phase 1 (Foundation) as proof of concept, evaluate results, then decide on full implementation.

**Next Steps:**
1. Review and approve strategic plan
2. Allocate engineering resources
3. Set up development environment
4. Begin Phase 1 implementation

---

**Questions for Discussion:**
1. Deployment model preference? (Dedicated service vs. serverless)
2. Timeline expectations?
3. Resource allocation?
4. Priority vs. other features?
5. Atlas Triggers availability timeline?
