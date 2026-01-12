/**
 * RAG Prompt Enhancement Tests
 *
 * Tests for RAG prompt enhancement utilities including context injection,
 * query building, and retrieval triggering logic.
 */

import '@testing-library/jest-dom';
import {
  enhancePromptWithContext,
  buildContextualQuery,
  shouldTriggerRetrieval,
  buildRAGResponseGuidance,
  combineTopicAndRAGGuidance,
  estimateTokenCount,
  wouldExceedTokenBudget,
  createEmptyTurnContext,
  createTurnContext,
} from '@/lib/rag/promptEnhancement';
import { RetrievedChunk, RAGConfig } from '@/types/rag';
import { ConversationState } from '@/types/conversational';

// Mock retrieved chunks for testing
const mockChunks: RetrievedChunk[] = [
  {
    chunkId: 'chunk-1',
    documentId: 'doc-1',
    text: 'Company policy states that employees receive 15 days of paid time off annually.',
    score: 0.92,
    metadata: {
      chunkIndex: 0,
      pageNumber: 5,
      section: 'Time Off Policy',
    },
    document: {
      fileName: 'employee-handbook.pdf',
      title: 'Employee Handbook',
      sourceType: 'policy',
    },
  },
  {
    chunkId: 'chunk-2',
    documentId: 'doc-1',
    text: 'Unused PTO can be carried over up to 5 days into the next calendar year.',
    score: 0.85,
    metadata: {
      chunkIndex: 1,
      pageNumber: 6,
    },
    document: {
      fileName: 'employee-handbook.pdf',
      title: 'Employee Handbook',
      sourceType: 'policy',
    },
  },
  {
    chunkId: 'chunk-3',
    documentId: 'doc-2',
    text: 'Health insurance enrollment is available within 30 days of hire date.',
    score: 0.78,
    metadata: {
      chunkIndex: 0,
    },
    document: {
      fileName: 'benefits-guide.docx',
      title: 'Benefits Guide',
      sourceType: 'guide',
    },
  },
];

// Mock conversation state
const mockConversationState: ConversationState = {
  conversationId: 'conv-123',
  formId: 'form-456',
  messages: [
    { role: 'assistant', content: 'Hello! How can I help you today?', timestamp: new Date() },
    { role: 'user', content: 'I have questions about company policies', timestamp: new Date() },
  ],
  topics: [],
  partialExtractions: {},
  confidence: 0.5,
  turnCount: 1,
  maxTurns: 15,
  status: 'active',
  startedAt: new Date(),
  updatedAt: new Date(),
};

// Mock RAG config
const mockRAGConfig: RAGConfig = {
  enabled: true,
  documents: ['doc-1', 'doc-2'],
  retrievalConfig: {
    maxChunks: 5,
    minScore: 0.7,
    retrievalThreshold: 0.5,
  },
};

