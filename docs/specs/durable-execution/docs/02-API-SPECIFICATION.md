# NetPad Durable Workflow Execution
## API Specification

**Document:** 02-API-SPECIFICATION.md  
**Version:** 1.0.0  
**Status:** Sprint Ready  
**Last Updated:** January 26, 2025

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Execution APIs](#3-execution-apis)
4. [Approval APIs](#4-approval-apis)
5. [Signal APIs](#5-signal-apis)
6. [Monitoring APIs](#6-monitoring-apis)
7. [Error Responses](#7-error-responses)
8. [Rate Limiting](#8-rate-limiting)
9. [Webhooks](#9-webhooks)

---

## 1. Overview

### 1.1 Base URL

```
Production: https://api.netpad.io/v1
Staging:    https://api.staging.netpad.io/v1
```

### 1.2 API Conventions

- **Content-Type**: `application/json`
- **Date Format**: ISO 8601 (`2025-01-26T10:30:00Z`)
- **Pagination**: Cursor-based using `cursor` and `limit` parameters
- **Sorting**: `sort` parameter with `field:direction` format (e.g., `startedAt:desc`)

### 1.3 Common Headers

```http
Authorization: Bearer <api_key>
Content-Type: application/json
X-Organization-Id: org_xxxxx
X-Project-Id: proj_xxxxx
X-Request-Id: req_xxxxx (optional, for tracing)
```

---

## 2. Authentication

All API calls require authentication via API key in the Authorization header.

### 2.1 API Key Scopes

| Scope | Description | Endpoints |
|-------|-------------|-----------|
| `executions:read` | Read execution status and history | GET endpoints |
| `executions:write` | Start, cancel, signal executions | POST, DELETE endpoints |
| `approvals:read` | View pending approvals | GET /approvals |
| `approvals:write` | Respond to approvals | POST /approvals/:id |
| `workflows:execute` | Trigger workflow execution | POST /workflows/:id/executions |

### 2.2 Error Response

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired API key",
    "details": {
      "required_scope": "executions:read"
    }
  }
}
```

---

## 3. Execution APIs

### 3.1 Start Execution

Start a new workflow execution.

```http
POST /workflows/{workflowId}/executions
```

**Request Body:**
```json
{
  "trigger": {
    "type": "manual",
    "payload": {
      "customer_name": "Acme Corp",
      "amount": 15000,
      "requested_by": "user_123"
    }
  },
  "variables": {
    "environment": "production",
    "debug": false
  },
  "priority": "normal",
  "idempotencyKey": "expense_req_12345"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `trigger.type` | string | Yes | `manual`, `api`, `webhook` |
| `trigger.payload` | object | Yes | Data passed to workflow |
| `variables` | object | No | Additional execution variables |
| `priority` | string | No | `low`, `normal`, `high` (default: `normal`) |
| `idempotencyKey` | string | No | Prevents duplicate executions |

**Response: 201 Created**
```json
{
  "executionId": "exec_abc123xyz",
  "workflowId": "wf_def456",
  "status": "pending",
  "createdAt": "2025-01-26T10:30:00Z",
  "links": {
    "self": "/executions/exec_abc123xyz",
    "workflow": "/workflows/wf_def456",
    "events": "/executions/exec_abc123xyz/events"
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_TRIGGER` | Trigger type doesn't match workflow |
| 402 | `UPGRADE_REQUIRED` | Workflow requires Team plan |
| 404 | `WORKFLOW_NOT_FOUND` | Workflow doesn't exist |
| 409 | `DUPLICATE_EXECUTION` | Idempotency key already used |
| 422 | `VALIDATION_ERROR` | Payload doesn't match schema |

---

### 3.2 Get Execution

Retrieve execution details and current state.

```http
GET /executions/{executionId}
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `includeVariables` | boolean | false | Include execution variables |
| `includeNodeStates` | boolean | false | Include per-node state |

**Response: 200 OK**
```json
{
  "executionId": "exec_abc123xyz",
  "workflowId": "wf_def456",
  "workflowName": "Expense Approval",
  "workflowVersion": 3,
  "organizationId": "org_xxx",
  "projectId": "proj_xxx",
  
  "status": "waiting",
  "currentNodeId": "approval_manager",
  
  "trigger": {
    "type": "form_submission",
    "sourceId": "form_expense_request",
    "payload": {
      "amount": 15000,
      "description": "Q1 Marketing Conference"
    },
    "timestamp": "2025-01-26T10:30:00Z"
  },
  
  "waitingFor": {
    "type": "approval",
    "approvalId": "appr_xyz789",
    "assignedTo": ["user_manager_1"],
    "expiresAt": "2025-01-28T10:30:00Z"
  },
  
  "progress": {
    "completedNodes": 3,
    "totalNodes": 7,
    "percentage": 43
  },
  
  "timing": {
    "startedAt": "2025-01-26T10:30:00Z",
    "updatedAt": "2025-01-26T10:30:15Z",
    "completedAt": null,
    "duration": null
  },
  
  "variables": {
    "trigger": { /* ... */ },
    "filter_priority": { "output": { "path": "high" } }
  },
  
  "nodeStates": {
    "trigger_form": { "status": "completed", "completedAt": "..." },
    "filter_priority": { "status": "completed", "completedAt": "..." },
    "approval_manager": { "status": "waiting", "startedAt": "..." }
  },
  
  "links": {
    "self": "/executions/exec_abc123xyz",
    "workflow": "/workflows/wf_def456",
    "events": "/executions/exec_abc123xyz/events",
    "cancel": "/executions/exec_abc123xyz/cancel",
    "approval": "/approvals/appr_xyz789"
  }
}
```

---

### 3.3 List Executions

List executions with filtering and pagination.

```http
GET /workflows/{workflowId}/executions
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | - | Filter by status (comma-separated) |
| `startedAfter` | datetime | - | Filter by start time |
| `startedBefore` | datetime | - | Filter by start time |
| `sort` | string | `startedAt:desc` | Sort order |
| `limit` | integer | 20 | Max results (1-100) |
| `cursor` | string | - | Pagination cursor |

**Example:**
```http
GET /workflows/wf_def456/executions?status=running,waiting&limit=50
```

**Response: 200 OK**
```json
{
  "data": [
    {
      "executionId": "exec_abc123",
      "status": "waiting",
      "trigger": { "type": "form_submission" },
      "currentNodeId": "approval_manager",
      "startedAt": "2025-01-26T10:30:00Z",
      "progress": { "percentage": 43 }
    },
    {
      "executionId": "exec_def456",
      "status": "running",
      "trigger": { "type": "manual" },
      "currentNodeId": "email_notify",
      "startedAt": "2025-01-26T10:25:00Z",
      "progress": { "percentage": 85 }
    }
  ],
  "pagination": {
    "hasMore": true,
    "nextCursor": "eyJpZCI6ImV4ZWNfZGVmNDU2In0",
    "total": 156
  }
}
```

---

### 3.4 Cancel Execution

Cancel a running or waiting execution.

```http
POST /executions/{executionId}/cancel
```

**Request Body:**
```json
{
  "reason": "Customer withdrew request",
  "cancelledBy": "user_123"
}
```

**Response: 200 OK**
```json
{
  "executionId": "exec_abc123xyz",
  "status": "cancelled",
  "cancelledAt": "2025-01-26T11:00:00Z",
  "cancelledBy": "user_123",
  "reason": "Customer withdrew request"
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_STATUS` | Cannot cancel completed/failed execution |
| 404 | `EXECUTION_NOT_FOUND` | Execution doesn't exist |

---

### 3.5 Retry Failed Execution

Retry a failed execution from the failed node.

```http
POST /executions/{executionId}/retry
```

**Request Body:**
```json
{
  "fromNode": "email_notify",
  "overrideVariables": {
    "email_override": "backup@example.com"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromNode` | string | No | Node ID to retry from (default: failed node) |
| `overrideVariables` | object | No | Variables to override |

**Response: 200 OK**
```json
{
  "executionId": "exec_abc123xyz",
  "status": "pending",
  "retryFromNode": "email_notify",
  "retryCount": 1,
  "retriedAt": "2025-01-26T11:00:00Z"
}
```

---

### 3.6 Get Execution Events

Retrieve the event history for an execution.

```http
GET /executions/{executionId}/events
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `eventType` | string | - | Filter by event type |
| `nodeId` | string | - | Filter by node |
| `since` | datetime | - | Events after timestamp |
| `limit` | integer | 100 | Max results |
| `cursor` | string | - | Pagination cursor |

**Response: 200 OK**
```json
{
  "data": [
    {
      "eventId": "evt_001",
      "eventType": "EXECUTION_STARTED",
      "timestamp": "2025-01-26T10:30:00.000Z",
      "sequenceNumber": 1,
      "payload": {
        "workflowId": "wf_def456",
        "trigger": { "type": "form_submission" }
      }
    },
    {
      "eventId": "evt_002",
      "eventType": "NODE_STARTED",
      "timestamp": "2025-01-26T10:30:00.050Z",
      "sequenceNumber": 2,
      "nodeId": "trigger_form",
      "payload": {}
    },
    {
      "eventId": "evt_003",
      "eventType": "NODE_COMPLETED",
      "timestamp": "2025-01-26T10:30:00.100Z",
      "sequenceNumber": 3,
      "nodeId": "trigger_form",
      "payload": {
        "output": { "form_data": { /* ... */ } }
      }
    },
    {
      "eventId": "evt_007",
      "eventType": "WAITING_FOR_APPROVAL",
      "timestamp": "2025-01-26T10:30:15.000Z",
      "sequenceNumber": 7,
      "nodeId": "approval_manager",
      "payload": {
        "approvalId": "appr_xyz789",
        "assignedTo": ["user_manager_1"],
        "expiresAt": "2025-01-28T10:30:00Z"
      }
    }
  ],
  "pagination": {
    "hasMore": false,
    "total": 7
  }
}
```

**Event Types:**

| Event Type | Description |
|------------|-------------|
| `EXECUTION_STARTED` | Execution created and queued |
| `EXECUTION_COMPLETED` | All nodes finished successfully |
| `EXECUTION_FAILED` | Execution failed with error |
| `EXECUTION_CANCELLED` | Execution manually cancelled |
| `NODE_SCHEDULED` | Node queued for execution |
| `NODE_STARTED` | Node execution began |
| `NODE_COMPLETED` | Node finished successfully |
| `NODE_FAILED` | Node failed with error |
| `NODE_RETRYING` | Node scheduled for retry |
| `WAITING_FOR_APPROVAL` | Paused for human approval |
| `APPROVAL_RECEIVED` | Approval granted |
| `APPROVAL_REJECTED` | Approval denied |
| `APPROVAL_TIMEOUT` | Approval expired |
| `TIMER_SCHEDULED` | Delay timer created |
| `TIMER_FIRED` | Delay timer triggered |
| `SIGNAL_RECEIVED` | External signal received |
| `VARIABLE_SET` | Execution variable updated |

---

## 4. Approval APIs

### 4.1 List Pending Approvals

Get approvals assigned to the current user or their roles.

```http
GET /approvals
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | `pending` | Filter by status |
| `assignedTo` | string | - | Filter by assignee |
| `workflowId` | string | - | Filter by workflow |
| `sort` | string | `createdAt:asc` | Sort order |
| `limit` | integer | 20 | Max results |

**Response: 200 OK**
```json
{
  "data": [
    {
      "approvalId": "appr_xyz789",
      "executionId": "exec_abc123",
      "workflowId": "wf_def456",
      "workflowName": "Expense Approval",
      
      "title": "Approve Expense Request",
      "description": "Marketing conference travel for Sarah Chen",
      "requestType": "approve_reject",
      
      "context": {
        "amount": 15000,
        "requestedBy": "Sarah Chen",
        "department": "Marketing",
        "description": "Q1 Marketing Conference in Austin"
      },
      
      "assignedTo": {
        "type": "user",
        "ids": ["user_manager_1"]
      },
      
      "status": "pending",
      "createdAt": "2025-01-26T10:30:15Z",
      "expiresAt": "2025-01-28T10:30:00Z",
      
      "links": {
        "self": "/approvals/appr_xyz789",
        "execution": "/executions/exec_abc123",
        "respond": "/approvals/appr_xyz789/respond"
      }
    }
  ],
  "pagination": {
    "hasMore": false,
    "total": 3
  }
}
```

---

### 4.2 Get Approval Details

Get full details for a specific approval.

```http
GET /approvals/{approvalId}
```

**Response: 200 OK**
```json
{
  "approvalId": "appr_xyz789",
  "executionId": "exec_abc123",
  "workflowId": "wf_def456",
  "nodeId": "approval_manager",
  "organizationId": "org_xxx",
  
  "title": "Approve Expense Request",
  "description": "Marketing conference travel for Sarah Chen",
  
  "requestType": "approve_reject",
  
  "options": [
    { "id": "approve", "label": "Approve", "value": "approved" },
    { "id": "reject", "label": "Reject", "value": "rejected" },
    { "id": "escalate", "label": "Escalate to VP", "value": "escalate" }
  ],
  
  "inputFields": [
    {
      "name": "comment",
      "label": "Comment (optional)",
      "type": "textarea",
      "required": false
    },
    {
      "name": "adjusted_amount",
      "label": "Adjusted Amount",
      "type": "number",
      "required": false,
      "condition": "decision === 'approve'"
    }
  ],
  
  "context": {
    "amount": 15000,
    "currency": "USD",
    "requestedBy": {
      "name": "Sarah Chen",
      "email": "sarah@example.com",
      "department": "Marketing"
    },
    "description": "Q1 Marketing Conference in Austin",
    "attachments": [
      {
        "name": "conference_details.pdf",
        "url": "/files/abc123/conference_details.pdf"
      }
    ],
    "previousApprovals": []
  },
  
  "assignedTo": {
    "type": "user",
    "ids": ["user_manager_1"],
    "names": ["John Manager"]
  },
  
  "status": "pending",
  
  "notifications": [
    {
      "channel": "email",
      "sentAt": "2025-01-26T10:30:20Z",
      "status": "delivered"
    },
    {
      "channel": "slack",
      "sentAt": "2025-01-26T10:30:21Z",
      "status": "delivered"
    }
  ],
  
  "timing": {
    "createdAt": "2025-01-26T10:30:15Z",
    "expiresAt": "2025-01-28T10:30:00Z",
    "timeRemaining": "47h 30m"
  },
  
  "links": {
    "self": "/approvals/appr_xyz789",
    "execution": "/executions/exec_abc123",
    "respond": "/approvals/appr_xyz789/respond"
  }
}
```

---

### 4.3 Respond to Approval

Submit a response to a pending approval.

```http
POST /approvals/{approvalId}/respond
```

**Request Body:**
```json
{
  "decision": "approved",
  "selectedOption": "approve",
  "input": {
    "comment": "Approved. Great opportunity for team visibility.",
    "adjusted_amount": 15000
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `decision` | string | Yes | `approved` or `rejected` |
| `selectedOption` | string | No | ID of selected option (if multiple options) |
| `input` | object | No | Values for input fields |

**Response: 200 OK**
```json
{
  "approvalId": "appr_xyz789",
  "status": "approved",
  "response": {
    "decision": "approved",
    "selectedOption": "approve",
    "input": {
      "comment": "Approved. Great opportunity for team visibility.",
      "adjusted_amount": 15000
    },
    "respondedBy": {
      "userId": "user_manager_1",
      "name": "John Manager"
    },
    "respondedAt": "2025-01-26T12:00:00Z"
  },
  "execution": {
    "executionId": "exec_abc123",
    "status": "pending",
    "message": "Execution resumed"
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_DECISION` | Decision not allowed |
| 400 | `MISSING_REQUIRED_INPUT` | Required input field missing |
| 403 | `NOT_ASSIGNED` | User not authorized to respond |
| 404 | `APPROVAL_NOT_FOUND` | Approval doesn't exist |
| 409 | `ALREADY_RESPONDED` | Approval already has response |
| 410 | `APPROVAL_EXPIRED` | Approval timed out |

---

### 4.4 Send Reminder

Send a reminder notification for a pending approval.

```http
POST /approvals/{approvalId}/remind
```

**Request Body:**
```json
{
  "channels": ["email", "slack"],
  "message": "Reminder: This expense request needs your approval by end of day."
}
```

**Response: 200 OK**
```json
{
  "approvalId": "appr_xyz789",
  "reminders": [
    {
      "channel": "email",
      "sentAt": "2025-01-26T14:00:00Z",
      "status": "sent"
    },
    {
      "channel": "slack",
      "sentAt": "2025-01-26T14:00:01Z",
      "status": "sent"
    }
  ]
}
```

---

## 5. Signal APIs

Signals allow external systems to wake up waiting executions.

### 5.1 Send Signal

Send a signal to a waiting execution.

```http
POST /executions/{executionId}/signal
```

**Request Body:**
```json
{
  "signalName": "payment_received",
  "payload": {
    "transaction_id": "txn_abc123",
    "amount": 15000,
    "timestamp": "2025-01-26T14:00:00Z"
  }
}
```

**Response: 200 OK**
```json
{
  "executionId": "exec_abc123",
  "signalName": "payment_received",
  "accepted": true,
  "executionStatus": "pending",
  "message": "Signal accepted, execution resumed"
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | `UNEXPECTED_SIGNAL` | Execution not waiting for this signal |
| 404 | `EXECUTION_NOT_FOUND` | Execution doesn't exist |
| 409 | `INVALID_STATUS` | Execution not in waiting state |

---

### 5.2 List Expected Signals

Get signals an execution is waiting for.

```http
GET /executions/{executionId}/signals
```

**Response: 200 OK**
```json
{
  "executionId": "exec_abc123",
  "status": "waiting",
  "expectedSignals": [
    {
      "signalName": "payment_received",
      "nodeId": "wait_payment",
      "waitingSince": "2025-01-26T10:30:00Z",
      "timeoutAt": "2025-01-27T10:30:00Z",
      "schema": {
        "type": "object",
        "required": ["transaction_id", "amount"],
        "properties": {
          "transaction_id": { "type": "string" },
          "amount": { "type": "number" }
        }
      }
    }
  ]
}
```

---

## 6. Monitoring APIs

### 6.1 Execution Statistics

Get aggregate statistics for workflow executions.

```http
GET /workflows/{workflowId}/executions/stats
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `period` | string | `24h` | Time period (`1h`, `24h`, `7d`, `30d`) |
| `groupBy` | string | - | Group by `status`, `trigger_type`, `hour` |

**Response: 200 OK**
```json
{
  "workflowId": "wf_def456",
  "period": "24h",
  "summary": {
    "total": 156,
    "completed": 120,
    "failed": 8,
    "running": 15,
    "waiting": 13,
    "cancelled": 0
  },
  "timing": {
    "avgDuration": 45000,
    "medianDuration": 32000,
    "p95Duration": 120000,
    "p99Duration": 180000
  },
  "byStatus": [
    { "status": "completed", "count": 120, "percentage": 76.9 },
    { "status": "failed", "count": 8, "percentage": 5.1 },
    { "status": "running", "count": 15, "percentage": 9.6 },
    { "status": "waiting", "count": 13, "percentage": 8.3 }
  ],
  "byHour": [
    { "hour": "2025-01-26T00:00:00Z", "started": 5, "completed": 4 },
    { "hour": "2025-01-26T01:00:00Z", "started": 8, "completed": 6 }
    // ...
  ]
}
```

---

### 6.2 Node Performance

Get performance metrics for workflow nodes.

```http
GET /workflows/{workflowId}/executions/node-stats
```

**Response: 200 OK**
```json
{
  "workflowId": "wf_def456",
  "period": "24h",
  "nodes": [
    {
      "nodeId": "trigger_form",
      "nodeType": "form_trigger",
      "label": "Expense Form",
      "executions": 156,
      "timing": {
        "avgDuration": 50,
        "p95Duration": 120
      },
      "outcomes": {
        "completed": 156,
        "failed": 0
      }
    },
    {
      "nodeId": "approval_manager",
      "nodeType": "approval",
      "label": "Manager Approval",
      "executions": 148,
      "timing": {
        "avgWaitTime": 7200000,
        "medianWaitTime": 3600000
      },
      "outcomes": {
        "approved": 120,
        "rejected": 15,
        "timeout": 5,
        "pending": 8
      }
    },
    {
      "nodeId": "email_notify",
      "nodeType": "email_send",
      "label": "Send Notification",
      "executions": 135,
      "timing": {
        "avgDuration": 1500,
        "p95Duration": 3000
      },
      "outcomes": {
        "completed": 130,
        "failed": 5
      },
      "retries": {
        "total": 8,
        "successful": 5
      }
    }
  ]
}
```

---

### 6.3 Queue Health

Get execution queue metrics.

```http
GET /executions/queue/health
```

**Response: 200 OK**
```json
{
  "queue": {
    "depth": 45,
    "oldestAge": 2500,
    "avgWaitTime": 1200
  },
  "workers": {
    "active": 3,
    "processing": 12,
    "idle": 0
  },
  "throughput": {
    "last1m": 25,
    "last5m": 118,
    "last1h": 1250
  },
  "alerts": []
}
```

---

## 7. Error Responses

### 7.1 Standard Error Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context"
    },
    "requestId": "req_abc123",
    "timestamp": "2025-01-26T10:30:00Z"
  }
}
```

### 7.2 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing API key |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `VALIDATION_ERROR` | 422 | Request body validation failed |
| `CONFLICT` | 409 | Resource state conflict |
| `UPGRADE_REQUIRED` | 402 | Feature requires paid plan |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

### 7.3 Validation Error Details

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "errors": [
        {
          "field": "trigger.payload.amount",
          "code": "REQUIRED",
          "message": "Amount is required"
        },
        {
          "field": "trigger.payload.email",
          "code": "INVALID_FORMAT",
          "message": "Invalid email format"
        }
      ]
    }
  }
}
```

---

## 8. Rate Limiting

### 8.1 Limits

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Execution read | 1000 requests | 1 minute |
| Execution write | 100 requests | 1 minute |
| Approval read | 500 requests | 1 minute |
| Approval write | 50 requests | 1 minute |
| Monitoring | 100 requests | 1 minute |

### 8.2 Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706266800
```

### 8.3 Rate Limited Response

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 30

{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded",
    "details": {
      "limit": 100,
      "remaining": 0,
      "resetAt": "2025-01-26T10:31:00Z",
      "retryAfter": 30
    }
  }
}
```

---

## 9. Webhooks

### 9.1 Execution Webhooks

Configure webhooks to receive execution events.

**Webhook Payload:**
```json
{
  "id": "whk_evt_abc123",
  "type": "execution.completed",
  "timestamp": "2025-01-26T10:30:00Z",
  "data": {
    "executionId": "exec_abc123",
    "workflowId": "wf_def456",
    "status": "completed",
    "duration": 45000,
    "trigger": {
      "type": "form_submission",
      "sourceId": "form_expense"
    }
  },
  "signature": "sha256=abc123..."
}
```

**Event Types:**

| Event | Description |
|-------|-------------|
| `execution.started` | Execution created |
| `execution.completed` | Execution finished successfully |
| `execution.failed` | Execution failed |
| `execution.cancelled` | Execution cancelled |
| `execution.waiting` | Execution paused for approval/timer |
| `approval.created` | New approval request |
| `approval.responded` | Approval received response |
| `approval.timeout` | Approval expired |

### 9.2 Webhook Signature Verification

```typescript
const crypto = require('crypto');

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expected}`)
  );
}
```

---

## Appendix: SDK Examples

### Node.js SDK

```typescript
import { NetPad } from '@netpad/sdk';

const client = new NetPad({
  apiKey: process.env.NETPAD_API_KEY,
  organizationId: 'org_xxx'
});

// Start execution
const execution = await client.workflows.execute('wf_expense_approval', {
  trigger: {
    type: 'manual',
    payload: {
      amount: 15000,
      description: 'Q1 Conference'
    }
  }
});

// Wait for completion
const result = await client.executions.waitForCompletion(execution.executionId, {
  timeout: 300000, // 5 minutes
  pollInterval: 1000
});

// Respond to approval
await client.approvals.respond('appr_xyz789', {
  decision: 'approved',
  input: { comment: 'Looks good!' }
});
```

### Python SDK

```python
from netpad import NetPad

client = NetPad(
    api_key=os.environ['NETPAD_API_KEY'],
    organization_id='org_xxx'
)

# Start execution
execution = client.workflows.execute(
    workflow_id='wf_expense_approval',
    trigger={
        'type': 'manual',
        'payload': {
            'amount': 15000,
            'description': 'Q1 Conference'
        }
    }
)

# Get execution status
status = client.executions.get(execution.execution_id)

# List pending approvals
approvals = client.approvals.list(status='pending')
```

---

*End of API Specification*
