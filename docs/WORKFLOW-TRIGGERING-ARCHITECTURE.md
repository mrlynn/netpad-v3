# How Workflow Triggering Actually Works in NetPad

## The Claim in Documentation

The IT Help Desk article claims:
> "NetPad stores form configurations as typed JSON documents and uses MongoDB Change Streams to trigger real-time workflow executions."

## Reality Check

**This is NOT true.** NetPad does NOT use MongoDB Change Streams. Here's how it actually works:

## Actual Implementation

### 1. Form Submission Flow

When a form is submitted:

```typescript
// src/app/api/forms/[formId]/submit/route.ts

// 1. Form data is received and validated
// 2. Submission is saved to MongoDB
await collection.insertOne(documentToInsert);

// 3. Explicit function call triggers workflows (NOT change streams)
if (form.organizationId) {
  triggerFormWorkflowsAsync(
    form.organizationId,
    form.id!,
    form.name,
    submission.id,
    cleanData,
    metadata
  );
}
```

### 2. Workflow Triggering Mechanism

```typescript
// src/lib/workflow/triggerWorkflow.ts

// triggerFormWorkflowsAsync() fires and forgets
export function triggerFormWorkflowsAsync(...) {
  // Fire and forget - don't await
  triggerFormWorkflows(...).catch(error => 
    console.error('Async workflow trigger error:', error)
  );
}

// This function:
// 1. Queries MongoDB to find workflows configured for this form
const workflows = await findWorkflowsForForm(orgId, formId);

// 2. Queues each workflow in a job queue collection
await enqueueJob({
  workflowId,
  executionId,
  orgId,
  trigger: executionTrigger,
  runAt: new Date(),
});
```

### 3. Job Processing

Workflows are processed by a separate job processor:

```typescript
// src/app/api/workflows/process/route.ts

// This endpoint is called:
// - By a cron job (e.g., Vercel Cron) every minute
// - Manually for testing
// - By a webhook after form submission

// Claims jobs from the queue
const job = await claimJob(workerId);

// Executes the workflow
await executeWorkflowJob(job);
```

## Architecture Summary

```
Form Submission
    ↓
Save to MongoDB (explicit insertOne)
    ↓
Explicit function call: triggerFormWorkflowsAsync()
    ↓
Query MongoDB for workflows configured for this form
    ↓
Queue workflow jobs in MongoDB job queue collection
    ↓
Job processor (cron/API) claims and executes jobs
```

## Why This Matters

**Change Streams would be:**
- Reactive: Workflows triggered automatically by database events
- Real-time: Events processed as soon as documents are inserted
- Decoupled: Form submission handler doesn't need to know about workflows

**Current Implementation:**
- Explicit: Code explicitly calls workflow trigger function
- Eventual: Jobs queued and processed asynchronously
- Coupled: Form submission handler knows about workflows

## Benefits of Current Approach

1. **Reliability**: Explicit control over when workflows trigger
2. **Error Handling**: Can catch and handle errors in the trigger path
3. **Visibility**: Clear code path from submission to workflow
4. **Testing**: Easier to test explicit function calls
5. **Performance**: Can batch workflow triggers

## Potential Improvement: Change Streams

Using MongoDB Change Streams would be a valid architecture pattern:

```typescript
// Hypothetical implementation
const changeStream = collection.watch([
  { $match: { 'operationType': 'insert' } }
]);

changeStream.on('change', async (change) => {
  const submission = change.fullDocument;
  await triggerFormWorkflows(
    submission.organizationId,
    submission.formId,
    // ...
  );
});
```

**Benefits of Change Streams:**
- True decoupling between form submission and workflows
- Automatic triggering without code changes
- Real-time event processing
- Can handle submissions from any source (API, direct DB writes, etc.)

**Downsides:**
- More complex error handling
- Need to handle reconnection logic
- Requires maintaining persistent connection
- Harder to debug and trace

## Recommendation

**Option 1: Update Documentation**
Remove the incorrect claim about Change Streams and accurately describe the current implementation (explicit function calls + job queue).

**Option 2: Implement Change Streams**
If real-time, decoupled triggering is desired, implement Change Streams as an alternative or additional mechanism. This would be a significant architectural change.

## Current Implementation Details

- **Form submissions**: Saved to MongoDB via `insertOne()`
- **Workflow triggering**: Explicit function call `triggerFormWorkflowsAsync()`
- **Job queue**: MongoDB collection storing pending workflow executions
- **Job processing**: Cron job (or API endpoint) that claims and executes jobs
- **No Change Streams**: Zero references in codebase
