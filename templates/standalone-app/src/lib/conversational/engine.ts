/**
 * Conversational Form Engine (Standalone Version)
 *
 * Manages conversational form flow, topic coverage, and completion detection.
 */

import { v4 as uuidv4 } from 'uuid';
import { Message } from '@/lib/ai/providers/base';
import {
  ConversationState,
  ConversationalFormConfig,
  TopicCoverage,
} from '@/types/conversational';

/**
 * Conversation Engine
 *
 * Manages the lifecycle of a conversational form session.
 */
export class ConversationEngine {
  private state: ConversationState;
  private config: ConversationalFormConfig;

  constructor(formId: string, config: ConversationalFormConfig) {
    this.config = config;
    this.state = this.initializeState(formId);
  }

  /**
   * Initialize a new conversation state
   */
  private initializeState(formId: string): ConversationState {
    const topics: TopicCoverage[] = this.config.topics.map((topic) => ({
      topicId: topic.id,
      name: topic.name,
      covered: false,
      depth: 0,
      priority: topic.priority,
      turnCount: 0,
    }));

    return {
      conversationId: uuidv4(),
      formId,
      messages: [],
      topics,
      partialExtractions: {},
      confidence: 0,
      turnCount: 0,
      maxTurns: this.config.conversationLimits.maxTurns,
      status: 'active',
      startedAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Get current conversation state
   */
  getState(): ConversationState {
    return { ...this.state };
  }

  /**
   * Get the configuration
   */
  getConfig(): ConversationalFormConfig {
    return this.config;
  }

  /**
   * Build system prompt based on persona and objective
   */
  buildSystemPrompt(): string {
    const { persona, objective, context, topics } = this.config;

    let prompt = '';

    // Add persona configuration
    switch (persona.style) {
      case 'professional':
        prompt += 'You are a professional assistant helping to gather information. ';
        prompt += 'Be clear, concise, and thorough. ';
        break;
      case 'friendly':
        prompt += 'You are a friendly and helpful assistant. ';
        prompt += 'Be warm and approachable while gathering information. ';
        break;
      case 'empathetic':
        prompt += 'You are an empathetic and understanding assistant. ';
        prompt += 'Be patient and supportive while gathering information. ';
        break;
      case 'casual':
        prompt += 'You are a casual and relaxed assistant. ';
        prompt += 'Keep the conversation natural and easy-going. ';
        break;
      case 'custom':
        if (persona.customPrompt) {
          prompt += persona.customPrompt + ' ';
        }
        break;
    }

    if (persona.tone) {
      prompt += `Your tone should be ${persona.tone}. `;
    }

    // Add objective
    prompt += `\n\nYour objective: ${objective}\n`;

    // Add context if provided
    if (context) {
      prompt += `\nContext: ${context}\n`;
    }

    // Add topics to explore
    prompt += '\nTopics to explore with the user:\n';
    topics.forEach((topic, index) => {
      prompt += `${index + 1}. ${topic.name}: ${topic.description}`;
      prompt += ` (Priority: ${topic.priority}, Depth: ${topic.depth})\n`;
    });

    // Add behaviors
    if (persona.behaviors && persona.behaviors.length > 0) {
      prompt += '\nBehaviors to exhibit:\n';
      persona.behaviors.forEach((behavior) => {
        prompt += `- ${behavior}\n`;
      });
    }

    // Add restrictions
    if (persona.restrictions && persona.restrictions.length > 0) {
      prompt += '\nRestrictions (things to avoid):\n';
      persona.restrictions.forEach((restriction) => {
        prompt += `- ${restriction}\n`;
      });
    }

    // Add conversation guidelines
    prompt += `
Guidelines:
- Ask one question at a time to keep the conversation focused
- Acknowledge the user's responses before moving to the next topic
- Be flexible and follow up on interesting details
- When you have gathered enough information on all required topics, wrap up the conversation
- Keep responses concise but informative
`;

    return prompt;
  }

  /**
   * Add a user message and increment turn count
   */
  addUserMessage(content: string): void {
    this.state.messages.push({
      role: 'user',
      content,
      timestamp: new Date(),
    });
    this.state.turnCount++;
    this.state.updatedAt = new Date();
  }

  /**
   * Add an assistant response
   */
  addAssistantMessage(content: string): void {
    this.state.messages.push({
      role: 'assistant',
      content,
      timestamp: new Date(),
    });
    this.state.updatedAt = new Date();
  }

  /**
   * Update partial extractions
   */
  updateExtractions(extractions: Record<string, any>, confidence: number): void {
    this.state.partialExtractions = {
      ...this.state.partialExtractions,
      ...extractions,
    };
    this.state.confidence = confidence;
    this.state.updatedAt = new Date();
  }

  /**
   * Update topic coverage based on message analysis
   */
  updateTopicCoverage(coveredTopicIds: string[]): void {
    for (const topic of this.state.topics) {
      if (coveredTopicIds.includes(topic.topicId)) {
        topic.covered = true;
        topic.turnCount++;
        topic.lastMentionedTurn = this.state.turnCount;
        topic.depth = Math.min(1, topic.depth + 0.25);
      }
    }
    this.state.updatedAt = new Date();
  }

  /**
   * Check if conversation should be completed
   */
  shouldComplete(): {
    complete: boolean;
    reason?: 'confidence' | 'turns' | 'topics';
  } {
    const { minConfidence, maxTurns } = this.config.conversationLimits;

    // Check if max turns reached
    if (this.state.turnCount >= maxTurns) {
      return { complete: true, reason: 'turns' };
    }

    // Check required topics coverage
    const requiredTopics = this.state.topics.filter((t) => t.priority === 'required');
    const allRequiredCovered = requiredTopics.every((t) => t.covered);

    // Check confidence threshold
    if (this.state.confidence >= minConfidence && allRequiredCovered) {
      return { complete: true, reason: 'confidence' };
    }

    // Check if all topics covered (even optional ones)
    const allTopicsCovered = this.state.topics.every((t) => t.covered);
    if (allTopicsCovered && this.state.confidence >= minConfidence * 0.8) {
      return { complete: true, reason: 'topics' };
    }

    return { complete: false };
  }

  /**
   * Mark conversation as completed
   */
  complete(): void {
    this.state.status = 'completed';
    this.state.completedAt = new Date();
    this.state.updatedAt = new Date();
  }

  /**
   * Mark conversation as abandoned
   */
  abandon(): void {
    this.state.status = 'abandoned';
    this.state.updatedAt = new Date();
  }

  /**
   * Mark conversation as errored
   */
  setError(error: string): void {
    this.state.status = 'error';
    this.state.error = error;
    this.state.updatedAt = new Date();
  }

  /**
   * Get uncovered topics for guidance
   */
  getUncoveredTopics(): TopicCoverage[] {
    return this.state.topics.filter((t) => !t.covered);
  }

  /**
   * Get next recommended topic to explore
   */
  getNextTopic(): TopicCoverage | null {
    const uncovered = this.getUncoveredTopics();

    // Prioritize required topics first
    const required = uncovered.filter((t) => t.priority === 'required');
    if (required.length > 0) return required[0];

    // Then important topics
    const important = uncovered.filter((t) => t.priority === 'important');
    if (important.length > 0) return important[0];

    // Then optional topics
    const optional = uncovered.filter((t) => t.priority === 'optional');
    if (optional.length > 0) return optional[0];

    return null;
  }

  /**
   * Restore state from a saved conversation
   */
  restoreState(savedState: ConversationState): void {
    this.state = { ...savedState };
  }
}

/**
 * Create a new conversation engine
 */
export function createConversationEngine(
  formId: string,
  config: ConversationalFormConfig
): ConversationEngine {
  return new ConversationEngine(formId, config);
}
