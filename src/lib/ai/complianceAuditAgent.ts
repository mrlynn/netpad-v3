/**
 * Compliance Audit Agent
 *
 * Audits form configurations for compliance with data privacy regulations
 * including GDPR, HIPAA, CCPA, PCI-DSS, and SOC2.
 */

import OpenAI from 'openai';
import {
  ComplianceAuditRequest,
  ComplianceAuditResponse,
  ComplianceViolation,
  AIServiceConfig,
} from './types';
import { SYSTEM_PROMPTS, buildComplianceAuditPrompt } from './prompts';

// ============================================
// Service Configuration
// ============================================

const DEFAULT_CONFIG: Partial<AIServiceConfig> = {
  model: 'gpt-4o-mini',
  temperature: 0.2, // Lower for more consistent compliance analysis
  maxTokens: 4000,
};

// Sensitive field patterns by framework
const SENSITIVE_PATTERNS: Record<string, { patterns: string[]; framework: string }[]> = {
  ssn: [
    { patterns: ['ssn', 'social_security', 'social security'], framework: 'all' },
  ],
  health: [
    { patterns: ['diagnosis', 'medical', 'health', 'prescription', 'medication', 'symptom', 'condition', 'treatment', 'insurance_id', 'patient'], framework: 'HIPAA' },
  ],
  financial: [
    { patterns: ['credit_card', 'card_number', 'cvv', 'account_number', 'routing', 'bank', 'payment'], framework: 'PCI-DSS' },
  ],
  pii: [
    { patterns: ['name', 'email', 'phone', 'address', 'birth', 'dob', 'age', 'gender'], framework: 'GDPR' },
  ],
};

// ============================================
// Compliance Audit Agent Class
// ============================================

