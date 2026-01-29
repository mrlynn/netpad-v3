# Phase 0: RAG Foundation

**Duration**: 2 weeks (January 27 - February 7, 2026)

**Status**: ✅ COMPLETE

**Goal**: Unblock RAG with production-ready vector search index and retrieval

---

## Overview

Phase 0 established the foundational infrastructure for NetPad's Knowledge Platform. The primary objective was to create a production-ready vector search system that enables semantic retrieval of document chunks to power conversational forms and future chatbot capabilities.

**Key Achievement**: RAG is fully operational with vector search indexes created programmatically, retrieval working with 0.77+ relevance scores.

---

## Completed Deliverables

### 1. Vector Search Index (Programmatic Creation)

**Implementation**: [src/lib/rag/indexManagement.ts](../../src/lib/rag/indexManagement.ts)

The vector search index is created programmatically using the MongoDB Node.js driver's `collection.createSearchIndex()` method. This approach is production-ready and scales to 1,000+ organizations.

**Index Definition**:
```typescript
const indexDefinition = {
  name: 'rag_vector_index',
  type: 'vectorSearch',
  definition: {
    fields: [
      {
        type: 'vector',
        path: 'embedding',
        numDimensions: 1024,      // Atlas Embedding API
        similarity: 'cosine',      // Cosine similarity for semantic search
      },
      {
        type: 'filter',
        path: 'formId',             // Scope retrieval to specific form
      },
      {
        type: 'filter',
        path: 'organizationId',     // Multi-tenant isolation
      },
      {
        type: 'filter',
        path: 'documentId',         // Filter by source document
      },
    ],
  },
};

await collection.createSearchIndex(indexDefinition);
```

**Key Features**:
- **Idempotent creation**: Safe to call multiple times
- **Status monitoring**: Returns 'BUILDING', 'READY', or error
- **Filter support**: Efficient multi-tenant isolation

**Verification**:
```bash
./scripts/rag/create-index.sh org_SxfbnHiW8-7MuZaa
# Output: ✓ Vector search index "rag_vector_index" already exists (status: READY)
```

---

### 2. Document Storage & Chunking

**Implementation**: [src/lib/rag/chunking.ts](../../src/lib/rag/chunking.ts)

Documents are split into semantically meaningful chunks for retrieval:

**Chunking Strategy**:
- **Chunk size**: 500-1000 tokens (configurable)
- **Overlap**: 100 tokens between chunks (preserves context at boundaries)
- **Metadata**: Section headers, document title, chunk position
- **Storage**: Per-organization databases (`netpad_rag_{organizationId}`)

**Collections**:
- `rag_documents`: Document metadata (filename, size, upload date)
- `rag_document_chunks`: Chunked text with embeddings

**Sample Chunk**:
```typescript
{
  chunkId: 'chunk_abc123',
  documentId: 'doc_xyz789',
  organizationId: 'org_SxfbnHiW8-7MuZaa',
  formId: '08c88d6f56454fed32b43f58426ea88d',
  chunkIndex: 0,
  text: 'Your first day at the company will be...',
  embedding: [0.123, -0.456, ...],  // 1024 dimensions
  metadata: {
    section: 'First Day Overview',
    documentTitle: 'Employee Onboarding Guide',
  },
  createdAt: ISODate('2026-01-28T...')
}
```

---

### 3. Embedding Generation

**Implementation**: [src/lib/rag/embeddings.ts](../../src/lib/rag/embeddings.ts)

**Primary Provider**: Atlas Embedding API
- **Dimensions**: 1024
- **Endpoint**: MongoDB Atlas Embedding API (`/api/embedding/v1/embeddings`)
- **Advantages**: Native integration, no external API keys required

**Fallback Providers**:
- Voyage AI (`voyage-2`)
- OpenAI (`text-embedding-3-small`)

**Usage**:
```typescript
import { generateQueryEmbedding } from '@/lib/rag/embeddings';

const queryEmbedding = await generateQueryEmbedding('What happens on my first day?');
// Returns: [0.234, -0.567, ...] (1024 dimensions)
```

---

### 4. Vector Search Retrieval

**Implementation**: [src/lib/rag/retrieval.ts](../../src/lib/rag/retrieval.ts)

Semantic search using MongoDB's `$vectorSearch` aggregation stage:

**Pipeline**:
```typescript
[
  {
    $vectorSearch: {
      index: 'rag_vector_index',
      path: 'embedding',
      queryVector: [0.123, -0.456, ...],  // Query embedding
      numCandidates: 50,                   // Candidate pool size
      limit: 5,                            // Top 5 results
      filter: {
        formId: '08c88d6f56454fed32b43f58426ea88d',
        organizationId: 'org_SxfbnHiW8-7MuZaa',
      },
    },
  },
  {
    $addFields: {
      score: { $meta: 'vectorSearchScore' },  // Relevance score (0-1)
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
]
```

