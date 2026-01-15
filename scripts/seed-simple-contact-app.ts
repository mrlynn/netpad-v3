/**
 * Seed Simple Contact App
 *
 * Creates a simple contact form application in an organization for testing publishing.
 * Run with: npx tsx scripts/seed-simple-contact-app.ts [orgId] [projectId]
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || process.env.PLATFORM_MONGODB_URI;
const DATABASE_NAME = process.env.PLATFORM_DB_NAME || 'form_builder_platform';

const ORG_ID = process.argv[2];
const PROJECT_ID = process.argv[3];
const USER_ID = process.argv[4] || 'system';

if (!ORG_ID || !PROJECT_ID) {
  console.error('Usage: npx tsx scripts/seed-simple-contact-app.ts <orgId> <projectId> [userId]');
  process.exit(1);
}

async function loadSimpleContactBundle() {
  const templatesDir = path.join(process.cwd(), 'examples/simple-contact-app/templates');
  
  // Load manifest
  const manifestPath = path.join(templatesDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  // Load form
  const formPath = path.join(templatesDir, 'form.json');
  const form = JSON.parse(fs.readFileSync(formPath, 'utf-8'));

  // Load workflow
  const workflowPath = path.join(templatesDir, 'workflow.json');
  const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf-8'));

  return {
    manifest,
    forms: [form],
    workflows: [workflow],
    connections: [
      {
        id: `conn_${Date.now()}`,
        formRef: form.slug || form.id,
        workflowRef: workflow.slug || workflow.id,
        type: 'trigger',
        config: {
          triggerOn: 'submit',
        },
        description: 'Triggers email notification on form submission',
        enabled: true,
      },
    ],
  };
}

async function seedApplication() {
  const client = new MongoClient(MONGODB_URI!);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const platformDb = client.db(DATABASE_NAME);
    // Use orgId directly as database name (same as getOrgDb does)
    const orgDb = client.db(ORG_ID);

    // Load bundle
    console.log('📦 Loading Simple Contact App bundle...');
    const bundle = await loadSimpleContactBundle();

    // Create application
    const applicationsCollection = orgDb.collection('applications');
    const applicationId = `app_simple_contact_${Date.now()}`;
    
    // Generate slug from name
    const slug = bundle.manifest.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
    
    const application = {
      applicationId,
      organizationId: ORG_ID,
      projectId: PROJECT_ID,
      name: bundle.manifest.name,
      description: bundle.manifest.description,
      slug,
      icon: bundle.manifest.icon || '📧',
      color: '#2196F3',
      version: bundle.manifest.version || '1.0.0',
      tags: bundle.manifest.tags || [],
      stats: {
        formsCount: 0,
        workflowsCount: 0,
        connectionsCount: 0,
      },
      status: 'active' as const,
      isDefault: false,
      createdBy: USER_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const existingApp = await applicationsCollection.findOne({
      organizationId: ORG_ID,
      projectId: PROJECT_ID,
      name: bundle.manifest.name,
    });

    if (existingApp) {
      console.log(`⚠️  Application "${bundle.manifest.name}" already exists. Using existing: ${existingApp.applicationId}`);
      application.applicationId = existingApp.applicationId;
    } else {
      await applicationsCollection.insertOne(application);
      console.log(`✅ Created application: ${application.name} (${application.applicationId})`);
    }

    // Create form
    const formsCollection = orgDb.collection('forms');
    const formDef = bundle.forms[0];
    const formId = `form_${Date.now()}`;

    // Ensure all fieldConfigs have required properties
    const processedFieldConfigs = (formDef.fieldConfigs || []).map((field: any) => ({
      ...field,
      included: field.included !== undefined ? field.included : true, // Default to included if not specified
    }));

    const formDoc = {
      id: formId,
      formId,
      slug: formDef.slug || 'contact',
      name: formDef.name,
      description: formDef.description,
      fieldConfigs: processedFieldConfigs,
      isPublished: false,
      organizationId: ORG_ID,
      projectId: PROJECT_ID,
      applicationId: application.applicationId,
      createdBy: USER_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const existingForm = await formsCollection.findOne({
      organizationId: ORG_ID,
      projectId: PROJECT_ID,
      applicationId: application.applicationId,
      slug: formDoc.slug,
    });

    if (existingForm) {
      console.log(`⚠️  Form "${formDef.name}" already exists. Skipping...`);
    } else {
      await formsCollection.insertOne(formDoc);
      console.log(`✅ Created form: ${formDef.name} (${formDoc.slug})`);
    }

    // Create workflow
    const workflowsCollection = orgDb.collection('workflows');
    const workflowDef = bundle.workflows[0];
    const workflowId = `wf_${Date.now()}`;

    const workflowDoc = {
      id: workflowId,
      slug: workflowDef.slug || 'contact-notification',
      name: workflowDef.name,
      description: workflowDef.description,
      canvas: workflowDef.canvas,
      settings: workflowDef.settings,
      variables: workflowDef.variables || [],
      status: 'draft' as const,
      version: 1,
      tags: workflowDef.tags || [],
      stats: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        avgExecutionTimeMs: 0,
      },
      orgId: ORG_ID,
      projectId: PROJECT_ID,
      applicationId: application.applicationId,
      createdBy: USER_ID,
      lastModifiedBy: USER_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const existingWorkflow = await workflowsCollection.findOne({
      orgId: ORG_ID,
      projectId: PROJECT_ID,
      applicationId: application.applicationId,
      slug: workflowDoc.slug,
    });

    if (existingWorkflow) {
      console.log(`⚠️  Workflow "${workflowDef.name}" already exists. Skipping...`);
    } else {
      await workflowsCollection.insertOne(workflowDoc);
      console.log(`✅ Created workflow: ${workflowDef.name} (${workflowDoc.slug})`);
    }

    console.log(`\n✅ Simple Contact App seeded successfully!`);
    console.log(`\n📊 Summary:`);
    console.log(`   - Application: ${application.name} (${application.applicationId})`);
    console.log(`   - Form: ${formDef.name}`);
    console.log(`   - Workflow: ${workflowDef.name}`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Navigate to: /orgs/${ORG_ID}/projects/${PROJECT_ID}/applications/${application.applicationId}`);
    console.log(`   2. Create a release`);
    console.log(`   3. Publish to marketplace`);

  } catch (error) {
    console.error('❌ Error seeding application:', error);
    throw error;
  } finally {
    await client.close();
  }
}

seedApplication()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