export class ComplianceAuditAgent {
  private client: OpenAI;
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
    });
  }

  /**
   * Audit form for compliance with specified frameworks
   */
  async audit(request: ComplianceAuditRequest): Promise<ComplianceAuditResponse> {
    try {
      // Validate request
      if (!request.form || !request.form.fieldConfigs) {
        return {
          success: false,
          error: 'Form configuration is required',
        };
      }

      if (!request.frameworks || request.frameworks.length === 0) {
        return {
          success: false,
          error: 'At least one compliance framework is required',
        };
      }

      const prompt = buildComplianceAuditPrompt(request.form, request.frameworks);

      const completion = await this.client.chat.completions.create({
        model: this.config.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.complianceAudit },
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
      const result = this.normalizeResult(parsed, request.frameworks);

      return {
        success: true,
        scores: result.scores,
        violations: result.violations,
        recommendations: result.recommendations,
        compliantAspects: result.compliantAspects,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      console.error('Compliance audit error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during audit',
      };
    }
  }

  /**
   * Quick local check for obvious compliance issues
   */
  getQuickCheck(
    form: ComplianceAuditRequest['form'],
    frameworks: ComplianceAuditRequest['frameworks']
  ): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];
    const fields = form.fieldConfigs;

    for (const field of fields) {
      const fieldLower = field.path.toLowerCase();
      const labelLower = field.label.toLowerCase();

      // Check for sensitive health data (HIPAA)
      if (frameworks.includes('HIPAA')) {
        const healthPatterns = SENSITIVE_PATTERNS.health[0].patterns;
        if (healthPatterns.some(p => fieldLower.includes(p) || labelLower.includes(p))) {
          if (!field.encryption?.enabled) {
            violations.push({
              framework: 'HIPAA',
              regulation: 'HIPAA Security Rule - Encryption',
              severity: 'critical',
              field: field.path,
              description: `Health-related field "${field.label}" is not encrypted`,
              remediation: 'Enable field-level encryption for PHI data',
            });
          }
        }
      }

      // Check for payment card data (PCI-DSS)
      if (frameworks.includes('PCI-DSS')) {
        const financialPatterns = SENSITIVE_PATTERNS.financial[0].patterns;
        if (financialPatterns.some(p => fieldLower.includes(p) || labelLower.includes(p))) {
          if (!field.encryption?.enabled) {
            violations.push({
              framework: 'PCI-DSS',
              regulation: 'PCI-DSS Requirement 3 - Protect Stored Data',
              severity: 'critical',
              field: field.path,
              description: `Payment card field "${field.label}" is not encrypted`,
              remediation: 'Enable field-level encryption for cardholder data',
            });
          }
        }
      }

      // Check for SSN (all frameworks)
      const ssnPatterns = SENSITIVE_PATTERNS.ssn[0].patterns;
      if (ssnPatterns.some(p => fieldLower.includes(p) || labelLower.includes(p))) {
        if (!field.encryption?.enabled) {
          violations.push({
            framework: frameworks[0],
            regulation: 'Data Protection - Sensitive Personal Data',
            severity: 'critical',
            field: field.path,
            description: `SSN field "${field.label}" is not encrypted`,
            remediation: 'Enable field-level encryption for SSN data',
          });
        }
      }

      // GDPR - Check for data minimization
      if (frameworks.includes('GDPR')) {
        const piiPatterns = SENSITIVE_PATTERNS.pii[0].patterns;
        const isPII = piiPatterns.some(p => fieldLower.includes(p) || labelLower.includes(p));
        if (isPII && field.required) {
          violations.push({
            framework: 'GDPR',
            regulation: 'Article 5(1)(c) - Data Minimization',
            severity: 'info',
            field: field.path,
            description: `Consider if "${field.label}" is necessary for the stated purpose`,
            remediation: 'Review if this field is essential; make optional if not required',
          });
        }
      }
    }

    return violations;
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private normalizeResult(
    raw: any,
    frameworks: ComplianceAuditRequest['frameworks']
  ): {
    scores?: Record<string, number>;
    violations?: ComplianceViolation[];
    recommendations?: string[];
    compliantAspects?: string[];
  } {
    return {
      scores: this.normalizeScores(raw.scores, frameworks),
      violations: this.normalizeViolations(raw.violations),
      recommendations: this.normalizeStringArray(raw.recommendations),
      compliantAspects: this.normalizeStringArray(raw.compliantAspects),
    };
  }

  private normalizeScores(scores: any, frameworks: string[]): Record<string, number> | undefined {
    if (!scores || typeof scores !== 'object') return undefined;

    const normalized: Record<string, number> = {};
    for (const framework of frameworks) {
      if (typeof scores[framework] === 'number') {
        normalized[framework] = Math.min(Math.max(Math.round(scores[framework]), 0), 100);
      }
    }

    return Object.keys(normalized).length > 0 ? normalized : undefined;
  }

  private normalizeViolations(violations: any[]): ComplianceViolation[] | undefined {
    if (!Array.isArray(violations)) return undefined;

    const normalized: ComplianceViolation[] = [];
    for (const v of violations) {
      if (!v || typeof v !== 'object') continue;
      const description = String(v.description || '');
      if (description.length === 0) continue;

      normalized.push({
        framework: String(v.framework || ''),
        regulation: String(v.regulation || ''),
        severity: this.normalizeSeverity(v.severity),
        field: v.field ? String(v.field) : undefined,
        description,
        remediation: String(v.remediation || ''),
      });
    }
    return normalized.length > 0 ? normalized : undefined;
  }

  private normalizeSeverity(severity: any): ComplianceViolation['severity'] {
    const validSeverities: ComplianceViolation['severity'][] = ['critical', 'warning', 'info'];
    return validSeverities.includes(severity) ? severity : 'info';
  }

  private normalizeStringArray(arr: any[]): string[] | undefined {
    if (!Array.isArray(arr)) return undefined;
    return arr
      .map(s => String(s || '').trim())
      .filter(s => s.length > 0);
  }
}

// ============================================
// Factory Function
// ============================================

export function createComplianceAuditAgent(apiKey?: string): ComplianceAuditAgent {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
  }

  return new ComplianceAuditAgent({ apiKey: key });
}
