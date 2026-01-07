/**
 * Prompt Engineering Framework for Conversational Forms
 * 
 * Generates system prompts and conversation guidance based on form configuration
 */

import {
  ConversationalFormConfig,
  ConversationTopic,
  ConversationPersona,
} from '@/types/conversational';
import { ConversationState } from '@/types/conversational';

/**
 * Build system prompt from conversational form configuration
 */
export function buildSystemPrompt(config: ConversationalFormConfig): string {
  const { objective, context, topics, persona } = config;

  let prompt = `You are a helpful AI assistant conducting a conversation to gather information for a form.

## Objective
${objective}

${context ? `## Context\n${context}\n` : ''}

## Topics to Explore
${topics
  .map(
    (t) =>
      `- **${t.name}** (${t.priority} priority, ${t.depth} depth): ${t.description}`
  )
  .join('\n')}

## Your Role
${buildPersonaSection(persona)}

## Guidelines
- Ask questions naturally and conversationally
- Probe deeper when needed, especially for required topics
- Be empathetic and helpful
- Keep the conversation focused on gathering the required information
- When you have enough information, summarize what you've learned and confirm completion
- If the user provides information for multiple topics in one response, acknowledge all of them
- Don't repeat questions you've already asked unless clarification is needed

## Conversation Flow
1. Start with a friendly greeting
2. Begin exploring topics in order of priority (required first, then important, then optional)
3. For each topic, ask follow-up questions to reach the desired depth
4. When all required topics are covered with sufficient depth, summarize and confirm`;

  return prompt;
}

/**
 * Build persona section of prompt
 */
function buildPersonaSection(persona: ConversationPersona): string {
  if (persona.style === 'custom' && persona.customPrompt) {
    return persona.customPrompt;
  }

  const styleDescriptions: Record<string, string> = {
    professional:
      'Maintain a professional, courteous tone. Use clear, formal language. Be efficient and respectful.',
    friendly:
      'Be warm, approachable, and conversational. Use friendly language and show genuine interest. Make the conversation feel natural and comfortable.',
    casual:
      'Keep it relaxed and informal. Use everyday language and be conversational. Do not be overly formal.',
    empathetic:
      'Show empathy and understanding. Be sensitive to the respondent\'s situation and feelings. Acknowledge their concerns and be supportive.',
  };

  let section = styleDescriptions[persona.style] || styleDescriptions.friendly;

  if (persona.tone) {
    section += `\n\nTone: ${persona.tone}`;
  }

  if (persona.behaviors && persona.behaviors.length > 0) {
    section += `\n\nBehaviors you should exhibit:\n${persona.behaviors.map((b) => `- ${b}`).join('\n')}`;
  }

  if (persona.restrictions && persona.restrictions.length > 0) {
    section += `\n\nThings to avoid:\n${persona.restrictions.map((r) => `- ${r}`).join('\n')}`;
  }

  return section;
}

/**
 * Build conversation context prompt (for ongoing conversations)
 * 
 * Includes what topics have been covered and what still needs to be explored
 */
export function buildConversationContext(
  state: ConversationState,
  config: ConversationalFormConfig
): string {
  const coveredTopics = state.topics.filter((t) => t.covered);
  const uncoveredRequiredTopics = state.topics.filter(
    (t) => !t.covered && t.priority === 'required'
  );
  const uncoveredImportantTopics = state.topics.filter(
    (t) => !t.covered && t.priority === 'important'
  );

  // Build summary of what's been discussed so far
  const userMessages = state.messages.filter(m => m.role === 'user').slice(-5); // Last 5 user messages
  const assistantMessages = state.messages.filter(m => m.role === 'assistant').slice(-5); // Last 5 assistant messages
  const conversationSummary = userMessages.length > 0 || assistantMessages.length > 0
    ? `\n### Recent Conversation History:\n${state.messages.slice(-10).map((msg, idx) => {
        const role = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'You' : 'System';
        return `${role}: ${msg.content}`;
      }).join('\n')}`
    : '';

  let context = `## Conversation Progress

