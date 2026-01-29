# FAQ Vector Search Index Setup

**Purpose**: This guide explains how to create the MongoDB Atlas Vector Search index required for FAQ hybrid search functionality.

**Last Updated**: January 29, 2026
**Phase**: Phase 1 - Knowledge Foundation

---

## Overview

The FAQ hybrid search feature requires a MongoDB Atlas Vector Search index on the `rag_faqs` collection. This index enables semantic similarity search using question embeddings while also supporting metadata filtering.

### Why Vector Search?

Vector search allows FAQs to match queries based on **semantic meaning** rather than just keyword matching:

- "What's the cost of the pro plan?" matches "How much is professional tier?"
- "How do I reset my password?" matches "I forgot my login credentials"
- Handles synonyms, paraphrasing, and intent naturally

Combined with keyword matching (30% weight), this creates a powerful hybrid search system.

---

## Index Definition

```javascript
{
  name: 'rag_faq_vector_index',
  type: 'vectorSearch',
  definition: {
    fields: [
      {
        type: 'vector',
        path: 'questionEmbedding',
        numDimensions: 1024,      // Voyage-3 embeddings
        similarity: 'cosine'      // Cosine similarity for semantic matching
      },
      {
        type: 'filter',
        path: 'organizationId'    // Isolate by organization
      },
      {
        type: 'filter',
        path: 'status'            // Filter by published/draft/archived
      },
      {
        type: 'filter',
        path: 'category'          // Filter by category
      },
      {
        type: 'filter',
        path: 'formId'            // Scope to specific forms
      }
    ]
  }
}
```

### Index Fields

| Field | Type | Purpose |
|-------|------|---------|
| `questionEmbedding` | vector (1024-dim) | Semantic search via cosine similarity |
| `organizationId` | filter | Multi-tenant data isolation |
| `status` | filter | Published vs draft vs archived |
| `category` | filter | General, technical, billing, features, troubleshooting |
| `formId` | filter | Form-specific or org-wide FAQs |

---

## Prerequisites

### Cloud Deployment (netpad.io)

| Requirement | Details |
|-------------|---------|
| **MongoDB Cluster** | Atlas M10+ cluster |
| **Vector Search** | Included with M10+ clusters |
| **Subscription** | Team or Enterprise tier |
| **Permissions** | Database user with `createSearchIndexes` permission |

### Self-Hosted Deployment

| Requirement | Details |
|-------------|---------|
| **MongoDB Setup** | Atlas Local (Docker) or Atlas cluster |
| **Vector Search** | Included with Atlas Local |
| **Subscription** | Any tier (Free, Pro, Team, Enterprise) |
| **Permissions** | Database user with search index permissions |

**Atlas Local Setup**:
```bash
# Option 1: Atlas CLI
atlas deployments setup local --type local

# Option 2: Docker
docker run -d -p 27017:27017 mongodb/mongodb-atlas-local
```

---

## Setup Methods

### Method 1: Automated Script (Recommended)

Use the provided Node.js script for automated index creation:

```bash
# With organization ID as argument
node scripts/rag/create-faq-vector-index.js org_abc123

# Or run interactively (prompts for org ID)
node scripts/rag/create-faq-vector-index.js
```

**What the script does**:
1. Connects to MongoDB using `MONGODB_URI` from environment
2. Checks if the FAQ database exists (`netpad_rag_{organizationId}`)
3. Verifies index doesn't already exist
4. Creates the vector search index
5. Confirms successful creation

**Script Output**:
```
═══════════════════════════════════════════════════════════
  NetPad FAQ Vector Search Index Setup
═══════════════════════════════════════════════════════════

🔌 Connecting to MongoDB...
✅ Connected to MongoDB

📊 Database: netpad_rag_org_abc123
📦 Collection: rag_faqs
🔍 Index: rag_faq_vector_index

✨ Creating vector search index...

✅ Vector search index created successfully!

📝 Index Details:
   Name: rag_faq_vector_index
   Type: Vector Search
   Dimensions: 1024 (Voyage-3)
   Similarity: Cosine
   Filterable Fields: organizationId, status, category, formId

⏳ Note: Index creation may take a few minutes to complete.
   You can monitor the status in the Atlas UI under Search Indexes.

🎉 Setup Complete!
```

### Method 2: MongoDB Shell (mongosh)

For manual setup or debugging:

