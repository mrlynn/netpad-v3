/**
 * IT Helpdesk Extraction Schema
 * 
 * Pre-configured extraction schema for IT support ticket intake.
 * This schema defines the structured data fields that should be extracted
 * from IT Helpdesk conversational forms.
 */

import { ExtractionSchema } from '@/lib/ai/providers/base';

/**
 * IT Helpdesk extraction schema
 * 
 * Defines the fields to extract from IT support conversations:
 * - Issue Category: Type of IT issue (hardware, software, network, access, other)
 * - Urgency Level: How urgent the issue is (low, medium, high, critical)
 * - Description: Detailed description of the issue
 * - Contact Preferences: How to reach the requester
 */
export const IT_HELPDESK_EXTRACTION_SCHEMA: ExtractionSchema[] = [
  {
    field: 'issueCategory',
    type: 'enum',
    required: true,
    description: 'The type of IT issue. Must be one of: hardware, software, network, access, other',
    options: ['hardware', 'software', 'network', 'access', 'other'],
    validation: {},
  },
  {
    field: 'urgency',
    type: 'enum',
    required: true,
    description: 'How urgent this issue is. Must be one of: low, medium, high, critical',
    options: ['low', 'medium', 'high', 'critical'],
    validation: {},
  },
  {
    field: 'description',
    type: 'string',
    required: true,
    description: 'A detailed description of the issue, including what is happening, when it started, what was tried, and any error messages',
    validation: {
      minLength: 20,
      maxLength: 2000,
    },
  },
  {
    field: 'affectedUsers',
    type: 'number',
    required: false,
    description: 'Number of users affected by this issue. Default to 1 if not specified',
    validation: {
      min: 1,
      max: 10000,
    },
  },
  {
    field: 'errorMessages',
    type: 'string',
    required: false,
    description: 'Any error messages or codes that appeared',
    validation: {
      maxLength: 500,
    },
  },
  {
    field: 'troubleshootingSteps',
    type: 'string',
    required: false,
    description: 'Steps already taken to try to resolve the issue',
    validation: {
      maxLength: 1000,
    },
  },
  {
    field: 'contactMethod',
    type: 'enum',
    required: false,
    description: 'Preferred contact method for follow-up. Must be one of: email, phone, chat, any',
    options: ['email', 'phone', 'chat', 'any'],
    validation: {},
  },
  {
    field: 'contactEmail',
    type: 'string',
    required: false,
    description: 'Email address for follow-up (if provided)',
    validation: {
      pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
    },
  },
  {
    field: 'contactPhone',
    type: 'string',
    required: false,
    description: 'Phone number for follow-up (if provided)',
    validation: {
      pattern: '^[\\d\\s\\-\\(\\)\\+]+$',
      maxLength: 20,
    },
  },
  {
    field: 'bestContactTime',
    type: 'string',
    required: false,
    description: 'Best time to reach the requester (if provided)',
    validation: {
      maxLength: 100,
    },
  },
  {
    field: 'assetId',
    type: 'string',
    required: false,
    description: 'Asset ID or serial number for hardware issues (if applicable)',
    validation: {
      maxLength: 50,
    },
  },
  {
    field: 'applicationName',
    type: 'string',
    required: false,
    description: 'Application name for software issues (if applicable)',
    validation: {
      maxLength: 100,
    },
  },
  {
    field: 'location',
    type: 'string',
    required: false,
    description: 'Location or office where the issue is occurring (if applicable)',
    validation: {
      maxLength: 200,
    },
  },
];

/**
 * Get IT Helpdesk extraction schema with topic mappings
 * 
 * Maps extraction fields to conversation topics for better extraction guidance
 */
export function getITHelpdeskExtractionSchema(): ExtractionSchema[] {
  return IT_HELPDESK_EXTRACTION_SCHEMA.map((schema) => ({
    ...schema,
    // Map to topic IDs from IT Helpdesk prompt
    topicId: getTopicIdForField(schema.field),
  }));
}

/**
 * Map extraction field to topic ID
 * 
 * Maps extraction schema fields to conversation topic IDs
 */
export function getTopicIdForField(field: string): string | undefined {
  const fieldToTopicMap: Record<string, string> = {
    issueCategory: 'topic_issue_category',
    urgency: 'topic_urgency',
    description: 'topic_description',
    contactMethod: 'topic_contact_preferences',
    contactEmail: 'topic_contact_preferences',
    contactPhone: 'topic_contact_preferences',
    bestContactTime: 'topic_contact_preferences',
    affectedSystem: 'topic_affected_system',
  };

  return fieldToTopicMap[field];
}

/**
 * IT Helpdesk extraction schema summary
 * 
 * Provides a human-readable summary of what fields are extracted
 */
export const IT_HELPDESK_SCHEMA_SUMMARY = {
  name: 'IT Helpdesk Ticket Intake',
  description: 'Extracts structured data from IT support conversations',
  requiredFields: [
    'issueCategory',
    'urgency',
    'description',
  ],
  optionalFields: [
    'affectedUsers',
    'errorMessages',
    'troubleshootingSteps',
    'contactMethod',
    'contactEmail',
    'contactPhone',
    'bestContactTime',
    'assetId',
    'applicationName',
    'location',
  ],
  fieldDescriptions: {
    issueCategory: 'Type of IT issue (hardware, software, network, access, other)',
    urgency: 'Urgency level (low, medium, high, critical)',
    description: 'Detailed description of the issue',
    affectedUsers: 'Number of users affected',
    errorMessages: 'Error messages or codes',
    troubleshootingSteps: 'Steps already taken',
    contactMethod: 'Preferred contact method',
    contactEmail: 'Email for follow-up',
    contactPhone: 'Phone for follow-up',
    bestContactTime: 'Best time to reach requester',
    assetId: 'Asset ID or serial number (hardware issues)',
    applicationName: 'Application name (software issues)',
    location: 'Location or office',
  },
};
