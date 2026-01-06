/**
 * IT Ticket Routing Workflow Configuration
 *
 * This file exports a typed WorkflowDefinition that can be imported into NetPad.
 * The workflow automates IT ticket routing with:
 * - Confirmation email to the requester
 * - Notification to the IT team
 * - Slack escalation for critical tickets
 *
 * @example
 * ```typescript
 * // Import into NetPad via API
 * const bundle = {
 *   manifest: { name: 'IT Help Desk', version: '1.0.0', assets: { workflows: ['workflow.json'] } },
 *   workflows: [itTicketRoutingWorkflow],
 * };
 *
 * await fetch('/api/templates/import?orgId=your-org-id', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify(bundle),
 * });
 * ```
 */

import type {
  WorkflowCanvas,
  WorkflowSettings,
  WorkflowVariable,
  WorkflowNode,
  WorkflowEdge,
  RetryPolicy,
} from '@/types/workflow';

import type { WorkflowDefinition } from '@/types/template';

// ============================================
// WORKFLOW SETTINGS
// ============================================

const retryPolicy: RetryPolicy = {
  maxRetries: 3,
  backoffMultiplier: 2,
  initialDelayMs: 1000,
};

const settings: WorkflowSettings = {
  executionMode: 'parallel', // Emails send simultaneously
  maxExecutionTime: 300000, // 5 minutes
  retryPolicy,
  errorHandling: 'continue', // Continue other actions if one fails
  timezone: 'America/New_York',
};

// ============================================
// WORKFLOW VARIABLES
// ============================================

const variables: WorkflowVariable[] = [
  {
    id: 'var-it-email',
    name: 'itTeamEmail',
    type: 'string',
    defaultValue: 'it-support@yourcompany.com',
    description: 'IT team distribution email address',
  },
  {
    id: 'var-slack-channel',
    name: 'criticalSlackChannel',
    type: 'string',
    defaultValue: '#it-critical-alerts',
    description: 'Slack channel for critical ticket alerts',
  },
];

// ============================================
// WORKFLOW NODES
// ============================================

const nodes: WorkflowNode[] = [
  // Trigger: Form Submission
  {
    id: 'trigger-1',
    type: 'form-trigger',
    position: { x: 100, y: 200 },
    config: {
      formId: 'YOUR_FORM_ID_HERE',
      waitForValidation: false,
      includeMetadata: true,
    },
    label: 'Form Submitted',
    enabled: true,
  },

  // Action: Send Confirmation to Requester
  {
    id: 'email-requester',
    type: 'email-send',
    position: { x: 400, y: 100 },
    config: {
      to: '{{trigger.payload.data.email}}',
      fromName: 'IT Support',
      subject: '✅ IT Support Request Received: {{trigger.payload.data.subject}}',
      body: `Hi {{trigger.payload.data.fullName}},

We've received your IT support request and a team member will review it shortly.

**Ticket Details:**
- Subject: {{trigger.payload.data.subject}}
- Category: {{trigger.payload.data.issueCategory}}
- Urgency: {{trigger.payload.data.urgencyLevel}}

**Your Description:**
{{trigger.payload.data.description}}

**What happens next:**
- Low/Medium urgency: Response within 24 hours
- High urgency: Response within 4 hours
- Critical: Immediate escalation

If this is truly urgent and you haven't heard back, call the IT Help Desk directly at ext. 4357.

Thanks,
The IT Team`,
      bodyFormat: 'markdown',
    },
    label: 'Requester Confirmation',
    notes: 'Sends confirmation email to the person who submitted the ticket',
    enabled: true,
  },

  // Action: Notify IT Team
  {
    id: 'email-it-team',
    type: 'email-send',
    position: { x: 400, y: 300 },
    config: {
      to: 'it-support@yourcompany.com',
      fromName: 'IT Help Desk',
      subject: '[{{trigger.payload.data.urgencyLevel}}] New Ticket: {{trigger.payload.data.subject}} from {{trigger.payload.data.fullName}}',
      body: `New IT support request submitted:

**Reporter:** {{trigger.payload.data.fullName}} ({{trigger.payload.data.department}})
**Contact:** {{trigger.payload.data.email}} | {{trigger.payload.data.phoneExtension}}
**Preferred Contact:** {{trigger.payload.data.preferredContactMethod}}

**Issue Details:**
- Category: {{trigger.payload.data.issueCategory}}
- Urgency: {{trigger.payload.data.urgencyLevel}}
- Subject: {{trigger.payload.data.subject}}

**Description:**
{{trigger.payload.data.description}}`,
      bodyFormat: 'markdown',
    },
    label: 'IT Team Notification',
    notes: 'Notifies the IT support team about the new ticket',
    enabled: true,
  },

  // Logic: Check if Critical
  {
    id: 'condition-critical',
    type: 'conditional',
    position: { x: 400, y: 500 },
    config: {
      conditions: [
        {
          field: 'trigger.payload.data.urgencyLevel',
          operator: 'equals',
          value: 'critical',
        },
      ],
      logicType: 'all',
    },
    label: 'Is Critical?',
    notes: 'Routes critical tickets to additional escalation',
    enabled: true,
  },

  // Action: Slack Webhook for Critical Tickets
  {
    id: 'webhook-critical',
    type: 'http-request',
    position: { x: 700, y: 450 },
    config: {
      method: 'POST',
      url: 'https://hooks.slack.com/services/YOUR_WEBHOOK_URL',
      headers: {
        'Content-Type': 'application/json',
      },
      body: '{"text": "🚨 CRITICAL IT TICKET from {{trigger.payload.data.fullName}} ({{trigger.payload.data.department}}): {{trigger.payload.data.subject}} — {{trigger.payload.data.description}}"}',
    },
    label: 'Slack Webhook',
    notes: 'Sends immediate alert to Slack for critical tickets. Replace YOUR_WEBHOOK_URL with your Slack incoming webhook URL.',
    enabled: true,
  },
];

