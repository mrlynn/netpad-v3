# RAG Infrastructure Setup - Complete

**Date:** January 28, 2026
**Status:** ✅ Ready to Use

## Summary

The RAG (Retrieval Augmented Generation) infrastructure setup is now complete and ready to use. We've created a streamlined 3-step process to set up RAG for any organization.

## Setup Process

### 1. Find Organization ID
```bash
npm run list-orgs
```

This displays all organizations in your platform database with their IDs.

### 2. Create Database & Collections
```bash
npm run setup-rag-db -- --org org_YOUR_ORG_ID
```

This script:
- Creates database: `netpad_rag_{organizationId}`
- Creates collections: `rag_documents` and `rag_document_chunks`
- Creates standard indexes for performance
- Provides the exact JSON definition for the vector search index

### 3. Create Vector Search Index in Atlas UI

Follow the instructions output by the script:

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Select cluster: **performance**
3. Navigate to: **Database Services** → **Search**
4. Click: **"Create Search Index"**
5. Database: `netpad_rag_{organizationId}`
6. Collection: `rag_document_chunks`
7. Use **JSON Editor** and paste the provided definition
8. Click **"Create Search Index"**
9. Wait 2-5 minutes for index to build

## What Was Built

### Phase 1 Foundation Components

1. **Type System** ([src/types/rag-storage.ts](../../src/types/rag-storage.ts))
   - Complete TypeScript definitions for RAG storage
   - Tier-based configuration defaults
   - Usage tracking types

2. **Storage Provider** ([src/lib/rag/storage/](../../src/lib/rag/storage/))
   - Provider interface abstraction
   - Platform storage implementation
   - Provider factory with caching

3. **Usage Tracking** ([src/lib/rag/usage/tracking.ts](../../src/lib/rag/usage/tracking.ts))
   - Document upload tracking
   - Query tracking
   - Daily usage aggregation
   - Limit checking

4. **Limit Enforcement** ([src/lib/rag/middleware/limits.ts](../../src/lib/rag/middleware/limits.ts))
   - Upload limit enforcement
   - Query limit enforcement
   - Typed error handling

### Setup Scripts

1. **[scripts/rag/list-organizations.ts](../../scripts/rag/list-organizations.ts)**
   - Lists all organizations from platform database
   - Shows org ID, name, slug, plan, created date

2. **[scripts/rag/setup-database-only.ts](../../scripts/rag/setup-database-only.ts)**
   - Creates per-organization database
   - Creates collections with standard indexes
   - Provides vector index definition
   - No Atlas Admin API required (avoiding auth issues)

3. **[scripts/rag/setup-vector-index.ts](../../scripts/rag/setup-vector-index.ts)**
   - Alternative automated setup using Atlas Admin API
   - Currently not recommended due to API authentication issues
   - Kept for future reference

### Documentation

1. **[QUICK-START-RAG.md](../../QUICK-START-RAG.md)**
   - Quick 3-step guide for setting up RAG
   - Expected output examples
   - Troubleshooting tips

2. **[scripts/rag/README.md](../../scripts/rag/README.md)**
   - Detailed setup instructions
   - Vector index definition explanation
   - Database structure documentation

## Database Structure

After setup, each organization has:

```
Cluster: performance
└── Database: netpad_rag_{organizationId}
    ├── Collection: rag_documents
    │   ├── Index: formId_1
    │   ├── Index: organizationId_1_formId_1
    │   ├── Index: status_1
    │   └── Index: uploadedAt_-1
    └── Collection: rag_document_chunks
        ├── Index: documentId_1
        ├── Index: formId_1
        ├── Index: organizationId_1_formId_1
        └── Vector Search Index: rag_vector_index ⭐
```

## Vector Index Configuration

```json
{
  "name": "rag_vector_index",
  "type": "vectorSearch",
  "definition": {
    "fields": [
      {
        "type": "vector",
        "path": "embedding",
        "numDimensions": 1024,
        "similarity": "dotProduct"
      },
      {"type": "filter", "path": "formId"},
      {"type": "filter", "path": "organizationId"},
      {"type": "filter", "path": "documentId"},
      {"type": "filter", "path": "status"}
    ]
  }
}
```

