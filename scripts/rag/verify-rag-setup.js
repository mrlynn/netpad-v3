/**
 * Verify RAG Setup
 *
 * Comprehensive verification script for Phase 1 RAG implementation:
 * - Checks vector indexes (documents and FAQs)
 * - Verifies document chunks and embeddings
 * - Tests FAQ embeddings
 * - Validates retrieval queries
 *
 * Usage:
 *   node scripts/rag/verify-rag-setup.js <organizationId> [formId]
 *
 * Example:
 *   node scripts/rag/verify-rag-setup.js org_abc123
 *   node scripts/rag/verify-rag-setup.js org_abc123 form_xyz789
 */

const { MongoClient } = require('mongodb');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('');
  log('═'.repeat(60), 'cyan');
  log(`  ${title}`, 'bright');
  log('═'.repeat(60), 'cyan');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function verifyRAGSetup(organizationId, formId) {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable not set');
  }

  const client = new MongoClient(uri);
  let allChecks = [];

  try {
    await client.connect();
    success('Connected to MongoDB');

    const dbName = `netpad_rag_${organizationId}`;
    const db = client.db(dbName);

    // ==============================================
    // 1. Check Database Exists
    // ==============================================
    section('1. Database Check');
    const admin = client.db().admin();
    const dbs = await admin.listDatabases();
    const dbExists = dbs.databases.some(d => d.name === dbName);

    if (dbExists) {
      success(`Database exists: ${dbName}`);
      allChecks.push({ name: 'Database exists', passed: true });
    } else {
      error(`Database not found: ${dbName}`);
      allChecks.push({ name: 'Database exists', passed: false });
      return; // Can't continue without database
    }

    // ==============================================
    // 2. Check Collections
    // ==============================================
    section('2. Collections Check');
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    info(`Found ${collections.length} collections`);

    const requiredCollections = ['rag_documents', 'rag_document_chunks', 'rag_faqs'];
    requiredCollections.forEach(name => {
      if (collectionNames.includes(name)) {
        success(`Collection exists: ${name}`);
        allChecks.push({ name: `Collection: ${name}`, passed: true });
      } else {
        warning(`Collection not found: ${name} (may not be created yet)`);
        allChecks.push({ name: `Collection: ${name}`, passed: false });
      }
    });

    // ==============================================
    // 3. Check Vector Indexes
    // ==============================================
    section('3. Vector Indexes Check');

    // Check chunks vector index
    if (collectionNames.includes('rag_document_chunks')) {
      const chunksIndexes = await db.collection('rag_document_chunks').indexes();
      const chunksVectorIndex = chunksIndexes.find(idx => idx.name === 'vector_index');

      if (chunksVectorIndex) {
        success('Document chunks vector index exists');
        info(`  Index name: ${chunksVectorIndex.name}`);
        info(`  Type: ${chunksVectorIndex.type || 'vectorSearch'}`);
        allChecks.push({ name: 'Chunks vector index', passed: true });
      } else {
        error('Document chunks vector index NOT found');
        warning('  Run: node scripts/rag/create-vector-index.ts');
        allChecks.push({ name: 'Chunks vector index', passed: false });
      }
    }

    // Check FAQs vector index
    if (collectionNames.includes('rag_faqs')) {
      const faqsIndexes = await db.collection('rag_faqs').indexes();
      const faqsVectorIndex = faqsIndexes.find(idx => idx.name === 'faq_vector_index');

      if (faqsVectorIndex) {
        success('FAQ vector index exists');
        info(`  Index name: ${faqsVectorIndex.name}`);
        info(`  Type: ${faqsVectorIndex.type || 'vectorSearch'}`);
        allChecks.push({ name: 'FAQ vector index', passed: true });
      } else {
        error('FAQ vector index NOT found');
        warning('  Run: node scripts/rag/create-faq-vector-index.js');
        allChecks.push({ name: 'FAQ vector index', passed: false });
      }
    }

    // ==============================================
    // 4. Check Documents
    // ==============================================
    section('4. Documents Check');

    if (collectionNames.includes('rag_documents')) {
      const docsQuery = formId ? { organizationId, formId } : { organizationId };
      const docCount = await db.collection('rag_documents').countDocuments(docsQuery);

      if (docCount > 0) {
        success(`Found ${docCount} document(s)`);
        allChecks.push({ name: 'Documents exist', passed: true });

        // Check document status
        const docs = await db.collection('rag_documents').find(docsQuery).toArray();
        const statusCounts = docs.reduce((acc, doc) => {
          acc[doc.status] = (acc[doc.status] || 0) + 1;
          return acc;
        }, {});

        Object.entries(statusCounts).forEach(([status, count]) => {
          info(`  ${status}: ${count}`);
        });

        // Check for embeddings
        const readyDocs = docs.filter(d => d.status === 'ready');
        if (readyDocs.length > 0) {
          success(`${readyDocs.length} document(s) processed and ready`);

          // Sample first document
          const sampleDoc = readyDocs[0];
          info(`  Sample: "${sampleDoc.title || sampleDoc.fileName}"`);
          info(`    Chunks: ${sampleDoc.chunkCount || 0}`);
          info(`    Size: ${(sampleDoc.fileSize / 1024).toFixed(2)} KB`);
        }
      } else {
        warning('No documents found');
        info('  Upload documents via Knowledge Tab → Documents tab');
        allChecks.push({ name: 'Documents exist', passed: false });
      }
    }

    // ==============================================
    // 5. Check Document Chunks
    // ==============================================
    section('5. Document Chunks Check');

    if (collectionNames.includes('rag_document_chunks')) {
      const chunksQuery = formId ? { organizationId, formId } : { organizationId };
      const chunkCount = await db.collection('rag_document_chunks').countDocuments(chunksQuery);

      if (chunkCount > 0) {
        success(`Found ${chunkCount} chunk(s)`);
        allChecks.push({ name: 'Chunks exist', passed: true });

        // Sample a chunk to verify embedding
        const sampleChunk = await db.collection('rag_document_chunks').findOne(chunksQuery);
        if (sampleChunk) {
          const hasEmbedding = sampleChunk.embedding && Array.isArray(sampleChunk.embedding);
          const embeddingLength = hasEmbedding ? sampleChunk.embedding.length : 0;

          if (hasEmbedding && embeddingLength > 0) {
            success(`Chunks have embeddings (dimension: ${embeddingLength})`);
            info(`  Model: ${sampleChunk.embeddingModel || 'unknown'}`);
            allChecks.push({ name: 'Chunk embeddings', passed: true });
          } else {
            error('Chunks missing embeddings!');
            allChecks.push({ name: 'Chunk embeddings', passed: false });
          }

          // Show sample chunk
          info(`  Sample chunk text (first 100 chars):`);
          console.log(`    "${sampleChunk.text.substring(0, 100)}..."`);
        }
      } else {
        warning('No chunks found');
        allChecks.push({ name: 'Chunks exist', passed: false });
      }
    }

    // ==============================================
    // 6. Check FAQs
    // ==============================================
    section('6. FAQs Check');

    if (collectionNames.includes('rag_faqs')) {
      const faqsQuery = formId ? { organizationId, formId } : { organizationId };
      const faqCount = await db.collection('rag_faqs').countDocuments(faqsQuery);

      if (faqCount > 0) {
        success(`Found ${faqCount} FAQ(s)`);
        allChecks.push({ name: 'FAQs exist', passed: true });

        // Check FAQ status
        const faqs = await db.collection('rag_faqs').find(faqsQuery).toArray();
        const statusCounts = faqs.reduce((acc, faq) => {
          acc[faq.status] = (acc[faq.status] || 0) + 1;
          return acc;
        }, {});

        Object.entries(statusCounts).forEach(([status, count]) => {
          info(`  ${status}: ${count}`);
        });

        // Check for embeddings
        const sampleFaq = faqs[0];
        const hasEmbedding = sampleFaq.questionEmbedding && Array.isArray(sampleFaq.questionEmbedding);
        const embeddingLength = hasEmbedding ? sampleFaq.questionEmbedding.length : 0;

        if (hasEmbedding && embeddingLength > 0 && !sampleFaq.questionEmbedding.every(v => v === 0)) {
          success(`FAQs have embeddings (dimension: ${embeddingLength})`);
          info(`  Model: ${sampleFaq.embeddingModel || 'unknown'}`);
          allChecks.push({ name: 'FAQ embeddings', passed: true });
        } else {
          error('FAQs missing embeddings or have placeholder zeros!');
          warning('  Edit and save FAQs via UI to generate real embeddings');
          allChecks.push({ name: 'FAQ embeddings', passed: false });
        }

        // Show sample FAQs
        info(`  Sample FAQs:`);
        faqs.slice(0, 3).forEach((faq, idx) => {
          console.log(`    ${idx + 1}. ${faq.question} [${faq.status}]`);
        });
      } else {
        warning('No FAQs found');
        info('  Create FAQs via Knowledge Tab → FAQs tab');
        info('  Or run: node scripts/rag/seed-it-helpdesk-faqs.js');
        allChecks.push({ name: 'FAQs exist', passed: false });
      }
    }

    // ==============================================
    // 7. Test Vector Search (if possible)
    // ==============================================
    section('7. Vector Search Test');

    // Only test if we have chunks with embeddings
    if (collectionNames.includes('rag_document_chunks')) {
      const sampleChunk = await db.collection('rag_document_chunks').findOne({ organizationId });
      if (sampleChunk && sampleChunk.embedding && sampleChunk.embedding.some(v => v !== 0)) {
        try {
          // Test vector search with the sample embedding
          const searchResults = await db.collection('rag_document_chunks').aggregate([
            {
              $vectorSearch: {
                index: 'vector_index',
                path: 'embedding',
                queryVector: sampleChunk.embedding,
                numCandidates: 10,
                limit: 3,
              },
            },
            {
              $project: {
                text: 1,
                score: { $meta: 'vectorSearchScore' },
              },
            },
          ]).toArray();

          if (searchResults.length > 0) {
            success('Vector search is working!');
            info(`  Found ${searchResults.length} results`);
            info(`  Top score: ${searchResults[0].score.toFixed(4)}`);
            allChecks.push({ name: 'Vector search working', passed: true });
          } else {
            warning('Vector search returned no results');
            allChecks.push({ name: 'Vector search working', passed: false });
          }
        } catch (err) {
          error('Vector search failed');
          console.error(`  Error: ${err.message}`);
          allChecks.push({ name: 'Vector search working', passed: false });
        }
      } else {
        warning('Cannot test vector search - no valid embeddings found');
      }
    }

    // ==============================================
    // Summary
    // ==============================================
    section('Summary');

    const passed = allChecks.filter(c => c.passed).length;
    const total = allChecks.length;
    const percentage = ((passed / total) * 100).toFixed(0);

    console.log('');
    allChecks.forEach(check => {
      const icon = check.passed ? '✅' : '❌';
      console.log(`  ${icon} ${check.name}`);
    });

    console.log('');
    if (passed === total) {
      success(`All checks passed! (${passed}/${total})`);
      log('🎉 RAG setup is complete and ready to use!', 'bright');
    } else {
      warning(`${passed}/${total} checks passed (${percentage}%)`);
      if (passed < total / 2) {
        error('⚠️  RAG setup incomplete. Follow the warnings above to complete setup.');
      } else {
        info('ℹ️  Most checks passed. Review warnings above for optional improvements.');
      }
    }

  } catch (error) {
    console.error('');
    error(`Fatal error: ${error.message}`);
    throw error;
  } finally {
    await client.close();
  }
}

// Main
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Usage: node verify-rag-setup.js <organizationId> [formId]');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/rag/verify-rag-setup.js org_abc123');
    console.log('  node scripts/rag/verify-rag-setup.js org_abc123 form_xyz789');
    console.log('');
    console.log('Verifies:');
    console.log('  - Database and collections exist');
    console.log('  - Vector indexes are created');
    console.log('  - Documents and chunks have embeddings');
    console.log('  - FAQs have embeddings');
    console.log('  - Vector search is working');
    process.exit(1);
  }

  const [organizationId, formId] = args;

  section('RAG Setup Verification');
  info(`Organization: ${organizationId}`);
  if (formId) {
    info(`Form: ${formId}`);
  } else {
    info('Form: All forms (org-wide)');
  }

  await verifyRAGSetup(organizationId, formId);
}

main().catch(console.error);
