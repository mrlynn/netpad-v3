/**
 * Fix Simple Contact App
 *
 * Updates existing simple contact app documents with missing required fields.
 * Run with: npx tsx scripts/fix-simple-contact-app.ts [orgId] [projectId] [applicationId]
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

if (!ORG_ID || !PROJECT_ID || !APPLICATION_ID) {
  console.error('Usage: npx tsx scripts/fix-simple-contact-app.ts <orgId> <projectId> <applicationId>');
  process.exit(1);
}

async function fixApplication() {
  const client = new MongoClient(MONGODB_URI!);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    // Use orgId directly as database name (same as getOrgDb does)
    const orgDb = client.db(ORG_ID);

    // Fix application first
    const applicationsCollection = orgDb.collection('applications');
    const application = await applicationsCollection.findOne({
      applicationId: APPLICATION_ID,
    });

    if (application) {
      const update: any = {};
      
      // Generate slug if missing
      if (!application.slug) {
        update.slug = application.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 50);
      }
      
      // Add missing required fields
      if (!application.version) {
        update.version = '1.0.0';
      }
      if (!application.status) {
        update.status = 'active';
      }
      if (application.isDefault === undefined) {
        update.isDefault = false;
      }
      if (!application.createdBy) {
        update.createdBy = 'system';
      }

      // Recalculate stats from actual forms and workflows
      const formsCollection = orgDb.collection('forms');
      const workflowsCollection = orgDb.collection('workflows');
      
      const [formsCount, workflowsCount] = await Promise.all([
        formsCollection.countDocuments({
          organizationId: ORG_ID,
          projectId: PROJECT_ID,
          applicationId: APPLICATION_ID,
        }),
        workflowsCollection.countDocuments({
          orgId: ORG_ID,
          projectId: PROJECT_ID,
          applicationId: APPLICATION_ID,
        }),
      ]);

      // Count connections (forms with vaultId)
      const formsWithConnections = await formsCollection
        .find({
          organizationId: ORG_ID,
          projectId: PROJECT_ID,
          applicationId: APPLICATION_ID,
          'dataSource.vaultId': { $exists: true, $ne: null },
        })
        .toArray();

      const uniqueVaultIds = new Set<string>();
      formsWithConnections.forEach((form: any) => {
        if (form.dataSource?.vaultId) {
          uniqueVaultIds.add(form.dataSource.vaultId);
        }
      });

      update.stats = {
        formsCount,
        workflowsCount,
        connectionsCount: uniqueVaultIds.size,
      };

      console.log(`📊 Recalculated stats: ${formsCount} forms, ${workflowsCount} workflows, ${uniqueVaultIds.size} connections`);

      if (Object.keys(update).length > 0) {
        await applicationsCollection.updateOne(
          { _id: application._id },
          { $set: update }
        );
        console.log(`✅ Fixed application: ${application.name}`);
      } else {
        console.log(`✓ Application already has required fields: ${application.name}`);
      }
    } else {
      console.log(`⚠️  Application not found: ${APPLICATION_ID}`);
      return;
    }

    // Fix form
    const formsCollection = orgDb.collection('forms');
    const form = await formsCollection.findOne({
      organizationId: ORG_ID,
      projectId: PROJECT_ID,
      applicationId: APPLICATION_ID,
      slug: 'contact',
    });

    if (form) {
      const update: any = {};
      if (form.isPublished === undefined) {
        update.isPublished = false;
      }
      
      // Fix fieldConfigs: ensure all fields have included: true
      if (form.fieldConfigs && Array.isArray(form.fieldConfigs)) {
        const needsUpdate = form.fieldConfigs.some((field: any) => field.included === undefined);
        if (needsUpdate) {
          update.fieldConfigs = form.fieldConfigs.map((field: any) => ({
            ...field,
            included: field.included !== undefined ? field.included : true,
          }));
          console.log(`📝 Updating ${update.fieldConfigs.length} field configs to include 'included: true'`);
        }
      }
      
      if (Object.keys(update).length > 0) {
        await formsCollection.updateOne(
          { _id: form._id },
          { $set: update }
        );
        console.log(`✅ Fixed form: ${form.name}`);
      } else {
        console.log(`✓ Form already has required fields: ${form.name}`);
      }
    } else {
      console.log(`⚠️  Form not found for application ${APPLICATION_ID}`);
    }

    // Fix workflow
    const workflowsCollection = orgDb.collection('workflows');
    const workflow = await workflowsCollection.findOne({
      orgId: ORG_ID,
      projectId: PROJECT_ID,
      applicationId: APPLICATION_ID,
      slug: 'contact-notification',
    });

    if (workflow) {
      const update: any = {};
      if (!workflow.status) {
        update.status = 'draft';
      }
      if (!workflow.version) {
        update.version = 1;
      }
      if (!workflow.tags || workflow.tags.length === 0) {
        update.tags = [];
      }
      if (!workflow.stats) {
        update.stats = {
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0,
          avgExecutionTimeMs: 0,
        };
      }
      if (!workflow.lastModifiedBy) {
        update.lastModifiedBy = workflow.createdBy || 'system';
      }

      if (Object.keys(update).length > 0) {
        await workflowsCollection.updateOne(
          { _id: workflow._id },
          { $set: update }
        );
        console.log(`✅ Fixed workflow: ${workflow.name}`);
      } else {
        console.log(`✓ Workflow already has required fields: ${workflow.name}`);
      }
    } else {
      console.log(`⚠️  Workflow not found for application ${APPLICATION_ID}`);
    }

    console.log(`\n✅ Fix complete!`);
    console.log(`\n💡 Try refreshing the application page now.`);

  } catch (error) {
    console.error('❌ Error fixing application:', error);
    throw error;
  } finally {
    await client.close();
  }
}

fixApplication()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
