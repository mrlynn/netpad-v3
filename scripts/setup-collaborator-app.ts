/**
 * Complete Setup Script for Collaborator Application
 * 
 * This script sets up the entire collaborator application end-to-end:
 * 1. Creates/finds organization, project, and application
 * 2. Sets up MongoDB connection vault
 * 3. Creates the form with conversational config
 * 4. Configures dataSource
 * 5. Publishes the form
 * 
 * Run with: npx tsx scripts/setup-collaborator-app.ts
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || process.env.PLATFORM_MONGODB_URI;
const DATABASE_NAME = process.env.PLATFORM_DB_NAME || 'form_builder_platform';
const TARGET_MONGODB_URI = process.env.TARGET_MONGODB_URI || MONGODB_URI; // Where submissions go
const TARGET_DATABASE = process.env.TARGET_DATABASE || 'netpad_platform';
const TARGET_COLLECTION = 'collaborator_submissions';

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is not set');
  process.exit(1);
}

// Load the form definition from the provided JSON
// Try multiple locations
const possiblePaths = [
  join(process.cwd(), 'collaborator-interest-form-definition.json'),
  join(process.cwd(), 'Downloads', 'collaborator-interest-form-definition.json'),
  join(process.env.HOME || '', 'Downloads', 'collaborator-interest-form-definition.json'),
];

let formDefinition: any;
let loadedFromPath: string | null = null;

for (const formDefinitionPath of possiblePaths) {
  try {
    const formJson = readFileSync(formDefinitionPath, 'utf-8');
    formDefinition = JSON.parse(formJson);
    loadedFromPath = formDefinitionPath;
    console.log('✅ Loaded form definition from:', formDefinitionPath);
    break;
  } catch (error) {
    // Try next path
    continue;
  }
}

if (!loadedFromPath) {
  console.warn('⚠️  Could not load form definition from file, using default...');
  // Use the default form definition
  formDefinition = {
    name: "Collaborator Interest Form",
    description: "Express interest in collaborating on this project",
    slug: "collaborator-interest-form",
    fieldConfigs: [
      {
        path: "name",
        label: "Name",
        type: "short_text",
        included: true,
        required: true,
        placeholder: "Your full name"
      },
      {
        path: "email",
        label: "Email",
        type: "email",
        included: true,
        required: true,
        placeholder: "you@example.com"
      },
      {
        path: "location",
        label: "Where are you based?",
        type: "short_text",
        included: true,
        required: false,
        placeholder: "City, Country (for timezone context)"
      },
      {
        path: "lane",
        label: "Which lane interests you most?",
        type: "dropdown",
        included: true,
        required: true,
        placeholder: "Select an area of focus",
        validation: {
          options: [
            { label: "Product & Design", value: "product_design" },
            { label: "Full-Stack Engineering", value: "engineering" },
            { label: "Integrations & Ecosystem", value: "integrations" },
            { label: "Not sure yet", value: "undecided" }
          ]
        }
      },
      {
        path: "availability",
        label: "What's your availability?",
        type: "dropdown",
        included: true,
        required: true,
        placeholder: "Select your availability",
        validation: {
          options: [
            { label: "A few hours/week", value: "few_hours" },
            { label: "5-10 hrs/week", value: "5-10_hours" },
            { label: "10+ hrs/week", value: "10+_hours" },
            { label: "Depends on the project", value: "depends" }
          ]
        }
      },
      {
        path: "workPreference",
        label: "How do you prefer to work?",
        type: "tags",
        included: true,
        required: false,
        placeholder: "Select your preferences",
        validation: {
          tagSuggestions: ["Async (written)", "Pairing sessions", "Weekly syncs", "Whatever works"],
          allowCustomTags: false,
          maxTags: 4
        }
      },
      {
        path: "workLinks",
        label: "Links to your work",
        type: "long_text",
        included: true,
        required: false,
        placeholder: "GitHub, LinkedIn, portfolio, or anything that shows what you've built",
        rows: 3
      },
      {
        path: "shipped",
        label: "What have you shipped that you're proud of?",
        type: "long_text",
        included: true,
        required: true,
        placeholder: "Tell us about 2-3 things you've built. What was the problem? What did you do? What was the outcome?",
        rows: 6,
        validation: {
          minLength: 100
        }
      },
      {
        path: "whyNetpad",
        label: "Why does this project interest you?",
        type: "long_text",
        included: true,
        required: true,
        placeholder: "What draws you to this project? What would you want to learn or contribute?",
        rows: 4,
        validation: {
          minLength: 50
        }
      },
      {
        path: "anythingElse",
        label: "Anything else?",
        type: "long_text",
        included: true,
        required: false,
        placeholder: "Questions, comments, or anything else you want to share",
        rows: 3
      }
    ],
    theme: {
      preset: "terminal-green"
    },
    formType: "conversational",
    conversationalConfig: {
      formType: "conversational",
      templateId: "collaborator-intake",
      objective: "Have a genuine conversation with someone interested in collaborating. Learn about their background, what they've built, and why they're drawn to this project.",
      context: "This is a collaboration opportunity for someone who wants to help shape the NetPad product. There are three lanes: Product & Design, Engineering, and Integrations. This is NOT a job posting - it's about finding someone who wants to shape the product, not execute tasks. The trial period is 2-4 weeks on a small project. Do not be forceful. Be polite and try to get what information you can. The most important thing is their name and email.",
      persona: {
        style: "friendly",
        tone: "curious, thoughtful, and direct - like talking to a potential co-founder",
        behaviors: [
          "Be genuinely curious about what they have built",
          "Ask follow-up questions when something sounds interesting",
          "Keep responses conversational but focused",
          "Be honest about what this opportunity is (and isn't)",
          "Make them feel like a potential partner, not an applicant"
        ],
        restrictions: [
          "Never be formal or corporate",
          "Do not ask multiple questions at once",
          "Do not oversell the opportunity",
          "Avoid generic HR-speak"
        ]
      },
      topics: [
        {
          id: "greeting",
          name: "Introduction",
          description: "Greet them warmly and ask them their name",
          priority: "required",
          depth: "surface",
          extractionField: "name"
        },
        {
          id: "email",
          name: "Email",
          description: "Get their email address",
          priority: "required",
          depth: "surface",
          extractionField: "email"
        },
        {
          id: "lane",
          name: "Area of Interest",
          description: "Which lane interests them most - don't be forceful.",
          priority: "required",
          depth: "moderate",
          extractionField: "lane"
        },
        {
          id: "shipped",
          name: "What They've Shipped",
          description: "What have they built that they're proud of? Get specifics.",
          priority: "required",
          depth: "moderate",
          extractionField: "shipped"
        },
        {
          id: "whyProject",
          name: "Why This Project",
          description: "What draws them to this opportunity?",
          priority: "required",
          depth: "moderate",
          extractionField: "whyNetpad"
        },
        {
          id: "availability",
          name: "Availability",
          description: "How much time can they commit?",
          priority: "important",
          depth: "surface",
          extractionField: "availability"
        }
      ],
      extractionSchema: [
        {
          field: "name",
          type: "string",
          required: true,
          description: "Full name",
          topicId: "greeting"
        },
        {
          field: "email",
          type: "string",
          required: true,
          description: "Email address",
          topicId: "email"
        },
        {
          field: "lane",
          type: "enum",
          required: true,
          options: ["product_design", "engineering", "integrations", "undecided"],
          topicId: "lane"
        },
        {
          field: "shipped",
          type: "string",
          required: true,
          description: "What they have built",
          topicId: "shipped"
        },
        {
          field: "whyNetpad",
          type: "string",
          required: true,
          description: "Why interested",
          topicId: "whyProject"
        },
        {
          field: "availability",
          type: "enum",
          required: false,
          options: ["few_hours", "5-10_hours", "10+_hours", "depends"],
          topicId: "availability"
        }
      ],
      conversationLimits: {
        maxTurns: 20,
        maxDuration: 20,
        minConfidence: 0.7
      },
      captureOptions: {
        captureTranscript: true,
        includeTimestamps: true,
        includeTopicCoverage: true,
        includeFieldConfidence: true
      },
      rag: {
        enabled: false,
        documents: [],
        retrievalConfig: {
          maxChunks: 5,
          minScore: 0.7,
          retrievalThreshold: 0.5
        }
      }
    }
  };
}

interface SetupResult {
  organizationId: string;
  projectId: string;
  applicationId: string;
  vaultId: string;
  formId: string;
  formSlug: string;
  formUrl: string;
}

async function setupCollaboratorApp(): Promise<SetupResult> {
  const client = new MongoClient(MONGODB_URI!);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DATABASE_NAME);
    const orgsCollection = db.collection('organizations');
    const projectsCollection = db.collection('projects');
    const applicationsCollection = db.collection('applications');
    const connectionVaultCollection = db.collection('connection_vault');
    const formsCollection = db.collection('forms');

    // ============================================
    // Step 1: Find or Create Organization
    // ============================================
    console.log('📋 Step 1: Setting up organization...');
    let organization = await orgsCollection.findOne({ slug: 'collaborator-app' });
    
    if (!organization) {
      const orgId = `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      organization = {
        orgId,
        name: 'Collaborator App',
        slug: 'collaborator-app',
        createdBy: 'setup-script',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
        subscription: {
          plan: 'free',
          status: 'active',
        },
        limits: {
          forms: 10,
          fieldsPerForm: 50,
          submissions: 1000,
          connections: 5,
        },
      };
      await orgsCollection.insertOne(organization);
      console.log('  ✅ Created organization:', organization.orgId);
    } else {
      console.log('  ✅ Found existing organization:', organization.orgId);
    }

    const organizationId = organization.orgId;

    // ============================================
    // Step 2: Find or Create Project
    // ============================================
    console.log('\n📋 Step 2: Setting up project...');
    let project = await projectsCollection.findOne({
      organizationId,
      slug: 'collaborator-project',
    });

    if (!project) {
      const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      project = {
        projectId,
        organizationId,
        name: 'Collaborator Project',
        slug: 'collaborator-project',
        description: 'Project for collaborator recruitment',
        environment: 'dev',
        createdBy: 'setup-script',
        createdAt: new Date(),
        updatedAt: new Date(),
        stats: {
          formCount: 0,
          workflowCount: 0,
          submissionCount: 0,
        },
      };
      await projectsCollection.insertOne(project);
      console.log('  ✅ Created project:', project.projectId);
    } else {
      console.log('  ✅ Found existing project:', project.projectId);
    }

    const projectId = project.projectId;

    // ============================================
    // Step 3: Find or Create Application
    // ============================================
    console.log('\n📋 Step 3: Setting up application...');
    let application = await applicationsCollection.findOne({
      organizationId,
      projectId,
      slug: 'collaborator-recruitment',
    });

    if (!application) {
      const applicationId = `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      application = {
        applicationId,
        organizationId,
        projectId,
        name: 'Collaborator Recruitment',
        slug: 'collaborator-recruitment',
        description: 'Application for recruiting collaborators',
        version: '1.0.0',
        status: 'active',
        isDefault: false,
        createdBy: 'setup-script',
        createdAt: new Date(),
        updatedAt: new Date(),
        stats: {
          formCount: 0,
          workflowCount: 0,
          submissionCount: 0,
        },
      };
      await applicationsCollection.insertOne(application);
      console.log('  ✅ Created application:', application.applicationId);
    } else {
      console.log('  ✅ Found existing application:', application.applicationId);
    }

    const applicationId = application.applicationId;

    // ============================================
    // Step 4: Set up Connection Vault
    // ============================================
    console.log('\n📋 Step 4: Setting up MongoDB connection vault...');
    
    // Use org-specific vault collection (format: org_{orgId}_connection_vault)
    const orgDbName = organizationId; // org_abc123
    const orgClient = new MongoClient(MONGODB_URI!);
    await orgClient.connect();
    const orgDb = orgClient.db(orgDbName);
    const orgVaultCollection = orgDb.collection('connection_vault');
    
    let vault = await orgVaultCollection.findOne({
      organizationId,
      name: 'Collaborator Submissions Connection',
    });

    if (!vault) {
      // Import encryption functions
      try {
        const encryptionModule = await import('../src/lib/encryption');
        const { encrypt, generateSecureId } = encryptionModule;
        
        const vaultId = generateSecureId('vault');
        const encryptedConnectionString = encrypt(TARGET_MONGODB_URI!);

        vault = {
          vaultId,
          organizationId,
          projectId,
          createdBy: 'setup-script',
          name: 'Collaborator Submissions Connection',
          description: 'MongoDB connection for collaborator form submissions',
          encryptedConnectionString,
          encryptionKeyId: 'v1',
          database: TARGET_DATABASE,
          allowedCollections: [TARGET_COLLECTION],
          permissions: [
            {
              userId: 'setup-script',
              role: 'owner',
              grantedAt: new Date(),
              grantedBy: 'setup-script',
            },
          ],
          status: 'active',
          usageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await orgVaultCollection.insertOne(vault);
        console.log('  ✅ Created connection vault:', vaultId);
      } catch (encryptError: any) {
        console.error('  ❌ Failed to encrypt connection string:', encryptError.message);
        console.error('  💡 Make sure VAULT_ENCRYPTION_KEY is set in .env.local');
        console.error('  💡 Generate one with: openssl rand -base64 32');
        throw new Error('Encryption key not configured');
      }
    } else {
      console.log('  ✅ Found existing connection vault:', vault.vaultId);
    }

    await orgClient.close();
    const vaultId = vault.vaultId;

    // ============================================
    // Step 5: Create or Update Form
    // ============================================
    console.log('\n📋 Step 5: Creating/updating form...');
    
    // Use org-specific forms collection (format: org_{orgId}_forms)
    const orgDbName = organizationId; // org_abc123
    const orgClient2 = new MongoClient(MONGODB_URI!);
    await orgClient2.connect();
    const orgDb2 = orgClient2.db(orgDbName);
    const orgFormsCollection = orgDb2.collection('forms');
    
    const formId = formDefinition.id || `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const formSlug = formDefinition.slug || 'collaborator-interest-form';

    const formDoc = {
      formId,
      id: formId,
      slug: formSlug,
      name: formDefinition.name,
      description: formDefinition.description,
      organizationId,
      projectId,
      applicationId,
      fieldConfigs: formDefinition.fieldConfigs,
      variables: formDefinition.variables || [],
      theme: formDefinition.theme,
      formType: formDefinition.formType || 'conversational',
      conversationalConfig: formDefinition.conversationalConfig,
      dataSource: {
        vaultId,
        collection: TARGET_COLLECTION,
        database: TARGET_DATABASE,
      },
      isPublished: true,
      publishedAt: new Date(),
      currentVersion: 1,
      createdBy: 'setup-script',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await orgFormsCollection.updateOne(
      { formId },
      { $set: formDoc },
      { upsert: true }
    );

    await orgClient2.close();
    
    console.log('  ✅ Form created/updated:', formId);
    console.log('  ✅ Form slug:', formSlug);

    // ============================================
    // Step 6: Verify Setup
    // ============================================
    console.log('\n📋 Step 6: Verifying setup...');

    // Test connection to target MongoDB
    try {
      const targetClient = new MongoClient(TARGET_MONGODB_URI!);
      await targetClient.connect();
      const targetDb = targetClient.db(TARGET_DATABASE);
      const targetCollection = targetDb.collection(TARGET_COLLECTION);
      
      // Create index if needed
      await targetCollection.createIndex({ submittedAt: -1 });
      await targetCollection.createIndex({ 'data.email': 1 });
      
      await targetClient.close();
      console.log('  ✅ Target MongoDB connection verified');
    } catch (error) {
      console.warn('  ⚠️  Could not verify target MongoDB connection:', error);
    }

    // Verify form is accessible
    const savedForm = await orgFormsCollection.findOne({ formId });
    if (savedForm && savedForm.isPublished) {
      console.log('  ✅ Form is published and ready');
    } else {
      console.warn('  ⚠️  Form may not be properly published');
    }

    const formUrl = `/forms/${formSlug}`;

    console.log('\n✅ Setup complete!\n');
    console.log('📊 Summary:');
    console.log(`  Organization ID: ${organizationId}`);
    console.log(`  Project ID: ${projectId}`);
    console.log(`  Application ID: ${applicationId}`);
    console.log(`  Connection Vault ID: ${vaultId}`);
    console.log(`  Form ID: ${formId}`);
    console.log(`  Form Slug: ${formSlug}`);
    console.log(`  Form URL: ${formUrl}`);
    console.log(`  Target Collection: ${TARGET_DATABASE}.${TARGET_COLLECTION}\n`);

    return {
      organizationId,
      projectId,
      applicationId,
      vaultId,
      formId,
      formSlug,
      formUrl,
    };
  } catch (error) {
    console.error('❌ Error setting up collaborator app:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run the setup
setupCollaboratorApp()
  .then((result) => {
    console.log('🎉 Collaborator application is ready!');
    console.log(`\nVisit: http://localhost:3000${result.formUrl}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  });
