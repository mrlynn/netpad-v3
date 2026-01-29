/**
 * Create MongoDB Atlas Vector Search Index for FAQs
 *
 * This script creates the vector search index required for FAQ hybrid search.
 *
 * Usage:
 *   node scripts/rag/create-faq-vector-index.js [organizationId]
 *
 * If organizationId is not provided, you'll be prompted to enter it.
 *
 * Requirements:
 *   - MongoDB Atlas cluster (M10+ for cloud, or Atlas Local for self-hosted)
 *   - MONGODB_URI environment variable set
 *   - Organization must have RAG enabled
 */

const { MongoClient } = require('mongodb');
const readline = require('readline');

// Index definition for FAQ vector search
const FAQ_VECTOR_INDEX = {
  name: 'rag_faq_vector_index',
  type: 'vectorSearch',
  definition: {
    fields: [
      {
        type: 'vector',
        path: 'questionEmbedding',
        numDimensions: 1024, // Voyage-3 default dimensions
        similarity: 'cosine'
      },
      {
        type: 'filter',
        path: 'organizationId'
      },
      {
        type: 'filter',
        path: 'status'
      },
      {
        type: 'filter',
        path: 'category'
      },
      {
        type: 'filter',
        path: 'formId'
      }
    ]
  }
};

/**
 * Prompt for user input
 */
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Check if index already exists
 */
async function checkIndexExists(collection, indexName) {
  const indexes = await collection.listSearchIndexes().toArray();
  return indexes.some(idx => idx.name === indexName);
}

/**
 * Create the vector search index
 */
async function createFAQVectorIndex(organizationId) {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('❌ Error: MONGODB_URI environment variable not set');
    console.log('\nPlease set MONGODB_URI in your .env.local file:');
    console.log('  MONGODB_URI=mongodb+srv://...');
    process.exit(1);
  }

  let client;

  try {
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(mongoUri);
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    // Get the FAQ database for this organization
    const dbName = `netpad_rag_${organizationId}`;
    const db = client.db(dbName);
    const collection = db.collection('rag_faqs');

    console.log(`📊 Database: ${dbName}`);
    console.log(`📦 Collection: rag_faqs`);
    console.log(`🔍 Index: ${FAQ_VECTOR_INDEX.name}\n`);

    // Check if database exists
    const databases = await client.db().admin().listDatabases();
    const dbExists = databases.databases.some(d => d.name === dbName);

    if (!dbExists) {
      console.log(`⚠️  Warning: Database "${dbName}" does not exist yet.`);
      console.log('   The database will be created when the first FAQ is added.\n');
      console.log('   You can still create the index - it will be ready when FAQs are added.\n');

      const proceed = await prompt('Proceed with index creation? (yes/no): ');
      if (proceed.toLowerCase() !== 'yes' && proceed.toLowerCase() !== 'y') {
        console.log('❌ Index creation cancelled');
        return;
      }
    }

    // Check if collection exists by listing collections
    console.log('🔍 Checking if collection exists...');
    const collections = await db.listCollections({ name: 'rag_faqs' }).toArray();
    const collectionExists = collections.length > 0;

    if (!collectionExists) {
      console.log('⚠️  Collection does not exist yet.');
      console.log('   Creating placeholder document to initialize collection...\n');

      // Create a placeholder FAQ document to initialize the collection
      // This will be a draft FAQ that can be deleted later
      const placeholderFAQ = {
        faqId: 'placeholder_' + Date.now(),
        organizationId: organizationId,
        question: 'Placeholder FAQ - Safe to delete',
        answer: 'This is a placeholder FAQ created during vector index setup. You can safely delete this.',
        keywords: ['placeholder'],
        questionEmbedding: new Array(1024).fill(0), // Zero vector
        embeddingModel: 'placeholder',
        category: 'general',
        status: 'draft',
        priority: 0,
        viewCount: 0,
        clickCount: 0,
        helpfulCount: 0,
        notHelpfulCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        relatedFaqIds: [],
      };

      await collection.insertOne(placeholderFAQ);
      console.log('✅ Placeholder FAQ created');
      console.log('   You can delete this FAQ later via the UI or API.\n');

      // Wait a moment for Atlas to recognize the collection
      console.log('⏳ Waiting for Atlas to recognize the collection...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('');
    } else {
      console.log('✅ Collection exists\n');
    }

    // Check if index already exists
    console.log('🔍 Checking for existing index...');
    const indexExists = await checkIndexExists(collection, FAQ_VECTOR_INDEX.name);

    if (indexExists) {
      console.log(`⚠️  Index "${FAQ_VECTOR_INDEX.name}" already exists!`);
      console.log('\nTo update the index, you must:');
      console.log('  1. Delete the existing index via Atlas UI or mongosh');
      console.log('  2. Run this script again to create the new index');
      console.log('\nAtlas UI: Data Services > Database > Search > Search Indexes');
      return;
    }

    console.log('✨ Creating vector search index...\n');
    console.log('Index definition:');
    console.log(JSON.stringify(FAQ_VECTOR_INDEX, null, 2));
    console.log('');

    // Create the search index
    await collection.createSearchIndex(FAQ_VECTOR_INDEX);

    console.log('✅ Vector search index created successfully!\n');
    console.log('📝 Index Details:');
    console.log(`   Name: ${FAQ_VECTOR_INDEX.name}`);
    console.log(`   Type: Vector Search`);
    console.log(`   Dimensions: 1024 (Voyage-3)`);
    console.log(`   Similarity: Cosine`);
    console.log(`   Filterable Fields: organizationId, status, category, formId\n`);

    console.log('⏳ Note: Index creation may take a few minutes to complete.');
    console.log('   You can monitor the status in the Atlas UI under Search Indexes.\n');

    console.log('🎉 Setup Complete!');
    console.log('\nNext steps:');
    console.log('  1. Wait for index to finish building (check Atlas UI)');
    console.log('  2. Create FAQs via POST /api/rag/faqs');
    console.log('  3. Search FAQs via POST /api/rag/faqs/search');
    console.log('  4. Monitor in AI Dashboard at /admin/api-metrics\n');

  } catch (error) {
    console.error('❌ Error creating vector search index:', error);

    if (error.message.includes('Atlas Search is not available')) {
      console.log('\n💡 Tip: Vector Search requires:');
      console.log('   - MongoDB Atlas M10+ cluster (for cloud deployment)');
      console.log('   - OR Atlas Local (for self-hosted deployment)');
      console.log('\nFor self-hosted setup:');
      console.log('   docker run -d -p 27017:27017 mongodb/mongodb-atlas-local');
    }

    if (error.message.includes('not authorized')) {
      console.log('\n💡 Tip: Ensure your MongoDB user has the following permissions:');
      console.log('   - createSearchIndexes');
      console.log('   - listSearchIndexes');
      console.log('   - updateSearchIndex');
      console.log('   - dropSearchIndex');
    }

    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

/**
 * Main entry point
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  NetPad FAQ Vector Search Index Setup');
  console.log('═══════════════════════════════════════════════════════════\n');

  let organizationId = process.argv[2];

  if (!organizationId) {
    console.log('This script creates the MongoDB Atlas Vector Search index');
    console.log('required for FAQ hybrid search functionality.\n');

    organizationId = await prompt('Enter Organization ID: ');

    if (!organizationId || !organizationId.trim()) {
      console.error('❌ Error: Organization ID is required');
      process.exit(1);
    }
  }

  organizationId = organizationId.trim();

  console.log('');
  await createFAQVectorIndex(organizationId);
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { createFAQVectorIndex, FAQ_VECTOR_INDEX };
