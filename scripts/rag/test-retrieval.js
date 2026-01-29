/**
 * Test RAG Retrieval
 *
 * Tests the complete retrieval pipeline:
 * - FAQ hybrid search (vector + keyword)
 * - Document chunk retrieval
 * - Combined results ranking
 *
 * Usage:
 *   node scripts/rag/test-retrieval.js <organizationId> <query> [formId]
 *
 * Example:
 *   node scripts/rag/test-retrieval.js org_abc123 "How do I reset my password?"
 *   node scripts/rag/test-retrieval.js org_abc123 "VPN connection" form_xyz789
 */

const { MongoClient } = require('mongodb');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testRetrieval(organizationId, query, formId) {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable not set');
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    log('✅ Connected to MongoDB', 'green');

    const dbName = `netpad_rag_${organizationId}`;
    const db = client.db(dbName);

    console.log('');
    log('═'.repeat(60), 'cyan');
    log('  RAG Retrieval Test', 'bright');
    log('═'.repeat(60), 'cyan');
    console.log('');
    log(`Query: "${query}"`, 'yellow');
    console.log('');

    // ==============================================
    // 1. Generate Query Embedding (Simulated)
    // ==============================================
    log('📊 Step 1: Query Embedding', 'cyan');
    log('  In production, this would call the embedding API', 'blue');
    log('  For this test, we\'ll use an existing embedding as proxy', 'blue');

    // Get a sample embedding from existing data
    const sampleChunk = await db.collection('rag_chunks').findOne({ organizationId });
    let queryEmbedding = null;

    if (sampleChunk && sampleChunk.embedding) {
      queryEmbedding = sampleChunk.embedding;
      log(`  ✅ Using sample embedding (dimension: ${queryEmbedding.length})`, 'green');
    } else {
      log('  ❌ No embeddings found - cannot test vector search', 'yellow');
    }

    // ==============================================
    // 2. FAQ Hybrid Search
    // ==============================================
    console.log('');
    log('📚 Step 2: FAQ Hybrid Search', 'cyan');

    const faqsQuery = formId
      ? { organizationId, formId, status: 'published' }
      : { organizationId, status: 'published' };

    const totalFaqs = await db.collection('rag_faqs').countDocuments(faqsQuery);
    log(`  Found ${totalFaqs} published FAQs`, 'blue');

    if (totalFaqs === 0) {
      log('  ⚠️  No published FAQs - create and publish FAQs to test', 'yellow');
    } else {
      // Keyword search (30% weight)
      const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      log(`  Keywords: [${keywords.join(', ')}]`, 'blue');

      const keywordResults = await db.collection('rag_faqs').find({
        ...faqsQuery,
        $or: [
          { question: { $regex: keywords.join('|'), $options: 'i' } },
          { answer: { $regex: keywords.join('|'), $options: 'i' } },
          { keywords: { $in: keywords } },
        ],
      }).toArray();

      log(`  Keyword matches: ${keywordResults.length}`, 'green');
      if (keywordResults.length > 0) {
        keywordResults.slice(0, 3).forEach((faq, idx) => {
          console.log(`    ${idx + 1}. ${faq.question}`);
        });
      }

      // Vector search (70% weight) - if we have embeddings
      if (queryEmbedding) {
        try {
          const vectorResults = await db.collection('rag_faqs').aggregate([
            {
              $vectorSearch: {
                index: 'faq_vector_index',
                path: 'questionEmbedding',
                queryVector: queryEmbedding,
                numCandidates: 20,
                limit: 5,
                filter: faqsQuery,
              },
            },
            {
              $project: {
                question: 1,
                answer: 1,
                category: 1,
                score: { $meta: 'vectorSearchScore' },
              },
            },
          ]).toArray();

          log(`  Vector matches: ${vectorResults.length}`, 'green');
          if (vectorResults.length > 0) {
            console.log('');
            log('  Top FAQ Results:', 'bright');
            vectorResults.forEach((faq, idx) => {
              console.log(`    ${idx + 1}. [${faq.category}] ${faq.question}`);
              console.log(`       Score: ${faq.score.toFixed(4)}`);
              console.log(`       Answer: ${faq.answer.substring(0, 100)}...`);
              console.log('');
            });
          }
        } catch (err) {
          log(`  ❌ Vector search failed: ${err.message}`, 'yellow');
        }
      }
    }

    // ==============================================
    // 3. Document Chunk Retrieval
    // ==============================================
    console.log('');
    log('📄 Step 3: Document Chunk Retrieval', 'cyan');

    const chunksQuery = formId ? { organizationId, formId } : { organizationId };
    const totalChunks = await db.collection('rag_chunks').countDocuments(chunksQuery);
    log(`  Found ${totalChunks} chunks`, 'blue');

    if (totalChunks === 0) {
      log('  ⚠️  No document chunks - upload documents to test', 'yellow');
    } else if (queryEmbedding) {
      try {
        const chunkResults = await db.collection('rag_chunks').aggregate([
          {
            $vectorSearch: {
              index: 'vector_index',
              path: 'embedding',
              queryVector: queryEmbedding,
              numCandidates: 50,
              limit: 5,
              filter: chunksQuery,
            },
          },
          {
            $lookup: {
              from: 'rag_documents',
              localField: 'documentId',
              foreignField: 'documentId',
              as: 'document',
            },
          },
          {
            $unwind: '$document',
          },
          {
            $project: {
              text: 1,
              chunkIndex: 1,
              'document.title': 1,
              'document.fileName': 1,
              score: { $meta: 'vectorSearchScore' },
            },
          },
        ]).toArray();

        log(`  Vector matches: ${chunkResults.length}`, 'green');
        if (chunkResults.length > 0) {
          console.log('');
          log('  Top Document Chunks:', 'bright');
          chunkResults.forEach((chunk, idx) => {
            const docTitle = chunk.document.title || chunk.document.fileName;
            console.log(`    ${idx + 1}. ${docTitle} (chunk ${chunk.chunkIndex})`);
            console.log(`       Score: ${chunk.score.toFixed(4)}`);
            console.log(`       Text: ${chunk.text.substring(0, 100)}...`);
            console.log('');
          });
        }
      } catch (err) {
        log(`  ❌ Vector search failed: ${err.message}`, 'yellow');
      }
    }

    // ==============================================
    // Summary
    // ==============================================
    console.log('');
    log('═'.repeat(60), 'cyan');
    log('  Summary', 'bright');
    log('═'.repeat(60), 'cyan');
    console.log('');

    if (!queryEmbedding) {
      log('⚠️  Could not test vector search - no embeddings available', 'yellow');
      log('   Upload documents or create FAQs with real embeddings to test', 'blue');
    } else if (totalFaqs === 0 && totalChunks === 0) {
      log('⚠️  No knowledge sources available', 'yellow');
      log('   Upload documents or create FAQs via the Knowledge Tab', 'blue');
    } else {
      log('✅ Retrieval test complete!', 'green');
      log('   Check the results above to verify relevance', 'blue');
    }

    console.log('');
    log('💡 Next Steps:', 'cyan');
    log('   1. Test with a real conversational form', 'blue');
    log('   2. Verify AI uses retrieved context in responses', 'blue');
    log('   3. Check AI Dashboard (/admin/api-metrics) for usage tracking', 'blue');

  } catch (error) {
    console.error('');
    log(`❌ Error: ${error.message}`, 'yellow');
    throw error;
  } finally {
    await client.close();
  }
}

// Main
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node test-retrieval.js <organizationId> <query> [formId]');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/rag/test-retrieval.js org_abc123 "How do I reset my password?"');
    console.log('  node scripts/rag/test-retrieval.js org_abc123 "VPN connection issues" form_xyz789');
    console.log('');
    console.log('Tests:');
    console.log('  - FAQ hybrid search (vector + keyword)');
    console.log('  - Document chunk vector search');
    console.log('  - Result ranking and relevance');
    process.exit(1);
  }

  const [organizationId, query, formId] = args;

  await testRetrieval(organizationId, query, formId);
}

main().catch(console.error);
