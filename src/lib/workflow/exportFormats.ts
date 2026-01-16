/**
 * Workflow Export Format Converters
 *
 * Converts NetPad workflow definitions to various formats:
 * - JSON (native)
 * - Mermaid diagram syntax
 * - n8n workflow format
 * - Make (Integromat) scenario format
 */

import { WorkflowDocument, WorkflowNode, WorkflowEdge } from '@/types/workflow';

// A minimal workflow interface that both WorkflowDocument and WorkflowDefinition satisfy
interface ExportableWorkflow {
  id?: string;
  name: string;
  description?: string;
  canvas: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  };
  status?: string;
  settings?: Record<string, unknown>;
  tags?: string[];
}

// ============================================
// Types
// ============================================

export type ExportFormat =
  | 'json'
  | 'mermaid'
  | 'mermaid-lr'  // Left to right
  | 'mermaid-tb'  // Top to bottom
  | 'n8n'
  | 'make';

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata?: boolean;
  includePositions?: boolean;
  prettyPrint?: boolean;
}

export interface ExportResult {
  content: string;
  mimeType: string;
  fileExtension: string;
  filename: string;
}

// ============================================
// Node Type Mappings for Mermaid
// ============================================

const NODE_SHAPES: Record<string, { start: string; end: string }> = {
  // Triggers - Stadium shape (rounded)
  'form-trigger': { start: '([', end: '])' },
  'schedule-trigger': { start: '([', end: '])' },
  'webhook-trigger': { start: '([', end: '])' },
  'manual-trigger': { start: '([', end: '])' },

  // Logic - Diamond shape
  'conditional': { start: '{', end: '}' },
  'switch': { start: '{', end: '}' },

  // Actions - Rectangle (default)
  'http-request': { start: '[', end: ']' },
  'mongodb-query': { start: '[(', end: ')]' },  // Cylinder for DB
  'send-email': { start: '[', end: ']' },
  'ai-generate': { start: '[[', end: ']]' },  // Subroutine shape

  // Data - Parallelogram
  'set-variable': { start: '[/', end: '/]' },
  'transform-data': { start: '[/', end: '/]' },

  // Control - Hexagon
  'delay': { start: '{{', end: '}}' },
  'loop': { start: '{{', end: '}}' },

  // Default
  'default': { start: '[', end: ']' },
};

const NODE_ICONS: Record<string, string> = {
  'form-trigger': 'fa:fa-file-alt',
  'schedule-trigger': 'fa:fa-clock',
  'webhook-trigger': 'fa:fa-bolt',
  'manual-trigger': 'fa:fa-play',
  'conditional': 'fa:fa-code-branch',
  'switch': 'fa:fa-random',
  'http-request': 'fa:fa-globe',
  'mongodb-query': 'fa:fa-database',
  'send-email': 'fa:fa-envelope',
  'ai-generate': 'fa:fa-robot',
  'set-variable': 'fa:fa-equals',
  'transform-data': 'fa:fa-exchange-alt',
  'delay': 'fa:fa-hourglass',
  'loop': 'fa:fa-redo',
};

// ============================================
// Mermaid Export
// ============================================

