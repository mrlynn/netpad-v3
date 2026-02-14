/**
 * Tests for AI Completion Hints Generator
 *
 * Tests the CompletionHintsGenerator class including:
 * - Local hints (email domains, name prefixes, phone country codes)
 * - Hint normalization and validation
 * - Short input rejection
 * - AI-powered hint generation (mocked)
 */

import { CompletionHintsGenerator, createCompletionHintsGenerator } from '@/lib/ai/completionHints';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    })),
  };
});

describe('CompletionHintsGenerator', () => {
  let generator: CompletionHintsGenerator;

  beforeEach(() => {
    generator = new CompletionHintsGenerator({ apiKey: 'test-key' });
  });

  // ==========================================
  // getLocalHints - Email Domain Completion
  // ==========================================
  describe('getLocalHints - email domains', () => {
    it('should suggest email domains after @', () => {
      const hints = generator.getLocalHints('email', 'user@g', 'Email');
      expect(hints.length).toBeGreaterThan(0);
      expect(hints[0].value).toBe('user@gmail.com');
    });

    it('should match multiple domains', () => {
      const hints = generator.getLocalHints('email', 'user@', 'Email');
      expect(hints.length).toBe(5); // all common domains
    });

    it('should match outlook', () => {
      const hints = generator.getLocalHints('email', 'user@out', 'Email');
      expect(hints.some(h => h.value === 'user@outlook.com')).toBe(true);
    });

    it('should return no email hints without @', () => {
      const hints = generator.getLocalHints('email', 'user', 'Email');
      expect(hints.length).toBe(0);
    });

    it('should return no email hints for non-email fields', () => {
      const hints = generator.getLocalHints('short_text', 'user@g', 'Username');
      expect(hints.length).toBe(0);
    });

    it('should preserve the local part of the email', () => {
      const hints = generator.getLocalHints('email', 'john.doe@y', 'Email');
      expect(hints[0].value).toContain('john.doe@');
    });

    it('should set confidence to 0.8 for email hints', () => {
      const hints = generator.getLocalHints('email', 'a@g', 'Email');
      hints.forEach(h => expect(h.confidence).toBe(0.8));
    });
  });

  // ==========================================
  // getLocalHints - Name Prefixes
  // ==========================================
  describe('getLocalHints - name prefixes', () => {
    it('should suggest name prefixes for name fields', () => {
      const hints = generator.getLocalHints('short_text', 'mr', 'Full Name');
      expect(hints.length).toBe(3); // Mr., Mrs., Ms.
    });

    it('should suggest Dr. for "dr" input', () => {
      const hints = generator.getLocalHints('short_text', 'dr', 'Name');
      expect(hints.some(h => h.value === 'Dr.')).toBe(true);
    });

    it('should suggest Prof. for "prof" input', () => {
      const hints = generator.getLocalHints('short_text', 'prof', 'Name');
      expect(hints.some(h => h.value === 'Prof.')).toBe(true);
    });

    it('should not suggest name prefixes for non-name fields', () => {
      const hints = generator.getLocalHints('short_text', 'mr', 'City');
      expect(hints.length).toBe(0);
    });

    it('should set confidence to 0.7 for name hints', () => {
      const hints = generator.getLocalHints('short_text', 'dr', 'Name');
      hints.forEach(h => expect(h.confidence).toBe(0.7));
    });

    it('should be case-insensitive for field label matching', () => {
      const hints = generator.getLocalHints('short_text', 'mr', 'FULL NAME');
      expect(hints.length).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // getLocalHints - Phone Country Codes
  // ==========================================
  describe('getLocalHints - phone country codes', () => {
    it('should suggest country codes starting with +', () => {
      const hints = generator.getLocalHints('phone', '+', 'Phone');
      expect(hints.length).toBeGreaterThan(0);
    });

    it('should filter country codes by prefix', () => {
      const hints = generator.getLocalHints('phone', '+4', 'Phone');
      const codes = hints.map(h => h.value.trim());
      expect(codes).toContain('+44');
      expect(codes).toContain('+49');
    });

    it('should show US/Canada for +1', () => {
      const hints = generator.getLocalHints('phone', '+1', 'Phone');
      expect(hints.some(h => h.displayText.includes('US/Canada'))).toBe(true);
    });

    it('should set confidence to 0.9 for phone hints', () => {
      const hints = generator.getLocalHints('phone', '+', 'Phone');
      hints.forEach(h => expect(h.confidence).toBe(0.9));
    });

    it('should not suggest codes without + prefix', () => {
      const hints = generator.getLocalHints('phone', '1', 'Phone');
      expect(hints.length).toBe(0);
    });

    it('should limit results to 5', () => {
      const hints = generator.getLocalHints('phone', '+', 'Phone');
      expect(hints.length).toBeLessThanOrEqual(5);
    });
  });

  // ==========================================
  // getLocalHints - Edge Cases
  // ==========================================
  describe('getLocalHints - edge cases', () => {
    it('should return empty array for unknown field types', () => {
      const hints = generator.getLocalHints('rating', '5', 'Rating');
      expect(hints).toEqual([]);
    });

    it('should return empty array for empty input', () => {
      const hints = generator.getLocalHints('email', '', 'Email');
      expect(hints).toEqual([]);
    });
  });

  // ==========================================
  // generateHints - AI-powered
  // ==========================================
  describe('generateHints', () => {
    it('should return empty hints for very short input (< 2 chars)', async () => {
      const result = await generator.generateHints({
        fieldType: 'short_text',
        partialValue: 'a',
        fieldLabel: 'City',
      });
      expect(result.success).toBe(true);
      expect(result.hints).toEqual([]);
    });

    it('should return empty hints for single character', async () => {
      const result = await generator.generateHints({
        fieldType: 'email',
        partialValue: 'x',
        fieldLabel: 'Email',
      });
      expect(result.success).toBe(true);
      expect(result.hints.length).toBe(0);
    });

    it('should call AI for inputs >= 2 chars', async () => {
      const OpenAI = require('openai').default;
      const mockCreate = jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              hints: [
                { value: 'New York', displayText: 'New York', confidence: 0.9 },
                { value: 'New Jersey', displayText: 'New Jersey', confidence: 0.8 },
              ],
            }),
          },
        }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      });

      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: mockCreate } },
      }));

      const gen = new CompletionHintsGenerator({ apiKey: 'test-key' });
      const result = await gen.generateHints({
        fieldType: 'short_text',
        partialValue: 'New',
        fieldLabel: 'City',
      });

      expect(result.success).toBe(true);
      expect(result.hints.length).toBe(2);
      expect(result.hints[0].value).toBe('New York');
      expect(result.usage?.totalTokens).toBe(15);
    });

    it('should handle AI returning empty response', async () => {
      const OpenAI = require('openai').default;
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: null } }],
            }),
          },
        },
      }));

      const gen = new CompletionHintsGenerator({ apiKey: 'test-key' });
      const result = await gen.generateHints({
        fieldType: 'short_text',
        partialValue: 'test',
        fieldLabel: 'Name',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No response');
    });

    it('should handle AI errors gracefully', async () => {
      const OpenAI = require('openai').default;
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('API rate limit')),
          },
        },
      }));

      const gen = new CompletionHintsGenerator({ apiKey: 'test-key' });
      const result = await gen.generateHints({
        fieldType: 'short_text',
        partialValue: 'test',
        fieldLabel: 'Name',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('API rate limit');
    });

    it('should deduplicate hints (case-insensitive)', async () => {
      const OpenAI = require('openai').default;
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify({
                    hints: [
                      { value: 'Test Value', confidence: 0.9 },
                      { value: 'test value', confidence: 0.8 },
                      { value: 'TEST VALUE', confidence: 0.7 },
                    ],
                  }),
                },
              }],
              usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
            }),
          },
        },
      }));

      const gen = new CompletionHintsGenerator({ apiKey: 'test-key' });
      const result = await gen.generateHints({
        fieldType: 'short_text',
        partialValue: 'test',
        fieldLabel: 'Field',
      });

      expect(result.hints.length).toBe(1);
    });

    it('should filter out hints that do not match partial value', async () => {
      const OpenAI = require('openai').default;
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify({
                    hints: [
                      { value: 'New York', confidence: 0.9 },
                      { value: 'Los Angeles', confidence: 0.8 }, // doesn't match "new"
                    ],
                  }),
                },
              }],
              usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
            }),
          },
        },
      }));

      const gen = new CompletionHintsGenerator({ apiKey: 'test-key' });
      const result = await gen.generateHints({
        fieldType: 'short_text',
        partialValue: 'new',
        fieldLabel: 'City',
      });

      expect(result.hints.length).toBe(1);
      expect(result.hints[0].value).toBe('New York');
    });

    it('should sort hints by confidence descending', async () => {
      const OpenAI = require('openai').default;
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify({
                    hints: [
                      { value: 'testing low', confidence: 0.3 },
                      { value: 'testing high', confidence: 0.95 },
                      { value: 'testing mid', confidence: 0.6 },
                    ],
                  }),
                },
              }],
              usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
            }),
          },
        },
      }));

      const gen = new CompletionHintsGenerator({ apiKey: 'test-key' });
      const result = await gen.generateHints({
        fieldType: 'short_text',
        partialValue: 'testing',
        fieldLabel: 'Field',
      });

      expect(result.hints[0].confidence).toBeGreaterThanOrEqual(result.hints[1].confidence);
      expect(result.hints[1].confidence).toBeGreaterThanOrEqual(result.hints[2].confidence);
    });

    it('should cap hints at 5', async () => {
      const OpenAI = require('openai').default;
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify({
                    hints: Array.from({ length: 10 }, (_, i) => ({
                      value: `testing option ${i}`,
                      confidence: 0.9 - i * 0.05,
                    })),
                  }),
                },
              }],
              usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
            }),
          },
        },
      }));

      const gen = new CompletionHintsGenerator({ apiKey: 'test-key' });
      const result = await gen.generateHints({
        fieldType: 'short_text',
        partialValue: 'testing',
        fieldLabel: 'Field',
      });

      expect(result.hints.length).toBeLessThanOrEqual(5);
    });

    it('should clamp confidence between 0 and 1', async () => {
      const OpenAI = require('openai').default;
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify({
                    hints: [
                      { value: 'testing high', confidence: 5.0 },
                      { value: 'testing neg', confidence: -0.5 },
                    ],
                  }),
                },
              }],
              usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
            }),
          },
        },
      }));

      const gen = new CompletionHintsGenerator({ apiKey: 'test-key' });
      const result = await gen.generateHints({
        fieldType: 'short_text',
        partialValue: 'testing',
        fieldLabel: 'Field',
      });

      result.hints.forEach(h => {
        expect(h.confidence).toBeGreaterThanOrEqual(0);
        expect(h.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should skip null/invalid hint entries', async () => {
      const OpenAI = require('openai').default;
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify({
                    hints: [
                      null,
                      'string-not-object',
                      { value: '', confidence: 0.5 },
                      { value: 'testing valid', confidence: 0.8 },
                    ],
                  }),
                },
              }],
              usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
            }),
          },
        },
      }));

      const gen = new CompletionHintsGenerator({ apiKey: 'test-key' });
      const result = await gen.generateHints({
        fieldType: 'short_text',
        partialValue: 'testing',
        fieldLabel: 'Field',
      });

      expect(result.hints.length).toBe(1);
      expect(result.hints[0].value).toBe('testing valid');
    });
  });

  // ==========================================
  // Factory Function
  // ==========================================
  describe('createCompletionHintsGenerator', () => {
    const origEnv = process.env.OPENAI_API_KEY;

    afterEach(() => {
      if (origEnv !== undefined) {
        process.env.OPENAI_API_KEY = origEnv;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
    });

    it('should throw without API key', () => {
      delete process.env.OPENAI_API_KEY;
      expect(() => createCompletionHintsGenerator()).toThrow('OpenAI API key is required');
    });

    it('should use provided API key', () => {
      const gen = createCompletionHintsGenerator('my-key');
      expect(gen).toBeInstanceOf(CompletionHintsGenerator);
    });

    it('should use env API key', () => {
      process.env.OPENAI_API_KEY = 'env-key';
      const gen = createCompletionHintsGenerator();
      expect(gen).toBeInstanceOf(CompletionHintsGenerator);
    });
  });
});
