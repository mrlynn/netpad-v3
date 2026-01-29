# Phase 1 Testing Guide - Knowledge Foundation

**Phase**: Phase 1 - Knowledge Foundation (Feb 10 - Mar 21, 2026)
**Last Updated**: January 29, 2026
**Status**: Ready for Testing

---

## Overview

This guide provides comprehensive end-to-end testing procedures for Phase 1 deliverables:

1. **FAQ CRUD API** - Create, read, update, delete, list FAQs
2. **FAQ Hybrid Search** - Vector + keyword search with MongoDB Atlas
3. **Document Upload** - RAG document processing with tracked embeddings
4. **AI Analytics Tracking** - All AI operations visible in dashboard
5. **Knowledge Tab UI** - Unified interface for documents + FAQs
6. **FAQ Management UI** - Create/edit FAQs visually

---

## Prerequisites

### Environment Setup

**Required Environment Variables**:
```bash
# MongoDB
MONGODB_URI=mongodb+srv://your-cluster.mongodb.net
NETPAD_DEPLOYMENT_MODE=self-hosted  # or omit for cloud

# AI/Embeddings (at least one required)
VOYAGE_API_KEY=your-voyage-api-key  # Recommended
OPENAI_API_KEY=your-openai-key      # Fallback

# Embedding Configuration
EMBEDDING_PROVIDER=auto              # auto-detection
VOYAGE_MODEL=voyage-3                # Default 1024-dim
```

**MongoDB Requirements**:
- **Cloud**: Atlas M10+ cluster with Vector Search
- **Self-Hosted**: Atlas Local (Docker) with Vector Search

**Test Organization**:
- Organization ID for testing (e.g., `org_test123`)
- Form ID for testing (e.g., `form_test456`)

### Index Setup

Before testing, create the FAQ vector search index:

```bash
# Run the automated setup script
node scripts/rag/create-faq-vector-index.js org_test123
```

Verify index is active:
```javascript
use netpad_rag_org_test123
db.rag_faqs.listSearchIndexes()
// Should show: rag_faq_vector_index with status "READY"
```

---

## Test Suite 1: FAQ CRUD API

### Test 1.1: Create FAQ (POST /api/rag/faqs)

**Purpose**: Verify FAQ creation with embedding generation and analytics tracking

**Request**:
```bash
curl -X POST http://localhost:3000/api/rag/faqs \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "org_test123",
    "formId": "form_test456",
    "question": "What is the pricing for the Pro plan?",
    "answer": "The Pro plan is $29 per month, billed annually at $290/year (save $58). Includes 100 AI generations/month and 500 workflow executions.",
    "keywords": ["pricing", "cost", "pro", "plan", "subscription"],
    "category": "billing",
    "tags": ["pricing", "subscription"],
    "status": "published",
    "priority": 5
  }'
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "faq": {
    "faqId": "faq_abc123...",
    "question": "What is the pricing for the Pro plan?",
    "answer": "The Pro plan is $29 per month...",
    "keywords": ["pricing", "cost", "pro", "plan", "subscription"],
    "category": "billing",
    "tags": ["pricing", "subscription"],
    "status": "published",
    "priority": 5,
    "createdAt": "2026-01-29T..."
  }
}
```

**Verifications**:
1. ✅ FAQ created in `netpad_rag_org_test123.rag_faqs`
2. ✅ `questionEmbedding` is 1024-element array
3. ✅ `embeddingModel` is set (e.g., "voyage-3")
4. ✅ AI Dashboard shows embedding request:
   - Navigate to `/admin/api-metrics`
   - Filter by organization: `org_test123`
   - Feature: `rag_conversational_forms`
   - Endpoint: `/api/rag/faqs`
   - Model: `voyage-3` (or configured model)
   - Tokens: ~10-20 for question embedding

### Test 1.2: List FAQs (GET /api/rag/faqs)

**Request**:
```bash
curl "http://localhost:3000/api/rag/faqs?organizationId=org_test123&formId=form_test456&limit=10"
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "faqs": [
    {
      "faqId": "faq_abc123...",
      "question": "What is the pricing for the Pro plan?",
      ...
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 10,
    "offset": 0,
    "hasMore": false
  }
}
```

