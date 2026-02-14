/**
 * Tests for AI Conditional Logic Generator
 *
 * Tests the ConditionalLogicGenerator class including:
 * - Simple condition creation
 * - Combining conditions (AND/OR)
 * - Inverting conditions
 * - Validation of generated logic
 * - Explanation generation
 * - AI-powered generation (mocked)
 */

import {
  ConditionalLogicGenerator,
  createConditionalLogicGenerator,
} from '@/lib/ai/conditionalLogicGenerator';
import { ConditionalLogic, ConditionOperator } from '@/types/form';

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

// Mock aiService
jest.mock('@/lib/ai/aiService', () => ({
  aiService: {
    complete: jest.fn(),
  },
  createAIContext: jest.fn().mockReturnValue({
    userId: 'test-user',
    orgId: 'test-org',
    feature: 'test',
    endpoint: '/test',
    isGuest: false,
  }),
}));

const SAMPLE_FIELDS = [
  { path: 'age', label: 'Age', type: 'number' },
  { path: 'country', label: 'Country', type: 'short_text' },
  { path: 'subscribe', label: 'Subscribe to newsletter', type: 'yes_no' },
  { path: 'email', label: 'Email Address', type: 'email' },
  { path: 'comments', label: 'Comments', type: 'long_text' },
];

