/**
 * Migration Script: Application Permissions (Phase 10)
 *
 * Ensures backward compatibility by:
 * 1. Setting defaultAccess: 'org_members' for existing applications
 * 2. No explicit permissions needed - creators are implicit owners
 * 3. Org owners/admins have full access by default
 *
 * Run: npx tsx scripts/migrate-application-permissions.ts
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is required');
  process.exit(1);
}

async function migrate() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    // Get all organization databases
    const adminDb = client.db().admin();
    const databases = await adminDb.listDatabases();
    
    const orgDatabases = databases.databases
      .map((db) => db.name)
      .filter((name) => name.startsWith('org_'));

    console.log(`Found ${orgDatabases.length} organization databases`);

    let totalUpdated = 0;
    let totalSkipped = 0;

    for (const dbName of orgDatabases) {
      try {
        const db = client.db(dbName);
        const applicationsCollection = db.collection('applications');

        // Find applications without defaultAccess field
        const applicationsToUpdate = await applicationsCollection
          .find({
            $or: [
              { defaultAccess: { $exists: false } },
              { defaultAccess: null },
            ],
          })
          .toArray();

        if (applicationsToUpdate.length === 0) {
          continue;
        }

        console.log(`\n[${dbName}] Found ${applicationsToUpdate.length} applications to update`);

        // Update all applications to have defaultAccess: 'org_members'
        const result = await applicationsCollection.updateMany(
          {
            $or: [
              { defaultAccess: { $exists: false } },
              { defaultAccess: null },
            ],
          },
          {
            $set: {
              defaultAccess: 'org_members',
              updatedAt: new Date(),
            },
          }
        );

        console.log(`[${dbName}] Updated ${result.modifiedCount} applications`);
        totalUpdated += result.modifiedCount;
        totalSkipped += applicationsToUpdate.length - result.modifiedCount;
      } catch (error: any) {
        console.error(`[${dbName}] Error:`, error.message);
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total applications updated: ${totalUpdated}`);
    console.log(`Total applications skipped: ${totalSkipped}`);
    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run migration
migrate().catch(console.error);
