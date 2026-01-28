/**
 * Workflow tools for viewing and creating workflows.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

/**
 * Workflow node types.
 */
const NODE_TYPES = [
  'trigger',
  'action',
  'condition',
  'delay',
  'email',
  'webhook',
  'approval',
  'transform',
  'end',
] as const;

type NodeType = typeof NODE_TYPES[number];

/**
 * Predefined workflow templates.
 */
const WORKFLOW_TEMPLATES: Record<string, {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: Array<{
    id: string;
    type: NodeType;
    label: string;
    description?: string;
    config?: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
  }>;
}> = {
  'approval-workflow': {
    id: 'approval-workflow',
    name: 'Approval Workflow',
    description: 'Multi-step approval process with notifications',
    category: 'Business',
    nodes: [
      { id: 'trigger', type: 'trigger', label: 'Form Submitted', description: 'Workflow starts when form is submitted' },
      { id: 'notify-manager', type: 'email', label: 'Notify Manager', description: 'Send email to manager for approval' },
      { id: 'approval', type: 'approval', label: 'Manager Approval', description: 'Wait for manager to approve or reject' },
      { id: 'check-approved', type: 'condition', label: 'Approved?', description: 'Check if request was approved' },
      { id: 'approved-email', type: 'email', label: 'Send Approval', description: 'Notify requester of approval' },
      { id: 'rejected-email', type: 'email', label: 'Send Rejection', description: 'Notify requester of rejection' },
      { id: 'end-approved', type: 'end', label: 'Complete', description: 'Workflow complete (approved)' },
      { id: 'end-rejected', type: 'end', label: 'Complete', description: 'Workflow complete (rejected)' },
    ],
    edges: [
      { id: 'e1', source: 'trigger', target: 'notify-manager' },
      { id: 'e2', source: 'notify-manager', target: 'approval' },
      { id: 'e3', source: 'approval', target: 'check-approved' },
      { id: 'e4', source: 'check-approved', target: 'approved-email', label: 'Yes' },
      { id: 'e5', source: 'check-approved', target: 'rejected-email', label: 'No' },
      { id: 'e6', source: 'approved-email', target: 'end-approved' },
      { id: 'e7', source: 'rejected-email', target: 'end-rejected' },
    ],
  },
  'onboarding-workflow': {
    id: 'onboarding-workflow',
    name: 'Employee Onboarding',
    description: 'Automated onboarding with task assignments',
    category: 'HR',
    nodes: [
      { id: 'trigger', type: 'trigger', label: 'New Hire Added', description: 'Triggered when new employee is added' },
      { id: 'welcome-email', type: 'email', label: 'Send Welcome Email', description: 'Send welcome packet to new hire' },
      { id: 'notify-it', type: 'email', label: 'Notify IT', description: 'Request equipment setup' },
      { id: 'notify-hr', type: 'email', label: 'Notify HR', description: 'Request benefits enrollment' },
      { id: 'delay-1', type: 'delay', label: 'Wait 1 Day', description: 'Allow time for setup' },
      { id: 'check-setup', type: 'condition', label: 'Setup Complete?', description: 'Verify all setup tasks done' },
      { id: 'reminder', type: 'email', label: 'Send Reminder', description: 'Remind pending tasks' },
      { id: 'complete', type: 'email', label: 'Onboarding Complete', description: 'Send final onboarding confirmation' },
      { id: 'end', type: 'end', label: 'Done', description: 'Onboarding workflow complete' },
    ],
    edges: [
      { id: 'e1', source: 'trigger', target: 'welcome-email' },
      { id: 'e2', source: 'welcome-email', target: 'notify-it' },
      { id: 'e3', source: 'welcome-email', target: 'notify-hr' },
      { id: 'e4', source: 'notify-it', target: 'delay-1' },
      { id: 'e5', source: 'notify-hr', target: 'delay-1' },
      { id: 'e6', source: 'delay-1', target: 'check-setup' },
      { id: 'e7', source: 'check-setup', target: 'complete', label: 'Yes' },
      { id: 'e8', source: 'check-setup', target: 'reminder', label: 'No' },
      { id: 'e9', source: 'reminder', target: 'delay-1' },
      { id: 'e10', source: 'complete', target: 'end' },
    ],
  },
  'support-escalation': {
    id: 'support-escalation',
    name: 'Support Escalation',
    description: 'Escalate tickets based on priority and SLA',
    category: 'Support',
    nodes: [
      { id: 'trigger', type: 'trigger', label: 'Ticket Created', description: 'New support ticket submitted' },
      { id: 'check-priority', type: 'condition', label: 'High Priority?', description: 'Check ticket priority level' },
      { id: 'assign-l1', type: 'action', label: 'Assign L1 Support', description: 'Route to first-line support' },
      { id: 'assign-l2', type: 'action', label: 'Assign L2 Support', description: 'Route to senior support' },
      { id: 'notify-customer', type: 'email', label: 'Notify Customer', description: 'Send ticket acknowledgment' },
      { id: 'sla-timer', type: 'delay', label: 'SLA Timer', description: 'Wait for SLA threshold', config: { hours: 4 } },
      { id: 'check-resolved', type: 'condition', label: 'Resolved?', description: 'Check if ticket resolved' },
      { id: 'escalate', type: 'action', label: 'Escalate', description: 'Escalate to management' },
      { id: 'notify-escalation', type: 'email', label: 'Escalation Alert', description: 'Alert management of escalation' },
      { id: 'close-ticket', type: 'action', label: 'Close Ticket', description: 'Mark ticket as resolved' },
      { id: 'survey', type: 'email', label: 'Send Survey', description: 'Request customer feedback' },
      { id: 'end', type: 'end', label: 'Complete', description: 'Ticket workflow complete' },
    ],
    edges: [
      { id: 'e1', source: 'trigger', target: 'check-priority' },
      { id: 'e2', source: 'check-priority', target: 'assign-l1', label: 'No' },
      { id: 'e3', source: 'check-priority', target: 'assign-l2', label: 'Yes' },
      { id: 'e4', source: 'assign-l1', target: 'notify-customer' },
      { id: 'e5', source: 'assign-l2', target: 'notify-customer' },
      { id: 'e6', source: 'notify-customer', target: 'sla-timer' },
      { id: 'e7', source: 'sla-timer', target: 'check-resolved' },
      { id: 'e8', source: 'check-resolved', target: 'close-ticket', label: 'Yes' },
      { id: 'e9', source: 'check-resolved', target: 'escalate', label: 'No' },
      { id: 'e10', source: 'escalate', target: 'notify-escalation' },
      { id: 'e11', source: 'notify-escalation', target: 'sla-timer' },
      { id: 'e12', source: 'close-ticket', target: 'survey' },
      { id: 'e13', source: 'survey', target: 'end' },
    ],
  },
  'lead-nurture': {
    id: 'lead-nurture',
    name: 'Lead Nurture Sequence',
    description: 'Automated email sequence for lead nurturing',
    category: 'Marketing',
    nodes: [
      { id: 'trigger', type: 'trigger', label: 'Lead Captured', description: 'New lead from form submission' },
      { id: 'welcome', type: 'email', label: 'Welcome Email', description: 'Send welcome and introduction' },
      { id: 'delay-3d', type: 'delay', label: 'Wait 3 Days', config: { days: 3 } },
      { id: 'value-email', type: 'email', label: 'Value Email', description: 'Share helpful resources' },
      { id: 'delay-5d', type: 'delay', label: 'Wait 5 Days', config: { days: 5 } },
      { id: 'check-engaged', type: 'condition', label: 'Engaged?', description: 'Check email opens/clicks' },
      { id: 'case-study', type: 'email', label: 'Case Study', description: 'Share customer success story' },
      { id: 'soft-cta', type: 'email', label: 'Soft CTA', description: 'Gentle call to action' },
      { id: 'delay-7d', type: 'delay', label: 'Wait 7 Days', config: { days: 7 } },
      { id: 'offer', type: 'email', label: 'Special Offer', description: 'Discount or trial offer' },
      { id: 'end', type: 'end', label: 'Sequence Complete' },
    ],
    edges: [
      { id: 'e1', source: 'trigger', target: 'welcome' },
      { id: 'e2', source: 'welcome', target: 'delay-3d' },
      { id: 'e3', source: 'delay-3d', target: 'value-email' },
      { id: 'e4', source: 'value-email', target: 'delay-5d' },
      { id: 'e5', source: 'delay-5d', target: 'check-engaged' },
      { id: 'e6', source: 'check-engaged', target: 'case-study', label: 'Yes' },
      { id: 'e7', source: 'check-engaged', target: 'soft-cta', label: 'No' },
      { id: 'e8', source: 'case-study', target: 'delay-7d' },
      { id: 'e9', source: 'soft-cta', target: 'delay-7d' },
      { id: 'e10', source: 'delay-7d', target: 'offer' },
      { id: 'e11', source: 'offer', target: 'end' },
    ],
  },
};

