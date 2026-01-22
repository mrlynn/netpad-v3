/**
 * Seed Collaborator Intake Form
 *
 * Creates the collaborator-intake form used on the /collaborate page.
 * This form is published globally and doesn't belong to any organization.
 *
 * Run with: npx tsx scripts/seed-collaborator-form.ts
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || process.env.PLATFORM_MONGODB_URI;
const DATABASE_NAME = process.env.PLATFORM_DB_NAME || 'form_builder_platform';

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is not set');
  process.exit(1);
}

// Collaborator intake form definition
const collaboratorForm = {
  id: 'collaborator-intake',
  formId: 'collaborator-intake',
  slug: 'collaborator-intake',
  name: 'Collaborator Interest Form',
  description: 'Express interest in collaborating on NetPad',
  collection: 'collaborator_submissions',
  database: 'netpad_platform',
  isPublished: true,
  fieldConfigs: [
    // Basic info
    {
      path: 'name',
      label: 'Name',
      type: 'string',
      included: true,
      required: true,
      placeholder: 'Your full name',
    },
    {
      path: 'email',
      label: 'Email',
      type: 'email',
      included: true,
      required: true,
      placeholder: 'you@example.com',
    },
    {
      path: 'location',
      label: 'Where are you based?',
      type: 'string',
      included: true,
      required: false,
      placeholder: 'City, Country (for timezone context)',
    },

    // Lane selection
    {
      path: 'lane',
      label: 'Which lane interests you most?',
      type: 'select',
      included: true,
      required: true,
      placeholder: 'Select an area of focus',
      validation: {
        options: [
          'Product & Design',
          'Full-Stack Engineering',
          'Integrations & Ecosystem',
          'Not sure yet',
        ],
      },
    },

    // Availability
    {
      path: 'availability',
      label: "What's your availability?",
      type: 'select',
      included: true,
      required: true,
      placeholder: 'Select your availability',
      validation: {
        options: [
          'A few hours/week',
          '5-10 hrs/week',
          '10+ hrs/week',
          'Depends on the project',
        ],
      },
    },

    // Work preference (multi-select via tags)
    {
      path: 'workPreference',
      label: 'How do you prefer to work?',
      type: 'tags',
      included: true,
      required: false,
      placeholder: 'Select your preferences',
      validation: {
        tagSuggestions: [
          'Async (written)',
          'Pairing sessions',
          'Weekly syncs',
          'Whatever works',
        ],
        allowCustomTags: false,
        maxTags: 4,
      },
    },

    // Links to work
    {
      path: 'workLinks',
      label: 'Links to your work',
      type: 'textarea',
      included: true,
      required: false,
      placeholder:
        "GitHub, LinkedIn, portfolio, or anything that shows what you've built",
    },

    // What have you shipped (required, min 100 chars)
    {
      path: 'shipped',
      label: "What have you shipped that you're proud of?",
      type: 'textarea',
      included: true,
      required: true,
      placeholder:
        "Tell us about 2-3 things you've built. What was the problem? What did you do? What was the outcome?",
      validation: {
        minLength: 100,
      },
    },

    // Why NetPad (required, min 50 chars)
    {
      path: 'whyNetpad',
      label: 'Why does NetPad interest you?',
      type: 'textarea',
      included: true,
      required: true,
      placeholder:
        'What draws you to this project? What would you want to learn or contribute?',
      validation: {
        minLength: 50,
      },
    },

    // Anything else
    {
      path: 'anythingElse',
      label: 'Anything else?',
      type: 'textarea',
      included: true,
      required: false,
      placeholder: 'Questions, comments, or anything else you want to share',
    },
  ],
  theme: {
    preset: 'mongodb',
    primaryColor: '#00ED64',
    secondaryColor: '#001E2B',
    backgroundColor: 'transparent',
    textColor: '#ffffff',
    textSecondaryColor: 'rgba(255, 255, 255, 0.6)',
    errorColor: '#f44336',
    successColor: '#00ED64',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    spacing: 'comfortable',
    borderRadius: 8,
    inputStyle: 'outlined',
    buttonStyle: 'contained',
    mode: 'dark',
  },
  formType: 'both', // Supports both traditional form and conversational modes
  conversationalConfig: {
    formType: 'conversational',
    templateId: 'collaborator-intake',
    objective:
      "Have a genuine conversation with someone interested in collaborating. Learn about their background, what they've built, and why they're drawn to this project.",
    context:
      "This is a collaboration opportunity for someone who wants to help shape a product. There are three lanes: Product & Design, Engineering, and Integrations. This is NOT a job posting - it's about finding someone who wants to shape the product, not execute tasks. The trial period is 2-4 weeks on a small project.",
    persona: {
      style: 'friendly',
      tone: 'curious, thoughtful, and direct - like talking to a potential co-founder',
      behaviors: [
        'Be genuinely curious about what they have built',
        'Ask follow-up questions when something sounds interesting',
        'Keep responses conversational but focused',
        "Be honest about what this opportunity is (and isn't)",
        'Make them feel like a potential partner, not an applicant',
      ],
      restrictions: [
        'Never be formal or corporate',
        'Do not ask multiple questions at once',
        'Do not oversell the opportunity',
        'Avoid generic HR-speak',
      ],
    },
    topics: [
      {
        id: 'greeting',
        name: 'Introduction',
        description: 'Greet them warmly and get their name',
        priority: 'required',
        depth: 'surface',
        extractionField: 'name',
      },
      {
        id: 'email',
        name: 'Email',
        description: 'Get their email address',
        priority: 'required',
        depth: 'surface',
        extractionField: 'email',
      },
      {
        id: 'lane',
        name: 'Area of Interest',
        description: 'Which lane interests them most',
        priority: 'required',
        depth: 'moderate',
        extractionField: 'lane',
      },
      {
        id: 'shipped',
        name: "What They've Shipped",
        description: "What have they built that they're proud of? Get specifics.",
        priority: 'required',
        depth: 'deep',
        extractionField: 'shipped',
      },
      {
        id: 'whyProject',
        name: 'Why This Project',
        description: 'What draws them to this opportunity?',
        priority: 'required',
        depth: 'deep',
        extractionField: 'whyNetpad',
      },
      {
        id: 'availability',
        name: 'Availability',
        description: 'How much time can they commit?',
        priority: 'important',
        depth: 'surface',
        extractionField: 'availability',
      },
    ],
    extractionSchema: [
      {
        field: 'name',
        type: 'string',
        required: true,
        description: 'Full name',
        topicId: 'greeting',
      },
      {
        field: 'email',
        type: 'string',
        required: true,
        description: 'Email address',
        topicId: 'email',
      },
      {
        field: 'lane',
        type: 'enum',
        required: true,
        options: ['product_design', 'engineering', 'integrations', 'undecided'],
        topicId: 'lane',
      },
      {
        field: 'shipped',
        type: 'string',
        required: true,
        description: 'What they have built',
        topicId: 'shipped',
      },
      {
        field: 'whyNetpad',
        type: 'string',
        required: true,
        description: 'Why interested',
        topicId: 'whyProject',
      },
      {
        field: 'availability',
        type: 'enum',
        required: false,
        options: ['few_hours', '5-10_hours', '10+_hours', 'depends'],
        topicId: 'availability',
      },
    ],
    conversationLimits: {
      maxTurns: 20,
      maxDuration: 20,
      minConfidence: 0.7,
    },
    captureOptions: {
      captureTranscript: true,
      includeTimestamps: true,
      includeTopicCoverage: true,
      includeFieldConfidence: true,
    },
  },
  hooks: {
    onSuccess: {
      message: "Thanks for reaching out! I'll be in touch within a few days if I think there's a fit.",
    },
  },
  branding: {
    showPoweredBy: true,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

async function seedCollaboratorForm() {
  const client = new MongoClient(MONGODB_URI!);

  try {
    await client.connect();
    console.log('Connected to MongoDB\n');

    const db = client.db(DATABASE_NAME);
    const publishedFormsCollection = db.collection('published_forms');

    // Check if form already exists
    const existingForm = await publishedFormsCollection.findOne({
      'form.slug': 'collaborator-intake',
    });

    if (existingForm) {
      console.log('Collaborator form already exists. Updating...');
      await publishedFormsCollection.updateOne(
        { 'form.slug': 'collaborator-intake' },
        {
          $set: {
            form: collaboratorForm,
            updatedAt: new Date(),
          },
        }
      );
      console.log('Updated collaborator-intake form');
    } else {
      console.log('Creating new collaborator form...');
      await publishedFormsCollection.insertOne({
        form: collaboratorForm,
        publishedAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('Created collaborator-intake form');
    }

    // Create index on slug for fast lookups (ignore if already exists)
    try {
      await publishedFormsCollection.createIndex({ 'form.slug': 1 });
      console.log('Created index on form.slug');
    } catch (indexErr: unknown) {
      const error = indexErr as { code?: number };
      if (error.code === 86) {
        console.log('Index on form.slug already exists (skipping)');
      } else {
        throw indexErr;
      }
    }

    // Also create the global submissions collection for storing submissions
    const globalSubmissionsCollection = db.collection('global_submissions');
    try {
      await globalSubmissionsCollection.createIndex({ formId: 1 });
      await globalSubmissionsCollection.createIndex({ submittedAt: -1 });
      console.log('Ensured global_submissions collection and indexes');
    } catch (indexErr: unknown) {
      const error = indexErr as { code?: number };
      if (error.code === 86) {
        console.log('Indexes on global_submissions already exist (skipping)');
      } else {
        throw indexErr;
      }
    }

    console.log('\n--- Summary ---');
    console.log('Form slug: collaborator-intake');
    console.log('Form URL: /collaborate (landing page) or /forms/collaborator-intake (direct)');
    console.log('Submissions will be stored in: global_submissions collection');
    console.log('\nDone!');
  } catch (error) {
    console.error('Error seeding collaborator form:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedCollaboratorForm();
