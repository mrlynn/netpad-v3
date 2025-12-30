/**
 * AI Workflow Generator Service
 *
 * Generates workflow configurations from natural language descriptions using OpenAI.
 */

import OpenAI from 'openai';
import {
  GenerateWorkflowRequest,
  GenerateWorkflowResponse,
  GeneratedWorkflow,
  GeneratedWorkflowNode,
  GeneratedWorkflowEdge,
  AIServiceConfig,
} from './types';
import { SYSTEM_PROMPTS, buildWorkflowGenerationPrompt } from './prompts';

// ============================================
// Service Configuration
// ============================================

const DEFAULT_CONFIG: Partial<AIServiceConfig> = {
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 4000,
};

// Valid node types that the AI can generate
const VALID_NODE_TYPES = [
  // Triggers
  'manual-trigger',
  'form-trigger',
  'webhook-trigger',
  'schedule-trigger',
  // Logic
  'conditional',
  'loop',
  'delay',
  // Integrations
  'http-request',
  'mongodb-query',
  'mongodb-write',
  // Actions
  'email-send',
  'notification',
  // Data
  'transform',
  'filter',
  'merge',
  // AI
  'ai-prompt',
  'ai-classify',
  'ai-extract',
];

// ============================================
// Workflow Generator Class
// ============================================

