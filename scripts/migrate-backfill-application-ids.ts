/**
 * Migration Script: Backfill applicationId for Existing Forms and Workflows
 * 
 * Phase 2 Migration: Assigns default application IDs to all existing forms and workflows
 * that have a projectId but no applicationId.
 * 
 * Usage: npm run migrate:backfill-application-ids
 * or: tsx scripts/migrate-backfill-application-ids.ts
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || process.env.PLATFORM_MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set');
  process.exit(1);
}

const PLATFORM_DB_NAME = process.env.PLATFORM_DB_NAME || 'form_builder_platform';

async function migrateBackfillApplicationIds() {
  const client = new MongoClient(MONGODB_URI!);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const platformDb = client.db(PLATFORM_DB_NAME);
    const projectsCollection = platformDb.collection('projects');

    // Import functions after client is connected
    const { ensureDefaultApplication } = await import('../src/lib/platform/applications');
    const { getOrgDb } = await import('../src/lib/platform/db');

    // Get all projects
    const projects = await projectsCollection.find({}).toArray();
    console.log(`📊 Found ${projects.length} project(s) to process\n`);

    let totalFormsUpdated = 0;
    let totalWorkflowsUpdated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const project of projects) {
      try {
        console.log(`📦 Processing project "${project.name}" (${project.projectId})`);

        // Ensure default application exists
        const defaultApp = await ensureDefaultApplication(
          project.organizationId,
          project.projectId,
          project.createdBy || 'system'
        );
        console.log(`  ✅ Default application: ${defaultApp.applicationId}`);

        // Get organization database
        const orgDb = await getOrgDb(project.organizationId);

        // Update forms without applicationId
        const formsCollection = orgDb.collection('forms');
        const formsResult = await formsCollection.updateMany(
          {
            projectId: project.projectId,
            $or: [
              { applicationId: { $exists: false } },
              { applicationId: null },
              { applicationId: '' },
            ],
          },
          {
            $set: {
              applicationId: defaultApp.applicationId,
              updatedAt: new Date(),
            },
          }
        );

        const formsUpdated = formsResult.modifiedCount;
        if (formsUpdated > 0) {
          console.log(`  ✅ Updated ${formsUpdated} form(s) with applicationId`);
          totalFormsUpdated += formsUpdated;
        }

        // Update workflows without applicationId
        const workflowsCollection = orgDb.collection('workflows');
        const workflowsResult = await workflowsCollection.updateMany(
          {
            projectId: project.projectId,
            $or: [
              { applicationId: { $exists: false } },
              { applicationId: null },
              { applicationId: '' },
            ],
          },
          {
            $set: {
              applicationId: defaultApp.applicationId,
              updatedAt: new Date(),
            },
          }
        );

        const workflowsUpdated = workflowsResult.modifiedCount;
        if (workflowsUpdated > 0) {
          console.log(`  ✅ Updated ${workflowsUpdated} workflow(s) with applicationId`);
          totalWorkflowsUpdated += workflowsUpdated;
        }

        if (formsUpdated === 0 && workflowsUpdated === 0) {
          console.log(`  ⏭️  No forms/workflows to update`);
          totalSkipped++;
        }

        console.log(''); // Blank line between projects
      } catch (error) {
        console.error(`  ❌ Error processing project "${project.name}" (${project.projectId}):`, error);
        totalErrors++;
        console.log(''); // Blank line
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`  ✅ Forms updated: ${totalFormsUpdated}`);
    console.log(`  ✅ Workflows updated: ${totalWorkflowsUpdated}`);
    console.log(`  ⏭️  Projects skipped (no updates needed): ${totalSkipped}`);
    console.log(`  ❌ Errors: ${totalErrors}`);
    console.log(`  📦 Total projects processed: ${projects.length}`);

    if (totalErrors === 0) {
      console.log('\n✅ Migration completed successfully!');
    } else {
      console.log(`\n⚠️  Migration completed with ${totalErrors} error(s)`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('✅ Database connection closed');
  }
}

// Run migration
migrateBackfillApplicationIds().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
