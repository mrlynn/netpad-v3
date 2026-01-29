# Execute Now: Unblock RAG (15 minutes)

**Goal**: Create the vector search index programmatically and verify RAG works

---

## About This Process

NetPad uses **production-ready programmatic index creation** via the MongoDB Node.js driver's `collection.createSearchIndex()` method. This is the recommended approach for automated deployments and scales to any number of organizations.

**No manual steps required** - the index is created automatically via code.

---

## Step 1: Create the Vector Search Index (5 minutes)

### Option A: Using the CLI Script (Recommended)

```bash
# Navigate to project root
cd /Users/michael.lynn/code/mongodb/netpad-3

# Run the script (it will auto-detect your org)
npx tsx scripts/rag/create-vector-index.ts
```

**What this does**:
1. Finds your platform organization automatically
2. Checks if an index already exists via `collection.listSearchIndexes()`
3. Creates the index programmatically via `collection.createSearchIndex()` if needed
4. Shows you the status

**Expected output**:
```
🚀 Creating vector search index for RAG...
   Organization ID: org_xxxxx

1️⃣ Checking current index status...
   ℹ️  No index found. Creating new index...

2️⃣ Creating vector search index...
   ✅ Vector search index created successfully!

3️⃣ Waiting for index to build...
   ⏳ This usually takes 5-10 minutes.
   The index builds asynchronously on Atlas.
```

### Option B: Using the API Endpoint

For production deployments, you can trigger index creation via API:

```bash
# First, start your dev server
npm run dev

# In another terminal, call the API
curl -X POST http://localhost:3000/api/rag/admin/ensure-index \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{"organizationId": "YOUR_ORG_ID"}'
```

### Option C: Automatic Creation on First Document Upload

The index can also be created automatically when the first document is uploaded. This is configured in your RAG upload flow.

---

## How It Works: Programmatic Index Creation

NetPad uses the MongoDB Node.js driver's `createSearchIndex()` method:

```typescript
// From src/lib/rag/indexManagement.ts
const indexDefinition = {
  name: 'rag_vector_index',
  type: 'vectorSearch',
  definition: {
    fields: [
      {
        type: 'vector',
        path: 'embedding',
        numDimensions: 1024, // Dynamically determined from embedding provider
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
```

**Key features**:
- ✅ **Fully automated** - No manual Atlas UI steps
- ✅ **Idempotent** - Safe to call multiple times (checks if exists first)
- ✅ **Dynamic dimensions** - Auto-detects embedding provider dimensions
- ✅ **Production-ready** - Used by MongoDB Node.js driver v6.5+

**Requirements**:
- MongoDB Atlas M10+ cluster (M0 free tier cannot create indexes programmatically)
- MongoDB Node.js driver 6.5+
- Atlas cluster running MongoDB 7.0+

---

## Step 2: Wait for Index to Build (5-10 minutes)

The index builds in the background on Atlas. You can:

