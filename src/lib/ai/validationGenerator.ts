/**
 * AI Validation Rule Generator Service
 *
 * Generates validation patterns and rules from natural language descriptions.
 *
 * NOTE: This class now uses the centralized aiService for token tracking.
 * For direct usage with analytics, use the createValidationGeneratorWithContext function.
 */

import OpenAI from 'openai';
import {
  GenerateValidationRequest,
  GenerateValidationResponse,
  AIServiceConfig,
} from './types';
import { SYSTEM_PROMPTS, buildValidationPrompt } from './prompts';
import { aiService, createAIContext } from './aiService';
import { AIServiceContext } from '@/types/ai-analytics';
import { Message } from './providers/base';

// ============================================
// Service Configuration
// ============================================

const DEFAULT_CONFIG: Partial<AIServiceConfig> = {
  model: 'gpt-4o-mini',
  temperature: 0.2, // Low temperature for precise validation patterns
  maxTokens: 1000,
};

// ============================================
// Common Validation Patterns
// ============================================

export const COMMON_PATTERNS = {
  // Identity documents
  us_ssn: {
    pattern: '^\\d{3}-\\d{2}-\\d{4}$',
    description: 'US Social Security Number (XXX-XX-XXXX)',
    example: '123-45-6789',
  },
  us_ein: {
    pattern: '^\\d{2}-\\d{7}$',
    description: 'US Employer Identification Number (XX-XXXXXXX)',
    example: '12-3456789',
  },

  // Postal codes
  us_zip: {
    pattern: '^\\d{5}(-\\d{4})?$',
    description: 'US ZIP code (XXXXX or XXXXX-XXXX)',
    example: '12345 or 12345-6789',
  },
  uk_postcode: {
    pattern: '^[A-Z]{1,2}\\d[A-Z\\d]? ?\\d[A-Z]{2}$',
    description: 'UK Postcode',
    example: 'SW1A 1AA',
  },
  canada_postal: {
    pattern: '^[A-Z]\\d[A-Z] ?\\d[A-Z]\\d$',
    description: 'Canadian Postal Code',
    example: 'K1A 0B1',
  },

  // ID formats
  employee_id_alpha_num: {
    pattern: '^[A-Z]{2}\\d{4,6}$',
    description: 'Employee ID (2 letters + 4-6 digits)',
    example: 'AB1234',
  },
  product_code: {
    pattern: '^[A-Z]{3}-\\d{3}-[A-Z]$',
    description: 'Product Code (XXX-NNN-X)',
    example: 'PRD-001-A',
  },
  order_number: {
    pattern: '^ORD-\\d{8}$',
    description: 'Order Number (ORD-XXXXXXXX)',
    example: 'ORD-12345678',
  },
  invoice_number: {
    pattern: '^INV-\\d{4}-\\d{6}$',
    description: 'Invoice Number (INV-YYYY-NNNNNN)',
    example: 'INV-2024-000001',
  },

  // Credit cards (for display/validation only, not storage)
  credit_card: {
    pattern: '^\\d{4}[- ]?\\d{4}[- ]?\\d{4}[- ]?\\d{4}$',
    description: 'Credit Card Number',
    example: '1234-5678-9012-3456',
  },

  // Time formats
  time_24h: {
    pattern: '^([01]\\d|2[0-3]):[0-5]\\d$',
    description: '24-hour time (HH:MM)',
    example: '14:30',
  },
  time_12h: {
    pattern: '^(0?[1-9]|1[0-2]):[0-5]\\d (AM|PM)$',
    description: '12-hour time (H:MM AM/PM)',
    example: '2:30 PM',
  },

  // Web/tech
  ip_v4: {
    pattern: '^((25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)\\.){3}(25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)$',
    description: 'IPv4 Address',
    example: '192.168.1.1',
  },
  mac_address: {
    pattern: '^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$',
    description: 'MAC Address',
    example: '00:1A:2B:3C:4D:5E',
  },
  hex_color: {
    pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
    description: 'Hexadecimal Color',
    example: '#FF5500',
  },

  // Common text patterns
  alphanumeric: {
    pattern: '^[A-Za-z0-9]+$',
    description: 'Letters and numbers only',
    example: 'Abc123',
  },
  letters_only: {
    pattern: '^[A-Za-z]+$',
    description: 'Letters only (no numbers or special characters)',
    example: 'Hello',
  },
  no_special_chars: {
    pattern: '^[A-Za-z0-9\\s]+$',
    description: 'Letters, numbers, and spaces only',
    example: 'Hello World 123',
  },
  username: {
    pattern: '^[a-zA-Z][a-zA-Z0-9_]{2,19}$',
    description: 'Username (3-20 chars, starts with letter)',
    example: 'john_doe123',
  },
  slug: {
    pattern: '^[a-z0-9]+(-[a-z0-9]+)*$',
    description: 'URL slug (lowercase, hyphen-separated)',
    example: 'my-blog-post',
  },
};

