/**
 * Move Simple Contact App to Correct Database
 *
 * Moves the application from the wrong database (org_org_xxx) to the correct one (org_xxx).
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || process.env.PLATFORM_MONGODB_URI;
const ORG_ID = process.argv[2] || 'org_qpuGzFP-4Aq1-Jaw';
const PROJECT_ID = process.argv[3] || 'proj_tBJWVq5m5ZmYjSL2';
const APPLICATION_ID = process.argv[4] || 'app_simple_contact_1768419629405';

async function moveApplication() {
  const client = new MongoClient(MONGODB_URI!);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    // Wrong database (where it was created)
    const wrongDb = client.db(`org_${ORG_ID}`);
    // Correct database (where it should be)
    const correctDb = client.db(ORG_ID);

    console.log(`📂 Wrong database: org_${ORG_ID}`);
    console.log(`📂 Correct database: ${ORG_ID}\n`);

    // Check if it exists in wrong database
    const wrongAppsCol = wrongDb.collection('applications');
    const wrongApp = await wrongAppsCol.findOne({ applicationId: APPLICATION_ID });

    if (wrongApp) {
      console.log(`✅ Found application in wrong database: ${wrongApp.name}`);
      
      // Check if it already exists in correct database
      const correctAppsCol = correctDb.collection('applications');
      const existing = await correctAppsCol.findOne({ applicationId: APPLICATION_ID });
      
      if (existing) {
        console.log(`⚠️  Application already exists in correct database. Deleting from wrong database...`);
        await wrongAppsCol.deleteOne({ applicationId: APPLICATION_ID });
        console.log(`✅ Deleted from wrong database`);
      } else {
        // Move to correct database
        console.log(`📦 Moving application to correct database...`);
        await correctAppsCol.insertOne(wrongApp);
        console.log(`✅ Moved application to correct database`);
        
        // Delete from wrong database
        await wrongAppsCol.deleteOne({ applicationId: APPLICATION_ID });
        console.log(`✅ Deleted from wrong database`);
      }

      // Also move form and workflow
      const wrongFormsCol = wrongDb.collection('forms');
      const wrongWorkflowsCol = wrongDb.collection('workflows');
      const correctFormsCol = correctDb.collection('forms');
      const correctWorkflowsCol = correctDb.collection('workflows');

      const form = await wrongFormsCol.findOne({ applicationId: APPLICATION_ID });
      if (form) {
        const existingForm = await correctFormsCol.findOne({ applicationId: APPLICATION_ID, slug: form.slug });
        if (!existingForm) {
          await correctFormsCol.insertOne(form);
          console.log(`✅ Moved form: ${form.name}`);
        }
        await wrongFormsCol.deleteOne({ _id: form._id });
      }

      const workflow = await wrongWorkflowsCol.findOne({ applicationId: APPLICATION_ID });
      if (workflow) {
        const existingWorkflow = await correctWorkflowsCol.findOne({ applicationId: APPLICATION_ID, slug: workflow.slug });
        if (!existingWorkflow) {
          await correctWorkflowsCol.insertOne(workflow);
          console.log(`✅ Moved workflow: ${workflow.name}`);
        }
        await wrongWorkflowsCol.deleteOne({ _id: workflow._id });
      }

      console.log(`\n✅ Application moved successfully!`);
    } else {
      console.log(`⚠️  Application not found in wrong database. Checking correct database...`);
      const correctAppsCol = correctDb.collection('applications');
      const correctApp = await correctAppsCol.findOne({ applicationId: APPLICATION_ID });
      if (correctApp) {
        console.log(`✅ Application already in correct database: ${correctApp.name}`);
      } else {
        console.log(`❌ Application not found in either database!`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
  }
}

moveApplication()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