**Why these settings:**
- **1024 dimensions**: Matches Voyage 4 embedding model output
- **dotProduct similarity**: Optimal for normalized embeddings from Voyage
- **Filter fields**: Enable secure multi-tenant queries and document filtering

## Tier-Based Limits

| Tier | Max Documents | Max Storage | Queries/Day | Storage Mode |
|------|--------------|-------------|-------------|--------------|
| Free | 3 | 25 MB | 50 | Platform |
| Pro | 50 | 500 MB | Unlimited | Platform |
| Team | Unlimited | Unlimited | Unlimited | User-cluster (optional) |
| Enterprise | Unlimited | Unlimited | Unlimited | User-cluster (required) |

## Next Steps: Phase 2

Now that the foundation is complete, Phase 2 will integrate these components into the application:

1. Update RAG upload endpoint to use storage provider
2. Update RAG retrieve endpoint to use storage provider
3. Create configuration management UI
4. Add usage tracking to API endpoints
5. Implement limit enforcement middleware
6. Update environment configuration

See [RAG-Deployment-Implementation-Spec.md](./RAG-Deployment-Implementation-Spec.md) for detailed Phase 2 tasks.

## Testing the Setup

Once you've completed the 3-step setup for an organization:

1. **Verify Database:** Check Atlas UI for `netpad_rag_{organizationId}` database
2. **Verify Collections:** Confirm `rag_documents` and `rag_document_chunks` exist
3. **Verify Indexes:** Check standard indexes on both collections
4. **Verify Vector Index:** Confirm `rag_vector_index` shows status "READY"
5. **Test Upload:** Try uploading a document via NetPad UI
6. **Test Query:** Try a conversational form with RAG enabled

## Files Modified/Created

### New Files (13 files, ~2,800 lines)
- `src/types/rag-storage.ts` (455 lines)
- `src/lib/rag/storage/provider.ts` (265 lines)
- `src/lib/rag/storage/platform-provider.ts` (473 lines)
- `src/lib/rag/storage/factory.ts` (103 lines)
- `src/lib/rag/storage/index.ts` (30 lines)
- `src/lib/rag/usage/tracking.ts` (383 lines)
- `src/lib/rag/middleware/limits.ts` (197 lines)
- `scripts/rag/list-organizations.ts` (67 lines)
- `scripts/rag/setup-database-only.ts` (157 lines)
- `scripts/rag/setup-vector-index.ts` (314 lines)
- `scripts/rag/README.md` (208 lines)
- `QUICK-START-RAG.md` (111 lines)
- `docs/implementation/RAG-Setup-Complete.md` (this file)

### Modified Files
- `src/types/platform.ts` (added `ragConfig` field)
- `package.json` (added npm scripts, dependencies)
- `.env.local` (already had required environment variables)

### Documentation Created
- Implementation spec
- Phase 1 completion summary
- Quick start guide
- Detailed setup guide

## Dependencies Added

```json
{
  "devDependencies": {
    "dotenv": "^17.2.3",
    "axios": "^1.13.4"
  }
}
```

## Known Issues and Workarounds

### Atlas Admin API Authentication
- **Issue:** Atlas Admin API returns 401 Unauthorized
- **Workaround:** Using manual vector index creation via Atlas UI
- **Future:** May regenerate API keys or use Terraform provider

### Why Manual Index Creation?
1. Atlas Admin API authentication issues
2. Better visibility - user sees exactly what's being created
3. One-time setup per organization
4. Avoids API key management complexity
5. Works reliably every time

## Support

For issues or questions:
1. Check [scripts/rag/README.md](../../scripts/rag/README.md) for troubleshooting
2. Verify environment variables in `.env.local`
3. Check MongoDB Atlas connection and permissions
4. Review Phase 1 implementation in `src/lib/rag/`

---

**Status:** ✅ Foundation complete, ready for Phase 2 integration

**Total Code:** ~2,800 lines across 13 new files
**Time Investment:** Phase 1 foundation
**Next Milestone:** Phase 2 API integration (Week 2 of implementation plan)
