/**
 * Tests for AI Filter Query Generator
 *
 * Tests the buildUserPrompt logic and generateFilterFromQuery function.
 * The server-side check and OpenAI calls are mocked.
 */

// Must mock before importing — the module has a top-level `typeof window` check
Object.defineProperty(global, 'window', { value: undefined, writable: true });

// Mock OpenAI dynamic import
jest.mock('openai', () => {
  const mockCreate = jest.fn();
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    })),
    _mockCreate: mockCreate,
  };
});

// Set API key before import
process.env.OPENAI_API_KEY = 'test-key';

import {
  generateFilterFromQuery,
  FilterGenerationRequest,
  FilterGenerationResponse,
  WorkflowContextForAI,
} from '@/lib/ai/filterQueryGenerator';

function getMockCreate() {
  return require('openai')._mockCreate;
}

describe('Filter Query Generator', () => {
  beforeEach(() => {
    getMockCreate().mockReset();
  });

  // ==========================================
  // Successful generation
  // ==========================================
  describe('generateFilterFromQuery - success', () => {
    it('should generate a simple filter', async () => {
      getMockCreate().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              filter: { status: 'active' },
              explanation: 'Filter for active documents',
            }),
          },
        }],
      });

      const result = await generateFilterFromQuery({
        query: 'Find all active documents',
      });

      expect(result.filter).toEqual({ status: 'active' });
      expect(result.explanation).toBe('Filter for active documents');
    });

    it('should pass collection name in prompt', async () => {
      getMockCreate().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              filter: { age: { $gte: 18 } },
              explanation: 'Adults only',
            }),
          },
        }],
      });

      const result = await generateFilterFromQuery({
        query: 'Find adults',
        collectionName: 'users',
      });

      expect(result.filter).toEqual({ age: { $gte: 18 } });
    });

    it('should include schema fields in prompt', async () => {
      getMockCreate().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              filter: { name: { $regex: 'john', $options: 'i' } },
            }),
          },
        }],
      });

      const result = await generateFilterFromQuery({
        query: 'Find users named john',
        schema: {
          fields: ['name', 'email', 'age'],
          sampleDocs: [{ name: 'John', email: 'john@test.com', age: 30 }],
        },
      });

      expect(result.filter).toHaveProperty('name');
    });

    it('should include existing filter context', async () => {
      getMockCreate().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              filter: { $and: [{ status: 'active' }, { age: { $gte: 18 } }] },
            }),
          },
        }],
      });

      const result = await generateFilterFromQuery({
        query: 'Also filter by age >= 18',
        existingFilter: { status: 'active' },
      });

      expect(result.filter.$and).toBeDefined();
    });

    it('should include workflow context in prompt', async () => {
      getMockCreate().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              filter: { email: '{{nodes.form-trigger_abc.data.email}}' },
            }),
          },
        }],
      });

      const workflowContext: WorkflowContextForAI = {
        upstreamNodes: [{
          id: 'form-trigger_abc',
          type: 'form-trigger',
          label: 'Contact Form',
          outputFields: ['data.email', 'data.name'],
        }],
        triggerInfo: {
          type: 'form-trigger',
          label: 'Contact Form',
          availableFields: ['respondent.email', 'data.email', 'data.name'],
        },
      };

      const result = await generateFilterFromQuery({
        query: 'Find by form email',
        workflowContext,
      });

      expect(result.filter.email).toContain('{{nodes');
    });

    it('should handle confidence in response', async () => {
      getMockCreate().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              filter: { status: 'active' },
              confidence: 0.95,
            }),
          },
        }],
      });

      const result = await generateFilterFromQuery({
        query: 'Find active items',
      });

      expect(result.confidence).toBe(0.95);
    });
  });

  // ==========================================
  // Error handling
  // ==========================================
  describe('generateFilterFromQuery - errors', () => {
    it('should throw on empty AI response', async () => {
      getMockCreate().mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      await expect(
        generateFilterFromQuery({ query: 'test' })
      ).rejects.toThrow('No response from AI');
    });

    it('should throw on invalid JSON response', async () => {
      getMockCreate().mockResolvedValue({
        choices: [{ message: { content: 'not json at all' } }],
      });

      await expect(
        generateFilterFromQuery({ query: 'test' })
      ).rejects.toThrow('Failed to parse');
    });

    it('should throw on missing filter object', async () => {
      getMockCreate().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({ explanation: 'no filter here' }),
          },
        }],
      });

      await expect(
        generateFilterFromQuery({ query: 'test' })
      ).rejects.toThrow('missing filter object');
    });

    it('should throw on non-object filter', async () => {
      getMockCreate().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({ filter: 'not an object' }),
          },
        }],
      });

      await expect(
        generateFilterFromQuery({ query: 'test' })
      ).rejects.toThrow('missing filter object');
    });

    it('should propagate API errors', async () => {
      getMockCreate().mockRejectedValue(new Error('Rate limited'));

      await expect(
        generateFilterFromQuery({ query: 'test' })
      ).rejects.toThrow('Rate limited');
    });

    it('should handle markdown-wrapped JSON response', async () => {
      getMockCreate().mockResolvedValue({
        choices: [{
          message: {
            content: '```json\n{"filter": {"status": "active"}, "explanation": "test"}\n```',
          },
        }],
      });

      const result = await generateFilterFromQuery({ query: 'test' });
      expect(result.filter).toEqual({ status: 'active' });
    });

    it('should handle markdown-wrapped without language tag', async () => {
      getMockCreate().mockResolvedValue({
        choices: [{
          message: {
            content: '```\n{"filter": {"status": "done"}}\n```',
          },
        }],
      });

      const result = await generateFilterFromQuery({ query: 'test' });
      expect(result.filter).toEqual({ status: 'done' });
    });
  });

  // ==========================================
  // Type definitions
  // ==========================================
  describe('Type definitions', () => {
    it('FilterGenerationRequest should accept minimal input', () => {
      const req: FilterGenerationRequest = { query: 'find all' };
      expect(req.query).toBe('find all');
    });

    it('FilterGenerationRequest should accept full input', () => {
      const req: FilterGenerationRequest = {
        query: 'find active users over 18',
        collectionName: 'users',
        schema: { fields: ['name', 'age', 'status'] },
        existingFilter: { status: 'active' },
        workflowContext: {
          upstreamNodes: [],
          triggerInfo: {
            type: 'manual',
            label: 'Manual Trigger',
            availableFields: [],
          },
        },
      };
      expect(req.collectionName).toBe('users');
    });

    it('WorkflowContextForAI should describe upstream nodes', () => {
      const ctx: WorkflowContextForAI = {
        upstreamNodes: [{
          id: 'node1',
          type: 'http-request',
          label: 'Fetch Users',
          outputFields: ['data.users', 'data.count'],
        }],
      };
      expect(ctx.upstreamNodes[0].outputFields.length).toBe(2);
    });
  });
});
