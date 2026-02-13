/**
 * Tests for Conversational State Management
 * 
 * Tests: createConversationState, addMessageToState, updateTopicCoverage,
 * analyzeAndUpdateTopicCoverage, updatePartialExtractions,
 * updateTopicCoverageFromExtractions, shouldCompleteConversation,
 * completeConversation, abandonConversation, markConversationError,
 * getCoverageSummary, calculateProgress, updateStateWithProgress
 */

import {
  createConversationState,
  addMessageToState,
  updateTopicCoverage,
  analyzeAndUpdateTopicCoverage,
  updatePartialExtractions,
  updateTopicCoverageFromExtractions,
  shouldCompleteConversation,
  completeConversation,
  abandonConversation,
  markConversationError,
  getCoverageSummary,
  calculateProgress,
  updateStateWithProgress,
} from '@/lib/conversational/state';

import type {
  ConversationalFormConfig,
  ConversationTopic,
  ConversationState,
  TopicCoverage,
} from '@/types/conversational';

// ─── Test Helpers ───

function makeConfig(overrides?: Partial<ConversationalFormConfig>): ConversationalFormConfig {
  return {
    formType: 'conversational',
    objective: 'Gather IT support ticket information',
    topics: [
      {
        id: 'issue_category',
        name: 'Issue Category',
        description: 'Type of IT issue',
        priority: 'required',
        depth: 'surface',
        extractionField: 'category',
      },
      {
        id: 'urgency',
        name: 'Urgency Level',
        description: 'How urgent the issue is',
        priority: 'required',
        depth: 'surface',
        extractionField: 'urgency',
      },
      {
        id: 'description',
        name: 'Description',
        description: 'Detailed issue description',
        priority: 'required',
        depth: 'deep',
        extractionField: 'description',
      },
      {
        id: 'contact',
        name: 'Contact Preferences',
        description: 'How to reach the requester',
        priority: 'important',
        depth: 'moderate',
        extractionField: 'contactMethod',
      },
      {
        id: 'additional',
        name: 'Additional Notes',
        description: 'Any additional context',
        priority: 'optional',
        depth: 'surface',
      },
    ],
    persona: {
      style: 'professional',
      behaviors: ['Be helpful'],
      restrictions: ['No jargon'],
    },
    extractionSchema: [
      { field: 'category', type: 'enum', required: true, description: 'Issue category', options: ['Hardware', 'Software', 'Network'], topicId: 'issue_category' },
      { field: 'urgency', type: 'enum', required: true, description: 'Urgency level', options: ['Low', 'Medium', 'High', 'Critical'], topicId: 'urgency' },
      { field: 'description', type: 'string', required: true, description: 'Detailed description', topicId: 'description' },
      { field: 'contactMethod', type: 'string', required: false, description: 'Preferred contact', topicId: 'contact' },
    ],
    conversationLimits: {
      maxTurns: 10,
      maxDuration: 30,
      minConfidence: 0.7,
    },
    ...overrides,
  };
}

function makeState(overrides?: Partial<ConversationState>): ConversationState {
  const config = makeConfig();
  const state = createConversationState('form_123', config);
  return { ...state, ...overrides };
}

// ─── createConversationState ───

