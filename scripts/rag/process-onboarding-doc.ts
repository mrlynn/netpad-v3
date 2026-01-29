/**
 * Process Onboarding Document with Embeddings
 *
 * This script:
 * 1. Reads the onboarding guide from the scratchpad
 * 2. Chunks the content intelligently by sections
 * 3. Generates embeddings using Voyage AI
 * 4. Stores in the proper RAG database with embeddings
 */

import { MongoClient } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Import embedding generation (uses your configured Voyage API)
import { generateEmbeddings } from '../../src/lib/rag/embeddings';

const MONGODB_URI = process.env.MONGODB_URI || process.env.TARGET_URI;
const ORG_ID = 'org_SxfbnHiW8-7MuZaa';
const FORM_ID = '08c88d6f56454fed32b43f58426ea88d';
const RAG_DB_NAME = `netpad_rag_${ORG_ID}`;

interface DocumentChunk {
  chunkId: string;
  documentId: string;
  formId: string;
  organizationId: string;
  text: string;
  embedding: number[];
  metadata: {
    section: string;
    chunkIndex: number;
    sourceType: string;
    documentTitle: string;
  };
  status: 'ready';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Chunk the document by markdown sections
 */
function chunkDocument(content: string): Array<{ text: string; section: string }> {
  // Split by ## headers (sections)
  const sections = content.split(/\n##\s+/);
  const chunks: Array<{ text: string; section: string }> = [];

  sections.forEach((section, index) => {
    const trimmed = section.trim();
    if (trimmed.length < 50) return; // Skip tiny sections

    // Extract section title from first line
    const lines = trimmed.split('\n');
    const title = lines[0].replace(/^#+\s*/, '').trim();

    // For very long sections, split further by ### headers
    if (trimmed.length > 2000) {
      const subsections = trimmed.split(/\n###\s+/);
      subsections.forEach((subsection, subIdx) => {
        const subTrimmed = subsection.trim();
        if (subTrimmed.length >= 50) {
          const subLines = subTrimmed.split('\n');
          const subTitle = subLines[0].replace(/^#+\s*/, '').trim();
          chunks.push({
            text: `## ${title}\n\n### ${subTrimmed}`,
            section: subIdx === 0 ? title : `${title} - ${subTitle}`
          });
        }
      });
    } else {
      chunks.push({
        text: `## ${trimmed}`,
        section: title || `Section ${index}`
      });
    }
  });

  return chunks;
}

async function main() {
  console.log('🚀 Processing Employee Onboarding Document with Embeddings\n');

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI or TARGET_URI environment variable not set');
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await client.connect();
    console.log('   ✓ Connected\n');

    // Get RAG database
    const ragDb = client.db(RAG_DB_NAME);
    const documentsCollection = ragDb.collection('rag_documents');
    const chunksCollection = ragDb.collection<DocumentChunk>('rag_document_chunks');

    // Read the onboarding guide
    console.log('📄 Reading onboarding guide...');
    const scratchpadPath = '/private/tmp/claude/-Users-michael-lynn-code-mongodb-netpad-3/28239e51-3ed0-4a83-a6d6-80364d4a307f/scratchpad/employee-onboarding-guide.md';

    if (!fs.existsSync(scratchpadPath)) {
      throw new Error(`Onboarding guide not found at: ${scratchpadPath}`);
    }

    const content = fs.readFileSync(scratchpadPath, 'utf8');
    console.log(`   ✓ Read ${content.length} bytes\n`);

    // Generate document ID
    const documentId = 'doc_' + crypto.randomBytes(12).toString('base64url');
    console.log(`📝 Document ID: ${documentId}\n`);

    // Create document record
    console.log('💾 Creating document record...');
    const document = {
      documentId,
      formId: FORM_ID,
      organizationId: ORG_ID,
      title: 'Employee Onboarding Guide',
      description: 'Comprehensive guide for new employee onboarding process',
      sourceType: 'guide',
      mimeType: 'text/markdown',
      fileSize: content.length,
      status: 'ready',
      metadata: {
        filename: 'employee-onboarding-guide.md',
        uploadedBy: 'system',
        uploadedAt: new Date(),
        chunkCount: 0, // Will update after chunking
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await documentsCollection.insertOne(document);
    console.log('   ✓ Document record created\n');

    // Chunk the document
    console.log('✂️  Chunking document...');
    const textChunks = chunkDocument(content);
    console.log(`   ✓ Created ${textChunks.length} chunks\n`);

    // Display chunk preview
    console.log('📋 Chunk preview:');
    textChunks.slice(0, 5).forEach((chunk, idx) => {
      console.log(`   ${idx + 1}. ${chunk.section} (${chunk.text.length} chars)`);
    });
    console.log('');

    // Generate embeddings
    console.log('🧮 Generating embeddings with Voyage AI...');
    console.log('   This may take 30-60 seconds...');

    const embeddings = await generateEmbeddings(textChunks);
    console.log(`   ✓ Generated ${embeddings.length} embeddings\n`);

    // Validate embeddings
    if (embeddings.length !== textChunks.length) {
      throw new Error(`Embedding count mismatch: expected ${textChunks.length}, got ${embeddings.length}`);
    }

    // Create chunk documents with embeddings
    console.log('💾 Storing chunks with embeddings...');
    const chunks: DocumentChunk[] = textChunks.map((chunk, index) => ({
      chunkId: `chunk_${documentId}_${index}`,
      documentId,
      formId: FORM_ID,
      organizationId: ORG_ID,
      text: chunk.text,
      embedding: embeddings[index],
      metadata: {
        section: chunk.section,
        chunkIndex: index,
        sourceType: 'guide',
        documentTitle: 'Employee Onboarding Guide',
      },
      status: 'ready' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Insert chunks in batches
    const batchSize = 10;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      await chunksCollection.insertMany(batch);
      console.log(`   ✓ Stored chunks ${i + 1}-${Math.min(i + batchSize, chunks.length)}`);
    }
    console.log('');

    // Update document with chunk count
    await documentsCollection.updateOne(
      { documentId },
      { $set: { 'metadata.chunkCount': chunks.length } }
    );

    // Update form configuration to reference this document
    console.log('🔗 Updating form configuration...');
    const orgDb = client.db(ORG_ID);
    await orgDb.collection('forms').updateOne(
      { formId: FORM_ID },
      {
        $set: {
          'conversationalConfig.rag.documents': [
            {
              documentId,
              title: 'Employee Onboarding Guide',
              sourceType: 'guide',
            },
          ],
        },
      }
    );
    console.log('   ✓ Form configuration updated\n');

    // Update published form
    console.log('📢 Updating published form...');
    const platformDb = client.db('form_builder_platform');
    const form = await orgDb.collection('forms').findOne({ formId: FORM_ID });
    await platformDb.collection('published_forms').updateOne(
      { 'form.id': FORM_ID },
      {
        $set: {
          form,
          updatedAt: new Date(),
        },
      }
    );
    console.log('   ✓ Published form updated\n');

    console.log('✅ Success! RAG document processing complete\n');
    console.log('📊 Summary:');
    console.log(`   • Document ID: ${documentId}`);
    console.log(`   • Chunks created: ${chunks.length}`);
    console.log(`   • Embeddings generated: ${embeddings.length}`);
    console.log(`   • Embedding dimensions: ${embeddings[0].length}`);
    console.log(`   • Database: ${RAG_DB_NAME}`);
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Create vector search index in Atlas UI (if not already done)');
    console.log('   2. Test the conversational form');
    console.log('   3. Look for RAG source citations in responses');
    console.log('');

  } catch (error) {
    console.error('\n❌ Error processing document:', error);
    throw error;
  } finally {
    await client.close();
    console.log('📡 Disconnected from MongoDB');
  }
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
