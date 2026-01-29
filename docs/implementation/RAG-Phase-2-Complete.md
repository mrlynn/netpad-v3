# RAG Phase 2: API Integration - Complete

**Date:** January 28, 2026
**Status:** ✅ Complete

## Summary

Phase 2 of the RAG deployment architecture is now complete. The API endpoints have been updated to use the new storage provider abstraction, with comprehensive usage tracking and limit enforcement.

## What Was Implemented

### 1. Configuration Management ([src/lib/rag/config.ts](../../src/lib/rag/config.ts))

Created a complete configuration management system:

- `getOrganizationRAGConfig()` - Retrieves config with tier-based defaults
- `updateOrganizationRAGConfig()` - Updates custom configuration
- `resetOrganizationRAGConfig()` - Resets to defaults
- `canUseRAG()` - Validates RAG availability
- `getStorageMode()` - Quick mode check
- `getUsageLimits()` - Retrieve usage limits
- `isUsingPlatformStorage()` - Check storage mode
- `isUsingUserClusterStorage()` - Check storage mode

**Key Features:**
- Automatic tier-based defaults (Free, Pro, Team, Enterprise)
- Proper nested object merging for updates
- Validation for user-cluster requirements

### 2. Updated Upload Endpoint ([src/app/api/rag/documents/upload/route.ts](../../src/app/api/rag/documents/upload/route.ts))

**Changes:**
- ✅ Uses `getRAGStorageProvider()` instead of direct database access
- ✅ Implements `enforceUploadLimits()` before processing
- ✅ Records document uploads via `RAGUsageTrackingService`
- ✅ Returns detailed limit errors (429 status) when exceeded
- ✅ Uses storage provider's `createDocument()` and `createChunks()` methods
- ✅ Uses storage provider's `ensureVectorIndex()` method

**Limit Enforcement:**
```typescript
try {
  await enforceUploadLimits(organizationId, config);
} catch (error) {
  if (error instanceof RAGLimitError) {
    return NextResponse.json({
      success: false,
      error: error.message,
      limitType: error.limitType,
      current: error.current,
      limit: error.limit,
    }, { status: 429 });
  }
}
```

**Usage Tracking:**
```typescript
const usageTracker = new RAGUsageTrackingService();
await usageTracker.recordDocumentUpload(organizationId, file.size);
```

### 3. Updated Retrieve Endpoint ([src/app/api/rag/retrieve/route.ts](../../src/app/api/rag/retrieve/route.ts))

**Changes:**
- ✅ Implements `enforceQueryLimits()` before vector search
- ✅ Records queries via `RAGUsageTrackingService`
- ✅ Returns detailed limit errors (429 status) when exceeded
- ✅ Maintains compatibility with existing retrieval functions

**Query Limit Enforcement:**
```typescript
try {
  await enforceQueryLimits(organizationId, config);
} catch (error) {
  if (error instanceof RAGLimitError) {
    return NextResponse.json({
      success: false,
      error: error.message,
      limitType: error.limitType,
      current: error.current,
      limit: error.limit,
    }, { status: 429 });
  }
}
```

**Usage Tracking:**
```typescript
const usageTracker = new RAGUsageTrackingService();
await usageTracker.recordVectorSearchQuery(organizationId);
```

### 4. Configuration API Endpoint ([src/app/api/rag/config/route.ts](../../src/app/api/rag/config/route.ts))

New API endpoint for managing RAG configuration:

**GET /api/rag/config**
- Returns configuration, usage summary, and availability status
- Requires `organizationId` query parameter

**Response:**
```json
{
  "success": true,
  "config": {
    "mode": "platform",
    "limits": {
      "maxDocuments": 3,
      "maxStorageBytes": 26214400,
      "maxQueriesPerDay": 50,
      "maxQueriesPerMonth": 1500
    }
  },
  "usage": {
    "documentsUploaded": 2,
    "totalStorageBytes": 15728640,
    "queriesToday": 25,
    "queriesThisMonth": 120
  },
  "available": true
}
```

**PUT /api/rag/config**
- Updates configuration (mode, limits, storage settings)
- Validates user-cluster connection strings
- Returns updated configuration

**Request:**
```json
{
  "organizationId": "org_abc123",
  "config": {
    "mode": "user-cluster",
    "userCluster": {
      "connectionString": "mongodb+srv://..."
    }
  }
}
```

**DELETE /api/rag/config**
- Resets configuration to tier-based defaults
- Returns new default configuration

## Tier-Based Limits

| Tier | Max Documents | Max Storage | Queries/Day | Queries/Month | Storage Mode |
|------|--------------|-------------|-------------|---------------|--------------|
| Free | 3 | 25 MB | 50 | 1,500 | Platform |
| Pro | 50 | 500 MB | Unlimited | Unlimited | Platform |
| Team | Unlimited | Unlimited | Unlimited | Unlimited | Platform or User-cluster |
| Enterprise | Unlimited | Unlimited | Unlimited | Unlimited | User-cluster |

## Limit Enforcement Behavior

### Document Upload Limits

1. **Check Document Count**: `current < maxDocuments`
2. **Check Storage Size**: `totalStorage + newFile < maxStorageBytes`
3. **Return 429 Error**: If either limit exceeded

**Error Response:**
```json
{
  "success": false,
  "error": "Document limit exceeded. Maximum 3 documents allowed on free plan.",
  "limitType": "documents",
  "current": 3,
  "limit": 3
}
```

### Query Limits

1. **Check Daily Queries**: `queriesToday < maxQueriesPerDay`
2. **Check Monthly Queries**: `queriesThisMonth < maxQueriesPerMonth`
3. **Return 429 Error**: If either limit exceeded

