/**
 * Migration Script: Create Default Applications for Existing Projects
 * 
 * Phase 1 Migration: Adds default applications to all existing projects
 * that don't already have one.
 * 
 * Usage: npm run migrate:default-applications
 * or: tsx scripts/migrate-default-applications.ts
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

async function migrateDefaultApplications() {
  const client = new MongoClient(MONGODB_URI!);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const platformDb = client.db(PLATFORM_DB_NAME);
    const projectsCollection = platformDb.collection('projects');
    
    // Import functions after client is connected
    const { ensureDefaultApplication } = await import('../src/lib/platform/applications');
    const { getApplicationsCollection } = await import('../src/lib/platform/db');

    // Get all projects
    const projects = await projectsCollection.find({}).toArray();
    console.log(`📊 Found ${projects.length} project(s) to process`);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const project of projects) {
      try {
        // Check if default application already exists
        const applicationsCollection = await getApplicationsCollection(project.organizationId);
        
        const existingDefault = await applicationsCollection.findOne({
          projectId: project.projectId,
          isDefault: true,
        });

        if (existingDefault) {
          console.log(`⏭️  Project "${project.name}" (${project.projectId}) already has default application`);
          skipped++;
          continue;
        }

        // Create default application
        await ensureDefaultApplication(
          project.organizationId,
          project.projectId,
          project.createdBy || 'system'
        );

        console.log(`✅ Created default application for project "${project.name}" (${project.projectId})`);
        created++;
      } catch (error) {
        console.error(`❌ Error processing project "${project.name}" (${project.projectId}):`, error);
        errors++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`  ✅ Created: ${created}`);
    console.log(`  ⏭️  Skipped: ${skipped}`);
    console.log(`  ❌ Errors: ${errors}`);
    console.log(`  📦 Total: ${projects.length}`);

    if (errors === 0) {
      console.log('\n✅ Migration completed successfully!');
    } else {
      console.log(`\n⚠️  Migration completed with ${errors} error(s)`);
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
migrateDefaultApplications().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