**Verifications**:
1. ✅ Returns all FAQs for the organization/form
2. ✅ Excludes `questionEmbedding` field (large array)
3. ✅ Pagination works correctly
4. ✅ Filtering by status, category works

### Test 1.3: Get Single FAQ (GET /api/rag/faqs/[faqId])

**Request**:
```bash
curl "http://localhost:3000/api/rag/faqs/faq_abc123?organizationId=org_test123"
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "faq": {
    "faqId": "faq_abc123",
    "question": "What is the pricing for the Pro plan?",
    "answer": "The Pro plan is $29 per month...",
    ...
  }
}
```

**Verifications**:
1. ✅ Returns complete FAQ details
2. ✅ `viewCount` incremented by 1
3. ✅ `lastAccessedAt` updated

### Test 1.4: Update FAQ (PATCH /api/rag/faqs/[faqId])

**Request** (change question):
```bash
curl -X PATCH http://localhost:3000/api/rag/faqs/faq_abc123 \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "org_test123",
    "question": "How much does the Professional tier cost?",
    "status": "published"
  }'
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "faq": {
    "faqId": "faq_abc123",
    "question": "How much does the Professional tier cost?",
    "updatedAt": "2026-01-29T...",
    ...
  }
}
```

**Verifications**:
1. ✅ Question updated
2. ✅ **NEW** embedding generated (question changed)
3. ✅ `embeddingModel` updated to current model
4. ✅ AI Dashboard shows new embedding request
5. ✅ `updatedAt` timestamp updated
6. ✅ If answer/keywords changed: No new embedding

### Test 1.5: Delete FAQ (DELETE /api/rag/faqs/[faqId])

**Request**:
```bash
curl -X DELETE "http://localhost:3000/api/rag/faqs/faq_abc123?organizationId=org_test123"
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "message": "FAQ deleted successfully"
}
```

**Verifications**:
1. ✅ FAQ removed from database
2. ✅ Subsequent GET returns 404
3. ✅ List no longer includes deleted FAQ

---

## Test Suite 2: FAQ Hybrid Search

### Test 2.1: Hybrid Search - Vector Match

**Purpose**: Verify semantic similarity works (paraphrased question)

**Setup**: Create FAQ with question "What is the pricing for the Pro plan?"

**Request**:
```bash
curl -X POST http://localhost:3000/api/rag/faqs/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How much does professional tier cost?",
    "organizationId": "org_test123",
    "maxResults": 5
  }'
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "results": [
    {
      "faq": {
        "faqId": "faq_abc123",
        "question": "What is the pricing for the Pro plan?",
        ...
      },
      "score": 0.85,
      "vectorScore": 0.89,
      "keywordScore": 0.0,
      "matchedField": "question",
      "snippet": "...pricing for the Pro plan..."
    }
  ],
  "searchMethod": "hybrid",
  "totalResults": 1,
  "latencyMs": 145
}
```

**Verifications**:
1. ✅ FAQ found despite different wording
2. ✅ `vectorScore` > 0.7 (semantic match)
3. ✅ `keywordScore` = 0 (no exact keywords)
4. ✅ `combinedScore` = (0.89 × 0.7) + (0 × 0.3) = 0.623
5. ✅ `searchMethod` = "hybrid"
6. ✅ AI Dashboard shows search embedding:
   - Feature: `rag_faq_search`
   - Endpoint: `/api/rag/faqs/search`
   - Tokens: ~10 for query embedding

### Test 2.2: Hybrid Search - Keyword Match

**Purpose**: Verify keyword matching works

**Request**:
```bash
curl -X POST http://localhost:3000/api/rag/faqs/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "pro plan pricing",
    "organizationId": "org_test123",
    "maxResults": 5
  }'
```

**Expected Response**:
```json
{
  "results": [
    {
      "score": 0.87,
      "vectorScore": 0.82,
      "keywordScore": 1.0,
      "matchedField": "keywords",
      ...
    }
  ],
  ...
}
```

**Verifications**:
1. ✅ FAQ found via keywords
2. ✅ `keywordScore` = 1.0 (exact keyword match)
3. ✅ `vectorScore` also high (semantic similarity)
4. ✅ `combinedScore` = (0.82 × 0.7) + (1.0 × 0.3) = 0.874

