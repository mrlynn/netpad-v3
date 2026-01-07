/**
 * Conversation Engine Core
 *
 * Orchestrates the conversation flow, topic coverage, and completion detection
 */

import {
  ConversationalFormConfig,
  ConversationState,
  ConversationTopic,
} from '@/types/conversational';
import { Message } from '@/lib/ai/providers/base';
import {
  buildConversationContext,
  getNextTopicGuidance,
  buildWrapUpPrompt,
} from './prompts';
import {
  addMessageToState,
  analyzeAndUpdateTopicCoverage,
  shouldCompleteConversation,
  createConversationState,
} from './state';
import { getTemplateById } from './templates';
import { PromptStrategy, DefaultPromptStrategy } from './strategies/prompt';

/**
 * Get the prompt strategy for a config
 *
 * Checks templateId first, then falls back to useITHelpdeskTemplate for backward compatibility
 */
function getPromptStrategyForConfig(config: ConversationalFormConfig): PromptStrategy {
  // Check for templateId first (new pattern)
  if (config.templateId) {
    const template = getTemplateById(config.templateId);
    if (template) {
      return template.promptStrategy;
    }
  }

  // Backward compatibility: check useITHelpdeskTemplate flag
  if (config.useITHelpdeskTemplate) {
    const itTemplate = getTemplateById('it-helpdesk');
    if (itTemplate) {
      return itTemplate.promptStrategy;
    }
  }

  // Default strategy
  return new DefaultPromptStrategy();
}

/**
 * Conversation engine that manages the flow of a conversational form
 */
export class ConversationEngine {
  private config: ConversationalFormConfig;
  private state: ConversationState;
  private messages: Message[] = [];
  private promptStrategy: PromptStrategy;

  constructor(config: ConversationalFormConfig, formId?: string) {
    this.config = config;
    this.state = createConversationState(formId || 'temp', config);
    this.promptStrategy = getPromptStrategyForConfig(config);
  }

  /**
   * Initialize conversation with system prompt
   */
  initialize(): Message[] {
    // Only initialize if we don't already have messages (preserve existing conversation)
    if (this.messages.length === 0) {
      // Use template's prompt strategy if available, otherwise fall back to legacy behavior
      const systemPrompt = this.getSystemPrompt();

      const systemMessage: Message = {
        role: 'system',
        content: systemPrompt,
        timestamp: new Date(),
      };

      this.messages = [systemMessage];
    } else {
      // Update system message if it exists, but preserve other messages
      const systemPrompt = this.getSystemPrompt();

      const existingSystemIndex = this.messages.findIndex(m => m.role === 'system');
      if (existingSystemIndex >= 0) {
        this.messages[existingSystemIndex] = {
          role: 'system',
          content: systemPrompt,
          timestamp: new Date(),
        };
      } else {
        // Add system message at the beginning
        this.messages.unshift({
          role: 'system',
          content: systemPrompt,
          timestamp: new Date(),
        });
      }
    }
    return [...this.messages];
  }

  /**
   * Get the system prompt using the appropriate strategy
   */
  private getSystemPrompt(): string {
    // Use the prompt strategy (handles templates and backward compatibility)
    return this.promptStrategy.buildSystemPrompt(this.config);
  }