// ============================================
// Validation Generator Class
// ============================================

export class ValidationGenerator {
  private client: OpenAI | null = null;
  private config: AIServiceConfig;
  private aiContext: AIServiceContext | null = null;

  constructor(config: AIServiceConfig, aiContext?: AIServiceContext) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.aiContext = aiContext || null;

    // Only create OpenAI client if not using centralized service
    if (!aiContext && config.apiKey) {
      this.client = new OpenAI({
        apiKey: config.apiKey,
      });
    }
  }

  /**
   * Generate validation rules from natural language description
   */
  async generateValidation(
    request: GenerateValidationRequest
  ): Promise<GenerateValidationResponse> {
    try {
      // First, check if this matches a common pattern
      const commonPattern = this.findCommonPattern(request.description);
      if (commonPattern) {
        return this.buildResponseFromCommonPattern(commonPattern, request.field);
      }

      // Otherwise, use AI to generate the pattern
      const prompt = buildValidationPrompt(request.field, request.description);

      const messages: Message[] = [
        { role: 'system', content: SYSTEM_PROMPTS.validationGenerator },
        { role: 'user', content: prompt },
      ];

      let responseText: string;

      // Use centralized aiService if context is provided (with analytics tracking)
      if (this.aiContext) {
        const result = await aiService.complete(this.aiContext, messages, {
          model: this.config.model,
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
          responseFormat: { type: 'json_object' },
        });

        if (!result.success || !result.data) {
          return {
            success: false,
            error: result.error || 'No response from AI model',
          };
        }

        responseText = result.data;
      } else {
        // Fallback to direct OpenAI client (legacy path without analytics)
        if (!this.client) {
          return {
            success: false,
            error: 'OpenAI client not configured',
          };
        }

        const completion = await this.client.chat.completions.create({
          model: this.config.model || 'gpt-4o-mini',
          messages: messages.map((m) => ({
            role: m.role as 'system' | 'user' | 'assistant',
            content: m.content,
          })),
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          response_format: { type: 'json_object' },
        });

        responseText = completion.choices[0]?.message?.content || '';
      }

      if (!responseText) {
        return {
          success: false,
          error: 'No response from AI model',
        };
      }

      const parsed = JSON.parse(responseText);

      // Validate the generated pattern
      if (parsed.pattern) {
        const patternValidation = this.validatePattern(parsed.pattern);
        if (!patternValidation.valid) {
          return {
            success: false,
            error: `Generated pattern is invalid: ${patternValidation.error}`,
          };
        }
      }

      return {
        success: true,
        pattern: parsed.pattern,
        errorMessage:
          parsed.errorMessage || this.generateErrorMessage(request.field.label, request.description),
        constraints: parsed.constraints,
        testCases: parsed.testCases || [],
      };
    } catch (error) {
      console.error('Validation generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during validation generation',
      };
    }
  }

  /**
   * Get a list of common validation patterns
   */
  getCommonPatterns(): typeof COMMON_PATTERNS {
    return COMMON_PATTERNS;
  }

  /**
   * Apply a common pattern by key
   */
  applyCommonPattern(
    patternKey: keyof typeof COMMON_PATTERNS,
    field: { path: string; label: string }
  ): GenerateValidationResponse {
    const pattern = COMMON_PATTERNS[patternKey];
    if (!pattern) {
      return {
        success: false,
        error: `Unknown pattern: ${patternKey}`,
      };
    }

    return {
      success: true,
      pattern: pattern.pattern,
      errorMessage: `${field.label} must match the format: ${pattern.description}`,
      testCases: [
        {
          input: pattern.example,
          shouldPass: true,
          description: `Valid ${pattern.description}`,
        },
        {
          input: 'invalid',
          shouldPass: false,
          description: 'Invalid format',
        },
      ],
    };
  }

  /**
   * Validate an input against a pattern
   */
  testPattern(pattern: string, input: string): { valid: boolean; error?: string } {
    try {
      const regex = new RegExp(pattern);
      const matches = regex.test(input);
      return { valid: matches };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid pattern',
      };
    }
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Find a matching common pattern based on description
   */
  private findCommonPattern(
    description: string
  ): { key: string; pattern: (typeof COMMON_PATTERNS)[keyof typeof COMMON_PATTERNS] } | null {
    const desc = description.toLowerCase();

    // Check for SSN
    if (desc.includes('ssn') || desc.includes('social security')) {
      return { key: 'us_ssn', pattern: COMMON_PATTERNS.us_ssn };
    }

    // Check for ZIP code
    if (desc.includes('zip') || (desc.includes('postal') && desc.includes('us'))) {
      return { key: 'us_zip', pattern: COMMON_PATTERNS.us_zip };
    }

    // Check for UK postcode
    if (desc.includes('uk') && desc.includes('post')) {
      return { key: 'uk_postcode', pattern: COMMON_PATTERNS.uk_postcode };
    }

    // Check for Canadian postal code
    if (desc.includes('canad') && desc.includes('postal')) {
      return { key: 'canada_postal', pattern: COMMON_PATTERNS.canada_postal };
    }

    // Check for employee ID
    if (
      desc.includes('employee id') ||
      (desc.includes('2 letter') && desc.includes('digit'))
    ) {
      return { key: 'employee_id_alpha_num', pattern: COMMON_PATTERNS.employee_id_alpha_num };
    }

    // Check for product code
    if (desc.includes('product code')) {
      return { key: 'product_code', pattern: COMMON_PATTERNS.product_code };
    }

    // Check for order number
    if (desc.includes('order number') || desc.includes('order id')) {
      return { key: 'order_number', pattern: COMMON_PATTERNS.order_number };
    }

    // Check for IP address
    if (desc.includes('ip address') || desc.includes('ipv4')) {
      return { key: 'ip_v4', pattern: COMMON_PATTERNS.ip_v4 };
    }

    // Check for MAC address
    if (desc.includes('mac address')) {
      return { key: 'mac_address', pattern: COMMON_PATTERNS.mac_address };
    }

    // Check for hex color
    if (desc.includes('hex color') || desc.includes('color code')) {
      return { key: 'hex_color', pattern: COMMON_PATTERNS.hex_color };
    }

    // Check for alphanumeric
    if (desc.includes('alphanumeric') || desc.includes('letters and numbers only')) {
      return { key: 'alphanumeric', pattern: COMMON_PATTERNS.alphanumeric };
    }

    // Check for username
    if (desc.includes('username')) {
      return { key: 'username', pattern: COMMON_PATTERNS.username };
    }

    // Check for slug
    if (desc.includes('slug') || desc.includes('url-friendly')) {
      return { key: 'slug', pattern: COMMON_PATTERNS.slug };
    }

    return null;
  }

  /**
   * Build response from a common pattern
   */
  private buildResponseFromCommonPattern(
    match: { key: string; pattern: (typeof COMMON_PATTERNS)[keyof typeof COMMON_PATTERNS] },
    field: { path: string; label: string }
  ): GenerateValidationResponse {
    return {
      success: true,
      pattern: match.pattern.pattern,
      errorMessage: `${field.label} must match the format: ${match.pattern.description}`,
      testCases: [
        {
          input: match.pattern.example,
          shouldPass: true,
          description: `Valid ${match.pattern.description}`,
        },
        {
          input: 'invalid_input',
          shouldPass: false,
          description: 'Invalid format',
        },
      ],
    };
  }

  /**
   * Validate that a regex pattern is valid
   */
  private validatePattern(pattern: string): { valid: boolean; error?: string } {
    try {
      new RegExp(pattern);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid regex pattern',
      };
    }
  }

  /**
   * Generate a default error message
   */
  private generateErrorMessage(fieldLabel: string, description: string): string {
    return `${fieldLabel} does not match the required format. ${description}`;
  }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a ValidationGenerator instance with default configuration
 *
 * @deprecated Use createValidationGeneratorWithContext for analytics tracking
 */
export function createValidationGenerator(apiKey?: string): ValidationGenerator {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
  }

  return new ValidationGenerator({ apiKey: key });
}

/**
 * Create a ValidationGenerator instance with AI context for centralized analytics tracking
 */
export function createValidationGeneratorWithContext(
  userId: string,
  orgId: string,
  isGuest: boolean = false
): ValidationGenerator {
  const aiContext = createAIContext(
    userId,
    orgId,
    'ai_validation_patterns',
    '/api/ai/generate-validation',
    isGuest
  );

  return new ValidationGenerator({ apiKey: '' }, aiContext);
}