### Test 2.3: Hybrid Search - Filtering

**Purpose**: Verify category/status filters work

**Request**:
```bash
curl -X POST http://localhost:3000/api/rag/faqs/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "pricing",
    "organizationId": "org_test123",
    "categories": ["billing"],
    "status": ["published"],
    "maxResults": 5
  }'
```

**Verifications**:
1. ✅ Only "billing" category FAQs returned
2. ✅ Only "published" status FAQs returned
3. ✅ Drafts and archived FAQs excluded

### Test 2.4: Fallback to Keyword-Only Search

**Purpose**: Verify fallback when vector index missing

**Setup**: Test with organization that has no vector index

**Expected Response**:
```json
{
  "success": true,
  "results": [...],
  "searchMethod": "keyword",
  "warning": "Vector search index not available, using keyword search only"
}
```

**Verifications**:
1. ✅ Search still works (keyword-only)
2. ✅ `searchMethod` = "keyword"
3. ✅ Warning message present
4. ✅ Results based on regex matching only

---

## Test Suite 3: Document Upload & Embeddings

### Test 3.1: Document Upload with Tracking

**Purpose**: Verify document upload generates tracked embeddings

**Request**:
```bash
curl -X POST http://localhost:3000/api/rag/documents/upload \
  -F "file=@test-document.pdf" \
  -F "formId=form_test456" \
  -F "organizationId=org_test123" \
  -F "sourceType=policy" \
  -F "title=Test Policy Document" \
  -F "description=Testing document upload"
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "document": {
    "documentId": "doc_xyz789",
    "filename": "test-document.pdf",
    "title": "Test Policy Document",
    "status": "processing",
    ...
  }
}
```

**Verifications**:
1. ✅ Document created with status "processing"
2. ✅ Background job starts processing
3. ✅ Wait 10-30 seconds, then check status:
   ```bash
   curl "http://localhost:3000/api/rag/documents/doc_xyz789?organizationId=org_test123"
   ```
4. ✅ Status changes to "completed"
5. ✅ `chunkCount` > 0 (document chunked)
6. ✅ AI Dashboard shows embedding requests:
   - Feature: `rag_conversational_forms`
   - Endpoint: `/api/rag/documents/upload`
   - Multiple requests (one per batch of chunks)
   - Total tokens ≈ document length / 4

### Test 3.2: Document Processing Failure

**Purpose**: Verify error handling for unsupported files

**Request**: Upload invalid file type (.exe, .zip, etc.)

**Expected Response** (400 Bad Request):
```json
{
  "success": false,
  "error": "Unsupported file type..."
}
```

**Verifications**:
1. ✅ Appropriate error message
2. ✅ No document created
3. ✅ No AI dashboard entries

---

## Test Suite 4: AI Analytics Dashboard

### Test 4.1: Dashboard Visibility

**Purpose**: Verify all AI operations appear in dashboard

**Steps**:
1. Navigate to `/admin/api-metrics`
2. Filter by organization: `org_test123`
3. Set date range: Last 24 hours

**Expected Results**:
Should see entries for:
- ✅ FAQ creation (embedding generation)
- ✅ FAQ update (if question changed)
- ✅ FAQ search (query embedding)
- ✅ Document upload (chunk embeddings)

**Verify Each Entry**:
- Organization ID: `org_test123`
- User ID: Test user ID
- Feature: `rag_conversational_forms` or `rag_faq_search`
- Endpoint: Correct API endpoint
- Model: `voyage-3` (or configured model)
- Provider: `voyage` or `openai`
- Tokens: Realistic count
- Latency: < 5000ms
- Cost: Calculated correctly
- Success: `true`

### Test 4.2: Cost Tracking

**Purpose**: Verify cost estimation is accurate

**Verifications**:
1. ✅ Each request shows estimated cost
2. ✅ Total cost aggregated correctly
3. ✅ Cost per token matches configured pricing:
   - Voyage-3: $0.06 per 1M tokens
   - OpenAI text-embedding-3-small: $0.02 per 1M tokens

### Test 4.3: Error Tracking

**Purpose**: Verify failed requests are logged

**Setup**: Temporarily remove API keys to force errors

