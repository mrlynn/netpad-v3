# Workflow Billing & Pricing Tier Limits - Implementation Summary

## Overview

Workflow execution limits are now properly enforced at the API level based on Stripe subscription pricing tiers. This ensures organizations cannot exceed their plan limits.

## Pricing Tier Limits (from `src/types/platform.ts`)

The following limits are enforced based on subscription tier:

| Tier | Workflow Executions/Month | Max Active Workflows |
|------|---------------------------|----------------------|
| **Free** | 50 | 1 |
| **Pro** | 500 | 5 |
| **Team** | 5,000 | 25 |
| **Enterprise** | Unlimited (-1) | Unlimited (-1) |

## Enforcement Points

### ✅ Fixed: Race Condition Prevention

**Previous Issue**: Usage was incremented after execution completed, allowing multiple requests to pass limit checks simultaneously.

**Fix Applied**: Usage is now incremented **at queue time** when the execution is created, preventing race conditions.

### Enforcement Locations

1. **Manual Triggers** (`/api/workflows/[workflowId]/execute`)
   - ✅ Limit check and increment at queue time
   - Returns 429 with usage details if limit exceeded

2. **Form Submission Triggers** (`triggerWorkflow.ts`)
   - ✅ Limit check and increment at queue time
   - Used when forms trigger workflows automatically

3. **Execution Completion** (`executor.ts`)
   - ✅ Updates success/failure counters for analytics
   - Usage already counted at queue time (no double-counting)

## Implementation Details

### Functions

#### `incrementWorkflowExecutionAtQueue(orgId, workflowId)`
- **When**: Called when execution is queued (before creating execution record)
- **What**: Increments total execution counter for limit enforcement
- **Returns**: Usage result with current/limit/remaining counts
- **Location**: `src/lib/platform/billing.ts`

#### `updateWorkflowExecutionResult(orgId, workflowId, success)`
- **When**: Called when execution completes (success or failure)
- **What**: Updates success/failure counters for analytics only
- **Returns**: void
- **Location**: `src/lib/platform/billing.ts`

#### `checkWorkflowExecutionLimit(orgId)`
- **When**: Called before queueing to check if allowed
- **What**: Checks current usage against tier limits (read-only)
- **Returns**: Usage result indicating if allowed
- **Location**: `src/lib/platform/billing.ts`

### Limit Check Flow

```
Request → Check queue capacity → Increment usage (enforces limit) → Create execution → Queue job
                                                                         ↓
                                                                   Execution completes
                                                                         ↓
                                                           Update success/failure counters
```

### Error Response Format

When limit is exceeded, API returns:

```json
{
  "error": "Monthly workflow execution limit reached (50)",
  "code": "LIMIT_EXCEEDED",
  "usage": {
    "current": 50,
    "limit": 50,
    "remaining": 0
  }
}
```

HTTP Status: `429 Too Many Requests`

## Usage Tracking

Usage is tracked per organization in the `usage` collection with structure:

```typescript
{
  organizationId: string,
  period: string,  // "YYYY-MM" format
  workflows: {
    executions: number,              // Total executions (for limit enforcement)
    successfulExecutions: number,    // Successful executions (analytics)
    failedExecutions: number,        // Failed executions (analytics)
    byWorkflow: {                    // Per-workflow execution counts
      [workflowId]: number
    }
  }
}
```

## Monthly Reset

Usage counters reset automatically at the start of each month based on the `period` field (`YYYY-MM` format). The `getCurrentPeriod()` function generates the current period string.

## Active Workflow Limits

Additionally enforced:
- `maxActiveWorkflows`: Maximum number of workflows that can be in "active" status
- Enforced in: `/api/workflows/[workflowId]/status` route
- Function: `checkActiveWorkflowLimit(orgId, currentActiveCount)`

## Testing Recommendations

1. **Concurrent Request Testing**
   - Test multiple simultaneous requests at limit boundary
   - Verify no executions exceed the limit

2. **Limit Boundary Testing**
   - Test with usage at limit - 1
   - Verify next request succeeds
   - Verify request at exact limit fails

3. **Tier Verification**
   - Verify limits match Stripe pricing tiers
   - Test free tier (50/month)
   - Test pro tier (500/month)
   - Test enterprise (unlimited)

4. **Monthly Reset**
   - Verify counters reset on month boundary
   - Test with date manipulation if needed

5. **All Trigger Types**
   - Manual triggers (API)
   - Form submission triggers
   - Webhook triggers (if implemented)
   - Scheduled triggers (if implemented)

## Future Considerations

### Webhook Triggers
If webhook endpoints are added to trigger workflows, ensure they use the same `incrementWorkflowExecutionAtQueue()` function.

### Scheduled Triggers
If scheduled/cron-based workflow triggers are implemented, ensure they check and increment limits before queuing executions.

### Usage Dashboard
Consider exposing usage metrics to users in the UI so they can monitor their consumption and plan accordingly.

## Files Modified

1. `src/lib/platform/billing.ts`
   - Added `incrementWorkflowExecutionAtQueue()`
   - Added `updateWorkflowExecutionResult()`
   - Deprecated `incrementWorkflowExecution()` (kept for backward compat)

2. `src/app/api/workflows/[workflowId]/execute/route.ts`
   - Changed to increment at queue time
   - Improved error response format

3. `src/lib/workflow/triggerWorkflow.ts`
   - Changed to increment at queue time for form triggers

4. `src/lib/workflow/executor.ts`
   - Changed to update success/failure only (not total count)
   - Added update for catch block failures

## Related Documentation

- `WORKFLOW_BILLING_FIX.md` - Details of the race condition fix
- `src/types/platform.ts` - Pricing tier definitions
- `DOCUMENTATION_SPECIFICATION.md` - API documentation
