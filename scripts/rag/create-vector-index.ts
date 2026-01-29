/**
 * Create Vector Search Index for RAG
 *
 * This script creates the vector search index on the platform cluster
 * Required for all RAG features to work
 *
 * Usage:
 *   npx tsx scripts/rag/create-vector-index.ts [organizationId]
 *
 * If organizationId is not provided, it will prompt for the platform org ID
 */

import { getPlatformDb } from '@/lib/platform/db';
import { ensureVectorSearchIndex, getVectorIndexStatus } from '@/lib/rag/indexManagement';

async function main() {
  const args = process.argv.slice(2);
  let organizationId = args[0];

  // If no org ID provided, try to get the platform organization
  if (!organizationId) {
    console.log('📋 No organization ID provided. Looking for platform organization...\n');

    try {
      const db = await getPlatformDb();
      const orgsCollection = db.collection('organizations');

      // Find the platform organization (usually the first/system org)
      const platformOrg = await orgsCollection.findOne(
        { isSystemOrg: true },
        { projection: { orgId: 1, name: 1 } }
      );

      if (!platformOrg) {
        // If no system org, show first few orgs
        const orgs = await orgsCollection
          .find({}, { projection: { orgId: 1, name: 1 } })
          .limit(5)
          .toArray();

        if (orgs.length === 0) {
          console.error('❌ No organizations found in database');
          process.exit(1);
        }

        console.log('Available organizations:');
        orgs.forEach((org, i) => {
          console.log(`  ${i + 1}. ${org.name || 'Unnamed'} (${org.orgId})`);
        });
        console.log('\nPlease run: npx tsx scripts/rag/create-vector-index.ts <orgId>');
        process.exit(1);
      }

      organizationId = platformOrg.orgId;
      console.log(`✅ Found platform organization: ${platformOrg.name || 'Platform'} (${organizationId})\n`);
    } catch (error) {
      console.error('❌ Error finding organization:', error);
      process.exit(1);
    }
  }

  console.log('🚀 Creating vector search index for RAG...');
  console.log(`   Organization ID: ${organizationId}\n`);

  try {
    // Check current status
    console.log('1️⃣ Checking current index status...');
    const currentStatus = await getVectorIndexStatus(organizationId);

    if (currentStatus.exists) {
      console.log(`   ✅ Index already exists (status: ${currentStatus.status})`);

      if (currentStatus.queryable) {
        console.log('   ✅ Index is queryable and ready to use!\n');
        console.log('✨ Vector search index is ready. RAG features are now functional.\n');
        process.exit(0);
      } else if (currentStatus.status === 'BUILDING') {
        console.log('   ⏳ Index is building...');
        console.log('   This usually takes 5-10 minutes. Check status again with:');
        console.log(`   npx tsx scripts/rag/create-vector-index.ts ${organizationId}\n`);
        process.exit(0);
      } else {
        console.log(`   ⚠️  Index status: ${currentStatus.status}`);
        console.log('   You may need to recreate the index.\n');
      }
    } else {
      console.log('   ℹ️  No index found. Creating new index...\n');
    }

    // Create the index
    console.log('2️⃣ Creating vector search index...');
    const result = await ensureVectorSearchIndex(organizationId);

    if (result.error) {
      console.error(`   ❌ Error: ${result.error}\n`);
      console.error('Troubleshooting:');
      console.error('  1. Verify MongoDB Atlas cluster tier (M10+ required for vector search)');
      console.error('  2. Verify MongoDB driver version (6.5+ required)');
      console.error('  3. Check Atlas cluster is accessible');
      console.error('  4. Check that MONGODB_URI in .env.local is correct\n');
      process.exit(1);
    }

    if (result.created) {
      console.log('   ✅ Vector search index created successfully!\n');
      console.log('3️⃣ Waiting for index to build...');
      console.log('   ⏳ This usually takes 5-10 minutes.');
      console.log('   The index will build in the background.\n');

      console.log('📝 Next steps:');
      console.log('   1. Wait 5-10 minutes for the index to build');
      console.log('   2. Check status again with:');
      console.log(`      npx tsx scripts/rag/create-vector-index.ts ${organizationId}`);
      console.log('   3. Once status is READY, test RAG retrieval:');
      console.log('      - Upload a test document via UI');
      console.log('      - Create a conversational form');
      console.log('      - Ask a question related to the document\n');

      console.log('✨ Index creation initiated. Check back in 5-10 minutes!\n');
    } else {
      console.log(`   ℹ️  Index already exists (status: ${result.status})\n`);

      if (result.status === 'READY') {
        console.log('✨ Vector search index is ready. RAG features are now functional.\n');
      } else {
        console.log(`⏳ Index status: ${result.status}. Wait a few minutes and check again.\n`);
      }
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
    console.error('\nPlease check:');
    console.error('  1. MongoDB connection (MONGODB_URI in .env.local)');
    console.error('  2. Organization ID is correct');
    console.error('  3. Network connectivity to Atlas\n');
    process.exit(1);
  }
}

// Run the script
main()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
