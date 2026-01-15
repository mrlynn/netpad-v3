/**
 * Verify Marketplace Data
 *
 * Quick script to check if marketplace applications exist in the database.
 * Run with: npx tsx scripts/verify-marketplace.ts
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || process.env.PLATFORM_MONGODB_URI;
const DATABASE_NAME = process.env.PLATFORM_DB_NAME || 'form_builder_platform';

async function verifyMarketplace() {
  if (!MONGODB_URI) {
    console.error('❌ Error: MONGODB_URI environment variable is not set');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DATABASE_NAME);
    const collection = db.collection('marketplace_applications');

    // Count all documents
    const total = await collection.countDocuments({});
    console.log(`📊 Total marketplace applications: ${total}`);

    // Count published
    const published = await collection.countDocuments({ published: true });
    console.log(`📊 Published applications: ${published}`);

    // Count unpublished
    const unpublished = await collection.countDocuments({ published: false });
    console.log(`📊 Unpublished (draft) applications: ${unpublished}\n`);

    if (total === 0) {
      console.log('⚠️  No applications found in marketplace_applications collection.');
      console.log('   Run the seed script: npm run seed:marketplace\n');
      return;
    }

    // List all applications
    const apps = await collection.find({}).toArray();
    console.log('📦 Applications in database:\n');
    
    for (const app of apps) {
      console.log(`   - ${app.id || 'NO ID'}`);
      console.log(`     Name: ${app.manifest?.name || 'NO NAME'}`);
      console.log(`     Published: ${app.published ? '✅' : '❌'}`);
      console.log(`     Category: ${app.manifest?.category || 'N/A'}`);
      console.log(`     Forms: ${app.bundle?.forms?.length || 0}`);
      console.log(`     Workflows: ${app.bundle?.workflows?.length || 0}`);
      console.log(`     Connections: ${app.bundle?.connections?.length || 0}`);
      console.log('');
    }

    // Test query (same as API uses)
    const publishedApps = await collection.find({ published: true }).toArray();
    console.log(`\n🔍 Query test (published: true):`);
    console.log(`   Found ${publishedApps.length} published application(s)`);

    if (publishedApps.length === 0 && total > 0) {
      console.log('\n⚠️  WARNING: Applications exist but none are published!');
      console.log('   Set published: true in the database or re-run seed script.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run verification
if (require.main === module) {
  verifyMarketplace()
    .then(() => {
      console.log('\n✅ Verification complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Verification failed:', error);
      process.exit(1);
    });
}

export { verifyMarketplace };