**Verifications**:
1. ✅ Failed requests appear in dashboard
2. ✅ `success` = `false`
3. ✅ Error code and message present
4. ✅ Can filter by status: "failed"

---

## Test Suite 5: Knowledge Tab UI

### Test 5.1: Knowledge Tab Rendering

**Purpose**: Verify Knowledge Tab loads correctly

**Steps**:
1. Navigate to Form Builder
2. Enable Conversational mode with RAG
3. Click "Knowledge" tab

**Expected Results**:
- ✅ Tab shows "Documents" and "FAQs" sub-tabs
- ✅ Document count and FAQ count displayed
- ✅ "Upload Document" button visible on Documents tab
- ✅ "New FAQ" button visible on FAQs tab

### Test 5.2: Documents List

**Purpose**: Verify documents list displays correctly

**Steps**:
1. Open Knowledge Tab > Documents
2. Upload a test document
3. Verify list updates

**Expected Results**:
- ✅ Empty state shows when no documents
- ✅ Documents appear after upload
- ✅ Status indicators (processing → completed)
- ✅ Document metadata displayed (size, pages, chunks)
- ✅ Checkbox to select for RAG
- ✅ Delete button works
- ✅ Auto-refresh while processing

### Test 5.3: FAQs List

**Purpose**: Verify FAQs list displays correctly

**Steps**:
1. Open Knowledge Tab > FAQs
2. Create test FAQs
3. Verify list updates

**Expected Results**:
- ✅ Empty state shows when no FAQs
- ✅ FAQs appear after creation
- ✅ Search box filters FAQs
- ✅ Category filter works
- ✅ Status chips display (Published, Draft, Archived)
- ✅ Analytics shown (views, helpful ratings)
- ✅ Edit menu works
- ✅ Delete confirmation works

### Test 5.4: Document Upload Dialog

**Purpose**: Verify document upload UI works

**Steps**:
1. Click "Upload Document"
2. Select file
3. Fill metadata
4. Upload

**Expected Results**:
- ✅ File picker opens
- ✅ File validation (size, type)
- ✅ Title auto-fills from filename
- ✅ Source type dropdown works
- ✅ Upload progress shown
- ✅ Success message/dialog closes
- ✅ List refreshes automatically

### Test 5.5: FAQ Editor Dialog

**Purpose**: Verify FAQ creation/editing UI works

**Steps**:
1. Click "New FAQ"
2. Fill question and answer
3. Add keywords
4. Set category, status, priority
5. Save

**Expected Results**:
- ✅ All fields editable
- ✅ Validation works (required fields)
- ✅ Keywords/tags autocomplete works
- ✅ Priority slider works
- ✅ Scope radio buttons work
- ✅ Save shows progress
- ✅ Success closes dialog
- ✅ List refreshes automatically

**Edit Test**:
1. Click "Edit" on existing FAQ
2. Verify fields pre-filled
3. Change question
4. Save

**Expected Results**:
- ✅ Existing data loads
- ✅ Changes saved
- ✅ New embedding generated if question changed

---

## Test Suite 6: Integration Testing

### Test 6.1: End-to-End: Create FAQ → Search → View in UI

**Steps**:
1. Create FAQ via API
2. Search for it via API
3. View in Knowledge Tab UI

**Verifications**:
- ✅ API creation works
- ✅ Search finds it
- ✅ UI displays it correctly
- ✅ Analytics tracked for all operations

### Test 6.2: End-to-End: Upload Document → Process → Select for RAG

**Steps**:
1. Upload document via UI
2. Wait for processing
3. Select for RAG retrieval
4. Verify in form settings

**Verifications**:
- ✅ Upload succeeds
- ✅ Processing completes
- ✅ Embeddings generated and tracked
- ✅ Selection saved
- ✅ Form shows selected documents

### Test 6.3: Multi-Organization Isolation

**Purpose**: Verify data isolation between organizations

**Steps**:
1. Create FAQs for org A
2. Create FAQs for org B
3. Search from org A
4. Search from org B

**Verifications**:
- ✅ Org A sees only org A FAQs
- ✅ Org B sees only org B FAQs
- ✅ Vector search filters by organizationId
- ✅ No cross-org data leakage

