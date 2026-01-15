/**
 * Verify Simple Contact App in API
 *
 * Directly queries the database the same way the API does to see why it's not returned.
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || process.env.PLATFORM_MONGODB_URI;
const ORG_ID = process.argv[2] || 'org_qpuGzFP-4Aq1-Jaw';
const PROJECT_ID = process.argv[3] || 'proj_tBJWVq5m5ZmYjSL2';
const APPLICATION_ID = process.argv[4] || 'app_simple_contact_1768419629405';

async function verify() {
  const client = new MongoClient(MONGODB_URI!);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    // Use orgId directly as database name (same as getOrgDb does)
    const orgDb = client.db(ORG_ID);
    const applicationsCollection = orgDb.collection('applications');
    
    console.log(`\n📂 Using database: ${ORG_ID}`);

    // Query exactly as listApplications does
    const query: Record<string, unknown> = {
      organizationId: ORG_ID,
      projectId: PROJECT_ID,
    };

    console.log('📋 Query:', JSON.stringify(query, null, 2));

    // Get the specific application
    const specificApp = await applicationsCollection.findOne({
      applicationId: APPLICATION_ID,
    });

    console.log('\n🔍 Specific Application:');
    if (specificApp) {
      console.log(JSON.stringify(specificApp, null, 2));
      console.log('\n✅ Application exists');
      console.log(`   organizationId: ${specificApp.organizationId} (matches: ${specificApp.organizationId === ORG_ID})`);
      console.log(`   projectId: ${specificApp.projectId} (matches: ${specificApp.projectId === PROJECT_ID})`);
      console.log(`   status: ${specificApp.status}`);
    } else {
      console.log('❌ Application NOT FOUND');
    }

    // Test the query
    const matchingApps = await applicationsCollection.find(query).toArray();
    console.log(`\n📊 Query matches ${matchingApps.length} applications:`);
    matchingApps.forEach((app, i) => {
      console.log(`   ${i + 1}. ${app.name} (${app.applicationId}) - status: ${app.status}`);
    });

    // Check if our app is in the results
    const found = matchingApps.find((a) => a.applicationId === APPLICATION_ID);
    if (found) {
      console.log(`\n✅ Simple Contact Form IS in query results`);
    } else {
      console.log(`\n❌ Simple Contact Form NOT in query results`);
      console.log(`   Checking why...`);
      
      if (specificApp) {
        console.log(`   - organizationId match: ${specificApp.organizationId === ORG_ID}`);
        console.log(`   - projectId match: ${specificApp.projectId === PROJECT_ID}`);
        if (specificApp.organizationId !== ORG_ID) {
          console.log(`   ❌ organizationId mismatch! Expected: ${ORG_ID}, Got: ${specificApp.organizationId}`);
        }
        if (specificApp.projectId !== PROJECT_ID) {
          console.log(`   ❌ projectId mismatch! Expected: ${PROJECT_ID}, Got: ${specificApp.projectId}`);
        }
      }
    }

    // Test with pagination (as API does)
    const sort = { updatedAt: -1 };
    const page = 1;
    const pageSize = 20;
    const paginatedApps = await applicationsCollection
      .find(query)
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray();

    console.log(`\n📄 Paginated results (page ${page}, size ${pageSize}):`);
    paginatedApps.forEach((app, i) => {
      console.log(`   ${i + 1}. ${app.name} (${app.applicationId})`);
    });

    const foundInPaginated = paginatedApps.find((a) => a.applicationId === APPLICATION_ID);
    if (foundInPaginated) {
      console.log(`\n✅ Simple Contact Form IS in paginated results`);
    } else {
      console.log(`\n❌ Simple Contact Form NOT in paginated results`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
  }
}

verify()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
