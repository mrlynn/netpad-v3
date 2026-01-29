# RAG Scripts - Quick Reference

Scripts for managing and testing RAG (Retrieval-Augmented Generation) features in NetPad.

## Setup Scripts

### Create Vector Indexes

**For Documents:**
```bash
npm run tsx scripts/rag/create-vector-index.ts <organizationId>
```

**For FAQs:**
```bash
node scripts/rag/create-faq-vector-index.js <organizationId>
```

### Seed Sample Data

**IT Helpdesk FAQs (12 examples):**
```bash
node scripts/rag/seed-it-helpdesk-faqs.js <organizationId> <formId>
```

## Verification & Testing

### Comprehensive Setup Verification

Checks database, collections, indexes, embeddings, and vector search:

```bash
node scripts/rag/verify-rag-setup.js <organizationId> [formId]
```

**Output:**
- ✅ Database and collections check
- ✅ Vector indexes verification
- ✅ Document and chunk statistics
- ✅ FAQ statistics and embeddings
- ✅ Vector search functionality test
- 📊 Pass/fail summary

### Test Retrieval

Tests FAQ hybrid search and document retrieval with a real query:

```bash
node scripts/rag/test-retrieval.js <organizationId> "<query>" [formId]
```

**Examples:**
```bash
node scripts/rag/test-retrieval.js org_abc123 "How do I reset my password?"
node scripts/rag/test-retrieval.js org_abc123 "VPN connection issues" form_xyz789
```

**Output:**
- 📊 Query embedding generation
- 📚 FAQ hybrid search results (vector + keyword)
- 📄 Document chunk retrieval results
- 🎯 Ranked results with scores

## Typical Workflow

### Initial Setup (Once per Organization)

1. **Create vector indexes:**
   ```bash
   npm run tsx scripts/rag/create-vector-index.ts <orgId>
   node scripts/rag/create-faq-vector-index.js <orgId>
   ```

2. **Verify setup:**
   ```bash
   node scripts/rag/verify-rag-setup.js <orgId>
   ```

### Adding Knowledge

**Option 1: Via UI (Recommended)**
- Navigate to Form Builder → Conversational Settings → Knowledge Base
- Upload documents (PDF, DOCX, TXT, MD)
- Create FAQs manually

**Option 2: Seed Sample Data**
```bash
node scripts/rag/seed-it-helpdesk-faqs.js <orgId> <formId>
```

**Important:** Seeded FAQs have placeholder embeddings. You must:
1. Edit each FAQ via the UI
2. Save to generate real embeddings
3. Change status to "Published"

### Testing

**Test retrieval with sample queries:**
```bash
node scripts/rag/test-retrieval.js <orgId> "your test query"
```

**Verify everything is working:**
```bash
node scripts/rag/verify-rag-setup.js <orgId>
```

## Troubleshooting

### Vector Index Not Found

**Problem:** `❌ Document chunks vector index NOT found`

**Solution:**
```bash
npm run tsx scripts/rag/create-vector-index.ts <orgId>
```

### FAQs Have Placeholder Embeddings

**Problem:** `❌ FAQs missing embeddings or have placeholder zeros!`

**Solution:**
1. Go to Knowledge Tab → FAQs
2. Edit each FAQ
3. Click "Update FAQ" (generates real embedding)
4. Change status to "Published"

### No Documents Found

**Problem:** `⚠️ No documents found`

**Solution:**
1. Go to Knowledge Tab → Documents
2. Upload PDF, DOCX, TXT, or MD files
3. Wait for processing (status: "ready")
4. Select documents for RAG

### Vector Search Failed

**Problem:** `❌ Vector search failed`

**Possible causes:**
- Vector index not created
- Wrong index name
- Embedding dimensions mismatch
- MongoDB Atlas Vector Search not available on cluster tier

**Solution:**
1. Verify indexes exist: `node scripts/rag/verify-rag-setup.js <orgId>`
2. Recreate indexes if needed
3. Check MongoDB Atlas cluster tier (M0+ supported in Phase 1)

## Environment Variables

Required:
```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
```

## File Locations

- **Scripts:** `/scripts/rag/`
- **Database:** `netpad_rag_<organizationId>`
- **Collections:**
  - `rag_documents` - Document metadata
  - `rag_chunks` - Document chunks with embeddings
  - `rag_faqs` - FAQ questions with embeddings

## Vector Index Specifications

### Documents (rag_chunks)
- **Index name:** `vector_index`
- **Path:** `embedding`
- **Dimensions:** 1024 (voyage-3)
- **Similarity:** cosine

### FAQs (rag_faqs)
- **Index name:** `faq_vector_index`
- **Path:** `questionEmbedding`
- **Dimensions:** 1024 (voyage-3)
- **Similarity:** cosine

## Phase 1 Features

- ✅ Document upload and chunking
- ✅ FAQ creation and management
- ✅ Vector embeddings (tracked for analytics)
- ✅ Hybrid search (vector + keyword for FAQs)
- ✅ Works with M0 free tier clusters
- ✅ Subscription-based access (PRO, TEAMS, ENTERPRISE)

## Next Steps

After setup verification:
1. Test with real conversational form
2. Verify AI uses retrieved context
3. Check AI Dashboard: `/admin/api-metrics`
4. Monitor embedding usage and costs

## Support

For issues or questions:
- Check Phase 1 Testing Guide: `/docs/knowledge-platform/Phase-1-Testing-Guide.md`
- Review implementation: `/docs/knowledge-platform/Phase-1-COMPLETE.md`