  /**
   * Process user message and generate assistant response context
   */
  processUserMessage(
    userMessage: string
  ): {
    messages: Message[];
    state: ConversationState;
    guidance: string;
    shouldComplete: boolean;
  } {
    // Debug: Log current message count before adding new message
    console.log('[ConversationEngine] Before processUserMessage:', {
      currentMessageCount: this.messages.length,
      messageRoles: this.messages.map(m => m.role),
      userMessage: userMessage.substring(0, 50),
    });
    
    // Add user message
    const userMsg: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    this.messages.push(userMsg);

    // Update state with new turn
    this.state = addMessageToState(this.state, 'user', userMessage);
    
    // Debug: Log after adding message
    console.log('[ConversationEngine] After adding user message:', {
      messageCount: this.messages.length,
      messageRoles: this.messages.map(m => m.role),
    });

    // Analyze topic coverage from user message
    this.state = analyzeAndUpdateTopicCoverage(
      this.state,
      userMessage,
      this.config.topics
    );

    // Get guidance for next response
    const topicGuidance = getNextTopicGuidance(this.state, this.config);
    const contextGuidance = buildConversationContext(this.state, this.config);
    const wrapUpGuidance = buildWrapUpPrompt(this.state, this.config);

    // Determine if conversation should complete
    const completionCheck = shouldCompleteConversation(this.state, this.config);

    // Build guidance for LLM
    let guidance = contextGuidance;
    if (!completionCheck.shouldComplete) {
      guidance += `\n\n${topicGuidance.guidance}`;
    } else {
      guidance += `\n\n${wrapUpGuidance}`;
    }

    return {
      messages: [...this.messages],
      state: this.state,
      guidance,
      shouldComplete: completionCheck.shouldComplete,
    };
  }

  /**
   * Add assistant response to conversation
   */
  addAssistantResponse(content: string): Message[] {
    const assistantMsg: Message = {
      role: 'assistant',
      content,
      timestamp: new Date(),
    };
    this.messages.push(assistantMsg);
    this.state = addMessageToState(this.state, 'assistant', content);
    return [...this.messages];
  }

  /**
   * Get current conversation state
   */
  getState(): ConversationState {
    return { ...this.state };
  }

  /**
   * Get all messages
   */
  getMessages(): Message[] {
    return [...this.messages];
  }

  /**
   * Get messages formatted for LLM API
   */
  getMessagesForLLM(): Array<{ role: string; content: string }> {
    return this.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /**
   * Update state (e.g., from persistence)
   */
  setState(state: ConversationState): void {
    this.state = state;
    // Restore messages from state to maintain conversation history
    this.messages = state.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp instanceof Date ? msg.timestamp : (msg.timestamp ? new Date(msg.timestamp) : new Date()),
    }));
  }

  /**
   * Update messages (e.g., from persistence)
   */
  setMessages(messages: Message[]): void {
    this.messages = messages;
  }

  /**
   * Check if conversation is complete
   */
  isComplete(): boolean {
    return shouldCompleteConversation(this.state, this.config).shouldComplete;
  }

  /**
   * Get completion reason
   */
  getCompletionReason(): string | null {
    const check = shouldCompleteConversation(this.state, this.config);
    return check.shouldComplete ? (check.reason || null) : null;
  }

  /**
   * Get uncovered required topics
   */
  getUncoveredRequiredTopics(): ConversationTopic[] {
    const uncovered = this.state.topics.filter(
      (t) => !t.covered && t.priority === 'required'
    );
    return uncovered
      .map((t) => this.config.topics.find((ct) => ct.id === t.topicId))
      .filter((t): t is ConversationTopic => t !== undefined);
  }

  /**
   * Get topic coverage summary
   */
  getTopicCoverageSummary(): {
    total: number;
    covered: number;
    required: number;
    requiredCovered: number;
    important: number;
    importantCovered: number;
  } {
    const total = this.state.topics.length;
    const covered = this.state.topics.filter((t) => t.covered).length;
    const required = this.state.topics.filter((t) => t.priority === 'required')
      .length;
    const requiredCovered = this.state.topics.filter(
      (t) => t.priority === 'required' && t.covered
    ).length;
    const important = this.state.topics.filter(
      (t) => t.priority === 'important'
    ).length;
    const importantCovered = this.state.topics.filter(
      (t) => t.priority === 'important' && t.covered
    ).length;

    return {
      total,
      covered,
      required,
      requiredCovered,
      important,
      importantCovered,
    };
  }
}

/**
 * Create a conversation engine instance
 */
export function createConversationEngine(
  config: ConversationalFormConfig
): ConversationEngine {
  return new ConversationEngine(config);
}