1. **Get coffee ☕** - This is a good time for a break
2. **Monitor in Atlas UI**:
   - Go to [MongoDB Atlas](https://cloud.mongodb.com)
   - Navigate to your cluster
   - Click "Search Indexes"
   - Look for `rag_vector_index` on the `rag_document_chunks` collection
   - Status should change from "BUILDING" → "READY"

3. **Check status via script**:
   ```bash
   npx tsx scripts/rag/create-vector-index.ts
   ```

---

## Step 3: Verify It Works (5 minutes)

### Option A: Test with the Script

```bash
# You'll need an organization ID and form ID
# Get these from your database or create a test form first

npx tsx scripts/rag/test-rag-retrieval.ts YOUR_ORG_ID YOUR_FORM_ID
```

**Expected output**:
```
🧪 Testing RAG Retrieval

1️⃣ Checking vector search index...
   ✅ Index is READY and queryable

2️⃣ Creating test document chunk...
   ✅ Embedding generated (1024 dimensions)
   ✅ Test chunk inserted

3️⃣ Performing vector search...
   Query: "How do I reset my password?"
   ✅ Found 1 results

4️⃣ Results:
   Result 1:
   Score: 0.8542
   File: test-document.txt
   Content: To reset your password, go to the login page...

5️⃣ Cleaning up test data...
   ✅ Test chunk deleted

✅ RAG retrieval test PASSED! 🎉
```

### Option B: Test via UI

1. **Create a test form**:
   - Go to your NetPad instance
   - Create a new form (or use existing)
   - Go to Settings → RAG

2. **Upload a test document**:
   - Upload a simple text file (e.g., IT policies)
   - Wait for processing (should be quick)

3. **Test conversational form**:
   - Enable conversational mode
   - Start a conversation
   - Ask a question related to your uploaded document
   - Verify the AI references the document in its response

---

## Troubleshooting

### "Index creation failed"

**Check**:
1. MongoDB Atlas cluster tier (M10+ required for vector search)
2. MongoDB driver version: `npm list mongodb` (should be 6.5+)
3. Network connectivity to Atlas

**Fix**:
```bash
# Check your MongoDB URI in .env.local
cat .env.local | grep MONGODB_URI

# Test connection
npx tsx -e "import { getPlatformDb } from './src/lib/platform/db'; getPlatformDb().then(() => console.log('✅ Connected')).catch(e => console.error('❌ Failed:', e))"
```

### "Index status: PENDING or BUILDING"

**Solution**: Wait longer. Large datasets can take 15+ minutes.

**Check Atlas UI**:
1. Go to Atlas → Cluster → Search Indexes
2. Click on the index
3. View build progress

### "No results found in test"

**Possible causes**:
1. Index still building (wait and retry)
2. Wrong organization ID or form ID
3. Embedding dimensions mismatch

**Check dimensions**:
```bash
# Check what dimension your embeddings use
grep -r "numDimensions" src/lib/rag/

# Should match your embedding provider:
# - Voyage AI: 1024
# - OpenAI text-embedding-3-small: 1536
```

### "Permission denied / Unauthorized"

**Solution**: Make sure you're logged in and have admin access.

```bash
# Check if you're a platform admin
cat .env.local | grep PLATFORM_ADMIN_EMAILS
```

---

## Success Criteria

You're done when:

- ✅ Script shows "Index created" or "Index already exists (status: READY)"
- ✅ Atlas UI shows index status: READY
- ✅ Test script passes with results found
- ✅ (Optional) UI test shows AI referencing uploaded documents

---

## What This Unblocks

Once the index is READY, you can:

1. ✅ **Upload documents** - Via UI or API
2. ✅ **Use conversational forms with RAG** - AI can reference uploaded docs
3. ✅ **Test retrieval quality** - Verify answers are accurate
4. ✅ **Move to Phase 1** - Start building FAQs, usage tracking, Knowledge UI

---

## Next Actions (After Index is Ready)

### Immediate (This Week)

1. **Test with real content**:
   - Upload 3-5 IT policy documents
   - Create IT Help Desk conversational form
   - Test common IT questions

2. **Document the process**:
   - Update operations runbook
   - Add to developer docs

3. **Prepare for templates launch**:
   - Finalize IT Help Desk template
   - Add sample documents to template

### This Sprint (Next 2 Weeks)

See [Quick Start Checklist](./QUICK_START_CHECKLIST.md) for full Phase 0 tasks.

---

## Questions?

- **Script not working?** Check the [Technical Architecture](./TECHNICAL_ARCHITECTURE.md) for data model details
- **Need to understand the system?** Read the [Implementation Plan](./KNOWLEDGE_PLATFORM_IMPLEMENTATION_PLAN.md)
- **Want high-level context?** See the [Roadmap Summary](./ROADMAP_SUMMARY.md)

---

**Time to execute**: ~15 minutes (5 min setup + 5-10 min index build)

**Ready? Run this now**:
```bash
cd /Users/michael.lynn/code/mongodb/netpad-3
npx tsx scripts/rag/create-vector-index.ts
```

🚀 Let's unblock RAG!

---

*Created: January 29, 2026*
