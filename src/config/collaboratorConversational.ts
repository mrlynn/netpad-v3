/**
 * Conversational Collaborator Intake Configuration
 *
 * This configuration powers the AI-driven conversational experience
 * for potential NetPad collaborators. The AI naturally gathers information
 * about the person's background, interests, and what they've built.
 */

import { ConversationalFormConfig } from '@/types/conversational';

export const collaboratorConversationalConfig: ConversationalFormConfig = {
  formType: 'conversational',
  templateId: 'collaborator-intake',

  objective: `Have a genuine conversation with someone interested in collaborating on NetPad.
Learn about their background, what they've built, and why they're drawn to this project.
This isn't a job interview - it's about finding people who want to shape what NetPad becomes.`,

  context: `NetPad is a platform for building forms and workflows connected to MongoDB.
The founder is looking for 1-2 collaborators to help shape the product.

There are three "lanes" for collaboration:
1. Product & Design - Navigation, form builder UX, workflow experience
2. Full-Stack Engineering - Workflow engine, form-to-database pipeline, performance
3. Integrations & Ecosystem - Webhooks, connectors, templates, marketplace

This is NOT a job posting. It's about finding someone who:
- Has shipped real things they're proud of
- Wants to shape a product, not just execute tasks
- Can commit 5-10 hrs/week to start
- Values building something meaningful over market-rate compensation

The trial period is 2-4 weeks on a small project to see if there's a fit.`,

  persona: {
    style: 'friendly',
    tone: 'curious, thoughtful, and direct - like talking to a potential co-founder',
    behaviors: [
      'Be genuinely curious about what they have built',
      'Ask follow-up questions when something sounds interesting',
      'Keep responses conversational but focused',
      'Be honest about what this opportunity is (and isn\'t)',
      'Make them feel like a potential partner, not an applicant',
    ],
    restrictions: [
      'Never be formal or corporate',
      'Do not ask multiple questions at once',
      'Do not oversell the opportunity',
      'Do not make promises about equity or compensation specifics',
      'Avoid generic HR-speak',
    ],
  },

  topics: [
    {
      id: 'greeting',
      name: 'Introduction',
      description: 'Greet them warmly and get their name to start the conversation',
      priority: 'required',
      depth: 'surface',
      extractionField: 'name',
    },
    {
      id: 'email',
      name: 'Email',
      description: 'Get their email address so we can follow up',
      priority: 'required',
      depth: 'surface',
      extractionField: 'email',
    },
    {
      id: 'location',
      name: 'Location',
      description: 'Where are they based? Useful for timezone context',
      priority: 'optional',
      depth: 'surface',
      extractionField: 'location',
    },
    {
      id: 'lane',
      name: 'Area of Interest',
      description: 'Which lane interests them most - Product & Design, Engineering, or Integrations?',
      priority: 'required',
      depth: 'surface', // This is a simple selection, not a deep topic
      extractionField: 'lane',
    },
    {
      id: 'shipped',
      name: 'What They\'ve Shipped',
      description: 'The most important topic - what have they built that they\'re proud of? Get specifics about 2-3 projects.',
      priority: 'required',
      depth: 'deep',
      extractionField: 'shipped',
    },
    {
      id: 'whyNetpad',
      name: 'Why NetPad',
      description: 'What draws them to this project? What would they want to learn or contribute?',
      priority: 'required',
      depth: 'deep',
      extractionField: 'whyNetpad',
    },
    {
      id: 'availability',
      name: 'Availability',
      description: 'How much time can they commit? A few hours, 5-10 hours, or more per week?',
      priority: 'important',
      depth: 'surface',
      extractionField: 'availability',
    },
    {
      id: 'workPreference',
      name: 'Work Style',
      description: 'How do they prefer to work? Async, pairing sessions, weekly syncs?',
      priority: 'optional',
      depth: 'surface',
      extractionField: 'workPreference',
    },
    {
      id: 'workLinks',
      name: 'Links to Work',
      description: 'GitHub, portfolio, LinkedIn - anything that shows what they\'ve built',
      priority: 'optional',
      depth: 'surface',
      extractionField: 'workLinks',
    },
    {
      id: 'questions',
      name: 'Their Questions',
      description: 'Do they have any questions about NetPad or this opportunity?',
      priority: 'optional',
      depth: 'moderate',
      extractionField: 'anythingElse',
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
      field: 'location',
      type: 'string',
      required: false,
      description: 'Where they are based (city, country)',
      topicId: 'location',
    },
    {
      field: 'lane',
      type: 'enum',
      required: true,
      description: 'Which collaboration lane interests them',
      options: ['product_design', 'engineering', 'integrations', 'undecided'],
      topicId: 'lane',
    },
    {
      field: 'shipped',
      type: 'string',
      required: true,
      description: 'What they have built that they are proud of - detailed description of 2-3 projects',
      topicId: 'shipped',
    },
    {
      field: 'whyNetpad',
      type: 'string',
      required: true,
      description: 'Why NetPad interests them and what they want to contribute',
      topicId: 'whyNetpad',
    },
    {
      field: 'availability',
      type: 'enum',
      required: false,
      description: 'How much time they can commit per week',
      options: ['few_hours', '5-10_hours', '10+_hours', 'depends'],
      topicId: 'availability',
    },
    {
      field: 'workPreference',
      type: 'array',
      required: false,
      description: 'How they prefer to work',
      options: ['async', 'pairing', 'weekly_syncs', 'flexible'],
      topicId: 'workPreference',
    },
    {
      field: 'workLinks',
      type: 'string',
      required: false,
      description: 'Links to their work - GitHub, portfolio, LinkedIn',
      topicId: 'workLinks',
    },
    {
      field: 'anythingElse',
      type: 'string',
      required: false,
      description: 'Any questions or additional comments',
      topicId: 'questions',
    },
  ],

  conversationLimits: {
    maxTurns: 20, // Allow more turns for deeper conversation about their work
    maxDuration: 20, // 20 minutes max
    minConfidence: 0.7, // 70% confidence required to complete
  },

  // Capture the full conversation transcript for review
  captureOptions: {
    captureTranscript: true,
    includeTimestamps: true,
    includeTopicCoverage: true,
    includeFieldConfidence: true,
  },
};
