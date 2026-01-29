# Knowledge Platform: Quick Start Checklist

**Goal**: Unblock RAG and launch templates (next 2 weeks)

---

## 🔴 Critical Blocker (Do First - 1 hour)

### Create Vector Search Index

The RAG infrastructure is **already built**. You just need to create the index:

```bash
# 1. Call the admin endpoint (via API client or curl)
curl -X POST https://netpad.io/api/rag/admin/ensure-index \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"organizationId": "PLATFORM_ORG_ID"}'

# 2. Wait 5-10 minutes for Atlas to build the index

# 3. Check status
curl -X GET "https://netpad.io/api/rag/admin/ensure-index?organizationId=PLATFORM_ORG_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Verify response shows:
# { "exists": true, "status": "READY", "queryable": true }
```

**What this unblocks**: EVERYTHING. All RAG features depend on this index.

---

## Week 1 Checklist (Jan 27-31)

### Engineering

- [ ] **Create vector search index** (1h) - See above
- [ ] **Monitor index build** (30m) - Check status every few minutes
- [ ] **Test document upload** (1h)
  - Upload a test PDF via RAG settings page
  - Verify chunks created in `rag_document_chunks` collection
  - Verify embeddings generated
- [ ] **Test retrieval** (1h)
  - Create conversational form with RAG enabled
  - Ask question related to uploaded document
  - Verify AI references the document in response
- [ ] **Finalize @netpad/templates** (4h)
  - Ensure package builds
  - Test installation in fresh project
  - Verify templates export correctly
- [ ] **Publish @netpad/templates to NPM** (1h)
  - Publish as beta initially
  - Test: `npm install @netpad/templates@beta`

### Product

- [ ] **Finalize IT Help Desk template** (6h)
  - Add 5+ sample IT policy documents
  - Add 10+ starter FAQ Q&As
  - Test template cloning workflow
- [ ] **Create sample knowledge content** (4h)
  - Common IT issues: password reset, VPN setup, software install
  - Format as both documents and FAQs
  - Test retrieval quality

**Total**: ~18 hours

---

## Week 2 Checklist (Feb 3-7)

### Marketing

- [ ] **Write templates announcement** (8h)
  - Blog post on netpad.io
  - Highlight: MongoDB-native, conversational forms, RAG-enabled
- [ ] **Prepare Hacker News post** (2h)
  - Title: "Show HN: NetPad Templates - MongoDB-native forms with AI"
  - Description emphasizing open source + templates
- [ ] **Social media content** (4h)
  - Twitter thread
  - LinkedIn post
  - Dev.to article (optional)

### Product

- [ ] **Identify first 10 waitlist users** (2h)
  - Prioritize: finance & healthcare verticals
  - Users who mentioned "internal tools" or "help desk"
- [ ] **Email onboarding sequence** (4h)
  - Email 1: "Your templates are ready!"
  - Email 2: "Getting started with conversational forms"
  - Email 3: "Adding knowledge to your forms"
- [ ] **Schedule 5 onboarding calls** (2h)
  - 30-min calls
  - Demo: conversational form + RAG + template cloning
- [ ] **Prepare demo script** (4h)
  - Show: clone template → customize → add docs → test conversation

### Engineering

- [ ] **Update homepage** (2h)
  - Add "Browse Templates" CTA
  - Feature conversational forms prominently
- [ ] **RAG load test** (2h)
  - 100 concurrent queries
  - Verify performance <2s response time
- [ ] **Monitor production** (ongoing)
  - Watch for errors
  - Monitor RAG usage metrics

**Total**: ~30 hours

---

## Success Metrics (End of Week 2)

- [ ] Vector search index: READY ✅
- [ ] @netpad/templates published to NPM ✅
- [ ] 5+ template clones in first week
- [ ] 10+ RAG documents uploaded across customers
- [ ] 3+ customer onboarding calls completed
- [ ] Templates announcement published (blog + HN)

---

## What You Already Have Built

You're **much closer** than you might think:

| Component | Status | Location |
|-----------|--------|----------|
| Document storage | ✅ Complete | `src/lib/rag/storage/` |
| Embedding generation | ✅ Complete | `src/lib/rag/embeddings.ts` |
| Document chunking | ✅ Complete | `src/lib/rag/chunking.ts` |
| Retrieval logic | ✅ Complete | `src/lib/rag/retrieval.ts` |
| Storage providers | ✅ Complete | Platform + User Cluster |
| Usage tracking | ✅ Complete | `src/lib/rag/usage/tracking.ts` |
| RAG configuration | ✅ Complete | `src/lib/rag/config.ts` |
| Index management | ✅ Complete | `src/lib/rag/indexManagement.ts` |
| Admin endpoints | ✅ Complete | `/api/rag/admin/*` |
| RAG settings UI | ✅ Complete | `/apps/[slug]/settings/rag` |

**What's missing**: Just the vector search index on the platform cluster.

---

## If Things Go Wrong

### Index creation fails

**Symptoms**: API returns error, or index status stays "PENDING" for >15 minutes

**Fix**:
1. Check Atlas cluster tier (M10+ required for vector search)
2. Check MongoDB driver version (6.5+ required)
3. Contact Atlas support with error message
4. Test in staging environment first

### Retrieval returns no results

**Symptoms**: Conversational form doesn't reference uploaded documents

**Check**:
1. Index status: `GET /api/rag/admin/ensure-index`
2. Embeddings generated: Check `rag_document_chunks.embedding` field exists
3. Query in Atlas UI: Run manual `$vectorSearch` query
4. Embedding dimensions: Ensure index dimensions match embedding provider (1536 for OpenAI, 1024 for Voyage)

### Templates don't clone correctly

**Symptoms**: Template cloning fails or fields missing

**Fix**:
1. Check template JSON schema validity
2. Verify `onAddTemplate()` is used (not `onAddField()` in loop)
3. Check console for errors
4. Test with simplest template first

---

## Next Steps After Week 2

Once Phase 0 is complete, move to [Phase 1: Foundation](./KNOWLEDGE_PLATFORM_IMPLEMENTATION_PLAN.md#phase-1-foundation-week-3-8-feb-10---mar-21):

1. **Usage Tracking & Tier Limits** (2 weeks)
2. **FAQ Knowledge Type** (2 weeks)
3. **Knowledge Tab UI** (2 weeks)

See full implementation plan for details.

---

## Questions?

- **Engineering blockers**: Check logs, Atlas UI, driver version
- **Product questions**: Review [strategic roadmap](../strategic/NetPad_Knowledge_platform_roadmap.md)
- **Timeline concerns**: See [implementation plan](./KNOWLEDGE_PLATFORM_IMPLEMENTATION_PLAN.md) for detailed breakdown

---

*Last updated: January 29, 2026*