function sanitizeMermaidId(id: string): string {
  // Mermaid IDs must be alphanumeric with underscores
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

function sanitizeMermaidLabel(label: string): string {
  // Escape quotes and special characters
  return label
    .replace(/"/g, "'")
    .replace(/\[/g, '(')
    .replace(/\]/g, ')')
    .replace(/\{/g, '(')
    .replace(/\}/g, ')')
    .substring(0, 50); // Truncate long labels
}

function getNodeShape(nodeType: string): { start: string; end: string } {
  return NODE_SHAPES[nodeType] || NODE_SHAPES['default'];
}

export function workflowToMermaid(
  workflow: ExportableWorkflow,
  direction: 'TB' | 'LR' = 'TB'
): string {
  const lines: string[] = [];
  const { nodes, edges } = workflow.canvas;

  // Header
  lines.push(`%%{ init: { 'theme': 'dark', 'themeVariables': { 'primaryColor': '#00ED64', 'primaryTextColor': '#fff', 'primaryBorderColor': '#00ED64', 'lineColor': '#666', 'secondaryColor': '#001E2B', 'tertiaryColor': '#112733' } } }%%`);
  lines.push(`flowchart ${direction}`);
  lines.push('');

  // Add title as comment
  lines.push(`    %% Workflow: ${workflow.name}`);
  if (workflow.description) {
    lines.push(`    %% ${workflow.description}`);
  }
  lines.push('');

  // Define subgraphs for different node types
  const triggerNodes = nodes.filter(n => n.type.includes('trigger'));
  const actionNodes = nodes.filter(n => !n.type.includes('trigger') && !n.type.includes('conditional') && !n.type.includes('switch'));
  const logicNodes = nodes.filter(n => n.type.includes('conditional') || n.type.includes('switch'));

  // Add nodes with shapes
  if (triggerNodes.length > 0) {
    lines.push('    subgraph Triggers');
    lines.push('        direction TB');
    triggerNodes.forEach(node => {
      const id = sanitizeMermaidId(node.id);
      const label = sanitizeMermaidLabel(node.label || node.type);
      const shape = getNodeShape(node.type);
      lines.push(`        ${id}${shape.start}"${label}"${shape.end}`);
    });
    lines.push('    end');
    lines.push('');
  }

  // Add remaining nodes (not in subgraphs for cleaner output)
  [...logicNodes, ...actionNodes].forEach(node => {
    const id = sanitizeMermaidId(node.id);
    const label = sanitizeMermaidLabel(node.label || node.type);
    const shape = getNodeShape(node.type);
    lines.push(`    ${id}${shape.start}"${label}"${shape.end}`);
  });
  lines.push('');

  // Add edges
  lines.push('    %% Connections');
  edges.forEach(edge => {
    const sourceId = sanitizeMermaidId(edge.source);
    const targetId = sanitizeMermaidId(edge.target);

    // Determine edge label and style
    let edgeLabel = '';
    let edgeStyle = '-->';

    if (edge.condition?.label) {
      edgeLabel = `|${sanitizeMermaidLabel(edge.condition.label)}|`;
    } else if (edge.sourceHandle && edge.sourceHandle !== 'default') {
      // Use handle name as label for conditional branches
      edgeLabel = `|${edge.sourceHandle}|`;
    }

    if (edge.animated) {
      edgeStyle = '-.->'; // Dashed for animated
    }

    lines.push(`    ${sourceId} ${edgeStyle}${edgeLabel} ${targetId}`);
  });
  lines.push('');

  // Add styling
  lines.push('    %% Styling');
  lines.push('    classDef trigger fill:#00ED64,stroke:#00C853,color:#001E2B,stroke-width:2px');
  lines.push('    classDef logic fill:#FF9800,stroke:#F57C00,color:#fff,stroke-width:2px');
  lines.push('    classDef action fill:#2196F3,stroke:#1976D2,color:#fff,stroke-width:2px');
  lines.push('    classDef data fill:#9C27B0,stroke:#7B1FA2,color:#fff,stroke-width:2px');

  // Apply classes
  if (triggerNodes.length > 0) {
    lines.push(`    class ${triggerNodes.map(n => sanitizeMermaidId(n.id)).join(',')} trigger`);
  }
  if (logicNodes.length > 0) {
    lines.push(`    class ${logicNodes.map(n => sanitizeMermaidId(n.id)).join(',')} logic`);
  }
  if (actionNodes.length > 0) {
    const dataNodes = actionNodes.filter(n => n.type.includes('variable') || n.type.includes('transform'));
    const otherNodes = actionNodes.filter(n => !n.type.includes('variable') && !n.type.includes('transform'));
    if (otherNodes.length > 0) {
      lines.push(`    class ${otherNodes.map(n => sanitizeMermaidId(n.id)).join(',')} action`);
    }
    if (dataNodes.length > 0) {
      lines.push(`    class ${dataNodes.map(n => sanitizeMermaidId(n.id)).join(',')} data`);
    }
  }

  return lines.join('\n');
}

// ============================================
// n8n Export
// ============================================

const N8N_NODE_TYPES: Record<string, string> = {
  'form-trigger': 'n8n-nodes-base.formTrigger',
  'webhook-trigger': 'n8n-nodes-base.webhook',
  'schedule-trigger': 'n8n-nodes-base.scheduleTrigger',
  'manual-trigger': 'n8n-nodes-base.manualTrigger',
  'http-request': 'n8n-nodes-base.httpRequest',
  'conditional': 'n8n-nodes-base.if',
  'switch': 'n8n-nodes-base.switch',
  'send-email': 'n8n-nodes-base.emailSend',
  'set-variable': 'n8n-nodes-base.set',
  'delay': 'n8n-nodes-base.wait',
  'loop': 'n8n-nodes-base.splitInBatches',
  'mongodb-query': 'n8n-nodes-base.mongoDb',
  'ai-generate': 'n8n-nodes-base.openAi',
};

export function workflowToN8n(workflow: ExportableWorkflow): object {
  const { nodes, edges } = workflow.canvas;

  const n8nNodes = nodes.map((node, index) => {
    const n8nType = N8N_NODE_TYPES[node.type] || 'n8n-nodes-base.noOp';

    return {
      id: node.id,
      name: node.label || node.type,
      type: n8nType,
      typeVersion: 1,
      position: [node.position.x, node.position.y],
      parameters: convertNodeConfigToN8n(node),
      disabled: !node.enabled,
    };
  });

  const n8nConnections: Record<string, any> = {};

  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    if (!sourceNode) return;

    const sourceName = sourceNode.label || sourceNode.type;
    if (!n8nConnections[sourceName]) {
      n8nConnections[sourceName] = { main: [[]] };
    }

    const targetNode = nodes.find(n => n.id === edge.target);
    if (!targetNode) return;

    n8nConnections[sourceName].main[0].push({
      node: targetNode.label || targetNode.type,
      type: 'main',
      index: 0,
    });
  });

  return {
    name: workflow.name,
    nodes: n8nNodes,
    connections: n8nConnections,
    active: workflow.status === 'active',
    settings: {
      executionOrder: 'v1',
    },
    tags: workflow.tags,
    meta: {
      exportedFrom: 'NetPad',
      exportedAt: new Date().toISOString(),
      originalId: workflow.id,
    },
  };
}