export class WorkflowGenerator {
  private client: OpenAI;
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
    });
  }

  /**
   * Generate a workflow from a natural language description
   */
  async generateWorkflow(request: GenerateWorkflowRequest): Promise<GenerateWorkflowResponse> {
    try {
      const prompt = buildWorkflowGenerationPrompt(request.prompt, {
        industry: request.context?.industry,
        availableForms: request.context?.availableForms,
        availableConnections: request.context?.availableConnections,
        preferredTrigger: request.options?.preferredTrigger,
        maxNodes: request.options?.maxNodes,
      });

      const completion = await this.client.chat.completions.create({
        model: this.config.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.workflowGenerator },
          { role: 'user', content: prompt },
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        response_format: { type: 'json_object' },
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        return {
          success: false,
          confidence: 0,
          error: 'No response from AI model',
        };
      }

      // Parse the generated workflow
      const generatedWorkflow = JSON.parse(responseText);

      // Validate and normalize the workflow configuration
      const normalizedWorkflow = this.normalizeWorkflowConfiguration(generatedWorkflow);

      // Validate that the workflow has at least one trigger
      const hasTrigger = normalizedWorkflow.nodes.some((node) =>
        node.type.endsWith('-trigger')
      );
      if (!hasTrigger) {
        return {
          success: false,
          confidence: 0,
          error: 'Generated workflow must have at least one trigger node',
        };
      }

      return {
        success: true,
        workflow: normalizedWorkflow,
        confidence: this.calculateConfidence(normalizedWorkflow),
        suggestions: this.generateSuggestions(normalizedWorkflow),
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      console.error('Workflow generation error:', error);
      return {
        success: false,
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error during workflow generation',
      };
    }
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Normalize and validate the generated workflow configuration
   */
  private normalizeWorkflowConfiguration(generated: any): GeneratedWorkflow {
    const workflow: GeneratedWorkflow = {
      name: generated.name || 'Generated Workflow',
      description: generated.description || '',
      nodes: [],
      edges: [],
      settings: {
        executionMode: generated.settings?.executionMode || 'sequential',
        errorHandling: generated.settings?.errorHandling || 'stop',
      },
    };

    // Normalize each node
    if (Array.isArray(generated.nodes)) {
      workflow.nodes = generated.nodes.map((node: any, index: number) =>
        this.normalizeNode(node, index)
      );
    }

    // Normalize each edge
    if (Array.isArray(generated.edges)) {
      workflow.edges = generated.edges.map((edge: any) => this.normalizeEdge(edge));
    }

    return workflow;
  }

  /**
   * Normalize a single node configuration
   */
  private normalizeNode(node: any, index: number): GeneratedWorkflowNode {
    // Validate node type
    let nodeType = node.type || 'manual-trigger';
    if (!VALID_NODE_TYPES.includes(nodeType)) {
      // Try to map common variations
      nodeType = this.mapNodeType(nodeType);
    }

    return {
      tempId: node.tempId || `node_${index + 1}`,
      type: nodeType,
      label: node.label || this.generateNodeLabel(nodeType),
      position: {
        x: node.position?.x ?? 250,
        y: node.position?.y ?? (100 + index * 150),
      },
      config: node.config || {},
      enabled: node.enabled !== false,
    };
  }

  /**
   * Normalize a single edge configuration
   */
  private normalizeEdge(edge: any): GeneratedWorkflowEdge {
    return {
      sourceTempId: edge.sourceTempId || edge.source || '',
      sourceHandle: edge.sourceHandle || 'output',
      targetTempId: edge.targetTempId || edge.target || '',
      targetHandle: edge.targetHandle || 'input',
      condition: edge.condition,
    };
  }

  /**
   * Map common node type variations to valid types
   */
  private mapNodeType(type: string): string {
    const mappings: Record<string, string> = {
      // Trigger variations
      'trigger': 'manual-trigger',
      'start': 'manual-trigger',
      'manual': 'manual-trigger',
      'form': 'form-trigger',
      'webhook': 'webhook-trigger',
      'schedule': 'schedule-trigger',
      'cron': 'schedule-trigger',
      // Logic variations
      'if': 'conditional',
      'ifelse': 'conditional',
      'if-else': 'conditional',
      'branch': 'conditional',
      'wait': 'delay',
      'for-each': 'loop',
      'foreach': 'loop',
      // Integration variations
      'http': 'http-request',
      'api': 'http-request',
      'rest': 'http-request',
      'mongo': 'mongodb-query',
      'database': 'mongodb-query',
      'db-query': 'mongodb-query',
      'db-write': 'mongodb-write',
      // Action variations
      'email': 'email-send',
      'send-email': 'email-send',
      'notify': 'notification',
      'push': 'notification',
      // Data variations
      'map': 'transform',
      'convert': 'transform',
      // AI variations
      'ai': 'ai-prompt',
      'gpt': 'ai-prompt',
      'llm': 'ai-prompt',
      'classify': 'ai-classify',
      'extract': 'ai-extract',
    };

    const normalized = type.toLowerCase().replace(/[_\s]/g, '-');
    return mappings[normalized] || 'manual-trigger';
  }

  /**
   * Generate a default label for a node type
   */
  private generateNodeLabel(type: string): string {
    const labels: Record<string, string> = {
      'manual-trigger': 'Manual Start',
      'form-trigger': 'Form Submission',
      'webhook-trigger': 'Webhook',
      'schedule-trigger': 'Schedule',
      'conditional': 'If/Else',
      'loop': 'Loop',
      'delay': 'Delay',
      'http-request': 'HTTP Request',
      'mongodb-query': 'Query Database',
      'mongodb-write': 'Write to Database',
      'email-send': 'Send Email',
      'notification': 'Send Notification',
      'transform': 'Transform Data',
      'filter': 'Filter',
      'merge': 'Merge',
      'ai-prompt': 'AI Prompt',
      'ai-classify': 'AI Classify',
      'ai-extract': 'AI Extract',
    };

    return labels[type] || type.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  }

  /**
   * Calculate confidence score for generated workflow
   */
  private calculateConfidence(workflow: GeneratedWorkflow): number {
    let score = 0.5; // Base score

    // Has a valid trigger
    const hasTrigger = workflow.nodes.some((n) => n.type.endsWith('-trigger'));
    if (hasTrigger) {
      score += 0.15;
    }

    // Has reasonable number of nodes (3-7 is ideal)
    const nodeCount = workflow.nodes.length;
    if (nodeCount >= 2 && nodeCount <= 10) {
      score += 0.15;
    }

    // Has edges connecting nodes
    if (workflow.edges.length > 0) {
      score += 0.1;
    }

    // Has name and description
    if (workflow.name && workflow.name !== 'Generated Workflow') {
      score += 0.05;
    }
    if (workflow.description) {
      score += 0.05;
    }

    return Math.min(score, 1);
  }

  /**
   * Generate suggestions for improving the workflow
   */
  private generateSuggestions(workflow: GeneratedWorkflow): string[] {
    const suggestions: string[] = [];
    const nodes = workflow.nodes;

    // Check for error handling
    const hasErrorHandling = workflow.settings?.errorHandling === 'continue';
    if (!hasErrorHandling && nodes.length > 3) {
      suggestions.push(
        'Consider setting errorHandling to "continue" for more resilient workflows.'
      );
    }

    // Check for delay nodes in long workflows
    const hasDelay = nodes.some((n) => n.type === 'delay');
    if (!hasDelay && nodes.length > 5) {
      suggestions.push(
        'Consider adding delay nodes between actions to avoid rate limiting issues.'
      );
    }

    // Check for notification/email in workflows without them
    const hasNotification = nodes.some((n) =>
      ['email-send', 'notification'].includes(n.type)
    );
    if (!hasNotification && nodes.length > 2) {
      suggestions.push(
        'Consider adding email or notification nodes to alert users of workflow completion.'
      );
    }

    // Check for conditional logic in complex workflows
    const hasConditional = nodes.some((n) => n.type === 'conditional');
    if (!hasConditional && nodes.length > 4) {
      suggestions.push(
        'Complex workflows often benefit from conditional branching to handle different scenarios.'
      );
    }

    return suggestions;
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a WorkflowGenerator instance with default configuration
 */
export function createWorkflowGenerator(apiKey?: string): WorkflowGenerator {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
  }

  return new WorkflowGenerator({ apiKey: key });
}
