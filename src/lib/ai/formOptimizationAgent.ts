/**
 * Form Optimization Agent
 *
 * Analyzes form configurations and suggests improvements to increase
 * completion rates and user experience.
 */

import OpenAI from 'openai';
import {
  FormOptimizationRequest,
  FormOptimizationResponse,
  OptimizationIssue,
  AIServiceConfig,
} from './types';
import { SYSTEM_PROMPTS, buildFormOptimizationPrompt } from './prompts';

// ============================================
// Service Configuration
// ============================================

const DEFAULT_CONFIG: Partial<AIServiceConfig> = {
  model: 'gpt-4o-mini',
  temperature: 0.4,
  maxTokens: 3000,
};

// ============================================
// Form Optimization Agent Class
// ============================================

export class FormOptimizationAgent {
  private client: OpenAI;
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
    });
  }

  /**
   * Analyze form and generate optimization suggestions
   */
  async analyze(request: FormOptimizationRequest): Promise<FormOptimizationResponse> {
    try {
      // Validate form has fields
      if (!request.form.fieldConfigs || request.form.fieldConfigs.length === 0) {
        return {
          success: false,
          error: 'Form has no fields to analyze',
        };
      }

      const prompt = buildFormOptimizationPrompt(request.form, request.responseStats);

      const completion = await this.client.chat.completions.create({
        model: this.config.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.formOptimization },
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
          error: 'No response from AI model',
        };
      }

      // Parse and normalize the response
      const parsed = JSON.parse(responseText);
      const result = this.normalizeResult(parsed);

      return {
        success: true,
        score: result.score,
        issues: result.issues,
        quickWins: result.quickWins,
        reorderSuggestions: result.reorderSuggestions,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      console.error('Form optimization analysis error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during analysis',
      };
    }
  }

  /**
   * Quick local analysis without AI
   */
  getQuickAnalysis(form: FormOptimizationRequest['form']): OptimizationIssue[] {
    const issues: OptimizationIssue[] = [];
    const fields = form.fieldConfigs;

    // Check form length
    if (fields.length > 15) {
      issues.push({
        type: 'conversion',
        severity: 'warning',
        description: `Form has ${fields.length} fields which may cause abandonment`,
        recommendation: 'Consider breaking into multiple steps or removing optional fields',
        estimatedImpact: 15,
      });
    }

    // Check for all required fields
    const requiredCount = fields.filter(f => f.required).length;
    if (requiredCount === fields.length && fields.length > 5) {
      issues.push({
        type: 'conversion',
        severity: 'warning',
        description: 'All fields are required',
        recommendation: 'Make some fields optional to reduce friction',
        estimatedImpact: 10,
      });
    }

    // Check for missing placeholders
    const textFields = fields.filter(f =>
      ['short_text', 'long_text', 'email', 'phone', 'url'].includes(f.type)
    );
    const missingPlaceholders = textFields.filter(f => !f.placeholder);
    if (missingPlaceholders.length > 0) {
      issues.push({
        type: 'ux',
        severity: 'suggestion',
        description: `${missingPlaceholders.length} text fields are missing placeholder examples`,
        recommendation: 'Add placeholder text to help users understand expected input',
        estimatedImpact: 5,
      });
    }

    // Check field ordering (email/name should come first)
    const emailIndex = fields.findIndex(f => f.type === 'email');
    const nameIndex = fields.findIndex(f =>
      f.label.toLowerCase().includes('name') && f.type === 'short_text'
    );
    if (emailIndex > 3 || (nameIndex > 0 && nameIndex > emailIndex)) {
      issues.push({
        type: 'ux',
        severity: 'suggestion',
        description: 'Contact fields should appear early in the form',
        recommendation: 'Move name and email fields to the beginning',
        estimatedImpact: 5,
      });
    }

    return issues;
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private normalizeResult(raw: any): {
    score?: number;
    issues?: OptimizationIssue[];
    quickWins?: string[];
    reorderSuggestions?: Array<{ from: number; to: number; reason: string }>;
  } {
    return {
      score: this.normalizeScore(raw.score),
      issues: this.normalizeIssues(raw.issues),
      quickWins: this.normalizeQuickWins(raw.quickWins),
      reorderSuggestions: this.normalizeReorderSuggestions(raw.reorderSuggestions),
    };
  }

  private normalizeScore(score: any): number | undefined {
    if (typeof score !== 'number') return undefined;
    return Math.min(Math.max(Math.round(score), 0), 100);
  }

  private normalizeIssues(issues: any[]): OptimizationIssue[] | undefined {
    if (!Array.isArray(issues)) return undefined;

    const normalized: OptimizationIssue[] = [];
    for (const i of issues) {
      if (!i || typeof i !== 'object') continue;
      const description = String(i.description || '');
      if (description.length === 0) continue;

      normalized.push({
        type: this.normalizeIssueType(i.type),
        severity: this.normalizeSeverity(i.severity),
        field: typeof i.field === 'string' ? i.field : undefined,
        description,
        recommendation: String(i.recommendation || ''),
        estimatedImpact: typeof i.estimatedImpact === 'number'
          ? Math.min(Math.max(i.estimatedImpact, 0), 100)
          : 0,
      });
    }
    return normalized.length > 0 ? normalized : undefined;
  }

  private normalizeIssueType(type: any): OptimizationIssue['type'] {
    const validTypes: OptimizationIssue['type'][] = ['ux', 'conversion', 'accessibility', 'mobile', 'performance'];
    return validTypes.includes(type) ? type : 'ux';
  }

  private normalizeSeverity(severity: any): OptimizationIssue['severity'] {
    const validSeverities: OptimizationIssue['severity'][] = ['critical', 'warning', 'suggestion'];
    return validSeverities.includes(severity) ? severity : 'suggestion';
  }

  private normalizeQuickWins(quickWins: any[]): string[] | undefined {
    if (!Array.isArray(quickWins)) return undefined;
    return quickWins
      .map(q => String(q || '').trim())
      .filter(q => q.length > 0);
  }

  private normalizeReorderSuggestions(suggestions: any[]): Array<{ from: number; to: number; reason: string }> | undefined {
    if (!Array.isArray(suggestions)) return undefined;

    return suggestions
      .map(s => {
        if (!s || typeof s !== 'object') return null;
        if (typeof s.from !== 'number' || typeof s.to !== 'number') return null;
        return {
          from: s.from,
          to: s.to,
          reason: String(s.reason || ''),
        };
      })
      .filter((s): s is { from: number; to: number; reason: string } => s !== null);
  }
}

// ============================================
// Factory Function
// ============================================

export function createFormOptimizationAgent(apiKey?: string): FormOptimizationAgent {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
  }

  return new FormOptimizationAgent({ apiKey: key });
}
