/**
 * Publish QA Testing App to Marketplace
 *
 * Exports the QA Testing application and publishes it to the NetPad marketplace.
 *
 * Run with: npx tsx scripts/publish-qa-app-marketplace.ts
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const ORG_ID = 'org_SxfbnHiW8-7MuZaa';
const APP_ID = 'app_qa_1768941544566';
const PLATFORM_DB = process.env.PLATFORM_DB_NAME || 'form_builder_platform';

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is not set');
  process.exit(1);
}

/**
 * Clean form for export - removes sensitive org-specific data
 */
function cleanFormForExport(form: any) {
  const {
    _id,
    connectionString,
    dataSource,
    organizationId,
    createdBy,
    accessControl,
    ...exportableFields
  } = form;

  return {
    ...exportableFields,
    id: form.formId,
    slug: form.slug,
  };
}

/**
 * Clean workflow for export - removes sensitive org-specific data
 */
function cleanWorkflowForExport(workflow: any) {
  const {
    _id,
    orgId,
    organizationId,
    createdBy,
    lastModifiedBy,
    stats,
    ...exportableFields
  } = workflow;

  return {
    ...exportableFields,
    id: workflow.workflowId,
    slug: workflow.slug,
  };
}

async function publishQAApp() {
  const client = new MongoClient(MONGODB_URI!);

  try {
    await client.connect();
    console.log('Connected to MongoDB\n');

    const orgDb = client.db(ORG_ID);
    const platformDb = client.db(PLATFORM_DB);

    // 1. Get the application
    console.log('1. Fetching QA Testing application...');
    const app = await orgDb.collection('applications').findOne({ applicationId: APP_ID });
    if (!app) {
      throw new Error(`Application ${APP_ID} not found`);
    }
    console.log(`   Found: ${app.name} v${app.version}`);

    // 2. Get all forms
    console.log('\n2. Fetching forms...');
    const forms = await orgDb.collection('forms').find({ applicationId: APP_ID }).toArray();
    console.log(`   Found ${forms.length} forms:`);
    forms.forEach((f) => console.log(`   - ${f.name} (${f.formId})`));

    // 3. Get all workflows
    console.log('\n3. Fetching workflows...');
    const workflows = await orgDb.collection('workflows').find({ applicationId: APP_ID }).toArray();
    console.log(`   Found ${workflows.length} workflows:`);
    workflows.forEach((w) => console.log(`   - ${w.name} (${w.workflowId})`));

    // 4. Clean forms and workflows for export
    console.log('\n4. Cleaning data for export...');
    const cleanedForms = forms.map(cleanFormForExport);
    const cleanedWorkflows = workflows.map(cleanWorkflowForExport);

    // 5. Detect form-workflow connections
    console.log('\n5. Detecting form-workflow connections...');
    const connections: any[] = [];
    for (const workflow of cleanedWorkflows) {
      if (!workflow.canvas?.nodes) continue;
      const formTriggerNodes = workflow.canvas.nodes.filter((node: any) => node.type === 'form-trigger');
      for (const node of formTriggerNodes) {
        const formId = node.config?.formId;
        if (!formId) continue;
        const form = cleanedForms.find((f) => f.id === formId || f.slug === formId);
        if (form) {
          connections.push({
            id: `conn_${workflow.slug}_${form.slug}`,
            formRef: form.slug || form.id,
            workflowRef: workflow.slug || workflow.id,
            type: 'trigger',
            config: {
              triggerOn: node.config?.triggerOn || 'submit',
              conditions: node.config?.conditions || [],
            },
            description: `Workflow "${workflow.name}" triggers on form "${form.name}" submission`,
            enabled: node.enabled !== false,
          });
        }
      }
    }
    console.log(`   Found ${connections.length} connections`);

    // 6. Create the marketplace bundle
    console.log('\n6. Creating marketplace bundle...');
    const appId = `netpad-qa-testing-framework`;
    const bundle = {
      manifest: {
        id: appId,
        name: 'QA Testing Framework',
        version: '1.0.0',
        description:
          'A comprehensive QA testing framework for NetPad. Includes forms for test execution, bug reporting, daily checklists, and smoke testing, along with automated alert workflows for critical bugs and test failures.',
        summary:
          'Comprehensive QA testing framework with test execution, bug reporting, and automated alerts.',
        author: 'NetPad Team',
        category: 'productivity',
        tags: ['qa', 'testing', 'bug-tracking', 'quality-assurance', 'automation'],
        icon: '🧪',
        color: '#00684A',
        assets: {
          forms: cleanedForms.map((_, i) => `forms/form-${i + 1}.json`),
          workflows: cleanedWorkflows.map((_, i) => `workflows/workflow-${i + 1}.json`),
        },
        dependencies: {
          netpad: '>=1.0.0',
        },
        instructions: {
          setup: [
            'Import the QA Testing Framework application',
            'Configure email settings in workflow variables for alert notifications',
            'Customize test case options to match your project needs',
            'Activate workflows to enable automated alerts',
          ],
          usage: [
            'Use Test Execution form for running individual test cases',
            'Use Bug Report form to document issues found during testing',
            'Use Daily QA Checklist for routine daily checks',
            'Use Smoke Test form for quick verification tests',
          ],
        },
        marketplace: {
          featured: false,
          downloads: 0,
          rating: 0,
          reviews: 0,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      forms: cleanedForms,
      workflows: cleanedWorkflows,
      connections,
      theme: {
        preset: 'mongodb',
        primaryColor: '#00ED64',
        secondaryColor: '#001E2B',
      },
    };

    // 7. Check if already exists in marketplace
    console.log('\n7. Checking marketplace for existing entry...');
    const marketplaceCollection = platformDb.collection('marketplace_applications');
    const existing = await marketplaceCollection.findOne({ id: appId });
    if (existing) {
      console.log(`   Application already exists with status: ${existing.status}`);
    }

    // 8. Insert/Update in marketplace
    console.log('\n8. Publishing to marketplace...');
    const now = new Date().toISOString();
    const marketplaceDoc = {
      id: appId,
      manifest: bundle.manifest,
      bundle: bundle,
      published: false, // Will be true when approved
      status: 'pending', // Requires admin approval
      isOfficial: true, // This is an official NetPad app
      publishedBy: 'system',
      source: 'web',
      sourceOrgId: ORG_ID,
      sourceApplicationId: APP_ID,
      versions: [
        {
          version: '1.0.0',
          changelog: 'Initial release with 4 forms and 2 workflows',
          publishedAt: new Date(),
          publishedBy: 'system',
        },
      ],
      latestVersion: '1.0.0',
      latestVersionPublishedAt: now,
      stats: {
        downloads: 0,
        reviews: 0,
      },
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    if (existing) {
      await marketplaceCollection.updateOne({ id: appId }, { $set: marketplaceDoc });
      console.log('   Updated existing marketplace entry');
    } else {
      await marketplaceCollection.insertOne(marketplaceDoc);
      console.log('   Created new marketplace entry');
    }

    // 9. Summary
    console.log('\n--- Publication Summary ---');
    console.log(`App ID: ${appId}`);
    console.log(`Name: ${bundle.manifest.name}`);
    console.log(`Version: ${bundle.manifest.version}`);
    console.log(`Forms: ${cleanedForms.length}`);
    console.log(`Workflows: ${cleanedWorkflows.length}`);
    console.log(`Connections: ${connections.length}`);
    console.log(`Status: pending (requires admin approval)`);
    console.log('\nTo approve this app:');
    console.log('1. Go to /admin/marketplace-review');
    console.log('2. Find "QA Testing Framework" in the pending list');
    console.log('3. Click Approve (and optionally mark as Official)');
    console.log('\nDone!');
  } catch (error) {
    console.error('Error publishing QA app:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

publishQAApp();
