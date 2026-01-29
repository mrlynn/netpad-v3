#!/usr/bin/env tsx
/**
 * Setup Vector Search Index for RAG
 *
 * This script creates the necessary database, collections, and vector search index
 * for RAG features on a per-organization basis.
 *
 * Usage:
 *   npm run setup-rag-index -- --org <organizationId>
 *   tsx scripts/rag/setup-vector-index.ts --org org_abc123
 */

import { MongoClient } from 'mongodb';
import axios from 'axios';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// ============================================
// Configuration
// ============================================

const MONGODB_URI = process.env.MONGODB_URI || process.env.TARGET_URI;
const ATLAS_PUBLIC_KEY = process.env.ATLAS_PUBLIC_KEY;
const ATLAS_PRIVATE_KEY = process.env.ATLAS_PRIVATE_KEY;
const ATLAS_ORG_ID = process.env.ATLAS_ORG_ID;

// Vector index definition
const VECTOR_INDEX_DEFINITION = {
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
      {
        type: 'filter',
        path: 'formId',
      },
      {
        type: 'filter',
        path: 'organizationId',
      },
      {
        type: 'filter',
        path: 'documentId',
      },
      {
        type: 'filter',
        path: 'status',
      },
    ],
  },
};

// ============================================
// Helper Functions
// ============================================

function parseArgs(): { organizationId?: string; help?: boolean } {
  const args = process.argv.slice(2);
  const parsed: any = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--org' && args[i + 1]) {
      parsed.organizationId = args[i + 1];
      i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
      parsed.help = true;
    }
  }

  return parsed;
}

function printUsage() {
  console.log(`
Setup Vector Search Index for RAG

Usage:
  npm run setup-rag-index -- --org <organizationId>
  tsx scripts/rag/setup-vector-index.ts --org org_abc123

Options:
  --org <organizationId>   Organization ID to set up RAG for
  --help, -h              Show this help message

Environment Variables Required:
  MONGODB_URI or TARGET_URI     MongoDB connection string
  ATLAS_PUBLIC_KEY              Atlas Admin API public key
  ATLAS_PRIVATE_KEY             Atlas Admin API private key
  ATLAS_ORG_ID                  Atlas organization ID

Example:
  tsx scripts/rag/setup-vector-index.ts --org org_abc123
`);
}

async function getAtlasProjectId(): Promise<string> {
  if (!ATLAS_PUBLIC_KEY || !ATLAS_PRIVATE_KEY || !ATLAS_ORG_ID) {
    throw new Error('Missing Atlas Admin API credentials in environment variables');
  }

  console.log('🔍 Finding Atlas project...');

  // Extract cluster name from connection string
  const match = MONGODB_URI?.match(/\/\/[^@]+@([^.]+)\./);
  const clusterName = match ? match[1] : 'performance';

  console.log(`   Cluster name: ${clusterName}`);

  // Get all projects in the organization
  const response = await axios.get(
    `https://cloud.mongodb.com/api/atlas/v1.0/groups`,
    {
      auth: {
        username: ATLAS_PUBLIC_KEY,
        password: ATLAS_PRIVATE_KEY,
      },
      params: {
        orgId: ATLAS_ORG_ID,
      },
    }
  );

  const projects = response.data.results;

  if (!projects || projects.length === 0) {
    throw new Error('No Atlas projects found');
  }

  // Try to find project containing our cluster
  for (const project of projects) {
    try {
      const clustersResponse = await axios.get(
        `https://cloud.mongodb.com/api/atlas/v1.0/groups/${project.id}/clusters`,
        {
          auth: {
            username: ATLAS_PUBLIC_KEY,
            password: ATLAS_PRIVATE_KEY,
          },
        }
      );

      const clusters = clustersResponse.data.results || [];
      const ourCluster = clusters.find((c: any) => c.name === clusterName);

      if (ourCluster) {
        console.log(`   ✓ Found project: ${project.name} (${project.id})`);
        return project.id;
      }
    } catch (err) {
      // Continue searching
    }
  }

  // Fallback: use first project
  console.log(`   ⚠ Using first project: ${projects[0].name} (${projects[0].id})`);
  return projects[0].id;
}