function convertNodeConfigToN8n(node: WorkflowNode): Record<string, unknown> {
  // Convert NetPad node config to n8n parameters
  // This is a simplified conversion - real implementation would need
  // detailed mapping for each node type
  const config = node.config || {};

  switch (node.type) {
    case 'http-request':
      return {
        url: config.url || '',
        method: config.method || 'GET',
        headers: config.headers || {},
        body: config.body || '',
      };
    case 'conditional':
      return {
        conditions: {
          string: [{
            value1: config.leftOperand || '',
            operation: config.operator || 'equals',
            value2: config.rightOperand || '',
          }],
        },
      };
    case 'send-email':
      return {
        fromEmail: config.from || '',
        toEmail: config.to || '',
        subject: config.subject || '',
        text: config.body || '',
      };
    default:
      return config as Record<string, unknown>;
  }
}

// ============================================
// Make (Integromat) Export
// ============================================

export function workflowToMake(workflow: ExportableWorkflow): object {
  const { nodes, edges } = workflow.canvas;

  const modules = nodes.map((node, index) => ({
    id: index + 1,
    module: getMakeModuleName(node.type),
    version: 1,
    parameters: node.config || {},
    mapper: {},
    metadata: {
      designer: {
        x: node.position.x,
        y: node.position.y,
      },
    },
  }));

  const routes = edges.map(edge => {
    const sourceIndex = nodes.findIndex(n => n.id === edge.source);
    const targetIndex = nodes.findIndex(n => n.id === edge.target);
    return {
      source: sourceIndex + 1,
      target: targetIndex + 1,
    };
  });

  return {
    name: workflow.name,
    description: workflow.description || '',
    modules,
    routes,
    scheduling: workflow.settings?.schedule ? {
      type: 'interval',
      interval: 15,
    } : { type: 'manual' },
    metadata: {
      exportedFrom: 'NetPad',
      exportedAt: new Date().toISOString(),
    },
  };
}

