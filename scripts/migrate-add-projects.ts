/**
 * Migration Script: Add Projects to NetPad (Atlas Hierarchy Migration)
 *
 * This script:
 * 1. Creates a default "General" project for each organization (with 'dev' environment)
 * 2. Assigns all existing forms to the default project
 * 3. Assigns all existing workflows to the default project
 * 4. Assigns all existing clusters to the default project
 * 5. Assigns all existing connections to the default project
 * 6. Updates project statistics (including cluster and connection counts)
 *
 * Run with: npx tsx scripts/migrate-add-projects.ts
 * 
 * Make sure MONGODB_URI is set in your environment:
 *   export MONGODB_URI="mongodb+srv://..."
 *   npx tsx scripts/migrate-add-projects.ts
 * 
 * Or run with inline env var:
 *   MONGODB_URI="mongodb+srv://..." npx tsx scripts/migrate-add-projects.ts
 */

import { MongoClient, Db } from 'mongodb';
import crypto from 'crypto';

const MONGODB_URI = process.env.MONGODB_URI;
const PLATFORM_DB_NAME = process.env.PLATFORM_DB_NAME || 'form_builder_platform';

if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is required');
  process.exit(1);
}

/**
 * Generate a secure ID with optional prefix
 */
function generateSecureId(prefix: string = ''): string {
  const randomPart = crypto.randomBytes(12).toString('base64url');
  return prefix ? `${prefix}_${randomPart}` : randomPart;
}

/**
 * Get or create default project for an organization
 */
async function ensureDefaultProject(
  client: MongoClient,
  organizationId: string,
  createdBy: string
): Promise<{ projectId: string; name: string; createdAt: Date }> {
  const platformDb = client.db(PLATFORM_DB_NAME);
  const projectsCollection = platformDb.collection('projects');

  // Check if default project exists
  const existing = await projectsCollection.findOne({
    organizationId,
    slug: 'general',
  });

  if (existing) {
    return {
      projectId: existing.projectId,
      name: existing.name,
      createdAt: existing.createdAt,
    };
  }

  // Create default project with 'dev' environment
  const now = new Date();
  const project = {
    projectId: generateSecureId('proj'),
    organizationId,
    name: 'General',
    description: 'Default project for organizing forms, workflows, clusters, and connections',
    slug: 'general',
    environment: 'dev' as const, // Required: dev, test, staging, or prod
    tags: [],
    settings: {},
    stats: {
      formCount: 0,
      workflowCount: 0,
      clusterCount: 0,
      connectionCount: 0,
    },
    createdBy,
    createdAt: now,
    updatedAt: now,
  };

  await projectsCollection.insertOne(project);

  return {
    projectId: project.projectId,
    name: project.name,
    createdAt: project.createdAt,
  };
}

/**
 * Calculate and update project statistics
 */
async function calculateProjectStats(
  client: MongoClient,
  projectId: string,
  organizationId: string
): Promise<void> {
  const platformDb = client.db(PLATFORM_DB_NAME);
  const projectsCollection = platformDb.collection('projects');
  const orgDb = client.db(organizationId);

  // Count forms
  const formsCollection = orgDb.collection('forms');
  const formCount = await formsCollection.countDocuments({ projectId });

  // Count workflows
  const workflowsCollection = orgDb.collection('workflows');
  const workflowCount = await workflowsCollection.countDocuments({ projectId });

  // Count clusters (platform database)
  const clustersCollection = platformDb.collection('provisioned_clusters');
  const clusterCount = await clustersCollection.countDocuments({ 
    projectId, 
    deletedAt: { $exists: false } 
  });

  // Count connections (organization database)
  const connectionsCollection = orgDb.collection('connection_vault');
  const connectionCount = await connectionsCollection.countDocuments({ 
    projectId, 
    status: { $ne: 'deleted' } 
  });

  // Get last activity date (most recent form or workflow update)
  const [latestForm, latestWorkflow] = await Promise.all([
    formsCollection
      .find({ projectId })
      .sort({ updatedAt: -1 })
      .limit(1)
      .toArray(),
    workflowsCollection
      .find({ projectId })
      .sort({ updatedAt: -1 })
      .limit(1)
      .toArray(),
  ]);

  let lastActivityAt: Date | undefined;
  const formDate = latestForm[0]?.updatedAt;
  const workflowDate = latestWorkflow[0]?.updatedAt;

  if (formDate && workflowDate) {
    lastActivityAt = formDate > workflowDate ? formDate : workflowDate;
  } else if (formDate) {
    lastActivityAt = formDate;
  } else if (workflowDate) {
    lastActivityAt = workflowDate;
  }

  // Update project stats
  await projectsCollection.updateOne(
    { projectId },
    {
      $set: {
        'stats.formCount': formCount,
        'stats.workflowCount': workflowCount,
        'stats.clusterCount': clusterCount,
        'stats.connectionCount': connectionCount,
        'stats.lastActivityAt': lastActivityAt,
        updatedAt: new Date(),
      },
    }
  );
}

