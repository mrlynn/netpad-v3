/**
 * Translation Agent
 *
 * Translates form content (labels, placeholders, options, etc.)
 * to multiple languages while preserving meaning and context.
 */

import OpenAI from 'openai';
import {
  TranslateFormRequest,
  TranslateFormResponse,
  TranslatedForm,
  AIServiceConfig,
} from './types';
import { SYSTEM_PROMPTS, buildTranslationPrompt } from './prompts';

// ============================================
// Service Configuration
// ============================================

const DEFAULT_CONFIG: Partial<AIServiceConfig> = {
  model: 'gpt-4o-mini',
  temperature: 0.3,
  maxTokens: 4000,
};

// Language code to name mapping
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
  ru: 'Russian',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  ar: 'Arabic',
  hi: 'Hindi',
  tr: 'Turkish',
  pl: 'Polish',
  vi: 'Vietnamese',
  th: 'Thai',
  id: 'Indonesian',
  ms: 'Malay',
  sv: 'Swedish',
  no: 'Norwegian',
  da: 'Danish',
  fi: 'Finnish',
  el: 'Greek',
  he: 'Hebrew',
  cs: 'Czech',
  hu: 'Hungarian',
  ro: 'Romanian',
  uk: 'Ukrainian',
};

// ============================================
// Translation Agent Class
// ============================================

export class TranslationAgent {
  private client: OpenAI;
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
    });
  }

  /**
   * Translate form content to specified languages
   */
  async translate(request: TranslateFormRequest): Promise<TranslateFormResponse> {
    try {
      // Validate request
      if (!request.form || !request.form.fieldConfigs) {
        return {
          success: false,
          error: 'Form configuration is required',
        };
      }

      if (!request.targetLanguages || request.targetLanguages.length === 0) {
        return {
          success: false,
          error: 'At least one target language is required',
        };
      }

      const prompt = buildTranslationPrompt(
        request.form,
        request.targetLanguages,
        request.sourceLanguage
      );

      const completion = await this.client.chat.completions.create({
        model: this.config.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.translation },
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
      const result = this.normalizeResult(parsed, request.targetLanguages);

      return {
        success: true,
        sourceLanguage: result.sourceLanguage,
        translations: result.translations,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      console.error('Translation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during translation',
      };
    }
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): Array<{ code: string; name: string }> {
    return Object.entries(LANGUAGE_NAMES).map(([code, name]) => ({ code, name }));
  }

  /**
   * Get language name from code
   */
  getLanguageName(code: string): string {
    return LANGUAGE_NAMES[code.toLowerCase()] || code;
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private normalizeResult(
    raw: any,
    targetLanguages: string[]
  ): {
    sourceLanguage?: string;
    translations?: TranslatedForm[];
  } {
    const sourceLanguage = typeof raw.sourceLanguage === 'string'
      ? raw.sourceLanguage
      : undefined;

    const translations: TranslatedForm[] = [];

    if (Array.isArray(raw.translations)) {
      for (const t of raw.translations) {
        const normalized = this.normalizeTranslation(t);
        if (normalized && targetLanguages.includes(normalized.language)) {
          translations.push(normalized);
        }
      }
    }

    return { sourceLanguage, translations };
  }

  private normalizeTranslation(raw: any): TranslatedForm | null {
    if (!raw || typeof raw !== 'object') return null;
    if (!raw.language || !raw.name) return null;

    return {
      language: String(raw.language),
      name: String(raw.name),
      description: raw.description ? String(raw.description) : undefined,
      fields: this.normalizeFields(raw.fields),
    };
  }

  private normalizeFields(fields: any[]): TranslatedForm['fields'] {
    if (!Array.isArray(fields)) return [];

    const normalized: TranslatedForm['fields'] = [];
    for (const f of fields) {
      if (!f || typeof f !== 'object') continue;
      if (!f.path || !f.label) continue;

      normalized.push({
        path: String(f.path),
        label: String(f.label),
        placeholder: f.placeholder ? String(f.placeholder) : undefined,
        helpText: f.helpText ? String(f.helpText) : undefined,
        options: this.normalizeOptions(f.options),
        errorMessage: f.errorMessage ? String(f.errorMessage) : undefined,
      });
    }
    return normalized;
  }

  private normalizeOptions(options: any[]): Array<{ label: string; value: string }> | undefined {
    if (!Array.isArray(options)) return undefined;

    return options
      .map(o => {
        if (!o || typeof o !== 'object') return null;
        return {
          label: String(o.label || ''),
          value: String(o.value || ''),
        };
      })
      .filter((o): o is { label: string; value: string } => o !== null && o.label.length > 0);
  }
}

// ============================================
// Factory Function
// ============================================

export function createTranslationAgent(apiKey?: string): TranslationAgent {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
  }

  return new TranslationAgent({ apiKey: key });
}