```javascript
// Connect to your Atlas cluster
mongosh "mongodb+srv://your-cluster.mongodb.net"

// Switch to the FAQ database for your organization
use netpad_rag_org_abc123

// Create the vector search index
db.rag_faqs.createSearchIndex({
  name: 'rag_faq_vector_index',
  type: 'vectorSearch',
  definition: {
    fields: [
      {
        type: 'vector',
        path: 'questionEmbedding',
        numDimensions: 1024,
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
})
```

### Method 3: Atlas UI

For visual index creation:

1. **Navigate to Atlas UI**:
   - Open [MongoDB Atlas Console](https://cloud.mongodb.com)
   - Select your cluster
   - Click **"Search"** tab

2. **Create Search Index**:
   - Click **"Create Search Index"**
   - Select **"Atlas Vector Search"**
   - Choose database: `netpad_rag_{organizationId}`
   - Choose collection: `rag_faqs`

3. **Configure Index**:
   - Index Name: `rag_faq_vector_index`
   - Copy the JSON definition above
   - Click **"Create Search Index"**

4. **Wait for Build**:
   - Initial build takes 1-5 minutes
   - Status shows "Building..." then "Active"

---

## Verification

### Check Index Status

**Via mongosh**:
```javascript
use netpad_rag_org_abc123
db.rag_faqs.listSearchIndexes()
```

**Expected output**:
```javascript
[
  {
    id: '...',
    name: 'rag_faq_vector_index',
    type: 'vectorSearch',
    status: 'READY',
    queryable: true,
    latestDefinition: { ... }
  }
]
```

**Via Atlas UI**:
- Navigate to: Cluster > Search > Search Indexes
- Look for `rag_faq_vector_index` with status "Active"

### Test Vector Search

Create a test FAQ and search for it:

```bash
# 1. Create a test FAQ via API
curl -X POST https://netpad.io/api/rag/faqs \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "org_abc123",
    "question": "What is the pricing for the pro plan?",
    "answer": "The Pro plan is $29 per month.",
    "keywords": ["pricing", "cost", "pro", "plan"],
    "category": "billing",
    "status": "published"
  }'

# 2. Search for it using hybrid search
curl -X POST https://netpad.io/api/rag/faqs/search \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "org_abc123",
    "query": "How much does professional tier cost?",
    "maxResults": 5
  }'
```

**Expected response**:
```json
{
  "success": true,
  "results": [
    {
      "faq": { ... },
      "score": 0.87,
      "vectorScore": 0.89,
      "keywordScore": 0.8,
      "matchedField": "question",
      "snippet": "...pricing for the pro plan..."
    }
  ],
  "searchMethod": "hybrid",
  "latencyMs": 145
}
```

---

## Troubleshooting

### Error: "Atlas Search is not available"

**Cause**: Cluster doesn't support Vector Search

**Solution**:
- **Cloud**: Upgrade to M10+ cluster
- **Self-Hosted**: Use Atlas Local (Docker)

```bash
# Self-hosted solution
docker run -d -p 27017:27017 mongodb/mongodb-atlas-local
```

### Error: "not authorized"

**Cause**: Database user lacks permissions

**Solution**: Grant search index permissions to your database user

1. Open Atlas UI > Database Access
2. Edit your database user
3. Grant Built-in Role: **"atlasAdmin"** or custom role with:
   - `createSearchIndexes`
   - `listSearchIndexes`
   - `updateSearchIndex`
   - `dropSearchIndex`

### Error: "Index already exists"

**Cause**: Index with same name already exists

**Solution**: Delete existing index first

**Via Atlas UI**:
1. Navigate to: Cluster > Search > Search Indexes
2. Find `rag_faq_vector_index`
3. Click **"..."** > **"Delete Index"**
4. Re-run creation script

**Via mongosh**:
```javascript
use netpad_rag_org_abc123
db.rag_faqs.dropSearchIndex('rag_faq_vector_index')
```

### Warning: "Database does not exist yet"

**Cause**: No FAQs have been created for this organization yet

**Solution**: This is normal for new organizations

- The script can still create the index
- Database will be created when first FAQ is added
- Index will be ready immediately

### Search returns empty results

**Diagnostics**:

1. **Check index status**:
   ```javascript
   db.rag_faqs.listSearchIndexes()
   // Ensure status is "READY" and queryable: true
   ```

2. **Check FAQs exist**:
   ```javascript
   db.rag_faqs.countDocuments({ organizationId: 'org_abc123', status: 'published' })
   ```

3. **Check embeddings are populated**:
   ```javascript
   db.rag_faqs.findOne({ organizationId: 'org_abc123' })
   // Ensure questionEmbedding array has 1024 elements
   ```

4. **Test with keyword-only search**:
   - If vector search fails, API automatically falls back to keyword search
   - Check `searchMethod` in response: "hybrid" vs "keyword"

---

## Per-Organization Setup

Each organization needs its own vector index:

### Why Per-Organization?

- Data isolation: Each org has its own database (`netpad_rag_{organizationId}`)
- Independent scaling: Different orgs may have different FAQ volumes
- Security: Prevents cross-organization data leaks

### Automation

For production deployments with many organizations:

```javascript
// scripts/rag/setup-all-faq-indexes.js
const { createFAQVectorIndex } = require('./create-faq-vector-index');

async function setupAllOrganizations() {
  const organizations = await getActiveOrganizations(); // Your org query

  for (const org of organizations) {
    console.log(`\nSetting up vector index for: ${org.id}`);

    try {
      await createFAQVectorIndex(org.id);
      console.log(`✅ ${org.id} complete`);
    } catch (error) {
      console.error(`❌ ${org.id} failed:`, error.message);
    }
  }
}

setupAllOrganizations();
```

---

## Index Maintenance

### Updating the Index

Vector search indexes are **immutable**. To update:

1. **Delete the existing index**
2. **Create the new index** with updated definition
3. **Wait for rebuild** (data is re-indexed automatically)

**Important**: The collection data (FAQs and their embeddings) is not affected. Only the search index structure changes.

### Monitoring Index Health

Track index health in production:

- **Atlas UI**: Cluster > Search > Search Indexes
- **Metrics**: Index size, query latency, error rates
- **Alerts**: Set up alerts for index failures

### Rebuilding Indexes

If index becomes corrupted or performance degrades:

```javascript
// 1. Drop the index
db.rag_faqs.dropSearchIndex('rag_faq_vector_index')

// 2. Recreate it
db.rag_faqs.createSearchIndex({ ... })

// 3. Wait for rebuild (automatic)
```

---

## Performance Considerations

### Index Size

Index size grows with:
- Number of FAQs
- Embedding dimensions (1024 for Voyage-3)
- Number of filter fields

**Estimates**:
- 100 FAQs ≈ 1 MB index size
- 1,000 FAQs ≈ 10 MB index size
- 10,000 FAQs ≈ 100 MB index size

### Query Performance

Hybrid search is fast due to:
- **Vector search**: Approximate Nearest Neighbor (ANN) algorithm
- **Cosine similarity**: Optimized for 1024-dimensional vectors
- **Filtered search**: Pre-filtering by organizationId reduces search space

**Typical latencies**:
- Vector search: 10-50ms
- Keyword search: 5-20ms
- Combined (hybrid): 30-100ms

### Scaling

For large deployments:
- Use M10+ clusters for better vector search performance
- Consider sharding for orgs with >50,000 FAQs
- Monitor query latency in AI Dashboard (`/admin/api-metrics`)

---

## Next Steps

After setting up the vector index:

1. ✅ **Create FAQs**: Use POST `/api/rag/faqs` to add FAQs
2. ✅ **Test Search**: Use POST `/api/rag/faqs/search` for hybrid search
3. ✅ **Monitor Analytics**: Check `/admin/api-metrics` for embedding costs
4. ⏳ **Build Knowledge Tab UI**: Visual interface for FAQ management (Phase 1)
5. ⏳ **Integrate with Conversational Forms**: FAQ retrieval during conversations

---

## Related Documentation

- **[Phase 1 Implementation](./Phase-1-Knowledge-Foundation.md)** - Complete Phase 1 plan
- **[AI Analytics Guidelines](./AI-Analytics-Guidelines.md)** - Mandatory tracking requirements
- **[RAG Types Documentation](../../src/types/rag-faq.ts)** - TypeScript FAQ types
- **[FAQ Search API](../../src/app/api/rag/faqs/search/route.ts)** - Hybrid search implementation
- **[FAQ CRUD API](../../src/app/api/rag/faqs/route.ts)** - Create/list FAQ endpoints

---

**Questions or Issues?**

If you encounter issues during setup:
1. Check the troubleshooting section above
2. Verify prerequisites (cluster tier, permissions)
3. Review Atlas UI Search Index status
4. Test with the verification steps

For development questions, see: [AI-Analytics-Guidelines.md](./AI-Analytics-Guidelines.md)
