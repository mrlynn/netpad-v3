#!/usr/bin/env tsx
/**
 * Setup RAG Database & Collections (No Atlas API Required)
 *
 * This script creates the necessary database, collections, and standard indexes
 * WITHOUT using the Atlas Admin API. You'll need to create the vector index
 * manually in Atlas UI afterward.
 *
 * Usage:
 *   npm run setup-rag-db -- --org <organizationId>
 */

import { MongoClient } from 'mongodb';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.TARGET_URI;

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: any = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--org' && args[i + 1]) {
      parsed.organizationId = args[i + 1];
      i++;
    }
  }

  return parsed;
}

async function setupRAGDatabase(organizationId: string) {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI or TARGET_URI environment variable not set');
  }

  console.log('\n🚀 RAG Database Setup\n');
  console.log(`Organization ID: ${organizationId}\n`);

  // Connect to MongoDB
  console.log('📡 Connecting to MongoDB...');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('   ✓ Connected\n');

  try {
    const databaseName = `netpad_rag_${organizationId}`;
    const db = client.db(databaseName);

    console.log(`📦 Setting up database: ${databaseName}`);

    // Create collections
    console.log('   Creating collections...');
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    if (!collectionNames.includes('rag_documents')) {
      await db.createCollection('rag_documents');
      console.log('   ✓ Created rag_documents collection');
    } else {
      console.log('   ✓ rag_documents collection exists');
    }

    if (!collectionNames.includes('rag_document_chunks')) {
      await db.createCollection('rag_document_chunks');
      console.log('   ✓ Created rag_document_chunks collection');
    } else {
      console.log('   ✓ rag_document_chunks collection exists');
    }

    // Create standard indexes
    console.log('\n   Creating standard indexes...');

    const documentsCollection = db.collection('rag_documents');
    await documentsCollection.createIndex({ formId: 1 });
    await documentsCollection.createIndex({ organizationId: 1, formId: 1 });
    await documentsCollection.createIndex({ status: 1 });
    await documentsCollection.createIndex({ uploadedAt: -1 });
    console.log('   ✓ Created indexes on rag_documents');

    const chunksCollection = db.collection('rag_document_chunks');
    await chunksCollection.createIndex({ documentId: 1 });
    await chunksCollection.createIndex({ formId: 1 });
    await chunksCollection.createIndex({ organizationId: 1, formId: 1 });
    console.log('   ✓ Created indexes on rag_document_chunks');

    console.log('\n✅ Database Setup Complete!\n');
    console.log('📝 Next Step: Create Vector Search Index in Atlas UI\n');
    console.log('Instructions:');
    console.log('1. Go to MongoDB Atlas: https://cloud.mongodb.com');
    console.log('2. Select cluster: performance');
    console.log('3. Navigate to: Database Services → Search');
    console.log('4. Click: "Create Search Index"');
    console.log(`5. Database: ${databaseName}`);
    console.log('6. Collection: rag_document_chunks');
    console.log('7. Use JSON Editor and paste this definition:\n');

    const indexDef = {
      name: 'rag_vector_index',
      type: 'vectorSearch',
      definition: {
        fields: [
          {
            type: 'vector',
            path: 'embedding',
            numDimensions: 1024,
            similarity: 'dotProduct',
          },
          { type: 'filter', path: 'formId' },
          { type: 'filter', path: 'organizationId' },
          { type: 'filter', path: 'documentId' },
          { type: 'filter', path: 'status' },
        ],
      },
    };

    console.log(JSON.stringify(indexDef, null, 2));
    console.log('\n8. Click "Create Search Index"');
    console.log('9. Wait 2-5 minutes for index to build');
    console.log('10. ✅ RAG is ready to use!\n');

  } finally {
    await client.close();
    console.log('📡 Disconnected from MongoDB\n');
  }
}

async function main() {
  const args = parseArgs();

  if (!args.organizationId) {
    console.error('❌ Error: --org parameter is required\n');
    console.error('Usage: npm run setup-rag-db -- --org org_abc123\n');
    process.exit(1);
  }

  if (!/^org_[a-zA-Z0-9_-]+$/.test(args.organizationId)) {
    console.error(`❌ Error: Invalid organization ID format: ${args.organizationId}`);
    console.error('   Expected format: org_abc123\n');
    process.exit(1);
  }

  try {
    await setupRAGDatabase(args.organizationId);
  } catch (error) {
    console.error('\n❌ Setup failed:');
    console.error(error);
    process.exit(1);
  }
}

main();