async function createVectorIndexViaAtlasAPI(
  projectId: string,
  clusterName: string,
  databaseName: string,
  collectionName: string
): Promise<void> {
  console.log('📊 Creating vector search index via Atlas Admin API...');

  const indexSpec = {
    database: databaseName,
    collectionName: collectionName,
    name: VECTOR_INDEX_DEFINITION.name,
    type: VECTOR_INDEX_DEFINITION.type,
    definition: VECTOR_INDEX_DEFINITION.definition,
  };

  try {
    const response = await axios.post(
      `https://cloud.mongodb.com/api/atlas/v1.0/groups/${projectId}/clusters/${clusterName}/fts/indexes`,
      indexSpec,
      {
        auth: {
          username: ATLAS_PUBLIC_KEY!,
          password: ATLAS_PRIVATE_KEY!,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`   ✓ Index created: ${response.data.name}`);
    console.log(`   Status: ${response.data.status}`);
    console.log(`   Index ID: ${response.data.indexID}`);
  } catch (error: any) {
    if (error.response?.data) {
      // Check if index already exists
      if (error.response.data.errorCode === 'DUPLICATE_INDEX') {
        console.log('   ✓ Index already exists');
        return;
      }
      throw new Error(`Atlas API Error: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

async function checkVectorIndexStatus(
  projectId: string,
  clusterName: string,
  databaseName: string,
  collectionName: string
): Promise<void> {
  console.log('🔍 Checking vector index status...');

  try {
    const response = await axios.get(
      `https://cloud.mongodb.com/api/atlas/v1.0/groups/${projectId}/clusters/${clusterName}/fts/indexes/${databaseName}/${collectionName}`,
      {
        auth: {
          username: ATLAS_PUBLIC_KEY!,
          password: ATLAS_PRIVATE_KEY!,
        },
      }
    );

    const indexes = response.data || [];
    const vectorIndex = indexes.find((idx: any) => idx.name === 'rag_vector_index');

    if (vectorIndex) {
      console.log(`   ✓ Vector index found`);
      console.log(`   Name: ${vectorIndex.name}`);
      console.log(`   Status: ${vectorIndex.status}`);
      console.log(`   Index ID: ${vectorIndex.indexID}`);

      if (vectorIndex.status === 'BUILDING') {
        console.log(`   ⏳ Index is still building... (this may take 2-5 minutes)`);
      } else if (vectorIndex.status === 'READY') {
        console.log(`   ✅ Index is ready for use!`);
      }
    } else {
      console.log(`   ⚠ Vector index not found`);
    }
  } catch (error: any) {
    console.log(`   ⚠ Could not check index status: ${error.message}`);
  }
}

// ============================================
// Main Setup Function
// ============================================

async function setupRAGInfrastructure(organizationId: string) {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI or TARGET_URI environment variable not set');
  }

  console.log('\n🚀 RAG Infrastructure Setup\n');
  console.log(`Organization ID: ${organizationId}\n`);

  // Connect to MongoDB
  console.log('📡 Connecting to MongoDB...');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('   ✓ Connected\n');

  try {
    // Database name
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

    // Create vector search index via Atlas Admin API
    console.log('');
    const clusterName = MONGODB_URI.match(/\/\/[^@]+@([^.]+)\./)?.[1] || 'performance';
    const projectId = await getAtlasProjectId();

    await createVectorIndexViaAtlasAPI(
      projectId,
      clusterName,
      databaseName,
      'rag_document_chunks'
    );

    console.log('');
    console.log('⏳ Waiting 5 seconds for index to initialize...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('');
    await checkVectorIndexStatus(
      projectId,
      clusterName,
      databaseName,
      'rag_document_chunks'
    );

    console.log('\n✅ RAG Infrastructure Setup Complete!\n');
    console.log('Next steps:');
    console.log('1. Upload a document to test RAG features');
    console.log('2. Check vector index status in Atlas UI if needed');
    console.log('3. The index may take 2-5 minutes to finish building\n');

  } finally {
    await client.close();
    console.log('📡 Disconnected from MongoDB\n');
  }
}

// ============================================
// Main Execution
// ============================================

async function main() {
  const args = parseArgs();

  if (args.help) {
    printUsage();
    process.exit(0);
  }

  if (!args.organizationId) {
    console.error('❌ Error: --org parameter is required\n');
    printUsage();
    process.exit(1);
  }

  // Validate organization ID format
  if (!/^org_[a-zA-Z0-9_-]+$/.test(args.organizationId)) {
    console.error(`❌ Error: Invalid organization ID format: ${args.organizationId}`);
    console.error('   Expected format: org_abc123\n');
    process.exit(1);
  }

  try {
    await setupRAGInfrastructure(args.organizationId);
  } catch (error) {
    console.error('\n❌ Setup failed:');
    console.error(error);
    process.exit(1);
  }
}

main();
