/**
 * Seed Marketplace with Form Templates
 *
 * This script publishes a selection of form templates to the marketplace
 * as standalone form items.
 *
 * Run with: npx tsx scripts/seed-marketplace-forms.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { MongoClient } from 'mongodb';

// Form templates to publish
const FORM_TEMPLATES = [
  {
    id: 'form_lead-capture_1.0.0',
    itemType: 'form' as const,
    manifest: {
      id: 'form_lead-capture_1.0.0',
      name: 'Lead Capture Form',
      version: '1.0.0',
      summary: 'Capture and qualify sales leads with company information, job title, and interest area.',
      description: `A professional lead capture form designed for B2B sales teams. Collects essential prospect information including name, work email, company details, and interest area.

**Perfect for:**
- Website lead generation pages
- Landing pages for marketing campaigns
- Trade show and event lead capture
- Content gating (whitepapers, webinars)

**Key Features:**
- 7 fields optimized for conversion
- Company size segmentation
- Interest/intent capture
- Mobile-responsive design`,
      category: 'business',
      tags: ['sales', 'leads', 'b2b', 'marketing', 'conversion'],
      icon: '🎯',
      author: { name: 'NetPad', email: 'templates@netpad.io' },
      license: 'MIT',
    },
    bundle: {
      form: {
        id: 'lead-capture',
        name: 'Lead Capture Form',
        description: 'Sales lead generation form',
        fieldConfigs: [
          { path: 'firstName', label: 'First Name', type: 'string', included: true, required: true, source: 'custom' },
          { path: 'lastName', label: 'Last Name', type: 'string', included: true, required: true, source: 'custom' },
          { path: 'email', label: 'Work Email', type: 'email', included: true, required: true, source: 'custom' },
          { path: 'company', label: 'Company Name', type: 'string', included: true, required: true, source: 'custom' },
          { path: 'jobTitle', label: 'Job Title', type: 'string', included: true, required: false, source: 'custom' },
          { path: 'companySize', label: 'Company Size', type: 'string', included: true, required: false, source: 'custom',
            options: ['1-10 employees', '11-50 employees', '51-200 employees', '201-500 employees', '500+ employees'] },
          { path: 'interest', label: 'What are you interested in?', type: 'string', included: true, required: true, source: 'custom' },
        ],
      },
      formMetadata: {
        fieldCount: 7,
        formType: 'traditional' as const,
        isMultiPage: false,
        hasConditionalLogic: false,
      },
    },
    published: true,
    status: 'approved' as const,
    isOfficial: true,
    source: 'web' as const,
    stats: { downloads: 0, reviews: 0 },
  },
  {
    id: 'form_support-ticket_1.0.0',
    itemType: 'form' as const,
    manifest: {
      id: 'form_support-ticket_1.0.0',
      name: 'Support Ticket Form',
      version: '1.0.0',
      summary: 'IT help desk and customer support ticket submission with priority and categorization.',
      description: `A comprehensive support ticket form for IT help desks and customer service teams. Captures issue details with priority levels and categorization for efficient routing.

**Perfect for:**
- IT help desk portals
- Customer support pages
- Internal issue tracking
- Bug report collection

**Key Features:**
- Issue categorization
- Priority levels (Low/Medium/High/Critical)
- Detailed description fields
- Steps to reproduce for technical issues`,
      category: 'support',
      tags: ['support', 'helpdesk', 'it', 'tickets', 'customer-service'],
      icon: '🎧',
      author: { name: 'NetPad', email: 'templates@netpad.io' },
      license: 'MIT',
    },
    bundle: {
      form: {
        id: 'support-ticket',
        name: 'Support Ticket Form',
        description: 'Help desk request form',
        fieldConfigs: [
          { path: 'name', label: 'Your Name', type: 'string', included: true, required: true, source: 'custom' },
          { path: 'email', label: 'Email', type: 'email', included: true, required: true, source: 'custom' },
          { path: 'category', label: 'Issue Category', type: 'string', included: true, required: true, source: 'custom',
            options: ['Technical Issue', 'Billing Question', 'Feature Request', 'Account Access', 'Other'] },
          { path: 'priority', label: 'Priority', type: 'string', included: true, required: true, source: 'custom',
            options: ['Low', 'Medium', 'High', 'Critical'] },
          { path: 'subject', label: 'Subject', type: 'string', included: true, required: true, source: 'custom' },
          { path: 'description', label: 'Description of Issue', type: 'string', included: true, required: true, source: 'custom' },
          { path: 'stepsToReproduce', label: 'Steps to Reproduce', type: 'string', included: true, required: false, source: 'custom' },
        ],
      },
      formMetadata: {
        fieldCount: 7,
        formType: 'traditional' as const,
        isMultiPage: false,
        hasConditionalLogic: false,
      },
    },
    published: true,
    status: 'approved' as const,
    isOfficial: true,
    source: 'web' as const,
    stats: { downloads: 0, reviews: 0 },
  },
  {
    id: 'form_nps-survey_1.0.0',
    itemType: 'form' as const,
    manifest: {
      id: 'form_nps-survey_1.0.0',
      name: 'NPS Survey',
      version: '1.0.0',
      summary: 'Net Promoter Score survey to measure customer loyalty and satisfaction.',
      description: `A standard Net Promoter Score (NPS) survey form to measure customer loyalty. Includes the classic 0-10 rating scale plus qualitative feedback fields.

**Perfect for:**
- Post-purchase surveys
- Quarterly customer health checks
- Product feedback collection
- Customer success programs

**Key Features:**
- Standard 0-10 NPS scale
- Reason for score capture
- Improvement suggestions field
- Follow-up permission toggle`,
      category: 'feedback',
      tags: ['nps', 'survey', 'feedback', 'customer-success', 'loyalty'],
      icon: '📊',
      author: { name: 'NetPad', email: 'templates@netpad.io' },
      license: 'MIT',
    },
    bundle: {
      form: {
        id: 'nps-survey',
        name: 'NPS Survey',
        description: 'Net Promoter Score survey',
        fieldConfigs: [
          { path: 'score', label: 'How likely are you to recommend us? (0-10)', type: 'number', included: true, required: true, source: 'custom',
            validation: { min: 0, max: 10 } },
          { path: 'reason', label: 'What is the primary reason for your score?', type: 'string', included: true, required: true, source: 'custom' },
          { path: 'improvements', label: 'What could we do better?', type: 'string', included: true, required: false, source: 'custom' },
          { path: 'followUp', label: 'May we contact you for follow-up?', type: 'boolean', included: true, required: false, source: 'custom' },
          { path: 'email', label: 'Email (optional)', type: 'email', included: true, required: false, source: 'custom' },
        ],
      },
      formMetadata: {
        fieldCount: 5,
        formType: 'traditional' as const,
        isMultiPage: false,
        hasConditionalLogic: false,
      },
    },
    published: true,
    status: 'approved' as const,
    isOfficial: true,
    source: 'web' as const,
    stats: { downloads: 0, reviews: 0 },
  },
  {
    id: 'form_event-registration_1.0.0',
    itemType: 'form' as const,
    manifest: {
      id: 'form_event-registration_1.0.0',
      name: 'Event Registration',
      version: '1.0.0',
      summary: 'Collect attendee registrations for conferences, webinars, and events.',
      description: `A comprehensive event registration form for conferences, webinars, workshops, and meetups. Captures attendee details, dietary preferences, and session interests.

**Perfect for:**
- Conference registration
- Webinar signups
- Workshop enrollment
- Meetup RSVPs

**Key Features:**
- Contact information capture
- Dietary restriction handling
- Session/track selection
- Accessibility needs`,
      category: 'events',
      tags: ['events', 'registration', 'conference', 'webinar', 'rsvp'],
      icon: '🎪',
      author: { name: 'NetPad', email: 'templates@netpad.io' },
      license: 'MIT',
    },
    bundle: {
      form: {
        id: 'event-registration',
        name: 'Event Registration',
        description: 'Event attendee registration',
        fieldConfigs: [
          { path: 'firstName', label: 'First Name', type: 'string', included: true, required: true, source: 'custom' },
          { path: 'lastName', label: 'Last Name', type: 'string', included: true, required: true, source: 'custom' },
          { path: 'email', label: 'Email', type: 'email', included: true, required: true, source: 'custom' },
          { path: 'phone', label: 'Phone', type: 'string', included: true, required: false, source: 'custom' },
          { path: 'company', label: 'Company/Organization', type: 'string', included: true, required: false, source: 'custom' },
          { path: 'jobTitle', label: 'Job Title', type: 'string', included: true, required: false, source: 'custom' },
          { path: 'dietaryRestrictions', label: 'Dietary Restrictions', type: 'string', included: true, required: false, source: 'custom',
            options: ['None', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Kosher', 'Other'] },
          { path: 'specialRequirements', label: 'Special Requirements or Accommodations', type: 'string', included: true, required: false, source: 'custom' },
        ],
      },
      formMetadata: {
        fieldCount: 8,
        formType: 'traditional' as const,
        isMultiPage: false,
        hasConditionalLogic: false,
      },
    },
    published: true,
    status: 'approved' as const,
    isOfficial: true,
    source: 'web' as const,
    stats: { downloads: 0, reviews: 0 },
  },
  {
    id: 'form_contact-form_1.0.0',
    itemType: 'form' as const,
    manifest: {
      id: 'form_contact-form_1.0.0',
      name: 'Contact Form',
      version: '1.0.0',
      summary: 'Simple contact form for website inquiries with inquiry type routing.',
      description: `A clean, professional contact form perfect for any website. Captures essential information including name, email, and message with inquiry type categorization.

**Perfect for:**
- Website contact pages
- General business inquiries
- Customer questions
- Partnership requests

**Key Features:**
- Name and email capture
- Optional phone number
- Inquiry type categorization
- Message field with validation`,
      category: 'business',
      tags: ['contact', 'inquiry', 'website', 'lead', 'general'],
      icon: '✉️',
      author: { name: 'NetPad', email: 'templates@netpad.io' },
      license: 'MIT',
    },
    bundle: {
      form: {
        id: 'contact-form',
        name: 'Contact Form',
        description: 'Simple contact form for website inquiries',
        fieldConfigs: [
          { path: 'firstName', label: 'First Name', type: 'string', included: true, required: true, source: 'custom' },
          { path: 'lastName', label: 'Last Name', type: 'string', included: true, required: true, source: 'custom' },
          { path: 'email', label: 'Email Address', type: 'email', included: true, required: true, source: 'custom' },
          { path: 'phone', label: 'Phone Number', type: 'string', included: true, required: false, source: 'custom' },
          { path: 'inquiryType', label: 'Inquiry Type', type: 'string', included: true, required: false, source: 'custom',
            options: ['General Question', 'Product Information', 'Pricing', 'Support', 'Partnership', 'Other'] },
          { path: 'message', label: 'Your Message', type: 'string', included: true, required: true, source: 'custom' },
        ],
      },
      formMetadata: {
        fieldCount: 6,
        formType: 'traditional' as const,
        isMultiPage: false,
        hasConditionalLogic: false,
      },
    },
    published: true,
    status: 'approved' as const,
    isOfficial: true,
    source: 'web' as const,
    stats: { downloads: 0, reviews: 0 },
  },
];

async function seedMarketplaceForms() {
  const connectionString = process.env.MONGODB_URI || process.env.PLATFORM_MONGODB_URI;

  if (!connectionString) {
    console.error('ERROR: MONGODB_URI or PLATFORM_MONGODB_URI environment variable is required');
    process.exit(1);
  }

  const client = new MongoClient(connectionString);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const dbName = process.env.PLATFORM_DB_NAME || 'form_builder_platform';
    const db = client.db(dbName);
    console.log(`Using database: ${dbName}`);
    const collection = db.collection('marketplace_applications');

    const now = new Date().toISOString();

    for (const template of FORM_TEMPLATES) {
      const doc = {
        ...template,
        publishedAt: now,
        publishedBy: 'system',
        reviewedAt: now,
        reviewedBy: 'system',
        createdAt: now,
        updatedAt: now,
        versions: [{
          version: template.manifest.version,
          changelog: 'Initial release',
          publishedAt: new Date(),
          publishedBy: 'system',
        }],
        latestVersion: template.manifest.version,
        latestVersionPublishedAt: now,
      };

      // Upsert to avoid duplicates
      const result = await collection.updateOne(
        { id: template.id },
        { $set: doc },
        { upsert: true }
      );

      if (result.upsertedCount > 0) {
        console.log(`✅ Created: ${template.manifest.name} (${template.id})`);
      } else if (result.modifiedCount > 0) {
        console.log(`🔄 Updated: ${template.manifest.name} (${template.id})`);
      } else {
        console.log(`⏭️  Unchanged: ${template.manifest.name} (${template.id})`);
      }
    }

    console.log(`\n🎉 Successfully seeded ${FORM_TEMPLATES.length} form templates to marketplace!`);

  } catch (error) {
    console.error('Error seeding marketplace:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedMarketplaceForms();
