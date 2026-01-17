/**
 * Conversational Waitlist Signup Configuration
 *
 * This configuration powers the AI-driven conversational waitlist signup experience.
 * The AI will naturally gather information about the user through conversation.
 */

import { ConversationalFormConfig } from '@/types/conversational';

export const waitlistConversationalConfig: ConversationalFormConfig = {
  formType: 'conversational',
  templateId: 'waitlist-signup',

  objective:
    "Have a friendly conversation to learn about someone interested in NetPad. Collect their contact info and understand what they're looking to build, their background, and how they found us. And... btw, if you want to use a more traditional forms interface, click the 'Form' toggle above.",

  context: `NetPad is a platform for building forms and workflows connected to MongoDB.
Key features include:
- Visual form builder with 30+ field types
- Workflow automation with AI-powered nodes
- Direct MongoDB integration
- Marketplace for sharing templates
- AI form generation and data extraction

We're in early access and want to understand our potential users better to prioritize features and ensure a great onboarding experience.`,

  persona: {
    style: 'friendly',
    tone: 'warm, curious, and conversational - like a helpful colleague',
    behaviors: [
      'Be genuinely curious about their use case',
      'Ask follow-up questions when something sounds interesting',
      'Keep responses concise - 1-2 sentences when possible',
      'Share brief, relevant info about NetPad features if it naturally fits',
      'Make them feel valued as an early adopter',
    ],
    restrictions: [
      'Never be pushy or salesy',
      'Avoid jargon unless they use it first',
      'Do not make promises about timelines or features',
      'Do not ask multiple questions at once',
    ],
  },

  topics: [
    {
      id: 'greeting',
      name: 'Introduction',
      description: 'Greet them warmly and ask for their name and email to get started',
      priority: 'required',
      depth: 'surface',
      extractionField: 'name',
    },
    {
      id: 'email',
      name: 'Email',
      description: 'Get their email address for the waitlist',
      priority: 'required',
      depth: 'surface',
      extractionField: 'email',
    },
    {
      id: 'company',
      name: 'Company/Organization',
      description: 'Learn about their company or organization',
      priority: 'important',
      depth: 'surface',
      extractionField: 'company',
    },
    {
      id: 'role',
      name: 'Role',
      description: 'Understand their role - developer, data engineer, product manager, etc.',
      priority: 'important',
      depth: 'surface',
      extractionField: 'role',
    },
    {
      id: 'useCase',
      name: 'Use Case',
      description:
        'What do they want to build? What problem are they trying to solve? This is the most important topic.',
      priority: 'required',
      depth: 'deep',
      extractionField: 'useCase',
    },
    {
      id: 'currentTools',
      name: 'Current Tools',
      description: 'What tools or solutions are they currently using for forms/workflows?',
      priority: 'important',
      depth: 'moderate',
      extractionField: 'currentTools',
    },
    {
      id: 'biggestChallenge',
      name: 'Biggest Challenge',
      description: 'What is their biggest pain point or challenge with current solutions?',
      priority: 'important',
      depth: 'moderate',
      extractionField: 'biggestChallenge',
    },
    {
      id: 'howDidYouHear',
      name: 'Discovery',
      description: 'How did they hear about NetPad? Social media, colleague, search, event, etc.',
      priority: 'important',
      depth: 'surface',
      extractionField: 'howDidYouHear',
    },
    {
      id: 'teamSize',
      name: 'Team Size',
      description: 'How big is their team? Just them, small team, or larger organization?',
      priority: 'optional',
      depth: 'surface',
      extractionField: 'teamSize',
    },
    {
      id: 'timeline',
      name: 'Timeline',
      description: 'When are they looking to start using a solution like NetPad?',
      priority: 'optional',
      depth: 'surface',
      extractionField: 'timeline',
    },
    {
      id: 'interests',
      name: 'Feature Interests',
      description:
        'Which NetPad features are most interesting to them? Forms, workflows, AI, MongoDB integration, automation?',
      priority: 'optional',
      depth: 'moderate',
      extractionField: 'interests',
    },
  ],

  extractionSchema: [
    {
      field: 'name',
      type: 'string',
      required: true,
      description: 'Full name of the person',
      topicId: 'greeting',
    },
    {
      field: 'email',
      type: 'string',
      required: true,
      description: 'Email address',
      topicId: 'email',
      validation: {
        pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
      },
    },
    {
      field: 'company',
      type: 'string',
      required: false,
      description: 'Company or organization name',
      topicId: 'company',
    },
    {
      field: 'role',
      type: 'enum',
      required: false,
      description: 'Their role/job function',
      options: ['developer', 'data_engineer', 'product_manager', 'executive', 'designer', 'other'],
      topicId: 'role',
    },
    {
      field: 'useCase',
      type: 'string',
      required: true,
      description: 'What they want to build or accomplish with NetPad',
      topicId: 'useCase',
    },
    {
      field: 'currentTools',
      type: 'string',
      required: false,
      description: 'Current tools they use for forms/workflows',
      topicId: 'currentTools',
    },
    {
      field: 'biggestChallenge',
      type: 'string',
      required: false,
      description: 'Their main pain point or challenge',
      topicId: 'biggestChallenge',
    },
    {
      field: 'howDidYouHear',
      type: 'enum',
      required: false,
      description: 'How they discovered NetPad',
      options: ['social_media', 'colleague', 'search', 'event', 'blog', 'podcast', 'other'],
      topicId: 'howDidYouHear',
    },
    {
      field: 'howDidYouHearOther',
      type: 'string',
      required: false,
      description: 'If "other", more details about how they found us',
      topicId: 'howDidYouHear',
    },
    {
      field: 'teamSize',
      type: 'enum',
      required: false,
      description: 'Size of their team',
      options: ['solo', '2-5', '6-20', '21-100', '100+'],
      topicId: 'teamSize',
    },
    {
      field: 'timeline',
      type: 'enum',
      required: false,
      description: 'When they want to start using NetPad',
      options: ['immediately', '1-3_months', '3-6_months', 'exploring'],
      topicId: 'timeline',
    },
    {
      field: 'interests',
      type: 'array',
      required: false,
      description: 'NetPad features they are most interested in',
      options: ['forms', 'workflows', 'ai', 'mongodb', 'automation', 'marketplace'],
      topicId: 'interests',
    },
  ],

  conversationLimits: {
    maxTurns: 15, // Allow enough turns for a natural conversation
    maxDuration: 15, // 15 minutes max
    minConfidence: 0.7, // 70% confidence required to complete
  },
};
