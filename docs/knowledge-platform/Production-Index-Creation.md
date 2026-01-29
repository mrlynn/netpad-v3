# Production-Ready Vector Search Index Creation

**Last Updated**: January 29, 2026

---

## Overview

NetPad uses **programmatic vector search index creation** via the MongoDB Node.js driver. This approach scales to thousands of organizations without manual intervention.

---

## Architecture

### Automatic Index Creation

Vector search indexes are created programmatically when:

1. **Organization onboarding** - First form with RAG enabled
2. **First document upload** - Triggered automatically
3. **Admin API call** - Manual trigger via `/api/rag/admin/ensure-index`
4. **Migration script** - Batch creation for existing orgs

### Index Per Organization

Each organization gets its own vector search index:
- **Collection**: `rag_document_chunks` (in org-specific database)
- **Index name**: `rag_vector_index`
- **Scope**: Filtered by `formId` for multi-tenancy within org

---

## Implementation

### Core Function

Located at [src/lib/rag/indexManagement.ts](../../src/lib/rag/indexManagement.ts:60-138):

```typescript
export async function ensureVectorSearchIndex(
  organizationId: string
): Promise<{
  created: boolean;
  exists: boolean;
  status?: string;
  error?: string;
}> {
  try {
    // 1. Check if index already exists (idempotent)
    const check = await checkVectorIndexExists(organizationId);

    if (check.exists) {
      return {
        created: false,
        exists: true,
        status: check.status,
      };
    }

    // 2. Get embedding dimensions from current provider
    const dimensions = getCurrentEmbeddingDimensions();

    // 3. Get database and collection
    const db = await getOrgDb(organizationId);
    const collection = db.collection('rag_document_chunks');

    // 4. Create index using MongoDB Node.js driver
    const indexDefinition = {
      name: 'rag_vector_index',
      type: 'vectorSearch',
      definition: {
        fields: [
          {
            type: 'vector',
            path: 'embedding',
            numDimensions: dimensions,
            similarity: 'cosine',
          },
          {
            type: 'filter',
            path: 'formId',
          },
          {
            type: 'filter',
            path: 'documentId',
          },
        ],
      },
    };

    await collection.createSearchIndex(indexDefinition);

    return {
      created: true,
      exists: true,
      status: 'BUILDING',
    };
  } catch (error) {
    console.error('[RAG Index] Error creating vector search index:', error);
    return {
      created: false,
      exists: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Programmatic creation** | Scales to unlimited orgs, no manual steps |
| **Idempotent function** | Safe to call multiple times, checks existence first |
| **Dynamic dimensions** | Auto-detects embedding provider (Voyage: 1024, OpenAI: 1536) |
| **Cosine similarity** | Best for normalized embeddings (standard in most models) |
| **Filter fields** | Enable efficient multi-tenant queries within org |

---

## Deployment Strategies

### Strategy 1: On-Demand Creation (Recommended)

**When**: First document upload for each organization

**Implementation**:
```typescript
// In document upload flow
export async function uploadDocument(
  organizationId: string,
  formId: string,
  file: File
) {
  // Ensure index exists before uploading
  const indexStatus = await ensureVectorSearchIndex(organizationId);

  if (indexStatus.error) {
    throw new Error(`Index creation failed: ${indexStatus.error}`);
  }

  // Proceed with document upload
  // ...
}
```

**Pros**:
- ✅ No upfront cost
- ✅ Index created only when needed
- ✅ No wasted indexes for orgs that don't use RAG

**Cons**:
- ⚠️ 5-10 minute wait on first upload (index builds async)
- ⚠️ Requires handling "index building" state in UI

### Strategy 2: Onboarding Hook

**When**: Organization created or upgraded to RAG-enabled tier

**Implementation**:
```typescript
// In organization creation flow
export async function createOrganization(data: OrgData) {
  const org = await createOrgInDatabase(data);

  // Trigger index creation asynchronously
  if (data.plan === 'pro' || data.plan === 'team' || data.plan === 'enterprise') {
    ensureVectorSearchIndex(org.orgId).catch(err => {
      console.error(`Failed to create index for ${org.orgId}:`, err);
      // Queue for retry
    });
  }

  return org;
}
```

**Pros**:
- ✅ Index ready by the time user uploads first document
- ✅ Better user experience (no waiting)

**Cons**:
- ⚠️ Indexes created even if org never uses RAG
- ⚠️ Requires async job queue for error handling

### Strategy 3: Batch Migration

**When**: Migrating existing organizations to RAG

**Implementation**:
```bash
# Run migration script
npx tsx scripts/rag/batch-create-indexes.ts
```

```typescript
// scripts/rag/batch-create-indexes.ts
async function batchCreateIndexes() {
  const db = await getPlatformDb();
  const orgs = await db.collection('organizations')
    .find({ plan: { $in: ['pro', 'team', 'enterprise'] } })
    .toArray();

  const results = [];

  for (const org of orgs) {
    console.log(`Creating index for ${org.orgId}...`);
    const result = await ensureVectorSearchIndex(org.orgId);
    results.push({ orgId: org.orgId, ...result });

    // Rate limit: wait between creations
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return results;
}
```

**Pros**:
- ✅ All indexes created upfront
- ✅ No user-facing delays

**Cons**:
- ⚠️ Slower migration (1 index per second max)
- ⚠️ Indexes for orgs that may not use RAG

---

## Recommended Approach

**For NetPad Cloud (SaaS)**:
- Use **Strategy 2 (Onboarding Hook)** for new organizations
- Use **Strategy 3 (Batch Migration)** for existing organizations

**For Self-Hosted**:
- Use **Strategy 1 (On-Demand)** to minimize resource usage
- Provide admin script for manual index creation if desired

---

## Monitoring & Observability

### Index Status Tracking

```typescript
// Check index status
const status = await getVectorIndexStatus(organizationId);

if (status.exists && status.status === 'READY') {
  // Index is ready
} else if (status.exists && status.status === 'BUILDING') {
  // Index is building (5-10 minutes)
} else if (status.exists && status.status === 'FAILED') {
  // Index creation failed - needs investigation
} else {
  // Index does not exist - create it
}
```

### Metrics to Track

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| **Index creation success rate** | % of successful index creations | <95% |
| **Index build time** | Time from creation to READY status | >15 minutes |
| **Index creation failures** | Number of failed index creations | >5 per hour |
| **Indexes per organization** | Should be 1 per org | >1 (indicates duplicate) |

### Logging

```typescript
logger.info('Vector index creation initiated', {
  organizationId,
  dimensions,
  timestamp: new Date(),
});

logger.info('Vector index ready', {
  organizationId,
  buildTimeMs: endTime - startTime,
  status: 'READY',
});

logger.error('Vector index creation failed', {
  organizationId,
  error: error.message,
  dimensions,
});
```

---

## Error Handling

### Common Errors

#### 1. "M0 clusters do not support programmatic index creation"

**Cause**: Free-tier Atlas clusters (M0) cannot create indexes via driver

**Solution**:
- Upgrade to M10+ cluster for programmatic creation
- OR: Use Atlas Admin API (separate approach)
- OR: Create index via Atlas UI (not recommended for production)

#### 2. "Embedding dimensions mismatch"

**Cause**: Index created with different dimensions than current embeddings

**Solution**:
```typescript
// Drop old index and recreate
await collection.dropSearchIndex('rag_vector_index');
await ensureVectorSearchIndex(organizationId);
```

#### 3. "Index creation timeout"

**Cause**: Atlas is overloaded or network issues

**Solution**:
- Retry after exponential backoff
- Check Atlas status page
- Verify network connectivity

### Retry Logic

```typescript
async function ensureVectorSearchIndexWithRetry(
  organizationId: string,
  maxRetries = 3
): Promise<any> {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await ensureVectorSearchIndex(organizationId);
    } catch (error) {
      lastError = error;
      console.warn(`Index creation attempt ${i + 1} failed, retrying...`);

      // Exponential backoff: 2^i seconds
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }

  throw new Error(`Index creation failed after ${maxRetries} attempts: ${lastError}`);
}
```

---

## Scaling Considerations

### For 1,000+ Organizations

**Challenges**:
- Index creation rate limited by Atlas
- Each index takes 5-10 minutes to build
- Batch migrations can take hours

**Solutions**:

1. **Async queue** - Queue index creations, process in background
   ```typescript
   // Use Bull, BullMQ, or similar
   await indexCreationQueue.add('createIndex', {
     organizationId,
     priority: 'normal',
   });
   ```

2. **Batch processing** - Create indexes in batches of 10-20
   ```typescript
   const batches = chunk(organizations, 20);
   for (const batch of batches) {
     await Promise.all(
       batch.map(org => ensureVectorSearchIndex(org.orgId))
     );
   }
   ```

3. **Status dashboard** - Show users index build progress
   ```typescript
   // Poll status until ready
   const pollStatus = async () => {
     const status = await getVectorIndexStatus(organizationId);
     if (status.status === 'READY') {
       return true;
     } else {
       setTimeout(pollStatus, 10000); // Check every 10s
     }
   };
   ```

### For Multi-Region Deployments

**Considerations**:
- Each region has separate Atlas cluster
- Indexes must be created per region
- Cross-region queries not supported

**Implementation**:
```typescript
async function ensureIndexAllRegions(organizationId: string) {
  const regions = ['us-east-1', 'eu-west-1', 'ap-southeast-1'];

  return Promise.all(
    regions.map(region =>
      ensureVectorSearchIndex(organizationId, { region })
    )
  );
}
```

---

## Testing

### Unit Tests

```typescript
describe('Vector Index Creation', () => {
  test('creates index if not exists', async () => {
    const result = await ensureVectorSearchIndex('org_test123');
    expect(result.created).toBe(true);
    expect(result.status).toBe('BUILDING');
  });

  test('returns existing if already created', async () => {
    await ensureVectorSearchIndex('org_test123');
    const result = await ensureVectorSearchIndex('org_test123');
    expect(result.created).toBe(false);
    expect(result.exists).toBe(true);
  });

  test('handles errors gracefully', async () => {
    // Mock connection failure
    jest.spyOn(db, 'collection').mockRejectedValue(new Error('Connection failed'));

    const result = await ensureVectorSearchIndex('org_test123');
    expect(result.error).toBeDefined();
    expect(result.exists).toBe(false);
  });
});
```

### Integration Tests

```typescript
describe('End-to-End Index Creation', () => {
  test('creates index and allows vector search', async () => {
    // Create index
    const createResult = await ensureVectorSearchIndex('org_test123');
    expect(createResult.created).toBe(true);

    // Wait for index to be ready (poll)
    await waitForIndexReady('org_test123', { timeout: 600000 }); // 10 min

    // Test vector search
    const db = await getOrgDb('org_test123');
    const collection = db.collection('rag_document_chunks');

    // Insert test document
    await collection.insertOne({
      organizationId: 'org_test123',
      formId: 'form_test',
      content: 'test content',
      embedding: new Array(1024).fill(0.1),
      createdAt: new Date(),
    });

    // Perform vector search
    const results = await collection.aggregate([
      {
        $vectorSearch: {
          index: 'rag_vector_index',
          queryVector: new Array(1024).fill(0.1),
          path: 'embedding',
          numCandidates: 100,
          limit: 5,
        },
      },
    ]).toArray();

    expect(results.length).toBeGreaterThan(0);
  });
});
```

---

## References

- [MongoDB Node.js Driver Documentation](https://www.mongodb.com/docs/drivers/node/current/)
- [MongoDB Atlas Vector Search](https://www.mongodb.com/docs/atlas/atlas-vector-search/)
- [createSearchIndex API](https://mongodb.github.io/node-mongodb-native/6.18/classes/Collection.html#createSearchIndex)
- [Community Forum: Creating Vector Search Indexes](https://www.mongodb.com/community/forums/t/can-i-create-a-vectorsearch-index-with-createsearchindex-command/265546)

---

## Sources

- [Run a MongoDB Vector Search Query - Node.js Driver](https://www.mongodb.com/docs/drivers/node/current/atlas-vector-search/)
- [MongoDB Vector Search Overview](https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-overview/)
- [Community Discussion on createSearchIndex](https://www.mongodb.com/community/forums/t/can-i-create-a-vectorsearch-index-with-createsearchindex-command/265546)

---

*Last updated: January 29, 2026*
