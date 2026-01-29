/**
 * Test RAG Retrieval
 *
 * Verifies that RAG is working correctly by:
 * 1. Generating a query embedding
 * 2. Performing vector search
 * 3. Displaying retrieved chunks
 */

import { MongoClient } from 'mongodb';
import { config } from 'dotenv';
import { generateQueryEmbedding } from '../../src/lib/rag/embeddings';

// Load environment variables
config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || process.env.TARGET_URI;
const ORG_ID = 'org_SxfbnHiW8-7MuZaa';
const FORM_ID = '08c88d6f56454fed32b43f58426ea88d';
const RAG_DB_NAME = `netpad_rag_${ORG_ID}`;
const VECTOR_INDEX_NAME = 'rag_vector_index';

async function testRAGRetrieval(query: string) {
  console.log('🧪 Testing RAG Retrieval\n');
  console.log(`Query: "${query}"\n`);

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable not set');
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB\n');

    const db = client.db(RAG_DB_NAME);
    const chunksCollection = db.collection('rag_document_chunks');

    // Generate query embedding
    console.log('🧮 Generating query embedding...');
    const queryEmbedding = await generateQueryEmbedding(query);
    console.log(`✓ Generated embedding (${queryEmbedding.length} dimensions)\n`);

    // Perform vector search
    console.log('🔍 Performing vector search...');
    const pipeline = [
      {
        $vectorSearch: {
          index: VECTOR_INDEX_NAME,
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: 50,
          limit: 5,
          filter: {
            formId: FORM_ID,
            organizationId: ORG_ID,
          },
        },
      },
      {
        $addFields: {
          score: { $meta: 'vectorSearchScore' },
        },
      },
      {
        $project: {
          chunkId: 1,
          text: 1,
          score: 1,
          'metadata.section': 1,
          'metadata.documentTitle': 1,
        },
      },
    ];

    const results = await chunksCollection.aggregate(pipeline).toArray();
    console.log(`✓ Retrieved ${results.length} chunks\n`);

    if (results.length === 0) {
      console.log('⚠️  No results found. This could mean:');
      console.log('   1. Vector search index is not ready yet (check Atlas UI)');
      console.log('   2. Index name mismatch');
      console.log('   3. Filter criteria excluding all documents');
      return;
    }

    // Display results
    console.log('📄 Retrieved Chunks:\n');
    results.forEach((chunk, index) => {
      console.log(`${index + 1}. ${chunk.metadata.section}`);
      console.log(`   Score: ${chunk.score.toFixed(4)}`);
      console.log(`   Text: ${chunk.text.substring(0, 150)}...`);
      console.log('');
    });

    console.log('✅ RAG retrieval working correctly!\n');
    console.log('🎯 Next steps:');
    console.log('   • Test the conversational form in the browser');
    console.log('   • Look for source citations in AI responses');
    console.log('   • Verify knowledge-grounded answers');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);

    if (error.message.includes('vector search')) {
      console.log('\n💡 Troubleshooting:');
      console.log('   1. Verify vector search index exists in Atlas UI');
      console.log('   2. Check index name is "rag_vector_index"');
      console.log('   3. Ensure index is on "rag_document_chunks" collection');
      console.log('   4. Wait 2-5 minutes for index to become READY');
    }

    throw error;
  } finally {
    await client.close();
    console.log('📡 Disconnected from MongoDB');
  }
}

// Run test queries
async function main() {
  const testQueries = [
    "What happens on my first day?",
    "Who is my onboarding buddy?",
    "What should I do in my first 30 days?",
  ];

  for (const query of testQueries) {
    await testRAGRetrieval(query);
    console.log('\n' + '='.repeat(80) + '\n');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
