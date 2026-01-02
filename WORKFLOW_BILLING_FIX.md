# Workflow Billing Limit Enforcement - Fix Required

## Critical Issue Found

**Problem**: Race condition allows exceeding workflow execution limits

**Current Flow**:
1. Request comes in → Check limit (e.g., 49/50 used) ✓
2. If allowed, create execution and queue job ✓
3. Return success immediately
4. Later, when execution completes → Increment usage counter ✗

**Race Condition**:
- Multiple requests can check limits simultaneously (all see 49/50)
- All pass the check and get queued
- When they complete, usage increments to 54/50 - exceeding limit

## Root Cause

Usage increment happens AFTER execution completes in `executor.ts`:
- Line 101: `incrementWorkflowExecution()` called after success
- Line 135: `incrementWorkflowExecution()` called after failure

This allows multiple executions to be queued before any complete, bypassing limits.

## Solution

**Increment usage when execution is QUEUED, not when it completes**

### Changes Required

1. **Move increment to queue time** in:
   - `src/app/api/workflows/[workflowId]/execute/route.ts`
   - `src/lib/workflow/triggerWorkflow.ts` (for form triggers, webhooks, schedules)

2. **Remove increment from executor** in:
   - `src/lib/workflow/executor.ts` (lines 101 and 135)

3. **Update `incrementWorkflowExecution`** to:
   - Still check limit before incrementing (defense in depth)
   - Be idempotent or handle race conditions

### Implementation Plan

#### Step 1: Update billing function to increment at queue time

The function should:
- Check limit
- If allowed, increment immediately (atomically if possible)
- Return the increment result

#### Step 2: Update API route

```typescript
// In /api/workflows/[workflowId]/execute/route.ts
// After limit check (line 58), BEFORE creating execution:

// Increment usage when queuing (not when completing)
const incrementResult = await incrementWorkflowExecution(orgId, workflowId, true);
if (!incrementResult.allowed) {
  return NextResponse.json({
    error: incrementResult.reason || 'Monthly workflow execution limit reached',
    code: 'LIMIT_EXCEEDED',
    usage: {
      current: incrementResult.current,
      limit: incrementResult.limit,
      remaining: incrementResult.remaining,
    },
  }, { status: 429 });
}

// Then proceed with createExecution and enqueueJob
```

#### Step 3: Update triggerWorkflow.ts

Same pattern - increment before queuing.

#### Step 4: Remove increment from executor

Remove the `incrementWorkflowExecution` calls from executor since usage is already tracked.

## Current Enforcement Points

✅ **Properly enforced**:
- `/api/workflows/[workflowId]/execute` - Manual triggers (checks limit, but increments too late)
- `triggerWorkflow.ts` - Form submission triggers (checks limit, but increments too late)

⚠️ **Need verification**:
- Webhook triggers (if they exist as API endpoints)
- Scheduled triggers (need to check how they're triggered)

## Testing

After fix:
1. Test concurrent requests at limit boundary
2. Verify usage increments immediately, not after completion
3. Verify failed executions still count (they should, since slot was used)
4. Test all trigger types (manual, form, webhook, schedule)
