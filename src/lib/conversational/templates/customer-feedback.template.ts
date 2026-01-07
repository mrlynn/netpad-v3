/**
 * Customer Feedback Template
 *
 * Pre-configured template for gathering customer feedback through conversation.
 */

import { ConversationTemplate } from './types';
import { ConversationTopic, ExtractionSchema } from '@/types/conversational';
import { DefaultPromptStrategy } from '../strategies/prompt';

/**
 * Customer Feedback topics
 */
export const CUSTOMER_FEEDBACK_TOPICS: ConversationTopic[] = [
  {
    id: 'satisfaction',
    name: 'Overall Satisfaction',
    description:
      'Determine overall satisfaction level with the product or service',
    priority: 'required',
    depth: 'moderate',
    extractionField: 'satisfactionRating',
  },
  {
    id: 'experience',
    name: 'Experience Details',
    description:
      'Get specific details about their experience - what worked well and what could be improved',
    priority: 'required',
    depth: 'deep',
    extractionField: 'experienceDetails',
  },
  {
    id: 'recommendation',
    name: 'Likelihood to Recommend',
    description:
      'Determine how likely they are to recommend to others (NPS-style)',
    priority: 'important',
    depth: 'surface',
    extractionField: 'npsScore',
  },
  {
    id: 'suggestions',
    name: 'Improvement Suggestions',
    description:
      'Gather specific suggestions for how to improve the product or service',
    priority: 'important',
    depth: 'moderate',
    extractionField: 'suggestions',
  },
];

/**
 * Customer Feedback extraction schema
 */
export const CUSTOMER_FEEDBACK_SCHEMA: ExtractionSchema[] = [
  {
    field: 'satisfactionRating',
    type: 'enum',
    required: true,
    description: 'Overall satisfaction level',
    options: ['very_satisfied', 'satisfied', 'neutral', 'dissatisfied', 'very_dissatisfied'],
    topicId: 'satisfaction',
  },
  {
    field: 'experienceDetails',
    type: 'string',
    required: true,
    description: 'Detailed feedback about their experience',
    validation: { minLength: 20 },
    topicId: 'experience',
  },
  {
    field: 'positiveAspects',
    type: 'array',
    required: false,
    description: 'Things they liked or found valuable',
  },
  {
    field: 'negativeAspects',
    type: 'array',
    required: false,
    description: 'Things they disliked or found frustrating',
  },
  {
    field: 'npsScore',
    type: 'number',
    required: false,
    description: 'Likelihood to recommend on a scale of 0-10',
    validation: { min: 0, max: 10 },
    topicId: 'recommendation',
  },
  {
    field: 'suggestions',
    type: 'string',
    required: false,
    description: 'Specific improvement suggestions',
    topicId: 'suggestions',
  },
  {
    field: 'wouldUseAgain',
    type: 'boolean',
    required: false,
    description: 'Whether they would use the product/service again',
  },
];

/**
 * Customer Feedback Template Definition
 */
export const customerFeedbackTemplate: ConversationTemplate = {
  id: 'customer-feedback',
  name: 'Customer Feedback',
  description: 'Gather detailed customer feedback through friendly conversation',
  category: 'feedback',
  icon: 'RateReview',
  version: '1.0.0',
  isBuiltIn: true,

  promptStrategy: new DefaultPromptStrategy(),

  defaultConfig: {
    objective:
      'Gather meaningful feedback about the customer experience to help improve our products and services.',
    context:
      'This is a customer feedback conversation. Be friendly, appreciative, and genuinely interested in their perspective.',
    persona: {
      style: 'friendly',
      tone: 'warm and appreciative',
      behaviors: [
        'Thank them for taking the time to share feedback',
        'Show genuine interest in their experience',
        'Ask follow-up questions to understand their perspective',
        'Acknowledge both positive and negative feedback gracefully',
      ],
      restrictions: [
        'Do not be defensive about negative feedback',
        'Do not make promises about changes',
        'Keep the conversation focused on their experience',
      ],
    },
    conversationLimits: {
      maxTurns: 12,
      maxDuration: 20,
      minConfidence: 0.7,
    },
  },

  defaultTopics: CUSTOMER_FEEDBACK_TOPICS,
  defaultSchema: CUSTOMER_FEEDBACK_SCHEMA,

  metadata: {
    previewDescription:
      'Perfect for gathering customer insights. Collects satisfaction rating, detailed feedback, NPS score, and improvement suggestions.',
    useCases: [
      'Post-purchase feedback',
      'Service satisfaction surveys',
      'Product feedback collection',
      'Customer experience research',
    ],
    tags: ['feedback', 'customer', 'survey', 'nps'],
    estimatedDuration: 4,
    author: 'NetPad',
    updatedAt: new Date('2026-01-07'),
  },
};

export default customerFeedbackTemplate;
