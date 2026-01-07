/**
 * Conversation State Management
 * 
 * Utilities for managing conversation state, topic coverage, and persistence
 */

import {
  ConversationState,
  TopicCoverage,
  ConversationalFormConfig,
  ConversationTopic,
} from '@/types/conversational';
import { Message } from '@/lib/ai/providers/base';
import { buildSystemPrompt } from './prompts';

/**
 * Generate a unique ID (browser-safe)
 */
function generateUniqueId(): string {
  // Use crypto.randomUUID if available (modern browsers), fallback to Math.random
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  // Fallback for older browsers
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Create initial conversation state
 */
export function createConversationState(
  formId: string,
  config: ConversationalFormConfig
): ConversationState {
  const conversationId = `conv_${generateUniqueId()}`;
  const now = new Date();

  // Initialize topics from config
  const topics: TopicCoverage[] = config.topics.map((topic) => ({
    topicId: topic.id,
    name: topic.name,
    covered: false,
    depth: 0,
    priority: topic.priority,
    turnCount: 0,
  }));

  // Initial system message
  const initialMessage: Message = {
    role: 'system',
    content: buildInitialSystemMessage(config),
    timestamp: now,
  };

  return {
    conversationId,
    formId,
    messages: [initialMessage],
    topics,
    partialExtractions: {},
    confidence: 0,
    turnCount: 0,
    maxTurns: config.conversationLimits.maxTurns,
    status: 'active',
    startedAt: now,
    updatedAt: now,
  };
}

/**
 * Add a message to conversation state
 */
export function addMessageToState(
  state: ConversationState,
  role: 'user' | 'assistant',
  content: string
): ConversationState {
  const newMessage: Message = {
    role,
    content,
    timestamp: new Date(),
  };

  return {
    ...state,
    messages: [...state.messages, newMessage],
    turnCount: role === 'user' ? state.turnCount + 1 : state.turnCount,
    updatedAt: new Date(),
  };
}

/**
 * Update topic coverage for a specific topic
 */
export function updateTopicCoverage(
  state: ConversationState,
  topicId: string,
  depth: number
): ConversationState {
  const topics = state.topics.map((topic) => {
    if (topic.topicId === topicId) {
      return {
        ...topic,
        covered: depth > 0,
        depth: Math.max(topic.depth, depth),
        turnCount: topic.turnCount + 1,
        lastMentionedTurn: state.turnCount,
      };
    }
    return topic;
  });

  return {
    ...state,
    topics,
    updatedAt: new Date(),
  };
}

/**
 * Analyze message and update topic coverage automatically
 * 
 * This is a simplified keyword-based approach for MVP.
 * Will be enhanced with AI-based analysis in Week 3.
 */
export function analyzeAndUpdateTopicCoverage(
  state: ConversationState,
  message: string,
  topics: ConversationTopic[]
): ConversationState {
  const messageLower = message.toLowerCase();
  let updatedState = state;

  for (const topic of topics) {
    // Check if message mentions this topic
    const keywords = [
      topic.name.toLowerCase(),
      topic.description.toLowerCase(),
      ...(topic.extractionField ? [topic.extractionField.toLowerCase()] : []),
    ];

    const mentionsTopic = keywords.some((keyword) =>
      messageLower.includes(keyword)
    );

    if (mentionsTopic) {
      // Estimate depth based on how much detail is provided
      // Simple heuristic: longer messages with topic keywords = deeper coverage
      const keywordCount = keywords.filter((kw) =>
        messageLower.includes(kw)
      ).length;
      const depth = Math.min(
        1.0,
        0.3 + keywordCount * 0.2 + (message.length > 100 ? 0.3 : 0)
      );

      updatedState = updateTopicCoverage(updatedState, topic.id, depth);
    }
  }

  return updatedState;
}

/**
 * Update partial extractions
 */
export function updatePartialExtractions(
  state: ConversationState,
  extractions: Record<string, any>,
  confidence: number
): ConversationState {
  return {
    ...state,
    partialExtractions: {
      ...state.partialExtractions,
      ...extractions,
    },
    confidence: Math.max(state.confidence, confidence),
    updatedAt: new Date(),
  };
}

/**
 * Update topic coverage based on extraction results
 * 
 * When data is extracted for a field, mark the corresponding topic as covered.
 * This is more reliable than keyword-based analysis.
 * 
 * @param state - Current conversation state
 * @param extractions - Extracted data (field -> value)
 * @param extractionSchema - Extraction schema with topicId mappings
 */
export function updateTopicCoverageFromExtractions(
  state: ConversationState,
  extractions: Record<string, any>,
  extractionSchema: Array<{ field: string; topicId?: string }>
): ConversationState {
  let updatedState = state;

  // Create a map of field -> topicId from the schema
  const fieldToTopicMap = new Map<string, string>();
  for (const schema of extractionSchema) {
    if (schema.topicId) {
      fieldToTopicMap.set(schema.field, schema.topicId);
    }
  }

  for (const [field, value] of Object.entries(extractions)) {
    // Skip if value is empty/null/undefined
    if (value === undefined || value === null || value === '') {
      continue;
    }

    // Get topic ID for this field from schema
    const topicId = fieldToTopicMap.get(field);
    if (!topicId) {
      continue; // No topic mapping for this field
    }

    // Find the topic in state
    const topicIndex = updatedState.topics.findIndex(t => t.topicId === topicId);
    if (topicIndex === -1) {
      console.warn(`[Topic Coverage] Topic ${topicId} not found in state for field ${field}`);
      continue; // Topic not found in state
    }

    // Determine depth based on value type and content
    let depth = 0.5; // Default moderate depth
    
    if (typeof value === 'string') {
      // For strings, depth increases with length and detail
      if (value.length > 100) {
        depth = 1.0; // Deep coverage
      } else if (value.length > 50) {
        depth = 0.7; // Moderate-deep coverage
      } else if (value.length > 20) {
        depth = 0.5; // Moderate coverage
      } else {
        depth = 0.3; // Surface coverage
      }
    } else if (typeof value === 'number') {
      // Numbers are usually surface-level (like urgency level)
      depth = 0.3;
    } else if (typeof value === 'boolean') {
      depth = 0.3;
    } else if (Array.isArray(value) && value.length > 0) {
      depth = 0.6;
    } else if (typeof value === 'object' && value !== null) {
      depth = 0.7;
    }

    // Update topic coverage
    updatedState = updateTopicCoverage(updatedState, topicId, depth);
    
    console.log(`[Topic Coverage] Updated ${topicId} (field: ${field}) to depth ${depth.toFixed(2)}, covered: true`);
  }

  return updatedState;
}

/**
 * Check if conversation should be completed
 */
export function shouldCompleteConversation(
  state: ConversationState,
  config: ConversationalFormConfig
): {
  shouldComplete: boolean;
  reason?: string;
} {
  // Check turn limit
  if (state.turnCount >= state.maxTurns) {
    return {
      shouldComplete: true,
      reason: 'Maximum turns reached',
    };
  }

  // Check required topics coverage
  const requiredTopics = state.topics.filter(
    (t) => t.priority === 'required'
  );
  const coveredRequiredTopics = requiredTopics.filter((t) => t.covered);

  if (coveredRequiredTopics.length < requiredTopics.length) {
    return { shouldComplete: false };
  }

  // Check confidence threshold
  if (state.confidence < config.conversationLimits.minConfidence) {
    return { shouldComplete: false };
  }

  // All required topics covered and confidence threshold met
  return {
    shouldComplete: true,
    reason: 'All required topics covered with sufficient confidence',
  };
}

/**
 * Mark conversation as completed
 */
export function completeConversation(
  state: ConversationState
): ConversationState {
  return {
    ...state,
    status: 'completed',
    completedAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Mark conversation as abandoned
 */
export function abandonConversation(
  state: ConversationState,
  reason?: string
): ConversationState {
  return {
    ...state,
    status: 'abandoned',
    completedAt: new Date(),
    updatedAt: new Date(),
    error: reason,
  };
}

/**
 * Mark conversation as error
 */
export function markConversationError(
  state: ConversationState,
  error: string
): ConversationState {
  return {
    ...state,
    status: 'error',
    updatedAt: new Date(),
    error,
  };
}

/**
 * Get coverage summary
 */
export function getCoverageSummary(state: ConversationState): {
  totalTopics: number;
  coveredTopics: number;
  requiredTopics: number;
  coveredRequiredTopics: number;
  averageDepth: number;
} {
  const coveredTopics = state.topics.filter((t) => t.covered).length;
  const requiredTopics = state.topics.filter((t) => t.priority === 'required');
  const coveredRequiredTopics = requiredTopics.filter((t) => t.covered).length;
  const averageDepth =
    state.topics.length > 0
      ? state.topics.reduce((sum, t) => sum + t.depth, 0) / state.topics.length
      : 0;

  return {
    totalTopics: state.topics.length,
    coveredTopics,
    requiredTopics: requiredTopics.length,
    coveredRequiredTopics,
    averageDepth,
  };
}

/**
 * Build initial system message from config
 *
 * Note: This is a simplified version. The full prompt engineering
 * is handled by buildSystemPrompt() in prompts.ts
 */
function buildInitialSystemMessage(
  config: ConversationalFormConfig
): string {
  return buildSystemPrompt(config) + '\n\nBegin the conversation with a friendly greeting and ask about the first topic.';
}

/**
 * Build persona prompt
 */
function buildPersonaPrompt(
  persona: ConversationalFormConfig['persona']
): string {
  if (persona.style === 'custom' && persona.customPrompt) {
    return persona.customPrompt;
  }

  const styleDescriptions: Record<string, string> = {
    professional:
      'Maintain a professional, courteous tone. Use clear, formal language.',
    friendly:
      'Be warm, approachable, and conversational. Use friendly language and show genuine interest.',
    casual:
      'Keep it relaxed and informal. Use everyday language and be conversational.',
    empathetic:
      'Show empathy and understanding. Be sensitive to the respondent\'s situation and feelings.',
  };

  let prompt = styleDescriptions[persona.style] || styleDescriptions.friendly;

  if (persona.behaviors && persona.behaviors.length > 0) {
    prompt += `\n\nBehaviors:\n${persona.behaviors.map((b) => `- ${b}`).join('\n')}`;
  }

  if (persona.restrictions && persona.restrictions.length > 0) {
    prompt += `\n\nRestrictions:\n${persona.restrictions.map((r) => `- Do not ${r}`).join('\n')}`;
  }

  return prompt;
}