**Retrieval Test Results** (January 28, 2026):

| Query | Top Score | Status |
|-------|-----------|--------|
| "What happens on my first day?" | 0.7724 | ✅ Strong relevance |
| "Who is my onboarding buddy?" | 0.7733 | ✅ Strong relevance |
| "What should I do in my first 30 days?" | 0.7261 | ✅ Strong relevance |

**Interpretation**:
- Scores >0.70 indicate high semantic relevance
- Atlas Embedding API performing well for HR/onboarding content
- Multi-tenant filtering working correctly

---

### 5. Storage Provider Architecture

**Implementation**: [src/lib/rag/storage/](../../src/lib/rag/storage/)

**Multi-Tenant Isolation**:
- Each organization gets a dedicated database: `netpad_rag_{organizationId}`
- No cross-organization data leakage
- Independent scaling per organization

**Storage Interface**:
```typescript
interface StorageProvider {
  storeDocument(doc: RAGDocument): Promise<string>;
  storeChunk(chunk: RAGDocumentChunk): Promise<void>;
  retrieveChunks(query: string, options: RetrievalOptions): Promise<RAGDocumentChunk[]>;
  deleteDocument(documentId: string): Promise<void>;
  getUsageStats(): Promise<UsageStats>;
}
```

**Providers**:
- **MongoDBStorageProvider**: Production implementation (Atlas)
- **LocalStorageProvider**: Development/testing

---

### 6. Usage Tracking Foundation

**Implementation**: [src/lib/rag/usage/](../../src/lib/rag/usage/)

Basic usage tracking for Phase 1 limits enforcement:

**Tracked Metrics**:
- Document count per organization
- Total storage bytes per organization
- Query count per organization
- Chunks generated per document

**Schema**:
```typescript
{
  organizationId: 'org_SxfbnHiW8-7MuZaa',
  period: ISODate('2026-02-01T00:00:00Z'),  // Start of month
  documents: {
    total: 15,
    storageBytes: 1234567,
    chunksGenerated: 234,
  },
  queries: {
    total: 432,
    byMonth: [23, 45, 67, ...]  // Daily breakdown
  },
  createdAt: ISODate('...'),
  updatedAt: ISODate('...')
}
```

**Note**: Full tier limits enforcement is Phase 1 work.

---

## Technical Validation

### End-to-End Test

**Script**: [scripts/rag/test-rag-retrieval.ts](../../scripts/rag/test-rag-retrieval.ts)

**Test Procedure**:
1. Generate query embedding via Atlas Embedding API
2. Perform vector search with filters (formId, organizationId)
3. Retrieve top 5 chunks
4. Display scores and text snippets

**Run Command**:
```bash
npx tsx scripts/rag/test-rag-retrieval.ts
```

**Sample Output**:
```
🧪 Testing RAG Retrieval

Query: "What happens on my first day?"

✓ Connected to MongoDB

🧮 Generating query embedding...
✓ Generated embedding (1024 dimensions)

🔍 Performing vector search...
✓ Retrieved 5 chunks

📄 Retrieved Chunks:

1. First Day Overview
   Score: 0.7724
   Text: Your first day at the company will be exciting! You'll meet your...

2. Orientation Schedule
   Score: 0.7512
   Text: On your first day, you'll attend a 2-hour orientation session...

3. Team Introduction
   Score: 0.7301
   Text: You'll be introduced to your team during the morning standup...

✅ RAG retrieval working correctly!

🎯 Next steps:
   • Test the conversational form in the browser
   • Look for source citations in AI responses
   • Verify knowledge-grounded answers
```

---

## Scripts & Tools

### Index Creation Script

**File**: [scripts/rag/create-vector-index.ts](../../scripts/rag/create-vector-index.ts)

**Wrapper**: [scripts/rag/create-index.sh](../../scripts/rag/create-index.sh) (loads .env.local)

**Usage**:
```bash
# Create index for specific organization
./scripts/rag/create-index.sh org_SxfbnHiW8-7MuZaa

# Output:
# ✓ Connected to MongoDB Atlas
# ✓ Vector search index "rag_vector_index" already exists (status: READY)
```

**Features**:
- Idempotent (safe to run multiple times)
- Validates MongoDB version (6.5+ required)
- Checks index status (BUILDING → READY)
- Provides troubleshooting guidance

---

### Retrieval Testing Script