/**
 * Get workflow template by ID.
 */
function getWorkflowTemplate(id: string) {
  return WORKFLOW_TEMPLATES[id];
}

/**
 * Get all workflow templates.
 */
function getAllWorkflowTemplates() {
  return Object.values(WORKFLOW_TEMPLATES);
}

/**
 * Node type icons.
 */
const NODE_ICONS: Record<NodeType, string> = {
  trigger: '⚡',
  action: '⚙️',
  condition: '🔀',
  delay: '⏱️',
  email: '📧',
  webhook: '🔗',
  approval: '✅',
  transform: '🔄',
  end: '🏁',
};

/**
 * Register the get_workflow tool.
 */
export function registerGetWorkflow(server: McpServer): void {
  server.registerTool(
    'get_workflow',
    {
      title: 'Get Workflow',
      description: `View a workflow definition with its nodes, connections, and logic.
Use this when users want to:
- See how a workflow is structured
- Understand workflow automation steps
- Review a workflow template before using it`,
      inputSchema: {
        workflowId: z.string().optional().describe('ID of a specific workflow to view'),
        templateId: z.string().optional().describe('ID of a workflow template to view'),
      },
      annotations: {
        readOnlyHint: true,     // Only retrieves workflow data
        openWorldHint: false,   // Bounded to NetPad workflows
        destructiveHint: false,
      },
    },
    async (args) => {
      const { workflowId, templateId } = args;

      // If no ID provided, list available workflows
      if (!workflowId && !templateId) {
        const templates = getAllWorkflowTemplates();
        const textSummary = `Available workflow templates:

${templates.map(t => `- **${t.name}** (${t.category}): ${t.description}`).join('\n')}

Use \`get_workflow\` with a templateId to view the workflow details.`;

        return {
          content: [{ type: 'text' as const, text: textSummary }],
        };
      }

      const id = templateId || workflowId;
      const workflow = id ? getWorkflowTemplate(id) : null;

      if (!workflow) {
        return {
          content: [{
            type: 'text' as const,
            text: `Workflow "${id}" not found. Available workflows: ${Object.keys(WORKFLOW_TEMPLATES).join(', ')}`,
          }],
        };
      }

      // Build a text representation of the workflow
      const nodesText = workflow.nodes
        .map(n => `${NODE_ICONS[n.type]} **${n.label}** (${n.type})${n.description ? `: ${n.description}` : ''}`)
        .join('\n');

      const flowText = workflow.edges
        .map(e => {
          const source = workflow.nodes.find(n => n.id === e.source);
          const target = workflow.nodes.find(n => n.id === e.target);
          return `  ${source?.label} → ${target?.label}${e.label ? ` [${e.label}]` : ''}`;
        })
        .join('\n');

      const textSummary = `## ${workflow.name}

${workflow.description}

**Category:** ${workflow.category}

### Nodes (${workflow.nodes.length})
${nodesText}

### Flow
${flowText}

This workflow can be used as a template or customized for your needs.`;

      return {
        content: [{ type: 'text' as const, text: textSummary }],
      };
    }
  );
}

