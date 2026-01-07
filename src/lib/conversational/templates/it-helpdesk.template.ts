/**
 * IT Helpdesk Template
 *
 * Pre-configured template for IT support ticket intake conversations.
 */

import { ConversationTemplate } from './types';
import { ConversationTopic, ExtractionSchema } from '@/types/conversational';
import { ITHelpdeskPromptStrategy } from '../strategies/prompt';

/**
 * IT Helpdesk default topics
 */
export const IT_HELPDESK_TOPICS: ConversationTopic[] = [
  {
    id: 'issue-category',
    name: 'Issue Category',
    description:
      'Determine the type of IT issue: Hardware, Software, Network, Access & Permissions, or Other',
    priority: 'required',
    depth: 'moderate',
    extractionField: 'issueCategory',
  },
  {
    id: 'urgency',
    name: 'Urgency Level',
    description:
      'Determine how urgent this issue is: Low, Medium, High, or Critical',
    priority: 'required',
    depth: 'surface',
    extractionField: 'urgency',
  },
  {
    id: 'description',
    name: 'Issue Description',
    description:
      'Get a detailed description of the issue including what happened, when it started, and any error messages',
    priority: 'required',
    depth: 'deep',
    extractionField: 'description',
  },
  {
    id: 'affected-system',
    name: 'Affected System',
    description:
      'Identify the specific device, application, or system affected',
    priority: 'important',
    depth: 'moderate',
    extractionField: 'affectedSystem',
  },
  {
    id: 'contact-preferences',
    name: 'Contact Preferences',
    description:
      'How to reach the requester: email, phone, or chat, and best time to contact',
    priority: 'important',
    depth: 'surface',
    extractionField: 'contactMethod',
  },
];

/**
 * IT Helpdesk extraction schema
 */
export const IT_HELPDESK_SCHEMA: ExtractionSchema[] = [
  {
    field: 'issueCategory',
    type: 'enum',
    required: true,
    description: 'Category of IT issue',
    options: ['hardware', 'software', 'network', 'access', 'other'],
    topicId: 'issue-category',
  },
  {
    field: 'urgency',
    type: 'enum',
    required: true,
    description: 'Urgency level of the issue',
    options: ['low', 'medium', 'high', 'critical'],
    topicId: 'urgency',
  },
  {
    field: 'subject',
    type: 'string',
    required: true,
    description: 'Brief subject line for the ticket (auto-generated from issue)',
    validation: { minLength: 5, maxLength: 100 },
  },
  {
    field: 'description',
    type: 'string',
    required: true,
    description: 'Detailed description of the issue',
    validation: { minLength: 20 },
    topicId: 'description',
  },
  {
    field: 'affectedSystem',
    type: 'string',
    required: false,
    description: 'The device, application, or system affected',
    topicId: 'affected-system',
  },
  {
    field: 'contactMethod',
    type: 'enum',
    required: false,
    description: 'Preferred contact method',
    options: ['email', 'phone', 'chat'],
    topicId: 'contact-preferences',
  },
  {
    field: 'additionalContext',
    type: 'string',
    required: false,
    description: 'Any additional context or troubleshooting already attempted',
  },
];

/**
 * IT Helpdesk Template Definition
 */
export const itHelpdeskTemplate: ConversationTemplate = {
  id: 'it-helpdesk',
  name: 'IT Helpdesk',
  description: 'Collect IT support ticket information through natural conversation',
  category: 'support',
  icon: 'SupportAgent',
  version: '1.0.0',
  isBuiltIn: true,

  promptStrategy: new ITHelpdeskPromptStrategy(),

  defaultConfig: {
    objective:
      'Collect all necessary information to create an IT support ticket that can be properly triaged and assigned to the appropriate team.',
    context:
      'This is an internal IT helpdesk for company employees. Be helpful, professional, and efficient.',
    persona: {
      style: 'professional',
      tone: 'helpful and empathetic',
      behaviors: [
        'Ask clarifying questions when the issue is unclear',
        'Probe for specific details about technical issues',
        'Be empathetic about urgent problems',
        'Reference previous conversation details',
      ],
      restrictions: [
        'Do not ask for sensitive passwords or credentials',
        'Keep conversation focused on IT support',
        'Do not make promises about resolution times',
      ],
    },
    conversationLimits: {
      maxTurns: 15,
      maxDuration: 30,
      minConfidence: 0.75,
    },
  },

  defaultTopics: IT_HELPDESK_TOPICS,
  defaultSchema: IT_HELPDESK_SCHEMA,

  metadata: {
    previewDescription:
      'Perfect for IT support portals. Gathers issue category, urgency, detailed description, and contact preferences.',
    useCases: [
      'Internal IT support tickets',
      'Help desk ticket intake',
      'Technical support requests',
    ],
    tags: ['support', 'it', 'helpdesk', 'tickets'],
    estimatedDuration: 3,
    author: 'NetPad',
    updatedAt: new Date('2026-01-07'),
  },
};

export default itHelpdeskTemplate;