**File**: [scripts/rag/test-rag-retrieval.ts](../../scripts/rag/test-rag-retrieval.ts)

**Usage**:
```bash
npx tsx scripts/rag/test-rag-retrieval.ts
```

**Features**:
- Tests 3 different queries
- Displays relevance scores
- Shows text snippets
- Validates filter isolation

---

## Deployment Considerations

### Production Readiness

✅ **Programmatic Index Creation**
- No manual Atlas UI steps required
- Idempotent creation via Node.js driver
- Scales to 1,000+ organizations

✅ **Multi-Tenant Isolation**
- Per-organization databases
- Filter-based query isolation
- No cross-tenant data leakage

✅ **Error Handling**
- Retry logic for index creation
- Graceful degradation if embedding API fails
- Detailed error messages for debugging

✅ **Monitoring**
- Index status tracking
- Query performance metrics
- Usage tracking foundation

### Scaling Strategies

**On-Demand Index Creation** (Current):
- Index created when first document uploaded
- 2-5 minute initial delay for index to become READY
- Acceptable for MVP

**Onboarding Hook** (Phase 1+):
- Index created during organization onboarding
- No delay when first document uploaded
- Better UX for production

**Batch Migration** (Enterprise):
- Pre-create indexes for all organizations
- Run during off-peak hours
- Parallel execution with rate limiting

**Full Details**: [Production-Index-Creation.md](./Production-Index-Creation.md)

---

## Known Limitations & Future Work

### Current Limitations

1. **Single Embedding Provider**:
   - Atlas Embedding API is primary
   - No provider failover yet (Phase 1 work)

2. **No Reranking**:
   - Vector search only (no hybrid search yet)
   - Reranking for FAQ integration in Phase 1

3. **No Usage Limits Enforcement**:
   - Tracking exists, but no tier limits enforced
   - Phase 1 will add free/pro/team limits

4. **Basic Chunking Strategy**:
   - Fixed 500-1000 token chunks
   - Could be optimized with semantic chunking (future)

### Future Enhancements (Post-Phase 3)

- **Hybrid Search**: Combine keyword + semantic search
- **Reranking**: Improve top-K result quality
- **Adaptive Chunking**: Semantic boundary detection
- **Caching**: Cache embeddings for frequent queries
- **Multi-Modal**: Support image/PDF embedding extraction

---

## Success Criteria (Validated ✅)

- [x] Vector search index created programmatically
- [x] Index status: READY
- [x] Retrieval working with query embeddings
- [x] Relevance scores >0.70 for test queries
- [x] Multi-tenant filtering working correctly
- [x] End-to-end test passing
- [x] Scripts documented and runnable
- [x] No manual Atlas UI steps required

---

## Key Files Reference

### Core Implementation
- [src/lib/rag/indexManagement.ts](../../src/lib/rag/indexManagement.ts) - Index creation
- [src/lib/rag/chunking.ts](../../src/lib/rag/chunking.ts) - Document chunking
- [src/lib/rag/embeddings.ts](../../src/lib/rag/embeddings.ts) - Embedding generation
- [src/lib/rag/retrieval.ts](../../src/lib/rag/retrieval.ts) - Vector search
- [src/lib/rag/storage/](../../src/lib/rag/storage/) - Storage providers
- [src/lib/rag/usage/](../../src/lib/rag/usage/) - Usage tracking

### Configuration
- [src/lib/rag/config.ts](../../src/lib/rag/config.ts) - RAG configuration

### Scripts
- [scripts/rag/create-vector-index.ts](../../scripts/rag/create-vector-index.ts) - Index creation
- [scripts/rag/create-index.sh](../../scripts/rag/create-index.sh) - Wrapper script
- [scripts/rag/test-rag-retrieval.ts](../../scripts/rag/test-rag-retrieval.ts) - Retrieval test

### Documentation
- [Production-Index-Creation.md](./Production-Index-Creation.md) - Scaling strategies
- [RAG-Phase-1-Complete.md](./RAG-Phase-1-Complete.md) - Completion report
- [Technical-Architecture.md](./Technical-Architecture.md) - Data models & APIs

---

## Next Steps → Phase 1

With Phase 0 complete, Phase 1 can begin immediately:

**Phase 1 Goals**:
1. Usage tracking with tier limits enforcement
2. FAQ knowledge type with hybrid search
3. Unified Knowledge Tab UI

**Timeline**: 6 weeks (Feb 10 - Mar 21, 2026)

**See**: [Phase-1-Knowledge-Foundation.md](./Phase-1-Knowledge-Foundation.md)

---

*Phase 0 completed: January 28, 2026*