**Error Response:**
```json
{
  "success": false,
  "error": "Daily query limit exceeded. 50 queries allowed per day on free plan.",
  "limitType": "queries_daily",
  "current": 50,
  "limit": 50
}
```

## Usage Tracking

### Daily Aggregation

Usage is tracked with daily aggregation in `rag_usage` collection:

```typescript
{
  organizationId: "org_abc123",
  date: "2026-01-28",
  documentsUploaded: 2,
  totalStorageBytes: 15728640,
  queries: 25,
  createdAt: Date,
  updatedAt: Date
}
```

### Running Totals

- **Documents**: Count never decreases (even if documents deleted)
- **Storage**: Total size of all uploaded documents
- **Queries**: Daily and monthly counters

## Migration Notes

### Backward Compatibility

The implementation maintains backward compatibility:

- Old storage functions (`createDocumentMetadata`, `storeChunks`, `updateDocumentStatus`) still work
- New code uses storage provider abstraction
- Gradual migration path for other endpoints

### Database Structure

No changes to existing database structure:
- `rag_documents` collection (unchanged)
- `rag_document_chunks` collection (unchanged)
- New: `rag_usage` collection (created automatically)

### Per-Organization Databases

Storage provider creates per-organization databases:
- Platform mode: `netpad_rag_{organizationId}` on platform cluster
- User-cluster mode: `netpad_rag_{organizationId}` on user's cluster

## Testing

### Manual Testing Steps

1. **Test Upload with Limits**
   ```bash
   curl -X POST http://localhost:3000/api/rag/documents/upload \
     -F "file=@document.pdf" \
     -F "formId=form_123" \
     -F "organizationId=org_abc123"
   ```

2. **Test Limit Enforcement**
   - Upload 3 documents (free tier limit)
   - 4th upload should return 429 error

3. **Test Query Limits**
   ```bash
   curl -X POST http://localhost:3000/api/rag/retrieve \
     -H "Content-Type: application/json" \
     -d '{
       "query": "test query",
       "formId": "form_123",
       "organizationId": "org_abc123"
     }'
   ```

4. **Test Configuration API**
   ```bash
   # Get config
   curl http://localhost:3000/api/rag/config?organizationId=org_abc123

   # Update config
   curl -X PUT http://localhost:3000/api/rag/config \
     -H "Content-Type: application/json" \
     -d '{
       "organizationId": "org_abc123",
       "config": {
         "limits": {
           "maxDocuments": 10
         }
       }
     }'

   # Reset config
   curl -X DELETE http://localhost:3000/api/rag/config?organizationId=org_abc123
   ```

## Files Modified/Created

### New Files (2 files, ~390 lines)
- `src/lib/rag/config.ts` (176 lines)
- `src/app/api/rag/config/route.ts` (214 lines)

### Modified Files (2 files)
- `src/app/api/rag/documents/upload/route.ts` (updated imports, limit enforcement, usage tracking)
- `src/app/api/rag/retrieve/route.ts` (updated imports, limit enforcement, usage tracking)

### Phase 1 Files (Still Active)
- `src/types/rag-storage.ts` (455 lines)
- `src/lib/rag/storage/provider.ts` (265 lines)
- `src/lib/rag/storage/platform-provider.ts` (473 lines)
- `src/lib/rag/storage/factory.ts` (103 lines)
- `src/lib/rag/usage/tracking.ts` (383 lines)
- `src/lib/rag/middleware/limits.ts` (197 lines)

## Known Limitations

### 1. updateDocumentStatus Still Uses Old Method

The storage provider interface doesn't have an `updateDocument()` method yet. The async processing function still uses:

```typescript
const { updateDocumentStatus } = await import('@/lib/rag/storage');
await updateDocumentStatus(documentId, organizationId, 'ready', {
  chunkCount: chunks.length,
});
```

**Resolution:** Add `updateDocument()` method to storage provider interface in Phase 3.

### 2. User-Cluster Connection Validation

The configuration API accepts user-cluster connection strings but doesn't validate them yet:

```typescript
// TODO: Validate connection string by attempting to connect
// This should be done carefully to avoid exposing connection errors
```

**Resolution:** Implement connection string validation in Phase 3.

### 3. Retrieval Still Uses Old Functions

The retrieve endpoint still uses old `retrieveWithMetadata()` and `getReadyDocuments()` functions instead of storage provider methods.

**Resolution:** Refactor retrieval functions to use storage provider in Phase 3.

## Next Steps: Phase 3

Phase 3 will focus on user-cluster storage support:

1. Implement User-Cluster Storage Provider
2. Add connection string validation
3. Create migration utilities for moving data between storage modes
4. Implement health checks for user clusters
5. Add monitoring and alerting for user-cluster issues
6. Complete storage provider interface (add updateDocument method)
7. Refactor retrieval functions to use storage provider

See [RAG-Deployment-Implementation-Spec.md](./RAG-Deployment-Implementation-Spec.md) for detailed Phase 3 tasks.

## Summary

**Phase 2 Status:** ✅ Complete

**New Code:** ~390 lines across 2 new files
**Modified Code:** 2 API endpoint files updated
**Total Phase 1+2:** ~2,250 lines of core infrastructure + ~390 lines of API integration

**Key Achievements:**
- ✅ Configuration management system
- ✅ Upload endpoint with limits and usage tracking
- ✅ Retrieve endpoint with limits and usage tracking
- ✅ Configuration API for managing RAG settings
- ✅ Proper error handling with detailed limit errors
- ✅ Backward compatibility maintained

**Ready for:**
- Phase 3: User-cluster storage implementation
- Production testing with real document uploads
- UI integration for configuration management
- Monitoring and analytics integration

---

**Next:** Begin Phase 3 when ready to implement user-cluster storage support.