describe('createConversationState', () => {
  it('creates state with correct formId and conversationId prefix', () => {
    const config = makeConfig();
    const state = createConversationState('form_abc', config);
    expect(state.formId).toBe('form_abc');
    expect(state.conversationId).toMatch(/^conv_/);
  });

  it('initializes all topics as uncovered with zero depth', () => {
    const config = makeConfig();
    const state = createConversationState('form_1', config);
    expect(state.topics).toHaveLength(5);
    state.topics.forEach((t) => {
      expect(t.covered).toBe(false);
      expect(t.depth).toBe(0);
      expect(t.turnCount).toBe(0);
    });
  });

  it('preserves topic priority from config', () => {
    const config = makeConfig();
    const state = createConversationState('f', config);
    const required = state.topics.filter((t) => t.priority === 'required');
    expect(required).toHaveLength(3);
    const important = state.topics.filter((t) => t.priority === 'important');
    expect(important).toHaveLength(1);
    const optional = state.topics.filter((t) => t.priority === 'optional');
    expect(optional).toHaveLength(1);
  });

  it('starts with one system message', () => {
    const state = createConversationState('f', makeConfig());
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0].role).toBe('system');
  });

  it('initializes turnCount to 0 and status to active', () => {
    const state = createConversationState('f', makeConfig());
    expect(state.turnCount).toBe(0);
    expect(state.status).toBe('active');
  });

  it('sets maxTurns from config', () => {
    const config = makeConfig({ conversationLimits: { maxTurns: 25, maxDuration: 60, minConfidence: 0.5 } });
    const state = createConversationState('f', config);
    expect(state.maxTurns).toBe(25);
  });

  it('initializes timestamps', () => {
    const before = new Date();
    const state = createConversationState('f', makeConfig());
    const after = new Date();
    expect(state.startedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(state.startedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('starts with empty partialExtractions and zero confidence', () => {
    const state = createConversationState('f', makeConfig());
    expect(state.partialExtractions).toEqual({});
    expect(state.confidence).toBe(0);
  });
});

// ─── addMessageToState ───

describe('addMessageToState', () => {
  it('appends user message and increments turnCount', () => {
    const state = makeState();
    const updated = addMessageToState(state, 'user', 'My laptop is broken');
    expect(updated.messages).toHaveLength(state.messages.length + 1);
    expect(updated.messages[updated.messages.length - 1].content).toBe('My laptop is broken');
    expect(updated.turnCount).toBe(state.turnCount + 1);
  });

  it('appends assistant message without incrementing turnCount', () => {
    const state = makeState();
    const updated = addMessageToState(state, 'assistant', 'I can help with that.');
    expect(updated.messages).toHaveLength(state.messages.length + 1);
    expect(updated.turnCount).toBe(state.turnCount);
  });

  it('does not mutate original state', () => {
    const state = makeState();
    const originalLength = state.messages.length;
    addMessageToState(state, 'user', 'test');
    expect(state.messages).toHaveLength(originalLength);
  });

  it('sets timestamp on new message', () => {
    const updated = addMessageToState(makeState(), 'user', 'hello');
    const last = updated.messages[updated.messages.length - 1];
    expect(last.timestamp).toBeInstanceOf(Date);
  });

  it('updates updatedAt', () => {
    const state = makeState();
    const updated = addMessageToState(state, 'user', 'test');
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(state.updatedAt.getTime());
  });
});

// ─── updateTopicCoverage ───

describe('updateTopicCoverage', () => {
  it('marks topic as covered when depth > 0', () => {
    const state = makeState();
    const updated = updateTopicCoverage(state, 'issue_category', 0.5);
    const topic = updated.topics.find((t) => t.topicId === 'issue_category')!;
    expect(topic.covered).toBe(true);
    expect(topic.depth).toBe(0.5);
  });

  it('does not mark as covered when depth is 0', () => {
    const state = makeState();
    const updated = updateTopicCoverage(state, 'issue_category', 0);
    const topic = updated.topics.find((t) => t.topicId === 'issue_category')!;
    expect(topic.covered).toBe(false);
  });

  it('keeps maximum depth (does not regress)', () => {
    let state = makeState();
    state = updateTopicCoverage(state, 'urgency', 0.8);
    state = updateTopicCoverage(state, 'urgency', 0.3);
    const topic = state.topics.find((t) => t.topicId === 'urgency')!;
    expect(topic.depth).toBe(0.8);
  });

  it('increments turnCount for the topic', () => {
    let state = makeState();
    state = updateTopicCoverage(state, 'contact', 0.5);
    state = updateTopicCoverage(state, 'contact', 0.6);
    const topic = state.topics.find((t) => t.topicId === 'contact')!;
    expect(topic.turnCount).toBe(2);
  });

  it('does not modify other topics', () => {
    const state = makeState();
    const updated = updateTopicCoverage(state, 'urgency', 0.5);
    const other = updated.topics.find((t) => t.topicId === 'issue_category')!;
    expect(other.covered).toBe(false);
    expect(other.depth).toBe(0);
  });

  it('handles non-existent topicId gracefully', () => {
    const state = makeState();
    const updated = updateTopicCoverage(state, 'nonexistent', 0.5);
    // No topic should be modified
    expect(updated.topics).toEqual(state.topics.map(t => ({ ...t })));
  });
});

// ─── analyzeAndUpdateTopicCoverage ───

describe('analyzeAndUpdateTopicCoverage', () => {
  const topics: ConversationTopic[] = [
    { id: 'issue_category', name: 'Issue Category', description: 'Type of IT issue', priority: 'required', depth: 'surface', extractionField: 'category' },
    { id: 'urgency', name: 'Urgency Level', description: 'How urgent', priority: 'required', depth: 'surface' },
  ];

  it('marks topic as covered when message mentions topic name', () => {
    const state = makeState();
    const updated = analyzeAndUpdateTopicCoverage(state, 'My issue category is hardware', topics);
    const topic = updated.topics.find((t) => t.topicId === 'issue_category')!;
    expect(topic.covered).toBe(true);
  });

  it('does not mark topic when message has no relevant keywords', () => {
    const state = makeState();
    const updated = analyzeAndUpdateTopicCoverage(state, 'Hello there, nice weather', topics);
    const issueTopic = updated.topics.find((t) => t.topicId === 'issue_category')!;
    expect(issueTopic.covered).toBe(false);
  });

  it('assigns higher depth for longer messages', () => {
    const state = makeState();
    const shortMsg = 'issue category';
    const longMsg = 'The issue category is hardware. My laptop screen is cracked and I need a replacement device urgently. This happened yesterday when I dropped it during a meeting. The asset tag is ABC-12345.';
    const short = analyzeAndUpdateTopicCoverage(state, shortMsg, topics);
    const long = analyzeAndUpdateTopicCoverage(state, longMsg, topics);
    const shortTopic = short.topics.find((t) => t.topicId === 'issue_category')!;
    const longTopic = long.topics.find((t) => t.topicId === 'issue_category')!;
    expect(longTopic.depth).toBeGreaterThan(shortTopic.depth);
  });

  it('can match on extractionField keyword', () => {
    const state = makeState();
    const updated = analyzeAndUpdateTopicCoverage(state, 'The category is software', topics);
    const topic = updated.topics.find((t) => t.topicId === 'issue_category')!;
    expect(topic.covered).toBe(true);
  });

  it('caps depth at 1.0', () => {
    const state = makeState();
    // Message with all keywords and long text
    const msg = 'issue category type of IT issue category ' + 'x'.repeat(200);
    const updated = analyzeAndUpdateTopicCoverage(state, msg, topics);
    const topic = updated.topics.find((t) => t.topicId === 'issue_category')!;
    expect(topic.depth).toBeLessThanOrEqual(1.0);
  });
});

// ─── updatePartialExtractions ───

describe('updatePartialExtractions', () => {
  it('merges new extractions into state', () => {
    const state = makeState();
    const updated = updatePartialExtractions(state, { category: 'Hardware' }, 0.8);
    expect(updated.partialExtractions.category).toBe('Hardware');
    expect(updated.confidence).toBe(0.8);
  });

  it('preserves existing extractions', () => {
    let state = makeState();
    state = updatePartialExtractions(state, { category: 'Hardware' }, 0.5);
    state = updatePartialExtractions(state, { urgency: 'High' }, 0.6);
    expect(state.partialExtractions.category).toBe('Hardware');
    expect(state.partialExtractions.urgency).toBe('High');
  });

  it('keeps maximum confidence', () => {
    let state = makeState();
    state = updatePartialExtractions(state, { a: 1 }, 0.9);
    state = updatePartialExtractions(state, { b: 2 }, 0.5);
    expect(state.confidence).toBe(0.9);
  });

  it('overwrites existing extraction field with new value', () => {
    let state = makeState();
    state = updatePartialExtractions(state, { category: 'Hardware' }, 0.5);
    state = updatePartialExtractions(state, { category: 'Software' }, 0.7);
    expect(state.partialExtractions.category).toBe('Software');
  });
});

// ─── updateTopicCoverageFromExtractions ───

describe('updateTopicCoverageFromExtractions', () => {
  const schema = [
    { field: 'category', type: 'enum' as const, required: true, description: 'Category', options: ['Hardware', 'Software'], topicId: 'issue_category' },
    { field: 'urgency', type: 'enum' as const, required: true, description: 'Urgency', options: ['Low', 'High'], topicId: 'urgency' },
    { field: 'description', type: 'string' as const, required: true, description: 'Description', topicId: 'description' },
    { field: 'contactMethod', type: 'string' as const, required: false, description: 'Contact', topicId: 'contact' },
  ];

  const topicsConfig: ConversationTopic[] = [
    { id: 'issue_category', name: 'Issue Category', description: 'Type', priority: 'required', depth: 'surface' },
    { id: 'urgency', name: 'Urgency', description: 'Level', priority: 'required', depth: 'surface' },
    { id: 'description', name: 'Description', description: 'Details', priority: 'required', depth: 'deep' },
    { id: 'contact', name: 'Contact', description: 'How to reach', priority: 'important', depth: 'moderate' },
  ];

  it('marks surface topic as covered with any non-empty value', () => {
    const state = makeState();
    const updated = updateTopicCoverageFromExtractions(state, { category: 'Hardware' }, schema, topicsConfig);
    const topic = updated.topics.find((t) => t.topicId === 'issue_category')!;
    expect(topic.covered).toBe(true);
  });

  it('marks enum field as covered regardless of value length', () => {
    const state = makeState();
    const updated = updateTopicCoverageFromExtractions(state, { urgency: 'Low' }, schema, topicsConfig);
    const topic = updated.topics.find((t) => t.topicId === 'urgency')!;
    expect(topic.covered).toBe(true);
  });

  it('does NOT mark deep topic as covered with short description', () => {
    const state = makeState();
    const updated = updateTopicCoverageFromExtractions(state, { description: 'broken' }, schema, topicsConfig);
    const topic = updated.topics.find((t) => t.topicId === 'description')!;
    // Short string (< 30 chars) gives depth 0.3, deep requires 0.7
    expect(topic.covered).toBe(false);
    expect(topic.depth).toBeGreaterThan(0);
  });

  it('marks deep topic as covered with substantial description', () => {
    const state = makeState();
    const longDesc = 'My laptop screen has been flickering intermittently since yesterday. It started after a Windows update was installed. I have tried restarting the computer and rolling back the update but the issue persists. The model is a Dell Latitude 5520 with asset tag DEL-55201.';
    const updated = updateTopicCoverageFromExtractions(state, { description: longDesc }, schema, topicsConfig);
    const topic = updated.topics.find((t) => t.topicId === 'description')!;
    expect(topic.covered).toBe(true);
  });

  it('skips null/undefined/empty values', () => {
    const state = makeState();
    const updated = updateTopicCoverageFromExtractions(state, { category: null, urgency: undefined, description: '' }, schema, topicsConfig);
    updated.topics.forEach((t) => {
      expect(t.covered).toBe(false);
      expect(t.depth).toBe(0);
    });
  });

  it('skips fields with no topicId mapping', () => {
    const schemaNoTopic = [{ field: 'notes', type: 'string' as const, required: false, description: 'Extra' }];
    const state = makeState();
    const updated = updateTopicCoverageFromExtractions(state, { notes: 'some notes' }, schemaNoTopic, topicsConfig);
    // All topics unchanged
    updated.topics.forEach((t) => {
      expect(t.depth).toBe(0);
    });
  });

  it('handles numeric values as surface depth', () => {
    const numSchema = [{ field: 'score', type: 'number' as const, required: false, description: 'Score', topicId: 'urgency' }];
    const state = makeState();
    const updated = updateTopicCoverageFromExtractions(state, { score: 5 }, numSchema, topicsConfig);
    const topic = updated.topics.find((t) => t.topicId === 'urgency')!;
    // Surface topic + number = covered (since urgency is surface)
    expect(topic.covered).toBe(true);
    expect(topic.depth).toBe(0.3);
  });

  it('handles array values', () => {
    const arrSchema = [{ field: 'tags', type: 'array' as const, required: false, description: 'Tags', topicId: 'contact' }];
    const state = makeState();
    const updated = updateTopicCoverageFromExtractions(state, { tags: ['email', 'phone'] }, arrSchema, topicsConfig);
    const topic = updated.topics.find((t) => t.topicId === 'contact')!;
    expect(topic.depth).toBe(0.6);
  });

  it('handles boolean values', () => {
    const boolSchema = [{ field: 'isBlocking', type: 'boolean' as const, required: false, description: 'Blocking?', topicId: 'urgency' }];
    const state = makeState();
    const updated = updateTopicCoverageFromExtractions(state, { isBlocking: true }, boolSchema, topicsConfig);
    const topic = updated.topics.find((t) => t.topicId === 'urgency')!;
    // Surface topic = always covered
    expect(topic.covered).toBe(true);
  });

  it('works without topicsConfig (defaults to surface)', () => {
    const state = makeState();
    const updated = updateTopicCoverageFromExtractions(state, { category: 'Software' }, schema);
    const topic = updated.topics.find((t) => t.topicId === 'issue_category')!;
    // Without topicsConfig, defaults to surface → covered
    expect(topic.covered).toBe(true);
  });
});

// ─── shouldCompleteConversation ───

describe('shouldCompleteConversation', () => {
  const config = makeConfig();

  it('returns true when maxTurns reached', () => {
    const state = makeState({ turnCount: 10 });
    const result = shouldCompleteConversation(state, config);
    expect(result.shouldComplete).toBe(true);
    expect(result.reason).toContain('Maximum turns');
  });

  it('returns false when required topics not covered', () => {
    const state = makeState({ turnCount: 2, confidence: 0.9 });
    const result = shouldCompleteConversation(state, config);
    expect(result.shouldComplete).toBe(false);
  });

  it('returns false when confidence below threshold', () => {
    const state = makeState({ confidence: 0.3 });
    // Cover all required topics
    state.topics = state.topics.map((t) =>
      t.priority === 'required' ? { ...t, covered: true, depth: 1 } : t
    );
    const result = shouldCompleteConversation(state, config);
    expect(result.shouldComplete).toBe(false);
  });

  it('returns true when all required topics covered and confidence met', () => {
    const state = makeState({ confidence: 0.8 });
    state.topics = state.topics.map((t) =>
      t.priority === 'required' ? { ...t, covered: true, depth: 1 } : t
    );
    const result = shouldCompleteConversation(state, config);
    expect(result.shouldComplete).toBe(true);
    expect(result.reason).toContain('All required topics');
  });

  it('ignores uncovered optional and important topics', () => {
    const state = makeState({ confidence: 0.8 });
    state.topics = state.topics.map((t) =>
      t.priority === 'required' ? { ...t, covered: true, depth: 1 } : t
    );
    // Optional/important still uncovered
    expect(state.topics.some((t) => !t.covered)).toBe(true);
    const result = shouldCompleteConversation(state, config);
    expect(result.shouldComplete).toBe(true);
  });
});

// ─── completeConversation ───

describe('completeConversation', () => {
  it('sets status to completed and completedAt', () => {
    const state = makeState();
    const completed = completeConversation(state);
    expect(completed.status).toBe('completed');
    expect(completed.completedAt).toBeInstanceOf(Date);
  });

  it('does not mutate original state', () => {
    const state = makeState();
    completeConversation(state);
    expect(state.status).toBe('active');
  });
});

// ─── abandonConversation ───

describe('abandonConversation', () => {
  it('sets status to abandoned with reason', () => {
    const state = makeState();
    const abandoned = abandonConversation(state, 'User left');
    expect(abandoned.status).toBe('abandoned');
    expect(abandoned.error).toBe('User left');
    expect(abandoned.completedAt).toBeInstanceOf(Date);
  });

  it('works without reason', () => {
    const abandoned = abandonConversation(makeState());
    expect(abandoned.status).toBe('abandoned');
    expect(abandoned.error).toBeUndefined();
  });
});

// ─── markConversationError ───

describe('markConversationError', () => {
  it('sets status to error with message', () => {
    const state = makeState();
    const errored = markConversationError(state, 'AI provider failed');
    expect(errored.status).toBe('error');
    expect(errored.error).toBe('AI provider failed');
  });
});

// ─── getCoverageSummary ───

describe('getCoverageSummary', () => {
  it('returns correct counts for fresh state', () => {
    const state = makeState();
    const summary = getCoverageSummary(state);
    expect(summary.totalTopics).toBe(5);
    expect(summary.coveredTopics).toBe(0);
    expect(summary.requiredTopics).toBe(3);
    expect(summary.coveredRequiredTopics).toBe(0);
    expect(summary.averageDepth).toBe(0);
  });

  it('counts covered topics correctly', () => {
    const state = makeState();
    state.topics[0].covered = true;
    state.topics[0].depth = 0.8;
    state.topics[1].covered = true;
    state.topics[1].depth = 0.6;
    const summary = getCoverageSummary(state);
    expect(summary.coveredTopics).toBe(2);
    expect(summary.coveredRequiredTopics).toBe(2);
    expect(summary.averageDepth).toBeCloseTo((0.8 + 0.6) / 5, 5);
  });

  it('handles empty topics array', () => {
    const state = makeState({ topics: [] } as any);
    state.topics = [];
    const summary = getCoverageSummary(state);
    expect(summary.totalTopics).toBe(0);
    expect(summary.averageDepth).toBe(0);
  });
});

// ─── calculateProgress ───

describe('calculateProgress', () => {
  it('returns 0% for fresh state', () => {
    const state = makeState();
    const progress = calculateProgress(state, makeConfig());
    expect(progress.completionPercentage).toBe(0);
    expect(progress.requiredTopicsCovered).toBe(0);
    expect(progress.totalRequiredTopics).toBe(3);
  });

  it('returns correct percentage when some required topics covered', () => {
    const state = makeState();
    state.topics[0].covered = true; // issue_category (required)
    const progress = calculateProgress(state, makeConfig());
    expect(progress.completionPercentage).toBe(33); // 1/3 rounded
  });

  it('returns 100% when all required topics covered', () => {
    const state = makeState();
    state.topics = state.topics.map((t) =>
      t.priority === 'required' ? { ...t, covered: true } : t
    );
    const progress = calculateProgress(state, makeConfig());
    expect(progress.completionPercentage).toBe(100);
  });

  it('returns 100% when no required topics exist', () => {
    const config = makeConfig({
      topics: [{ id: 'opt', name: 'Optional', description: 'test', priority: 'optional', depth: 'surface' }],
    });
    const state = createConversationState('f', config);
    const progress = calculateProgress(state, config);
    expect(progress.completionPercentage).toBe(100);
  });

  it('counts extracted fields correctly', () => {
    const state = makeState();
    state.partialExtractions = { category: 'Hardware', urgency: 'High', description: null, empty: '' };
    const progress = calculateProgress(state, makeConfig());
    expect(progress.fieldsExtracted).toBe(2); // null and '' excluded
  });

  it('identifies missing required fields', () => {
    const state = makeState();
    state.partialExtractions = { category: 'Hardware' };
    const config = makeConfig();
    const progress = calculateProgress(state, config);
    expect(progress.missingRequiredFields).toContain('urgency');
    expect(progress.missingRequiredFields).toContain('description');
    expect(progress.missingRequiredFields).not.toContain('category');
    expect(progress.missingRequiredFields).not.toContain('contactMethod'); // not required
  });

  it('works without config (no missing fields check)', () => {
    const state = makeState();
    const progress = calculateProgress(state);
    expect(progress.missingRequiredFields).toEqual([]);
  });
});

// ─── updateStateWithProgress ───

describe('updateStateWithProgress', () => {
  it('attaches progress to state', () => {
    const state = makeState();
    const updated = updateStateWithProgress(state, makeConfig());
    expect(updated.progress).toBeDefined();
    expect(updated.progress!.completionPercentage).toBe(0);
  });

  it('updates updatedAt timestamp', () => {
    const state = makeState();
    const updated = updateStateWithProgress(state);
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(state.updatedAt.getTime());
  });
});
