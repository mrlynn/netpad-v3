/**
 * Response Insights Agent
 *
 * Analyzes form responses to surface patterns, anomalies, trends, and actionable insights.
 */

import OpenAI from 'openai';
import {
  ResponseInsightsRequest,
  ResponseInsightsResponse,
  ResponsePattern,
  ResponseAnomaly,
  ResponseTrend,
  AIServiceConfig,
} from './types';
import { SYSTEM_PROMPTS, buildResponseInsightsPrompt } from './prompts';

// ============================================
// Service Configuration
// ============================================

const DEFAULT_CONFIG: Partial<AIServiceConfig> = {
  model: 'gpt-4o-mini',
  temperature: 0.5,
  maxTokens: 4000,
};

// ============================================
// Response Insights Agent Class
// ============================================

export class ResponseInsightsAgent {
  private client: OpenAI;
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
    });
  }

  /**
   * Analyze form responses and generate insights
   */
  async analyze(request: ResponseInsightsRequest): Promise<ResponseInsightsResponse> {
    try {
      // Validate we have responses to analyze
      if (!request.responses || request.responses.length === 0) {
        return {
          success: false,
          error: 'No responses provided for analysis',
        };
      }

      // Limit responses to prevent token overflow
      const responseSample = request.responses.slice(0, 100);

      const prompt = buildResponseInsightsPrompt(
        request.form,
        responseSample,
        request.focusAreas,
        request.timeRange
      );

      const completion = await this.client.chat.completions.create({
        model: this.config.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.responseInsights },
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

      // Parse the response
      const parsed = JSON.parse(responseText);

      // Normalize and validate the response
      const insights = this.normalizeInsights(parsed);

      return {
        success: true,
        summary: insights.summary,
        patterns: insights.patterns,
        anomalies: insights.anomalies,
        trends: insights.trends,
        qualityScore: insights.qualityScore,
        recommendations: insights.recommendations,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      console.error('Response insights analysis error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during analysis',
      };
    }
  }

  /**
   * Perform quick statistical analysis without AI
   */
  getQuickStats(
    responses: Array<Record<string, unknown>>,
    fieldConfigs: Array<{ path: string; label: string; type: string; required?: boolean }>
  ): {
    totalResponses: number;
    completionRate: number;
    fieldStats: Record<string, { filled: number; empty: number; uniqueValues: number }>;
  } {
    const stats: Record<string, { filled: number; empty: number; uniqueValues: Set<string> }> = {};

    // Initialize stats for each field
    for (const field of fieldConfigs) {
      stats[field.path] = { filled: 0, empty: 0, uniqueValues: new Set() };
    }

    // Calculate stats
    for (const response of responses) {
      for (const field of fieldConfigs) {
        const value = this.getNestedValue(response, field.path);
        if (this.isEmpty(value)) {
          stats[field.path].empty++;
        } else {
          stats[field.path].filled++;
          stats[field.path].uniqueValues.add(String(value));
        }
      }
    }

    // Calculate completion rate (responses with all required fields filled)
    const requiredFields = fieldConfigs.filter(f => f.required);
    let completeResponses = 0;
    for (const response of responses) {
      const allRequiredFilled = requiredFields.every(field => {
        const value = this.getNestedValue(response, field.path);
        return !this.isEmpty(value);
      });
      if (allRequiredFilled) completeResponses++;
    }

    return {
      totalResponses: responses.length,
      completionRate: responses.length > 0 ? completeResponses / responses.length : 0,
      fieldStats: Object.fromEntries(
        Object.entries(stats).map(([path, s]) => [
          path,
          { filled: s.filled, empty: s.empty, uniqueValues: s.uniqueValues.size },
        ])
      ),
    };
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Normalize and validate insights from AI response
   */
  private normalizeInsights(raw: any): {
    summary?: string;
    patterns?: ResponsePattern[];
    anomalies?: ResponseAnomaly[];
    trends?: ResponseTrend[];
    qualityScore?: number;
    recommendations?: string[];
  } {
    return {
      summary: typeof raw.summary === 'string' ? raw.summary : undefined,
      patterns: this.normalizePatterns(raw.patterns),
      anomalies: this.normalizeAnomalies(raw.anomalies),
      trends: this.normalizeTrends(raw.trends),
      qualityScore: this.normalizeScore(raw.qualityScore),
      recommendations: this.normalizeRecommendations(raw.recommendations),
    };
  }

  private normalizePatterns(patterns: any[]): ResponsePattern[] | undefined {
    if (!Array.isArray(patterns)) return undefined;

    return patterns
      .map(p => {
        if (!p || typeof p !== 'object') return null;
        return {
          description: String(p.description || ''),
          fields: Array.isArray(p.fields) ? p.fields.map(String) : [],
          frequency: typeof p.frequency === 'number' ? p.frequency : 0,
          examples: Array.isArray(p.examples) ? p.examples : [],
          type: this.normalizePatternType(p.type),
        };
      })
      .filter((p): p is ResponsePattern => p !== null && p.description.length > 0);
  }

  private normalizePatternType(type: any): ResponsePattern['type'] {
    const validTypes: ResponsePattern['type'][] = ['common_value', 'correlation', 'sequence', 'timing'];
    return validTypes.includes(type) ? type : 'common_value';
  }

  private normalizeAnomalies(anomalies: any[]): ResponseAnomaly[] | undefined {
    if (!Array.isArray(anomalies)) return undefined;

    return anomalies
      .map(a => {
        if (!a || typeof a !== 'object') return null;
        return {
          description: String(a.description || ''),
          fields: Array.isArray(a.fields) ? a.fields.map(String) : [],
          severity: this.normalizeSeverity(a.severity),
          affectedResponses: Array.isArray(a.affectedResponses) ? a.affectedResponses.map(String) : [],
          type: this.normalizeAnomalyType(a.type),
        };
      })
      .filter((a): a is ResponseAnomaly => a !== null && a.description.length > 0);
  }

  private normalizeSeverity(severity: any): 'low' | 'medium' | 'high' {
    const validSeverities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
    return validSeverities.includes(severity) ? severity : 'low';
  }

  private normalizeAnomalyType(type: any): ResponseAnomaly['type'] {
    const validTypes: ResponseAnomaly['type'][] = ['outlier', 'duplicate', 'spam', 'incomplete', 'invalid'];
    return validTypes.includes(type) ? type : 'outlier';
  }

  private normalizeTrends(trends: any[]): ResponseTrend[] | undefined {
    if (!Array.isArray(trends)) return undefined;

    return trends
      .map(t => {
        if (!t || typeof t !== 'object') return null;
        return {
          metric: String(t.metric || ''),
          direction: this.normalizeTrendDirection(t.direction),
          change: typeof t.change === 'number' ? t.change : 0,
          description: String(t.description || ''),
        };
      })
      .filter((t): t is ResponseTrend => t !== null && t.metric.length > 0);
  }

  private normalizeTrendDirection(direction: any): ResponseTrend['direction'] {
    const validDirections: ResponseTrend['direction'][] = ['increasing', 'decreasing', 'stable'];
    return validDirections.includes(direction) ? direction : 'stable';
  }

  private normalizeScore(score: any): number | undefined {
    if (typeof score !== 'number') return undefined;
    return Math.min(Math.max(Math.round(score), 0), 100);
  }

  private normalizeRecommendations(recommendations: any[]): string[] | undefined {
    if (!Array.isArray(recommendations)) return undefined;
    return recommendations
      .map(r => String(r || '').trim())
      .filter(r => r.length > 0);
  }

  /**
   * Get nested value from an object using dot notation path
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: any, key) => {
      return current && typeof current === 'object' ? current[key] : undefined;
    }, obj);
  }

  /**
   * Check if a value is considered empty
   */
  private isEmpty(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    return false;
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a ResponseInsightsAgent instance
 */
export function createResponseInsightsAgent(apiKey?: string): ResponseInsightsAgent {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
  }

  return new ResponseInsightsAgent({ apiKey: key });
}
