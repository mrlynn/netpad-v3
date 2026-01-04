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
      event: 'submission.created',
      formSlug: 'it-support-request',
    },
    label: 'Form Submitted',
    enabled: true,
  },

  // Action: Send Confirmation to Requester
  {
    id: 'email-requester',
    type: 'email',
    position: { x: 400, y: 100 },
    config: {
      to: '{{email}}',
      fromName: 'IT Support',
      subject: '✅ IT Support Request Received: {{subject}}',
      body: `Hi {{fullName}},

We've received your IT support request and a team member will review it shortly.

**Ticket Details:**
- Subject: {{subject}}
- Category: {{issueCategory}}
- Urgency: {{urgencyLevel}}

**Your Description:**
{{description}}

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
    type: 'email',
    position: { x: 400, y: 300 },
    config: {
      to: 'it-support@yourcompany.com',
      fromName: 'IT Help Desk',
      subject: '[{{urgencyLevel}}] New Ticket: {{subject}} from {{fullName}}',
      body: `New IT support request submitted:

**Reporter:** {{fullName}} ({{department}})
**Contact:** {{email}} | {{phoneExtension}}
**Preferred Contact:** {{preferredContactMethod}}

**Issue Details:**
- Category: {{issueCategory}}
- Urgency: {{urgencyLevel}}
- Subject: {{subject}}

**Description:**
{{description}}

**Additional Context:**
{{#if assetId}}Asset ID: {{assetId}}{{/if}}
{{#if applicationName}}Application: {{applicationName}}{{/if}}
{{#if networkLocation}}Location: {{networkLocation}}{{/if}}`,
      bodyFormat: 'markdown',
    },
    label: 'IT Team Notification',
    notes: 'Notifies the IT support team about the new ticket',
    enabled: true,
  },

  // Logic: Check if Critical
  {
    id: 'condition-critical',
    type: 'condition',
    position: { x: 400, y: 500 },
    config: {
      conditions: [
        {
          field: 'urgencyLevel',
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

  // Action: Slack Alert for Critical Tickets
  {
    id: 'slack-critical',
    type: 'slack',
    position: { x: 700, y: 450 },
    config: {
      channel: '#it-critical-alerts',
      message:
        '🚨 CRITICAL IT TICKET from {{fullName}} ({{department}}): {{subject}} — {{description}}',
      messageFormat: 'text',
    },
    label: 'Slack Alert',
    notes: 'Sends immediate alert to Slack for critical tickets',
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

  // Critical Check (Yes) → Slack Alert
  {
    id: 'edge-condition-to-slack',
    source: 'condition-critical',
    sourceHandle: 'yes',
    target: 'slack-critical',
    targetHandle: 'input',
    condition: {
      expression: "urgencyLevel === 'critical'",
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
    'Automated routing workflow for IT support tickets. Sends confirmation to requester, notifies IT team, and escalates critical tickets to Slack.',
  canvas,
  settings,
  variables,
  tags: ['it-support', 'helpdesk', 'ticketing', 'automation'],
};

export default itTicketRoutingWorkflow;
