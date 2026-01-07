/**
 * General Intake Template
 *
 * A flexible template for general information gathering conversations.
 */

import { ConversationTemplate } from './types';
import { ConversationTopic, ExtractionSchema } from '@/types/conversational';
import { DefaultPromptStrategy } from '../strategies/prompt';

/**
 * General Intake topics
 */
export const GENERAL_INTAKE_TOPICS: ConversationTopic[] = [
  {
    id: 'purpose',
    name: 'Purpose',
    description:
      'Understand the main purpose or reason for reaching out',
    priority: 'required',
    depth: 'moderate',
    extractionField: 'purpose',
  },
  {
    id: 'details',
    name: 'Details',
    description:
      'Gather detailed information about their request or situation',
    priority: 'required',
    depth: 'deep',
    extractionField: 'details',
  },
  {
    id: 'contact-info',
    name: 'Contact Information',
    description:
      'Collect contact information for follow-up',
    priority: 'important',
    depth: 'surface',
    extractionField: 'contactInfo',
  },
  {
    id: 'timeline',
    name: 'Timeline',
    description:
      'Understand any timing requirements or deadlines',
    priority: 'optional',
    depth: 'surface',
    extractionField: 'timeline',
  },
  {
    id: 'additional-notes',
    name: 'Additional Notes',
    description:
      'Capture any additional information or special requests',
    priority: 'optional',
    depth: 'moderate',
    extractionField: 'additionalNotes',
  },
];

/**
 * General Intake extraction schema
 */
export const GENERAL_INTAKE_SCHEMA: ExtractionSchema[] = [
  {
    field: 'purpose',
    type: 'string',
    required: true,
    description: 'Main purpose or reason for the inquiry',
    validation: { minLength: 10 },
    topicId: 'purpose',
  },
  {
    field: 'details',
    type: 'string',
    required: true,
    description: 'Detailed information about the request',
    validation: { minLength: 20 },
    topicId: 'details',
  },
  {
    field: 'name',
    type: 'string',
    required: false,
    description: 'Name of the person',
  },
  {
    field: 'email',
    type: 'string',
    required: false,
    description: 'Email address for follow-up',
    validation: { pattern: '^[^@]+@[^@]+\\.[^@]+$' },
    topicId: 'contact-info',
  },
  {
    field: 'phone',
    type: 'string',
    required: false,
    description: 'Phone number for follow-up',
  },
  {
    field: 'preferredContactMethod',
    type: 'enum',
    required: false,
    description: 'How they prefer to be contacted',
    options: ['email', 'phone', 'either'],
  },
  {
    field: 'timeline',
    type: 'string',
    required: false,
    description: 'Any timing requirements or deadlines',
    topicId: 'timeline',
  },
  {
    field: 'priority',
    type: 'enum',
    required: false,
    description: 'Priority level of the request',
    options: ['low', 'medium', 'high'],
  },
  {
    field: 'additionalNotes',
    type: 'string',
    required: false,
    description: 'Any additional information or special requests',
    topicId: 'additional-notes',
  },
];

/**
 * General Intake Template Definition
 */
export const generalIntakeTemplate: ConversationTemplate = {
  id: 'general-intake',
  name: 'General Intake',
  description: 'A flexible template for general information gathering',
  category: 'general',
  icon: 'Assignment',
  version: '1.0.0',
  isBuiltIn: true,

  promptStrategy: new DefaultPromptStrategy(),

  defaultConfig: {
    objective:
      'Gather all relevant information about the inquiry or request to enable proper follow-up and processing.',
    context:
      'This is a general intake conversation. Be helpful, thorough, and efficient.',
    persona: {
      style: 'friendly',
      tone: 'helpful and professional',
      behaviors: [
        'Be welcoming and helpful',
        'Ask clarifying questions when needed',
        'Ensure all necessary information is collected',
        'Confirm understanding before concluding',
      ],
      restrictions: [
        'Do not ask for unnecessary personal information',
        'Keep the conversation focused and efficient',
      ],
    },
    conversationLimits: {
      maxTurns: 12,
      maxDuration: 20,
      minConfidence: 0.7,
    },
  },

  defaultTopics: GENERAL_INTAKE_TOPICS,
  defaultSchema: GENERAL_INTAKE_SCHEMA,

  metadata: {
    previewDescription:
      'Versatile template for any intake process. Collects purpose, details, contact info, timeline, and notes.',
    useCases: [
      'Contact forms',
      'Inquiry handling',
      'Lead qualification',
      'Service requests',
      'General applications',
    ],
    tags: ['general', 'intake', 'contact', 'inquiry'],
    estimatedDuration: 3,
    author: 'NetPad',
    updatedAt: new Date('2026-01-07'),
  },
};

export default generalIntakeTemplate;