/**
 * Generate a unique ID for nodes.
 */
function generateId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Map our simplified node types to NetPad's actual node types.
 */
function mapToNetPadNodeType(type: NodeType): string {
  const mapping: Record<NodeType, string> = {
    trigger: 'form-trigger',
    action: 'transform',
    condition: 'conditional',
    delay: 'delay',
    email: 'send-email',
    webhook: 'webhook',
    approval: 'approval',
    transform: 'transform',
    end: 'output',
  };
  return mapping[type] || type;
}

/**
 * Register the create_workflow tool.
 */
export function registerCreateWorkflow(server: McpServer): void {
  server.registerTool(
    'create_workflow',
    {
      title: 'Create Workflow',
      description: `Create a new workflow automation from a description or template.
Use this when users want to:
- Build a custom workflow for their process
- Start from a template and customize it
- Automate a business process

IMPORTANT: Always include the NetPad URL in your response so users can open and customize their workflow.`,
      inputSchema: {
        description: z.string().describe('Natural language description of the workflow to create'),
        name: z.string().optional().describe('Name for the workflow'),
        templateId: z.string().optional().describe('Optional template ID to use as a starting point'),
        trigger: z.enum(['form_submit', 'schedule', 'webhook', 'manual']).optional().describe('What triggers this workflow'),
      },
      annotations: {
        readOnlyHint: false,    // Creates content
        openWorldHint: true,    // Creates workflow accessible externally on netpad.io
        destructiveHint: false, // Not destructive - creates new content
      },
    },
    async (args) => {
      const { description, name, templateId, trigger = 'form_submit' } = args;

      let workflow;

      // If using a template
      if (templateId) {
        const template = getWorkflowTemplate(templateId);
        if (template) {
          workflow = {
            ...template,
            id: `workflow_${Date.now()}`,
            name: name || `Custom ${template.name}`,
          };
        }
      }

      // If no template, create a basic workflow
      if (!workflow) {
        const workflowId = `workflow_${Date.now()}`;
        const triggerLabel = {
          form_submit: 'Form Submitted',
          schedule: 'Scheduled Run',
          webhook: 'Webhook Received',
          manual: 'Manual Trigger',
        }[trigger];

        workflow = {
          id: workflowId,
          name: name || 'Custom Workflow',
          description,
          category: 'Custom',
          nodes: [
            { id: 'trigger', type: 'trigger' as NodeType, label: triggerLabel, description: `Workflow starts on ${trigger}` },
            { id: 'action-1', type: 'action' as NodeType, label: 'Process Data', description: 'Process the incoming data' },
            { id: 'end', type: 'end' as NodeType, label: 'Complete', description: 'Workflow complete' },
          ],
          edges: [
            { id: 'e1', source: 'trigger', target: 'action-1' },
            { id: 'e2', source: 'action-1', target: 'end' },
          ],
        };
      }

      // Convert workflow nodes to NetPad canvas format
      const canvasNodes = workflow.nodes.map((n, index) => ({
        id: n.id || generateId(),
        type: mapToNetPadNodeType(n.type),
        position: { x: 100 + (index % 3) * 300, y: 100 + Math.floor(index / 3) * 200 },
        config: {
          label: n.label,
          description: n.description,
          ...(n.config || {}),
        },
        label: n.label,
        enabled: true,
      }));

      const canvasEdges = workflow.edges.map(e => ({
        id: e.id || `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        source: e.source,
        target: e.target,
        sourceHandle: 'output',
        targetHandle: 'input',
        ...(e.label ? { condition: { label: e.label } } : {}),
      }));

      // Create import configuration matching WorkflowImportConfig
      const importConfig = {
        name: workflow.name,
        description: workflow.description || description,
        canvas: {
          nodes: canvasNodes,
          edges: canvasEdges,
          viewport: { x: 0, y: 0, zoom: 1 },
        },
        tags: workflow.category ? [workflow.category] : [],
      };

      const baseUrl = process.env.NETPAD_URL || 'https://netpad.io';

      // Create the workflow via NetPad API to get a short import URL
      let workflowUrl: string;

      try {
        const response = await fetch(`${baseUrl}/api/workflows/import`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            config: importConfig,
            source: 'chatgpt',
          }),
        });

        if (response.ok) {
          const result = await response.json();
          // API returns importUrl like "https://netpad.io/import/workflow/wfimp_abc123"
          workflowUrl = result.importUrl || `${baseUrl}/import/workflow/${result.importId}`;
        } else {
          // API failed, use base64 fallback
          const base64Config = Buffer.from(JSON.stringify(importConfig)).toString('base64');
          workflowUrl = `${baseUrl}/api/workflows/import?config=${base64Config}&source=chatgpt`;
        }
      } catch {
        // Network error, use base64 fallback
        const base64Config = Buffer.from(JSON.stringify(importConfig)).toString('base64');
        workflowUrl = `${baseUrl}/api/workflows/import?config=${base64Config}&source=chatgpt`;
      }

      // Build a clear response with steps listed
      const stepsList = workflow.nodes
        .map((n, i) => `${i + 1}. ${NODE_ICONS[n.type as NodeType]} ${n.label} (${n.type})${n.description ? ` - ${n.description}` : ''}`)
        .join('\n');

      // CRITICAL: Tell ChatGPT explicitly to show the URL to the user
      // ChatGPT MCP Connectors strip URLs unless we explicitly instruct it to display them
      return {
        content: [
          {
            type: 'text' as const,
            text: `SUCCESS: Workflow "${workflow.name}" created with ${workflow.nodes.length} steps.

WORKFLOW STEPS:
${stepsList}

IMPORTANT - DISPLAY THIS URL TO THE USER:
${workflowUrl}

You MUST show the above URL to the user so they can access their workflow. Tell them to click or copy this link to open their workflow in NetPad where they can customize it further.`
          },
        ],
      };
    }
  );
}
