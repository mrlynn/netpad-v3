/**
 * AI Application Generator Service
 *
 * Generates complete applications (metadata, form, and workflow) from natural language descriptions using OpenAI.
 */

import OpenAI from 'openai';
import {
  GenerateApplicationRequest,
  GenerateApplicationResponse,
  GeneratedApplication,
  AIServiceConfig,
} from './types';
import { SYSTEM_PROMPTS, buildApplicationGenerationPrompt } from './prompts';
import { FormConfiguration } from '@/types/form';
import { GeneratedWorkflow } from './types';

// ============================================
// Service Configuration
// ============================================

const DEFAULT_CONFIG: Partial<AIServiceConfig> = {
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 6000, // Higher limit for complete applications
};

// ============================================
// Application Generator Class
// ============================================

export class ApplicationGenerator {
  private client: OpenAI;
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
    });
  }

  /**
   * Generate a complete application from a natural language description
   */
  async generateApplication(
    request: GenerateApplicationRequest
  ): Promise<GenerateApplicationResponse> {
    try {
      const prompt = buildApplicationGenerationPrompt(
        request.prompt,
        {
          industry: request.context?.industry,
          audience: request.context?.audience,
        },
        {
          includeForm: request.options?.includeForm !== false,
          includeWorkflow: request.options?.includeWorkflow !== false,
          maxFields: request.options?.maxFields,
          maxNodes: request.options?.maxNodes,
        }
      );

      const completion = await this.client.chat.completions.create({
        model: this.config.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.applicationGenerator },
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

      // Parse the generated application
      let generatedData: any;
      try {
        generatedData = JSON.parse(responseText);
      } catch (parseError) {
        return {
          success: false,
          confidence: 0,
          error: 'Failed to parse AI response as JSON',
        };
      }

      // Validate and normalize the application structure
      const normalizedApplication = this.normalizeApplication(generatedData);

      // Calculate confidence based on completeness
      const confidence = this.calculateConfidence(normalizedApplication);

      // Extract token usage
      const usage = completion.usage
        ? {
            promptTokens: completion.usage.prompt_tokens,
            completionTokens: completion.usage.completion_tokens,
            totalTokens: completion.usage.total_tokens,
          }
        : undefined;

      return {
        success: true,
        application: normalizedApplication,
        confidence,
        usage,
      };
    } catch (error) {
      console.error('Application generation error:', error);
      return {
        success: false,
        confidence: 0,
        error:
          error instanceof Error ? error.message : 'Unknown error during generation',
      };
    }
  }

  /**
   * Normalize and validate the generated application structure
   */
  private normalizeApplication(data: any): GeneratedApplication {
    const application: GeneratedApplication = {
      application: {
        name: data.application?.name || 'Generated Application',
        description: data.application?.description,
        tags: Array.isArray(data.application?.tags) ? data.application.tags : [],
        version: data.application?.version || '1.0.0',
        color: data.application?.color || '#00ED64',
      },
    };

    // Normalize form if present
    if (data.form) {
      application.form = this.normalizeForm(data.form);
    }

    // Normalize workflow if present
    if (data.workflow) {
      application.workflow = this.normalizeWorkflow(data.workflow);
    }

    return application;
  }

  /**
   * Normalize form configuration
   */
  private normalizeForm(formData: any): Partial<FormConfiguration> {
    const form: Partial<FormConfiguration> = {
      name: formData.name || 'Generated Form',
      description: formData.description,
      fieldConfigs: [],
    };

    if (Array.isArray(formData.fieldConfigs)) {
      form.fieldConfigs = formData.fieldConfigs.map((field: any) => ({
        path: field.path || `field_${Date.now()}_${Math.random()}`,
        label: field.label || 'Untitled Field',
        type: field.type || 'short_text',
        required: field.required === true,
        included: field.included !== false,
        placeholder: field.placeholder,
        helpText: field.helpText,
        validation: field.validation,
        encryption: field.encryption,
      }));
    }

    return form;
  }

  /**
   * Normalize workflow configuration
   */
  private normalizeWorkflow(workflowData: any): GeneratedWorkflow {
    // Helper to map generic node types to supported NetPad workflow node types
    const mapNodeType = (rawType: string | undefined): string => {
      const type = (rawType || '').toLowerCase();

      // Triggers
      if (type === 'form_submission' || type === 'form-submission' || type === 'form_trigger') {
        return 'form-trigger';
      }

      // Data persistence
      if (
        type === 'save-data' ||
        type === 'savedata' ||
        type === 'db-write' ||
        type === 'database-write' ||
        type === 'mongo-write' ||
        type === 'mongodb-save'
      ) {
        return 'mongodb-write';
      }

      // Email / notification
      if (
        type === 'send-email' ||
        type === 'email' ||
        type === 'email_notification' ||
        type === 'email-send'
      ) {
        return 'email-send';
      }

      // Fallback to known core types, otherwise pass through
      return type || 'manual-trigger';
    };

    const workflow: GeneratedWorkflow = {
      name: workflowData.name || 'Generated Workflow',
      description: workflowData.description,
      nodes: [],
      edges: [],
      settings: workflowData.settings || {
        executionMode: 'sequential',
        errorHandling: 'stop',
      },
    };

    if (Array.isArray(workflowData.nodes)) {
      workflow.nodes = workflowData.nodes.map((node: any, index: number) => ({
        tempId: node.tempId || `node_${index}`,
        type: mapNodeType(node.type),
        label: node.label || 'Untitled Node',
        position: node.position || { x: 250, y: 100 + index * 150 },
        config: node.config || {},
        enabled: node.enabled !== false,
      }));
    }

    if (Array.isArray(workflowData.edges)) {
      workflow.edges = workflowData.edges.map((edge: any) => ({
        sourceTempId: edge.sourceTempId,
        sourceHandle: edge.sourceHandle || 'output',
        targetTempId: edge.targetTempId,
        targetHandle: edge.targetHandle || 'input',
        condition: edge.condition,
      }));
    }

    return workflow;
  }

  /**
   * Calculate confidence score based on completeness
   */
  private calculateConfidence(application: GeneratedApplication): number {
    let score = 0;
    let maxScore = 0;

    // Application metadata (required)
    maxScore += 2;
    if (application.application.name) score += 1;
    if (application.application.description) score += 1;

    // Form (if included)
    if (application.form) {
      maxScore += 3;
      if (application.form.name) score += 1;
      if (application.form.fieldConfigs && application.form.fieldConfigs.length > 0) {
        score += 1;
      }
      if (application.form.fieldConfigs && application.form.fieldConfigs.length >= 3) {
        score += 1; // Bonus for having multiple fields
      }
    }

    // Workflow (if included)
    if (application.workflow) {
      maxScore += 3;
      if (application.workflow.name) score += 1;
      if (application.workflow.nodes && application.workflow.nodes.length > 0) {
        score += 1;
      }
      if (application.workflow.nodes && application.workflow.nodes.length >= 2) {
        score += 1; // Bonus for having multiple nodes
      }
    }

    return maxScore > 0 ? Math.min(score / maxScore, 1) : 0;
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create an ApplicationGenerator instance
 */
export function createApplicationGenerator(apiKey: string): ApplicationGenerator {
  return new ApplicationGenerator({ apiKey });
}