async function migrate() {
  console.log('🚀 Starting Projects migration...\n');

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const platformDb = client.db(PLATFORM_DB_NAME);
    const organizationsCollection = platformDb.collection('organizations');

    // Get all organizations
    const organizations = await organizationsCollection.find({}).toArray();
    console.log(`📋 Found ${organizations.length} organization(s)\n`);

    let totalFormsMigrated = 0;
    let totalWorkflowsMigrated = 0;
    let totalClustersMigrated = 0;
    let totalConnectionsMigrated = 0;
    let projectsCreated = 0;

    for (const org of organizations) {
      const orgId = org.orgId;
      console.log(`\n🏢 Processing organization: ${org.name} (${orgId})`);

      try {
        // Get or create default project
        const defaultProject = await ensureDefaultProject(
          client,
          orgId,
          org.createdBy || 'system'
        );

        const wasJustCreated = defaultProject.createdAt.getTime() > Date.now() - 5000; // Created within last 5 seconds
        if (wasJustCreated) {
          projectsCreated++;
          console.log(`  ✅ Created default project: ${defaultProject.name} (${defaultProject.projectId})`);
        } else {
          console.log(`  ℹ️  Default project already exists: ${defaultProject.name} (${defaultProject.projectId})`);
        }

        // Get organization database
        const orgDb = client.db(orgId);

        // Migrate forms
        const formsCollection = orgDb.collection('forms');
        const formsWithoutProject = await formsCollection.find({
          projectId: { $exists: false },
        }).toArray();

        if (formsWithoutProject.length > 0) {
          const result = await formsCollection.updateMany(
            { projectId: { $exists: false } },
            {
              $set: {
                projectId: defaultProject.projectId,
                updatedAt: new Date(),
              },
            }
          );
          totalFormsMigrated += result.modifiedCount;
          console.log(`  📝 Migrated ${result.modifiedCount} form(s) to default project`);
        } else {
          console.log(`  ℹ️  No forms to migrate`);
        }

        // Migrate workflows
        const workflowsCollection = orgDb.collection('workflows');
        const workflowsWithoutProject = await workflowsCollection.find({
          projectId: { $exists: false },
        }).toArray();

        if (workflowsWithoutProject.length > 0) {
          const result = await workflowsCollection.updateMany(
            { projectId: { $exists: false } },
            {
              $set: {
                projectId: defaultProject.projectId,
                updatedAt: new Date(),
              },
            }
          );
          totalWorkflowsMigrated += result.modifiedCount;
          console.log(`  🔄 Migrated ${result.modifiedCount} workflow(s) to default project`);
        } else {
          console.log(`  ℹ️  No workflows to migrate`);
        }

        // Migrate clusters (platform database)
        const clustersCollection = platformDb.collection('provisioned_clusters');
        const clustersWithoutProject = await clustersCollection.find({
          organizationId: orgId,
          projectId: { $exists: false },
          deletedAt: { $exists: false },
        }).toArray();

        if (clustersWithoutProject.length > 0) {
          const result = await clustersCollection.updateMany(
            { 
              organizationId: orgId,
              projectId: { $exists: false },
              deletedAt: { $exists: false },
            },
            {
              $set: {
                projectId: defaultProject.projectId,
                updatedAt: new Date(),
              },
            }
          );
          totalClustersMigrated += result.modifiedCount;
          console.log(`  🗄️  Migrated ${result.modifiedCount} cluster(s) to default project`);
        } else {
          console.log(`  ℹ️  No clusters to migrate`);
        }

        // Migrate connections (organization database)
        const connectionsCollection = orgDb.collection('connection_vault');
        const connectionsWithoutProject = await connectionsCollection.find({
          organizationId: orgId,
          projectId: { $exists: false },
          status: { $ne: 'deleted' },
        }).toArray();

        if (connectionsWithoutProject.length > 0) {
          const result = await connectionsCollection.updateMany(
            { 
              organizationId: orgId,
              projectId: { $exists: false },
              status: { $ne: 'deleted' },
            },
            {
              $set: {
                projectId: defaultProject.projectId,
                updatedAt: new Date(),
              },
            }
          );
          totalConnectionsMigrated += result.modifiedCount;
          console.log(`  🔌 Migrated ${result.modifiedCount} connection(s) to default project`);
        } else {
          console.log(`  ℹ️  No connections to migrate`);
        }

        // Update project statistics
        await calculateProjectStats(client, defaultProject.projectId, orgId);
        console.log(`  📊 Updated project statistics`);

      } catch (error) {
        console.error(`  ❌ Error processing organization ${orgId}:`, error);
        // Continue with next organization
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration completed!');
    console.log('='.repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   - Projects created: ${projectsCreated}`);
    console.log(`   - Forms migrated: ${totalFormsMigrated}`);
    console.log(`   - Workflows migrated: ${totalWorkflowsMigrated}`);
    console.log(`   - Clusters migrated: ${totalClustersMigrated}`);
    console.log(`   - Connections migrated: ${totalConnectionsMigrated}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Closed MongoDB connection');
  }
}

// Run migration
migrate().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
