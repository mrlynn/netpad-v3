/**
 * Check Application
 *
 * Diagnostic script to check if an application exists and what fields it has.
 * Run with: npx tsx scripts/check-application.ts [orgId] [projectId] [applicationId]
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || process.env.PLATFORM_MONGODB_URI;
const DATABASE_NAME = process.env.PLATFORM_DB_NAME || 'form_builder_platform';

const ORG_ID = process.argv[2];
const PROJECT_ID = process.argv[3];
const APPLICATION_ID = process.argv[4];

if (!ORG_ID || !PROJECT_ID) {
  console.error('Usage: npx tsx scripts/check-application.ts <orgId> <projectId> [applicationId]');
  process.exit(1);
}

async function checkApplication() {
  const client = new MongoClient(MONGODB_URI!);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    // Use orgId directly as database name (same as getOrgDb does)
    const orgDb = client.db(ORG_ID);

    // Check all applications in the project
    const applicationsCollection = orgDb.collection('applications');
    
    console.log(`\n📋 All applications in project ${PROJECT_ID}:\n`);
    const allApps = await applicationsCollection
      .find({ organizationId: ORG_ID, projectId: PROJECT_ID })
      .toArray();
    
    console.log(`Found ${allApps.length} application(s):\n`);
    
    for (const app of allApps) {
      console.log(`Application: ${app.name}`);
      console.log(`  ID: ${app.applicationId}`);
      console.log(`  Organization: ${app.organizationId}`);
      console.log(`  Project: ${app.projectId}`);
      console.log(`  Slug: ${app.slug || 'MISSING'}`);
      console.log(`  Status: ${app.status || 'MISSING'}`);
      console.log(`  Version: ${app.version || 'MISSING'}`);
      console.log(`  Stats: ${JSON.stringify(app.stats || 'MISSING', null, 2)}`);
      console.log(`  isDefault: ${app.isDefault !== undefined ? app.isDefault : 'MISSING'}`);
      console.log(`  createdBy: ${app.createdBy || 'MISSING'}`);
      console.log(`  Created: ${app.createdAt}`);
      console.log(`  Updated: ${app.updatedAt}`);
      console.log('');
    }

    // If specific application ID provided, check it
    if (APPLICATION_ID) {
      console.log(`\n🔍 Checking specific application: ${APPLICATION_ID}\n`);
      const specificApp = await applicationsCollection.findOne({
        applicationId: APPLICATION_ID,
      });

      if (specificApp) {
        console.log('✅ Application found:');
        console.log(JSON.stringify(specificApp, null, 2));
      } else {
        console.log('❌ Application NOT found');
      }
    }

    // Check forms for this project
    console.log(`\n📝 Forms in project:\n`);
    const formsCollection = orgDb.collection('forms');
    const forms = await formsCollection
      .find({ organizationId: ORG_ID, projectId: PROJECT_ID })
      .toArray();
    
    console.log(`Found ${forms.length} form(s):\n`);
    for (const form of forms) {
      console.log(`  - ${form.name} (${form.id || form.formId})`);
      console.log(`    Application: ${form.applicationId || 'NONE'}`);
      console.log(`    Slug: ${form.slug || 'NONE'}`);
    }

    // Check workflows for this project
    console.log(`\n🔄 Workflows in project:\n`);
    const workflowsCollection = orgDb.collection('workflows');
    const workflows = await workflowsCollection
      .find({ orgId: ORG_ID, projectId: PROJECT_ID })
      .toArray();
    
    console.log(`Found ${workflows.length} workflow(s):\n`);
    for (const workflow of workflows) {
      console.log(`  - ${workflow.name} (${workflow.id})`);
      console.log(`    Application: ${workflow.applicationId || 'NONE'}`);
      console.log(`    Status: ${workflow.status || 'MISSING'}`);
      console.log(`    Slug: ${workflow.slug || 'NONE'}`);
    }

    // Test the query that listApplications uses
    console.log(`\n🔎 Testing listApplications query:\n`);
    const query = {
      organizationId: ORG_ID,
      projectId: PROJECT_ID,
    };
    console.log('Query:', JSON.stringify(query, null, 2));
    
    const matchingApps = await applicationsCollection.find(query).toArray();
    console.log(`\nFound ${matchingApps.length} matching application(s):\n`);
    for (const app of matchingApps) {
      console.log(`  - ${app.name} (${app.applicationId})`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
  }
}

checkApplication()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
