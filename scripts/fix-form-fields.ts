/**
 * Fix Form Fields - Add included: true to all fieldConfigs
 *
 * This script fixes existing forms by ensuring all fieldConfigs have included: true
 * so they display properly in the Form Builder.
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || process.env.PLATFORM_MONGODB_URI;
const ORG_ID = process.argv[2] || 'org_qpuGzFP-4Aq1-Jaw';
const PROJECT_ID = process.argv[3] || 'proj_tBJWVq5m5ZmYjSL2';
const APPLICATION_ID = process.argv[4]; // Optional: specific application

async function fixFormFields() {
  const client = new MongoClient(MONGODB_URI!);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    // Use orgId directly as database name (same as getOrgDb does)
    const orgDb = client.db(ORG_ID);
    const formsCollection = orgDb.collection('forms');

    console.log(`📂 Using database: ${ORG_ID}`);
    console.log(`📂 Project: ${PROJECT_ID}`);
    if (APPLICATION_ID) {
      console.log(`📂 Application: ${APPLICATION_ID}\n`);
    } else {
      console.log(`📂 All applications\n`);
    }

    // Build query
    const query: any = {
      organizationId: ORG_ID,
      projectId: PROJECT_ID,
    };
    if (APPLICATION_ID) {
      query.applicationId = APPLICATION_ID;
    }

    const forms = await formsCollection.find(query).toArray();
    console.log(`📋 Found ${forms.length} form(s)\n`);

    let fixedCount = 0;

    for (const form of forms) {
      if (!form.fieldConfigs || !Array.isArray(form.fieldConfigs)) {
        console.log(`⚠️  Form "${form.name}" has no fieldConfigs, skipping...`);
        continue;
      }

      // Check if any fields are missing included property
      const needsUpdate = form.fieldConfigs.some((field: any) => field.included === undefined);
      
      if (!needsUpdate) {
        console.log(`✓ Form "${form.name}" already has all fields with included property`);
        continue;
      }

      // Update fieldConfigs
      const updatedFieldConfigs = form.fieldConfigs.map((field: any) => ({
        ...field,
        included: field.included !== undefined ? field.included : true,
      }));

      await formsCollection.updateOne(
        { _id: form._id },
        { $set: { fieldConfigs: updatedFieldConfigs } }
      );

      const fieldsFixed = updatedFieldConfigs.filter((f: any) => f.included === true).length;
      console.log(`✅ Fixed form "${form.name}": ${fieldsFixed} fields now have included: true`);
      fixedCount++;
    }

    console.log(`\n✅ Fixed ${fixedCount} form(s)`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
  }
}

fixFormFields()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