// ============================================
// WORKFLOW EDGES (Connections)
// ============================================

const edges: WorkflowEdge[] = [
  // Trigger → Requester Confirmation (parallel)
  {
    id: 'edge-trigger-to-requester',
    source: 'trigger-1',
    sourceHandle: 'output',
    target: 'email-requester',
    targetHandle: 'input',
  },

  // Trigger → IT Team Notification (parallel)
  {
    id: 'edge-trigger-to-it-team',
    source: 'trigger-1',
    sourceHandle: 'output',
    target: 'email-it-team',
    targetHandle: 'input',
  },

  // Trigger → Critical Check (parallel)
  {
    id: 'edge-trigger-to-condition',
    source: 'trigger-1',
    sourceHandle: 'output',
    target: 'condition-critical',
    targetHandle: 'input',
  },

  // Critical Check (Yes) → Slack Webhook
  {
    id: 'edge-condition-to-webhook',
    source: 'condition-critical',
    sourceHandle: 'yes',
    target: 'webhook-critical',
    targetHandle: 'input',
    condition: {
      expression: "trigger.payload.data.urgencyLevel === 'critical'",
      label: 'Yes',
    },
  },
];

// ============================================
// WORKFLOW CANVAS
// ============================================

const canvas: WorkflowCanvas = {
  nodes,
  edges,
  viewport: {
    x: 0,
    y: 0,
    zoom: 1,
  },
};

// ============================================
// EXPORTED WORKFLOW DEFINITION
// ============================================

/**
 * IT Ticket Routing Workflow
 *
 * Automates ticket handling:
 * 1. Sends confirmation email to the requester
 * 2. Notifies the IT team (in parallel)
 * 3. Escalates critical tickets to Slack
 */
export const itTicketRoutingWorkflow: WorkflowDefinition = {
  name: 'IT Ticket Routing',
  description:
    'Automated routing workflow for IT support tickets. Sends confirmation to requester, notifies IT team, and escalates critical tickets via webhook.',
  canvas,
  settings,
  variables,
  tags: ['it-support', 'helpdesk', 'ticketing', 'automation'],
};

export default itTicketRoutingWorkflow;