describe('ConditionalLogicGenerator', () => {
  let generator: ConditionalLogicGenerator;

  beforeEach(() => {
    generator = new ConditionalLogicGenerator({ apiKey: 'test-key' });
  });

  // ==========================================
  // createSimpleCondition
  // ==========================================
  describe('createSimpleCondition', () => {
    it('should create a simple equals condition', () => {
      const result = generator.createSimpleCondition('country', 'equals', 'US');
      expect(result).toEqual({
        action: 'show',
        logicType: 'all',
        conditions: [{ field: 'country', operator: 'equals', value: 'US' }],
      });
    });

    it('should default to show action', () => {
      const result = generator.createSimpleCondition('age', 'greaterThan', 18);
      expect(result.action).toBe('show');
    });

    it('should accept hide action', () => {
      const result = generator.createSimpleCondition('age', 'lessThan', 18, 'hide');
      expect(result.action).toBe('hide');
    });

    it('should handle isEmpty operator without value', () => {
      const result = generator.createSimpleCondition('comments', 'isEmpty');
      expect(result.conditions[0].value).toBeUndefined();
    });

    it('should handle isTrue operator', () => {
      const result = generator.createSimpleCondition('subscribe', 'isTrue');
      expect(result.conditions[0].operator).toBe('isTrue');
    });
  });

  // ==========================================
  // combineWithAnd
  // ==========================================
  describe('combineWithAnd', () => {
    it('should combine multiple conditions with AND', () => {
      const c1 = generator.createSimpleCondition('age', 'greaterThan', 18);
      const c2 = generator.createSimpleCondition('country', 'equals', 'US');
      const combined = generator.combineWithAnd([c1, c2]);

      expect(combined.logicType).toBe('all');
      expect(combined.conditions.length).toBe(2);
    });

    it('should preserve action from first condition', () => {
      const c1 = generator.createSimpleCondition('age', 'greaterThan', 18, 'hide');
      const c2 = generator.createSimpleCondition('country', 'equals', 'US');
      const combined = generator.combineWithAnd([c1, c2]);

      expect(combined.action).toBe('hide');
    });

    it('should flatten conditions from multiple inputs', () => {
      const c1: ConditionalLogic = {
        action: 'show',
        logicType: 'all',
        conditions: [
          { field: 'age', operator: 'greaterThan', value: 18 },
          { field: 'age', operator: 'lessThan', value: 65 },
        ],
      };
      const c2 = generator.createSimpleCondition('country', 'equals', 'US');
      const combined = generator.combineWithAnd([c1, c2]);

      expect(combined.conditions.length).toBe(3);
    });

    it('should default to show for empty array', () => {
      const combined = generator.combineWithAnd([]);
      expect(combined.action).toBe('show');
      expect(combined.conditions).toEqual([]);
    });
  });

  // ==========================================
  // combineWithOr
  // ==========================================
  describe('combineWithOr', () => {
    it('should combine conditions with OR', () => {
      const c1 = generator.createSimpleCondition('country', 'equals', 'US');
      const c2 = generator.createSimpleCondition('country', 'equals', 'CA');
      const combined = generator.combineWithOr([c1, c2]);

      expect(combined.logicType).toBe('any');
      expect(combined.conditions.length).toBe(2);
    });
  });

  // ==========================================
  // invertCondition
  // ==========================================
  describe('invertCondition', () => {
    it('should invert show to hide', () => {
      const condition = generator.createSimpleCondition('age', 'greaterThan', 18);
      const inverted = generator.invertCondition(condition);
      expect(inverted.action).toBe('hide');
    });

    it('should invert hide to show', () => {
      const condition = generator.createSimpleCondition('age', 'greaterThan', 18, 'hide');
      const inverted = generator.invertCondition(condition);
      expect(inverted.action).toBe('show');
    });

    it('should preserve conditions when inverting', () => {
      const condition = generator.createSimpleCondition('age', 'greaterThan', 18);
      const inverted = generator.invertCondition(condition);
      expect(inverted.conditions).toEqual(condition.conditions);
      expect(inverted.logicType).toBe(condition.logicType);
    });
  });

  // ==========================================
  // explainCondition
  // ==========================================
  describe('explainCondition', () => {
    it('should explain a simple equals condition', () => {
      const logic: ConditionalLogic = {
        action: 'show',
        logicType: 'all',
        conditions: [{ field: 'country', operator: 'equals', value: 'US' }],
      };
      const explanation = generator.explainCondition(logic, SAMPLE_FIELDS);
      expect(explanation).toContain('Show');
      expect(explanation).toContain('Country');
      expect(explanation).toContain('US');
    });

    it('should explain hide action', () => {
      const logic: ConditionalLogic = {
        action: 'hide',
        logicType: 'all',
        conditions: [{ field: 'age', operator: 'lessThan', value: 18 }],
      };
      const explanation = generator.explainCondition(logic, SAMPLE_FIELDS);
      expect(explanation).toContain('Hide');
    });

    it('should use AND for all logicType with multiple conditions', () => {
      const logic: ConditionalLogic = {
        action: 'show',
        logicType: 'all',
        conditions: [
          { field: 'age', operator: 'greaterThan', value: 18 },
          { field: 'country', operator: 'equals', value: 'US' },
        ],
      };
      const explanation = generator.explainCondition(logic, SAMPLE_FIELDS);
      expect(explanation).toContain('AND');
    });

    it('should use OR for any logicType', () => {
      const logic: ConditionalLogic = {
        action: 'show',
        logicType: 'any',
        conditions: [
          { field: 'country', operator: 'equals', value: 'US' },
          { field: 'country', operator: 'equals', value: 'CA' },
        ],
      };
      const explanation = generator.explainCondition(logic, SAMPLE_FIELDS);
      expect(explanation).toContain('OR');
    });

    it('should describe all operator types', () => {
      const operators: Array<{ op: ConditionOperator; expected: string }> = [
        { op: 'equals', expected: 'is' },
        { op: 'notEquals', expected: 'is not' },
        { op: 'contains', expected: 'contains' },
        { op: 'notContains', expected: 'does not contain' },
        { op: 'greaterThan', expected: 'greater than' },
        { op: 'lessThan', expected: 'less than' },
        { op: 'isEmpty', expected: 'empty' },
        { op: 'isNotEmpty', expected: 'has a value' },
        { op: 'isTrue', expected: 'checked' },
        { op: 'isFalse', expected: 'unchecked' },
      ];

      for (const { op, expected } of operators) {
        const logic: ConditionalLogic = {
          action: 'show',
          logicType: 'all',
          conditions: [{ field: 'country', operator: op, value: 'test' }],
        };
        const explanation = generator.explainCondition(logic, SAMPLE_FIELDS);
        expect(explanation.toLowerCase()).toContain(expected.toLowerCase());
      }
    });

    it('should use field path as fallback when label not found', () => {
      const logic: ConditionalLogic = {
        action: 'show',
        logicType: 'all',
        conditions: [{ field: 'unknown_field', operator: 'equals', value: 'test' }],
      };
      const explanation = generator.explainCondition(logic, SAMPLE_FIELDS);
      expect(explanation).toContain('unknown_field');
    });
  });

  // ==========================================
  // generateConditionalLogic (AI-powered)
  // ==========================================
  describe('generateConditionalLogic', () => {
    it('should generate logic from AI response', async () => {
      const OpenAI = require('openai').default;
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify({
                    conditionalLogic: {
                      action: 'show',
                      logicType: 'all',
                      conditions: [{ field: 'age', operator: 'greaterThan', value: 18 }],
                    },
                    explanation: 'Show when age is over 18',
                  }),
                },
              }],
            }),
          },
        },
      }));

      const gen = new ConditionalLogicGenerator({ apiKey: 'test-key' });
      const result = await gen.generateConditionalLogic({
        description: 'Show this field when age is over 18',
        availableFields: SAMPLE_FIELDS,
      });

      expect(result.success).toBe(true);
      expect(result.conditionalLogic?.action).toBe('show');
      expect(result.conditionalLogic?.conditions[0].field).toBe('age');
    });

    it('should reject invalid action in AI response', async () => {
      const OpenAI = require('openai').default;
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify({
                    conditionalLogic: {
                      action: 'invalid',
                      logicType: 'all',
                      conditions: [{ field: 'age', operator: 'greaterThan', value: 18 }],
                    },
                  }),
                },
              }],
            }),
          },
        },
      }));

      const gen = new ConditionalLogicGenerator({ apiKey: 'test-key' });
      const result = await gen.generateConditionalLogic({
        description: 'test',
        availableFields: SAMPLE_FIELDS,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid action');
    });

    it('should reject unknown fields in AI response', async () => {
      const OpenAI = require('openai').default;
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify({
                    conditionalLogic: {
                      action: 'show',
                      logicType: 'all',
                      conditions: [{ field: 'nonexistent', operator: 'equals', value: 'test' }],
                    },
                  }),
                },
              }],
            }),
          },
        },
      }));

      const gen = new ConditionalLogicGenerator({ apiKey: 'test-key' });
      const result = await gen.generateConditionalLogic({
        description: 'test',
        availableFields: SAMPLE_FIELDS,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown field');
    });

    it('should reject invalid operators', async () => {
      const OpenAI = require('openai').default;
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify({
                    conditionalLogic: {
                      action: 'show',
                      logicType: 'all',
                      conditions: [{ field: 'age', operator: 'badOperator', value: 18 }],
                    },
                  }),
                },
              }],
            }),
          },
        },
      }));

      const gen = new ConditionalLogicGenerator({ apiKey: 'test-key' });
      const result = await gen.generateConditionalLogic({
        description: 'test',
        availableFields: SAMPLE_FIELDS,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid operator');
    });

    it('should reject empty conditions array', async () => {
      const OpenAI = require('openai').default;
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify({
                    conditionalLogic: {
                      action: 'show',
                      logicType: 'all',
                      conditions: [],
                    },
                  }),
                },
              }],
            }),
          },
        },
      }));

      const gen = new ConditionalLogicGenerator({ apiKey: 'test-key' });
      const result = await gen.generateConditionalLogic({
        description: 'test',
        availableFields: SAMPLE_FIELDS,
      });

      expect(result.success).toBe(false);
    });

    it('should reject when conditionalLogic is missing from response', async () => {
      const OpenAI = require('openai').default;
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify({ explanation: 'no logic here' }),
                },
              }],
            }),
          },
        },
      }));

      const gen = new ConditionalLogicGenerator({ apiKey: 'test-key' });
      const result = await gen.generateConditionalLogic({
        description: 'test',
        availableFields: SAMPLE_FIELDS,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('did not generate valid');
    });

    it('should require value for value-requiring operators', async () => {
      const OpenAI = require('openai').default;
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify({
                    conditionalLogic: {
                      action: 'show',
                      logicType: 'all',
                      conditions: [{ field: 'age', operator: 'equals' }], // missing value
                    },
                  }),
                },
              }],
            }),
          },
        },
      }));

      const gen = new ConditionalLogicGenerator({ apiKey: 'test-key' });
      const result = await gen.generateConditionalLogic({
        description: 'test',
        availableFields: SAMPLE_FIELDS,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('requires a value');
    });

    it('should handle AI errors gracefully', async () => {
      const OpenAI = require('openai').default;
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('Network error')),
          },
        },
      }));

      const gen = new ConditionalLogicGenerator({ apiKey: 'test-key' });
      const result = await gen.generateConditionalLogic({
        description: 'test',
        availableFields: SAMPLE_FIELDS,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should handle empty AI response', async () => {
      const OpenAI = require('openai').default;
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: '' } }],
            }),
          },
        },
      }));

      const gen = new ConditionalLogicGenerator({ apiKey: 'test-key' });
      const result = await gen.generateConditionalLogic({
        description: 'test',
        availableFields: SAMPLE_FIELDS,
      });

      expect(result.success).toBe(false);
    });

    it('should return without client when no apiKey and no context', async () => {
      const gen = new ConditionalLogicGenerator({ apiKey: '' });
      const result = await gen.generateConditionalLogic({
        description: 'test',
        availableFields: SAMPLE_FIELDS,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });
  });

  // ==========================================
  // Factory Functions
  // ==========================================
  describe('createConditionalLogicGenerator', () => {
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
      expect(() => createConditionalLogicGenerator()).toThrow('OpenAI API key is required');
    });

    it('should use provided API key', () => {
      const gen = createConditionalLogicGenerator('my-key');
      expect(gen).toBeInstanceOf(ConditionalLogicGenerator);
    });
  });
});