describe('RAG Prompt Enhancement', () => {
  describe('enhancePromptWithContext', () => {
    it('should enhance prompt with retrieved context', () => {
      const basePrompt = 'You are a helpful HR assistant.';
      const result = enhancePromptWithContext(basePrompt, mockChunks);

      expect(result.prompt).toContain(basePrompt);
      expect(result.prompt).toContain('Knowledge Base Context');
      expect(result.prompt).toContain('Employee Handbook');
      expect(result.chunksIncluded).toBe(3);
      expect(result.sources).toHaveLength(3);
      expect(result.wasTruncated).toBe(false);
    });

    it('should return original prompt when no chunks provided', () => {
      const basePrompt = 'You are a helpful assistant.';
      const result = enhancePromptWithContext(basePrompt, []);

      expect(result.prompt).toBe(basePrompt);
      expect(result.chunksIncluded).toBe(0);
      expect(result.sources).toHaveLength(0);
    });

    it('should include citation instructions by default', () => {
      const basePrompt = 'Base prompt';
      const result = enhancePromptWithContext(basePrompt, mockChunks);

      expect(result.prompt).toContain('Citation Guidelines');
      expect(result.prompt).toContain('[Source N]');
    });

    it('should exclude citation instructions when disabled', () => {
      const basePrompt = 'Base prompt';
      const result = enhancePromptWithContext(basePrompt, mockChunks, {
        includeCitationInstructions: false,
      });

      expect(result.prompt).not.toContain('Citation Guidelines');
    });

    it('should truncate context when exceeding max length', () => {
      const basePrompt = 'Base prompt';
      const result = enhancePromptWithContext(basePrompt, mockChunks, {
        maxContextLength: 500,
      });

      expect(result.wasTruncated).toBe(true);
      expect(result.chunksIncluded).toBeLessThan(3);
    });

    it('should generate correct sources with metadata', () => {
      const result = enhancePromptWithContext('Prompt', mockChunks);
      const firstSource = result.sources[0];

      expect(firstSource.index).toBe(1);
      expect(firstSource.documentId).toBe('doc-1');
      expect(firstSource.title).toBe('Employee Handbook');
      expect(firstSource.pageNumber).toBe(5);
      expect(firstSource.section).toBe('Time Off Policy');
      expect(firstSource.score).toBe(0.92);
    });
  });

  describe('buildContextualQuery', () => {
    it('should return user message as query for long messages', () => {
      const longMessage = 'How many days of paid time off do employees receive according to company policy?';
      const query = buildContextualQuery(longMessage, mockConversationState);

      expect(query).toContain(longMessage);
    });

    it('should add conversation context for short messages', () => {
      const shortMessage = 'How many?';
      const stateWithHistory: ConversationState = {
        ...mockConversationState,
        messages: [
          { role: 'user', content: 'Tell me about PTO policy', timestamp: new Date() },
          { role: 'assistant', content: 'Our PTO policy allows...', timestamp: new Date() },
        ],
      };

      const query = buildContextualQuery(shortMessage, stateWithHistory);
      expect(query).toContain(shortMessage);
      expect(query).toContain('Context:');
    });

    it('should truncate very long queries', () => {
      const veryLongMessage = 'A'.repeat(1000);
      const query = buildContextualQuery(veryLongMessage, mockConversationState);

      expect(query.length).toBeLessThanOrEqual(503); // 500 + "..."
    });
  });

  describe('shouldTriggerRetrieval', () => {
    it('should return false when RAG is disabled', () => {
      const disabledConfig: RAGConfig = { ...mockRAGConfig, enabled: false };
      const result = shouldTriggerRetrieval('What is our policy?', mockConversationState, disabledConfig);

      expect(result).toBe(false);
    });

    it('should return false when no documents configured', () => {
      const noDocsConfig: RAGConfig = { ...mockRAGConfig, documents: [] };
      const result = shouldTriggerRetrieval('What is our policy?', mockConversationState, noDocsConfig);

      expect(result).toBe(false);
    });

    it('should trigger for question-like messages', () => {
      const questions = [
        'What is our vacation policy?',
        'How do I request time off?',
        'Can you explain the benefits?',
        'Where do I find the employee handbook?',
      ];

      questions.forEach((q) => {
        const result = shouldTriggerRetrieval(q, mockConversationState, mockRAGConfig);
        expect(result).toBe(true);
      });
    });

    it('should trigger for information-seeking messages', () => {
      const infoMessages = [
        'Tell me about the policy',
        'I need information about guidelines',
        'Explain the procedure for requests',
      ];

      infoMessages.forEach((msg) => {
        const result = shouldTriggerRetrieval(msg, mockConversationState, mockRAGConfig);
        expect(result).toBe(true);
      });
    });

    it('should not trigger for simple responses', () => {
      const simpleResponses = ['yes', 'no', 'ok', 'thanks', 'got it'];

      simpleResponses.forEach((resp) => {
        const result = shouldTriggerRetrieval(resp, mockConversationState, mockRAGConfig);
        expect(result).toBe(false);
      });
    });

    it('should trigger for longer messages', () => {
      const longMessage = 'I started working here last month and I am trying to understand all the different policies that apply to me as a new employee';
      const result = shouldTriggerRetrieval(longMessage, mockConversationState, mockRAGConfig);

      expect(result).toBe(true);
    });
  });

  describe('buildRAGResponseGuidance', () => {
    it('should return no-context message when no sources', () => {
      const guidance = buildRAGResponseGuidance(false, []);

      expect(guidance).toContain('No relevant documentation');
    });

    it('should list available sources when context provided', () => {
      const sources = mockChunks.map((chunk, i) => ({
        index: i + 1,
        documentId: chunk.documentId,
        chunkId: chunk.chunkId,
        title: chunk.document?.title || 'Untitled',
        pageNumber: chunk.metadata.pageNumber,
        section: chunk.metadata.section,
        score: chunk.score,
        excerpt: chunk.text.substring(0, 100),
      }));

      const guidance = buildRAGResponseGuidance(true, sources);

      expect(guidance).toContain('Available Sources');
      expect(guidance).toContain('[Source 1]');
      expect(guidance).toContain('Employee Handbook');
    });
  });

  describe('combineTopicAndRAGGuidance', () => {
    it('should combine topic guidance with RAG awareness', () => {
      const topicGuidance = 'Focus on gathering information about PTO requests.';
      const ragContext = {
        hasContext: true,
        chunkCount: 3,
        topSources: mockChunks.slice(0, 2).map((c, i) => ({
          index: i + 1,
          documentId: c.documentId,
          chunkId: c.chunkId,
          title: c.document?.title || '',
          score: c.score,
          excerpt: c.text.substring(0, 80),
        })),
      };

      const combined = combineTopicAndRAGGuidance(topicGuidance, ragContext);

      expect(combined).toContain(topicGuidance);
      expect(combined).toContain('Knowledge Base Integration');
      expect(combined).toContain('3 relevant passage');
    });

    it('should return original guidance when no RAG context', () => {
      const topicGuidance = 'Focus on the current topic.';
      const combined = combineTopicAndRAGGuidance(topicGuidance, {
        hasContext: false,
        chunkCount: 0,
        topSources: [],
      });

      expect(combined).toBe(topicGuidance);
    });
  });

  describe('Token estimation utilities', () => {
    it('should estimate token count', () => {
      const text = 'This is a test sentence with some words.';
      const tokens = estimateTokenCount(text);

      // ~1 token per 4 characters
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(text.length);
    });

    it('should detect when token budget exceeded', () => {
      const shortPrompt = 'Short prompt';
      const longContext = 'A'.repeat(20000);

      expect(wouldExceedTokenBudget(shortPrompt, longContext, 4000)).toBe(true);
      expect(wouldExceedTokenBudget(shortPrompt, 'Short context', 4000)).toBe(false);
    });
  });

  describe('Turn context management', () => {
    it('should create empty turn context', () => {
      const context = createEmptyTurnContext();

      expect(context.wasTriggered).toBe(false);
      expect(context.chunks).toHaveLength(0);
      expect(context.sources).toHaveLength(0);
      expect(context.timestamp).toBeInstanceOf(Date);
    });

    it('should create turn context from retrieval results', () => {
      const context = createTurnContext('test query', mockChunks, 150);

      expect(context.wasTriggered).toBe(true);
      expect(context.query).toBe('test query');
      expect(context.chunks).toHaveLength(3);
      expect(context.sources).toHaveLength(3);
      expect(context.latencyMs).toBe(150);
    });
  });
});