Turn: ${state.turnCount} / ${state.maxTurns}
Confidence: ${Math.round(state.confidence * 100)}%
${conversationSummary}

### Topics Covered
${coveredTopics.length > 0
    ? coveredTopics
        .map(
          (t) =>
            `- ${t.name} (${Math.round(t.depth * 100)}% depth, ${t.turnCount} mentions)`
        )
        .join('\n')
    : 'None yet'}

### Topics Still Needed
${uncoveredRequiredTopics.length > 0
    ? `**Required (must cover):**\n${uncoveredRequiredTopics
        .map((t) => `- ${t.name}: ${config.topics.find((ct) => ct.id === t.topicId)?.description || ''}`)
        .join('\n')}`
    : ''}
${uncoveredImportantTopics.length > 0
    ? `**Important (should cover):**\n${uncoveredImportantTopics
        .map((t) => `- ${t.name}: ${config.topics.find((ct) => ct.id === t.topicId)?.description || ''}`)
        .join('\n')}`
    : ''}

### Next Steps
${uncoveredRequiredTopics.length > 0
    ? `Focus on required topics first. Ask about: ${uncoveredRequiredTopics[0].name}`
    : uncoveredImportantTopics.length > 0
    ? `Move to important topics. Ask about: ${uncoveredImportantTopics[0].name}`
    : 'All required topics covered. Summarize and confirm completion.'}

**CRITICAL**: Reference what the user has already told you in the conversation history above. Don't ask questions about information they've already provided. Build on what they've said, don't repeat yourself.`;

  return context;
}

/**
 * Build topic-specific guidance for the next question
 */
export function getNextTopicGuidance(
  state: ConversationState,
  config: ConversationalFormConfig
): {
  topic?: ConversationTopic;
  guidance: string;
} {
  // Find next uncovered required topic
  const uncoveredRequired = state.topics.find(
    (t) => !t.covered && t.priority === 'required'
  );

  if (uncoveredRequired) {
    const topicConfig = config.topics.find((t) => t.id === uncoveredRequired.topicId);
    if (topicConfig) {
      return {
        topic: topicConfig,
        guidance: `Ask about ${topicConfig.name}. This is a required topic with ${topicConfig.depth} depth. ${topicConfig.description}`,
      };
    }
  }

  // Find next uncovered important topic
  const uncoveredImportant = state.topics.find(
    (t) => !t.covered && t.priority === 'important'
  );

  if (uncoveredImportant) {
    const topicConfig = config.topics.find((t) => t.id === uncoveredImportant.topicId);
    if (topicConfig) {
      return {
        topic: topicConfig,
        guidance: `Ask about ${topicConfig.name}. This is an important topic. ${topicConfig.description}`,
      };
    }
  }

  // All required/important topics covered
  return {
    guidance: 'All required and important topics are covered. Summarize what you\'ve learned and confirm if the user has anything else to add before completing.',
  };
}

/**
 * Build IT Helpdesk-specific system prompt
 */
export function buildITHelpdeskPrompt(): string {
  return `You are a helpful IT support agent conducting a ticket intake conversation. Your goal is to gather all necessary information to create a support ticket.

## Objective
Collect information about an IT support issue to create a ticket that can be properly triaged and assigned.

## Topics to Explore

### Issue Category (Required, Moderate Depth)
Determine the type of IT issue:
- **Hardware**: Problems with physical devices (laptops, monitors, printers, keyboards, mice, etc.). This includes:
  - Lost or stolen devices (e.g., "I lost my laptop" = Hardware issue)
  - Broken or damaged devices
  - Devices that won't turn on or power issues
  - Physical defects or malfunctions
- **Software**: Issues with applications, programs, or operating systems:
  - Application crashes or errors
  - Software not working correctly
  - Installation problems
  - Performance issues with specific programs
- **Network**: Connectivity, internet, or network access problems:
  - Can't connect to Wi-Fi
  - Internet is slow or not working
  - VPN connection issues
  - Network printer access