function getMakeModuleName(nodeType: string): string {
  const mappings: Record<string, string> = {
    'form-trigger': 'gateway:CustomWebhook',
    'webhook-trigger': 'gateway:CustomWebhook',
    'http-request': 'http:ActionSendRequest',
    'conditional': 'flow:Router',
    'send-email': 'email:ActionSendEmail',
    'delay': 'flow:Sleep',
  };
  return mappings[nodeType] || 'util:NoOp';
}

// ============================================
// Main Export Function
// ============================================

export function exportWorkflow(
  workflow: ExportableWorkflow,
  options: ExportOptions
): ExportResult {
  const { format, prettyPrint = true } = options;
  const baseFilename = (workflow.name || 'workflow').toLowerCase().replace(/\s+/g, '-');

  switch (format) {
    case 'json': {
      const content = prettyPrint
        ? JSON.stringify(workflow, null, 2)
        : JSON.stringify(workflow);
      return {
        content,
        mimeType: 'application/json',
        fileExtension: 'json',
        filename: `${baseFilename}-definition.json`,
      };
    }

    case 'mermaid':
    case 'mermaid-tb': {
      const content = workflowToMermaid(workflow, 'TB');
      return {
        content,
        mimeType: 'text/plain',
        fileExtension: 'mmd',
        filename: `${baseFilename}-diagram.mmd`,
      };
    }

    case 'mermaid-lr': {
      const content = workflowToMermaid(workflow, 'LR');
      return {
        content,
        mimeType: 'text/plain',
        fileExtension: 'mmd',
        filename: `${baseFilename}-diagram.mmd`,
      };
    }

    case 'n8n': {
      const n8nWorkflow = workflowToN8n(workflow);
      const content = prettyPrint
        ? JSON.stringify(n8nWorkflow, null, 2)
        : JSON.stringify(n8nWorkflow);
      return {
        content,
        mimeType: 'application/json',
        fileExtension: 'json',
        filename: `${baseFilename}-n8n.json`,
      };
    }

    case 'make': {
      const makeScenario = workflowToMake(workflow);
      const content = prettyPrint
        ? JSON.stringify(makeScenario, null, 2)
        : JSON.stringify(makeScenario);
      return {
        content,
        mimeType: 'application/json',
        fileExtension: 'json',
        filename: `${baseFilename}-make.json`,
      };
    }

    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

// ============================================
// Format Metadata
// ============================================

export interface FormatInfo {
  id: ExportFormat;
  name: string;
  description: string;
  icon: string;
  fileExtension: string;
  supportsImport: boolean;
}

export const EXPORT_FORMATS: FormatInfo[] = [
  {
    id: 'json',
    name: 'NetPad JSON',
    description: 'Native format - can be re-imported into NetPad',
    icon: 'code',
    fileExtension: 'json',
    supportsImport: true,
  },
  {
    id: 'mermaid-tb',
    name: 'Mermaid Diagram (Top-Bottom)',
    description: 'Visual flowchart for documentation (vertical layout)',
    icon: 'account_tree',
    fileExtension: 'mmd',
    supportsImport: false,
  },
  {
    id: 'mermaid-lr',
    name: 'Mermaid Diagram (Left-Right)',
    description: 'Visual flowchart for documentation (horizontal layout)',
    icon: 'account_tree',
    fileExtension: 'mmd',
    supportsImport: false,
  },
  {
    id: 'n8n',
    name: 'n8n Workflow',
    description: 'Compatible with n8n automation platform',
    icon: 'sync_alt',
    fileExtension: 'json',
    supportsImport: false,
  },
  {
    id: 'make',
    name: 'Make (Integromat)',
    description: 'Compatible with Make automation platform',
    icon: 'hub',
    fileExtension: 'json',
    supportsImport: false,
  },
];
