/**
 * Test Applications API
 *
 * Calls the applications API and shows the response.
 * Run with: npx tsx scripts/test-applications-api.ts [orgId] [projectId]
 */

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const ORG_ID = process.argv[2] || 'org_qpuGzFP-4Aq1-Jaw';
const PROJECT_ID = process.argv[3] || 'proj_tBJWVq5m5ZmYjSL2';

async function testAPI() {
  const url = `http://localhost:3000/api/applications?orgId=${ORG_ID}&projectId=${PROJECT_ID}`;
  console.log(`\n🔍 Testing API: ${url}\n`);

  try {
    const response = await fetch(url, {
      headers: {
        'Cookie': process.env.TEST_COOKIE || '', // You might need to set this
      },
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log(`\n📦 Response:\n`);
    console.log(JSON.stringify(data, null, 2));

    if (data.success && data.applications) {
      console.log(`\n✅ Found ${data.applications.length} application(s):\n`);
      data.applications.forEach((app: any, index: number) => {
        console.log(`${index + 1}. ${app.name} (${app.applicationId})`);
        console.log(`   Status: ${app.status}`);
        console.log(`   Stats: ${app.stats?.formsCount || 0} forms, ${app.stats?.workflowsCount || 0} workflows`);
        console.log(`   Created: ${app.createdAt}`);
        console.log(`   Updated: ${app.updatedAt}`);
        console.log('');
      });
    } else {
      console.log(`\n⚠️  No applications in response or success=false`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testAPI()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
