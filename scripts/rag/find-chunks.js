/**
 * Find Document Chunks
 *
 * Searches for where document chunks are stored
 */

const { MongoClient } = require('mongodb');

async function findChunks(organizationId) {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI not set');
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const ragDbName = `netpad_rag_${organizationId}`;
    const platformDbName = 'netpad';

    // Check RAG database
    console.log(`Checking ${ragDbName}...`);
    const ragDb = client.db(ragDbName);
    const ragCollections = await ragDb.listCollections().toArray();

    console.log(`  Collections (${ragCollections.length}):`);
    for (const coll of ragCollections) {
      const count = await ragDb.collection(coll.name).countDocuments({});
      console.log(`    - ${coll.name}: ${count} documents`);

      if (coll.name === 'rag_documents') {
        const doc = await ragDb.collection(coll.name).findOne({});
        if (doc) {
          console.log(`      Sample: ${doc.title || doc.fileName}`);
          console.log(`      Status: ${doc.status}`);
          console.log(`      ChunkCount: ${doc.chunkCount || 0}`);
        }
      }
    }

    // Check platform database
    console.log(`\nChecking ${platformDbName}...`);
    const platformDb = client.db(platformDbName);
    const platformCollections = await platformDb.listCollections().toArray();

    const ragRelated = platformCollections.filter(c =>
      c.name.includes('chunk') ||
      c.name.includes('rag') ||
      c.name.includes(organizationId)
    );

    if (ragRelated.length > 0) {
      console.log(`  RAG-related collections (${ragRelated.length}):`);
      for (const coll of ragRelated) {
        const count = await platformDb.collection(coll.name).countDocuments({});
        console.log(`    - ${coll.name}: ${count} documents`);
      }
    } else {
      console.log('  No RAG-related collections found');
    }

    // Check for user cluster storage
    console.log('\nChecking for user cluster references...');
    const orgConfig = await platformDb.collection('organizations').findOne({
      organizationId
    });

    if (orgConfig) {
      console.log('  Organization config:');
      console.log(`    Has cluster config: ${!!orgConfig.clusterConfig}`);
      if (orgConfig.ragConfig) {
        console.log(`    RAG mode: ${orgConfig.ragConfig.mode || 'not set'}`);
        console.log(`    RAG platform: ${orgConfig.ragConfig.platform || 'not set'}`);
      }
    }

    // Check rag_config collection
    const ragConfig = await platformDb.collection('rag_config').findOne({
      organizationId
    });

    if (ragConfig) {
      console.log('\n  RAG Config:');
      console.log(`    Mode: ${ragConfig.mode}`);
      console.log(`    Platform: ${ragConfig.platform || 'not set'}`);
      if (ragConfig.userCluster) {
        console.log(`    User cluster: ${ragConfig.userCluster.connectionId || 'not set'}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.close();
  }
}

const args = process.argv.slice(2);
if (args.length < 1) {
  console.log('Usage: node find-chunks.js <organizationId>');
  process.exit(1);
}

findChunks(args[0]).catch(console.error);