- **Access & Permissions**: Account access, password resets, permission changes:
  - Can't log in to account
  - Password reset needed
  - Need access to a system or resource
  - Permission denied errors
- **Other**: Anything that doesn't fit the above categories

**Important**: Use common sense to categorize issues. For example:
- "I lost my laptop" → Hardware (lost/stolen device)
- "My laptop won't turn on" → Hardware (power/device issue)
- "I can't log in to my email" → Access & Permissions
- "The application keeps crashing" → Software
- "I can't connect to Wi-Fi" → Network

Ask follow-up questions to clarify the specific issue within the category, but don't ask redundant questions if the category is already clear.

### Urgency Level (Required, Surface Depth)
Determine how urgent this issue is:
- Low: Minor inconvenience, can wait
- Medium: Affecting work but not blocking
- High: Significantly impacting work
- Critical: Blocking critical work or system-wide issue

### Description (Required, Deep Depth)
Get a detailed description of the issue:
- What exactly is happening?
- When did it start?
- What were they doing when it started?
- What have they tried already?
- Any error messages?
- How many people are affected?

### Contact Preferences (Important, Moderate Depth)
How to reach the requester:
- Preferred contact method (email, phone, chat)
- Best time to reach them
- Any availability constraints

## Your Role
- Be professional but friendly
- Show empathy for technical frustrations
- **Remember all previous conversation details** - reference what the user has already told you
- Ask clarifying questions to ensure you understand the issue
- For hardware issues, ask for asset ID or serial number if available
- For software issues, ask for application name and version
- For network issues, ask about location and affected devices
- For access issues, ask for system/resource name

## Guidelines
- Start with a friendly greeting: "Hi! I'm here to help you submit an IT support ticket. What kind of issue are you experiencing?"
- **CRITICAL: Always remember and reference previous messages in the conversation**
- If the user says "I lost my laptop", immediately recognize this as a Hardware issue (lost/stolen device) and ask about:
  - When it was lost
  - Asset ID or serial number if known
  - Whether it needs to be disabled/remotely wiped for security
  - Whether they need a replacement device
- If the issue is urgent, acknowledge it and prioritize gathering critical information
- Be thorough but efficient - don't ask redundant questions
- **Don't ask about issue category if it's already clear from the user's description**
- When you have all required information, summarize the ticket details and confirm

## Example Flow
1. Greeting + ask about issue type
2. Probe for details based on category
3. Determine urgency
4. Get detailed description
5. Ask about contact preferences
6. Summarize and confirm`;
}

/**
 * Build extraction guidance for a specific topic
 */
export function buildExtractionGuidance(
  topic: ConversationTopic,
  config: ConversationalFormConfig
): string {
  const extractionField = config.extractionSchema.find(
    (s) => s.topicId === topic.id || s.field === topic.extractionField
  );

  if (!extractionField) {
    return `Extract information about ${topic.name} from the conversation.`;
  }

  let guidance = `Extract the ${extractionField.field} field (${extractionField.type}) from the conversation about ${topic.name}.`;

  if (extractionField.type === 'enum' && extractionField.options) {
    guidance += ` Valid values: ${extractionField.options.join(', ')}.`;
  }

  if (extractionField.required) {
    guidance += ' This field is required.';
  }

  if (extractionField.description) {
    guidance += ` ${extractionField.description}`;
  }

  return guidance;
}

/**
 * Build wrap-up prompt when conversation should complete
 */
export function buildWrapUpPrompt(
  state: ConversationState,
  config: ConversationalFormConfig
): string {
  const coveredTopics = state.topics.filter((t) => t.covered);
  const missingRequired = state.topics.filter(
    (t) => !t.covered && t.priority === 'required'
  );

  if (missingRequired.length > 0) {
    return `You still need to cover these required topics: ${missingRequired.map((t) => t.name).join(', ')}. Continue the conversation to gather this information.`;
  }

  return `You have gathered all required information. Summarize what you've learned in a clear, concise way, and confirm with the user that everything is correct. Then thank them and let them know their ticket/request has been submitted.`;
}
