/**
 * Tests for Conversational Prompt Engineering
 * 
 * Tests: buildSystemPrompt, buildConversationContext, getNextTopicGuidance,
 * buildITHelpdeskPrompt, buildExtractionGuidance, buildWrapUpPrompt
 */

import {
  buildSystemPrompt,
  buildConversationContext,
  getNextTopicGuidance,
  buildITHelpdeskPrompt,
  buildExtractionGuidance,
  buildWrapUpPrompt,
} from '@/lib/conversational/prompts';

import { createConversationState } from '@/lib/conversational/state';

import type {
  ConversationalFormConfig,
  ConversationTopic,
  ConversationState,
} from '@/types/conversational';

// ─── Test Helpers ───

function makeConfig(overrides?: Partial<ConversationalFormConfig>): ConversationalFormConfig {
  return {
    formType: 'conversational',
    objective: 'Collect support ticket information',
    context: 'Internal IT support portal',
    topics: [
      { id: 'cat', name: 'Category', description: 'Issue type', priority: 'required', depth: 'surface' },
      { id: 'desc', name: 'Description', description: 'Detailed issue description', priority: 'required', depth: 'deep' },
      { id: 'contact', name: 'Contact Info', description: 'How to reach the user', priority: 'important', depth: 'moderate' },
      { id: 'extra', name: 'Additional Notes', description: 'Extra context', priority: 'optional', depth: 'surface' },
    ],
    persona: {
      style: 'professional',
      tone: 'helpful',
      behaviors: ['Ask follow-up questions', 'Be concise'],
      restrictions: ['Do not provide medical advice'],
    },
    extractionSchema: [
      { field: 'category', type: 'enum', required: true, description: 'Issue category', options: ['Hardware', 'Software'], topicId: 'cat' },
      { field: 'description', type: 'string', required: true, description: 'Full description', topicId: 'desc' },
      { field: 'contactEmail', type: 'string', required: false, description: 'Email', topicId: 'contact' },
    ],
    conversationLimits: { maxTurns: 10, maxDuration: 30, minConfidence: 0.7 },
    ...overrides,
  };
}

function makeState(overrides?: Partial<ConversationState>): ConversationState {
  const config = makeConfig();
  const state = createConversationState('form_1', config);
  return { ...state, ...overrides };
}

// ─── buildSystemPrompt ───

describe('buildSystemPrompt', () => {
  it('includes objective', () => {
    const prompt = buildSystemPrompt(makeConfig());
    expect(prompt).toContain('Collect support ticket information');
  });

  it('includes context when provided', () => {
    const prompt = buildSystemPrompt(makeConfig());
    expect(prompt).toContain('Internal IT support portal');
  });

  it('omits context section when not provided', () => {
    const prompt = buildSystemPrompt(makeConfig({ context: undefined }));
    expect(prompt).not.toContain('## Context');
  });

  it('lists all topics with priority and depth', () => {
    const prompt = buildSystemPrompt(makeConfig());
    expect(prompt).toContain('Category');
    expect(prompt).toContain('required');
    expect(prompt).toContain('surface');
    expect(prompt).toContain('Description');
    expect(prompt).toContain('deep');
  });

  it('includes persona behaviors', () => {
    const prompt = buildSystemPrompt(makeConfig());
    expect(prompt).toContain('Ask follow-up questions');
    expect(prompt).toContain('Be concise');
  });

  it('includes persona restrictions', () => {
    const prompt = buildSystemPrompt(makeConfig());
    expect(prompt).toContain('Do not provide medical advice');
  });

  it('includes tone when set', () => {
    const prompt = buildSystemPrompt(makeConfig());
    expect(prompt).toContain('helpful');
  });

  it('uses custom prompt for custom style', () => {
    const config = makeConfig({
      persona: { style: 'custom', customPrompt: 'You are a pirate AI. Arrr!' },
    });
    const prompt = buildSystemPrompt(config);
    expect(prompt).toContain('You are a pirate AI. Arrr!');
  });

  it('includes conversation flow guidelines', () => {
    const prompt = buildSystemPrompt(makeConfig());
    expect(prompt).toContain('friendly greeting');
    expect(prompt).toContain('priority');
  });

  it('handles each persona style', () => {
    for (const style of ['professional', 'friendly', 'casual', 'empathetic'] as const) {
      const prompt = buildSystemPrompt(makeConfig({ persona: { style } }));
      expect(prompt.length).toBeGreaterThan(100);
    }
  });
});

// ─── buildConversationContext ───