---

## Performance Testing

### Test P.1: FAQ Search Latency

**Target**: < 100ms for hybrid search

**Method**:
1. Create 100 FAQs
2. Run 10 search queries
3. Measure latency from response

**Expected Results**:
- ✅ p50 latency: < 50ms
- ✅ p95 latency: < 100ms
- ✅ p99 latency: < 200ms

### Test P.2: Document Processing Time

**Target**: < 60s for 5MB document

**Method**:
1. Upload 5MB PDF
2. Measure time to "completed" status

**Expected Results**:
- ✅ 1MB document: < 15s
- ✅ 5MB document: < 60s
- ✅ Timeout after 60s with error

### Test P.3: Embedding Generation Cost

**Target**: Reasonable token usage

**Method**:
1. Create 10 FAQs
2. Check AI Dashboard for total tokens

**Expected Results**:
- ✅ Each FAQ: 10-50 tokens (depending on question length)
- ✅ Total cost: < $0.01 for 10 FAQs

---

## Error Cases

### Test E.1: Missing Vector Index

**Setup**: Test with org that has no vector index

**Expected Behavior**:
- ✅ FAQ creation still works
- ✅ Search falls back to keyword-only
- ✅ Warning message shown
- ✅ No crashes or 500 errors

### Test E.2: Invalid Organization ID

**Request**: Use non-existent org ID

**Expected Response**: 403 Forbidden or 404 Not Found

### Test E.3: Quota Exceeded

**Setup**: Exceed tier usage limits

**Expected Behavior**:
- ✅ API returns quota exceeded error
- ✅ User-friendly message
- ✅ Upgrade prompt shown

---

## Regression Testing

### Test R.1: Existing Document Upload Still Works

**Purpose**: Ensure new tracking didn't break existing flows

**Verifications**:
- ✅ Documents upload successfully
- ✅ Processing completes
- ✅ Retrieval works in conversational forms

### Test R.2: Conversational Forms Still Work

**Purpose**: Ensure RAG integration still functional

**Verifications**:
- ✅ Conversational chat works
- ✅ Document retrieval works
- ✅ Citations shown correctly

---

## Checklist: Phase 1 Complete

Mark each item when verified:

### Backend
- [ ] FAQ CRUD API (create, read, update, delete, list)
- [ ] FAQ hybrid search (vector + keyword)
- [ ] Document upload with tracked embeddings
- [ ] AI analytics tracking (all operations logged)
- [ ] Vector search index setup script
- [ ] Usage tracking (RAG limits enforced)

### Frontend
- [ ] Knowledge Tab renders correctly
- [ ] Documents List displays and updates
- [ ] FAQs List displays with search/filter
- [ ] Document Upload Dialog works
- [ ] FAQ Editor Dialog works (create + edit)
- [ ] Real-time status updates (processing docs)

### Documentation
- [ ] AI Analytics Guidelines published
- [ ] FAQ Vector Index Setup guide complete
- [ ] Capabilities documentation updated (internal + external)
- [ ] Phase 1 implementation docs complete

### Analytics
- [ ] All FAQ operations tracked in dashboard
- [ ] All document operations tracked in dashboard
- [ ] Cost estimation accurate
- [ ] Error tracking works

### Performance
- [ ] Search latency < 100ms (p95)
- [ ] Document processing < 60s for 5MB
- [ ] No memory leaks or crashes

---

## Next Steps After Testing

Once all tests pass:

1. **Deploy to Staging**: Test in staging environment
2. **User Acceptance Testing**: Get feedback from test users
3. **Performance Profiling**: Monitor under load
4. **Bug Fixes**: Address any issues found
5. **Launch Phase 1**: Roll out to production
6. **Monitor**: Watch AI Dashboard, usage metrics, errors
7. **Plan Phase 2**: Start Phase 2 (Form Intelligence) planning

---

**Questions or Issues?**

If tests fail or you encounter issues:
1. Check logs: Browser console, server console
2. Verify environment variables
3. Check MongoDB connection and vector index status
4. Review AI Dashboard for tracking failures
5. Consult troubleshooting sections in docs

For development questions: See [AI-Analytics-Guidelines.md](./AI-Analytics-Guidelines.md)