describe('buildConversationContext', () => {
  it('shows turn count and confidence', () => {
    const state = makeState({ turnCount: 3, confidence: 0.45 });
    const ctx = buildConversationContext(state, makeConfig());
    expect(ctx).toContain('Turn: 3 / 10');
    expect(ctx).toContain('45%');
  });

  it('lists covered topics', () => {
    const state = makeState();
    state.topics[0].covered = true;
    state.topics[0].depth = 0.8;
    state.topics[0].turnCount = 2;
    const ctx = buildConversationContext(state, makeConfig());
    expect(ctx).toContain('Category');
    expect(ctx).toContain('80%');
  });

  it('shows "None yet" when no topics covered', () => {
    const ctx = buildConversationContext(makeState(), makeConfig());
    expect(ctx).toContain('None yet');
  });

  it('lists uncovered required topics in "Still Needed"', () => {
    const ctx = buildConversationContext(makeState(), makeConfig());
    expect(ctx).toContain('Required (must cover)');
    expect(ctx).toContain('Category');
    expect(ctx).toContain('Description');
  });

  it('lists uncovered important topics', () => {
    const ctx = buildConversationContext(makeState(), makeConfig());
    expect(ctx).toContain('Important (should cover)');
    expect(ctx).toContain('Contact Info');
  });

  it('suggests next required topic in Next Steps', () => {
    const ctx = buildConversationContext(makeState(), makeConfig());
    expect(ctx).toContain('Focus on required topics first');
    expect(ctx).toContain('Category');
  });

  it('suggests important topics when required are done', () => {
    const state = makeState();
    // Mark required topics as covered
    state.topics = state.topics.map((t) =>
      t.priority === 'required' ? { ...t, covered: true } : t
    );
    const ctx = buildConversationContext(state, makeConfig());
    expect(ctx).toContain('Move to important topics');
  });

  it('suggests completion when all required and important done', () => {
    const state = makeState();
    state.topics = state.topics.map((t) =>
      t.priority !== 'optional' ? { ...t, covered: true } : t
    );
    const ctx = buildConversationContext(state, makeConfig());
    expect(ctx).toContain('Summarize and confirm completion');
  });

  it('includes CRITICAL instruction about referencing history', () => {
    const ctx = buildConversationContext(makeState(), makeConfig());
    expect(ctx).toContain('CRITICAL');
    expect(ctx).toContain("don't repeat yourself");
  });
});

// ─── getNextTopicGuidance ───

describe('getNextTopicGuidance', () => {
  it('returns first uncovered required topic', () => {
    const state = makeState();
    const result = getNextTopicGuidance(state, makeConfig());
    expect(result.topic?.id).toBe('cat');
    expect(result.guidance).toContain('Category');
    expect(result.guidance).toContain('required');
  });

  it('returns important topic when all required covered', () => {
    const state = makeState();
    state.topics = state.topics.map((t) =>
      t.priority === 'required' ? { ...t, covered: true } : t
    );
    const result = getNextTopicGuidance(state, makeConfig());
    expect(result.topic?.id).toBe('contact');
    expect(result.guidance).toContain('important');
  });

  it('returns completion guidance when all required/important covered', () => {
    const state = makeState();
    state.topics = state.topics.map((t) =>
      t.priority !== 'optional' ? { ...t, covered: true } : t
    );
    const result = getNextTopicGuidance(state, makeConfig());
    expect(result.topic).toBeUndefined();
    expect(result.guidance).toContain('Summarize');
  });

  it('skips already covered required topics', () => {
    const state = makeState();
    state.topics[0].covered = true; // cat
    const result = getNextTopicGuidance(state, makeConfig());
    expect(result.topic?.id).toBe('desc');
  });
});

// ─── buildITHelpdeskPrompt ───

describe('buildITHelpdeskPrompt', () => {
  it('returns non-empty prompt', () => {
    const prompt = buildITHelpdeskPrompt();
    expect(prompt.length).toBeGreaterThan(500);
  });

  it('includes all issue categories', () => {
    const prompt = buildITHelpdeskPrompt();
    expect(prompt).toContain('Hardware');
    expect(prompt).toContain('Software');
    expect(prompt).toContain('Network');
    expect(prompt).toContain('Access & Permissions');
  });

  it('includes urgency levels', () => {
    const prompt = buildITHelpdeskPrompt();
    expect(prompt).toContain('Low');
    expect(prompt).toContain('Medium');
    expect(prompt).toContain('High');
    expect(prompt).toContain('Critical');
  });

  it('includes lost laptop example', () => {
    const prompt = buildITHelpdeskPrompt();
    expect(prompt).toContain('lost my laptop');
  });

  it('starts with friendly greeting instruction', () => {
    const prompt = buildITHelpdeskPrompt();
    expect(prompt).toContain('friendly greeting');
  });
});

// ─── buildExtractionGuidance ───

describe('buildExtractionGuidance', () => {
  it('returns guidance for topic with extraction schema', () => {
    const topic: ConversationTopic = { id: 'cat', name: 'Category', description: 'Issue type', priority: 'required', depth: 'surface' };
    const config = makeConfig();
    const guidance = buildExtractionGuidance(topic, config);
    expect(guidance).toContain('category');
    expect(guidance).toContain('enum');
    expect(guidance).toContain('Hardware');
    expect(guidance).toContain('Software');
    expect(guidance).toContain('required');
  });

  it('returns generic guidance when no schema match', () => {
    const topic: ConversationTopic = { id: 'unknown', name: 'Unknown Topic', description: 'Mystery', priority: 'optional', depth: 'surface' };
    const guidance = buildExtractionGuidance(topic, makeConfig());
    expect(guidance).toContain('Unknown Topic');
  });

  it('includes description when present', () => {
    const topic: ConversationTopic = { id: 'desc', name: 'Description', description: 'Details', priority: 'required', depth: 'deep' };
    const guidance = buildExtractionGuidance(topic, makeConfig());
    expect(guidance).toContain('description');
    expect(guidance).toContain('Full description');
  });
});

// ─── buildWrapUpPrompt ───

describe('buildWrapUpPrompt', () => {
  it('prompts to continue when required topics missing', () => {
    const state = makeState();
    const prompt = buildWrapUpPrompt(state, makeConfig());
    expect(prompt).toContain('still need to cover');
    expect(prompt).toContain('Category');
  });

  it('prompts to summarize when all required covered', () => {
    const state = makeState();
    state.topics = state.topics.map((t) =>
      t.priority === 'required' ? { ...t, covered: true } : t
    );
    const prompt = buildWrapUpPrompt(state, makeConfig());
    expect(prompt).toContain('Summarize');
    expect(prompt).toContain('confirm');
  });
});
