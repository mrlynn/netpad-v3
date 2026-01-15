# Caching Architecture

This document describes the multi-layer caching system for the Data Explorer and Data Browser.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                            │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐    ┌─────────────────────────────────────┐ │
│  │   useDataExplorer   │    │           DataBrowser               │ │
│  │   (SWR cached)      │    │    (raw fetch - not cached*)        │ │
│  └─────────────────────┘    └─────────────────────────────────────┘ │
│           │                              │                          │
│           ▼                              ▼                          │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    SWR Cache Layer                              ││
│  │  • useDatabases, useCollections, useLinkedResources             ││
│  │  • 5-10 minute TTL, deduplication, stale-while-revalidate       ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ HTTP
┌─────────────────────────────────────────────────────────────────────┐
│                       Browser HTTP Cache                            │
│           Cache-Control: private, max-age=300-600                   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ HTTP
┌─────────────────────────────────────────────────────────────────────┐
│                         SERVER (Vercel)                             │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                      API Routes                                 ││
│  │  /api/collections, /api/mongodb/query, /api/data-explorer/...   ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │              MongoDB Client Cache (clientCache.ts)              ││
│  │  • Connection pooling across requests                           ││
│  │  • 10-minute TTL, automatic cleanup                             ││
│  │  • Avoids ~500ms-2s connection overhead per request             ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ MongoDB Wire Protocol
┌─────────────────────────────────────────────────────────────────────┐
│                        MongoDB Atlas                                │
└─────────────────────────────────────────────────────────────────────┘
```

## Cache Layers Explained

### Layer 1: SWR Client Cache (src/lib/swr/)

**What it caches**: API responses in browser memory
**TTL**: 5-10 minutes depending on data type
**Benefits**:
- Instant UI updates on repeat views
- Deduplication of concurrent requests
- Background revalidation

**Currently used by**:
- ✅ `useDataExplorer` hook (Data Explorer tree)
- ❌ `DataBrowser` component (uses raw fetch)

### Layer 2: Browser HTTP Cache

**What it caches**: API responses based on Cache-Control headers
**TTL**: 5-10 minutes (set via response headers)
**Benefits**:
- Survives page refreshes
- Works without JavaScript

**Currently enabled for**:
- ✅ `/api/collections`
- ✅ `/api/data-explorer/linked-resources`
- ❌ `/api/mongodb/query` (dynamic data, no caching)

### Layer 3: MongoDB Client Cache (src/lib/mongodb/clientCache.ts)

**What it caches**: MongoDB TCP connections
**TTL**: 10 minutes idle timeout
**Benefits**:
- Eliminates connection handshake overhead
- Maintains connection pools

**Currently used by**:
- ✅ `/api/mongodb/query`
- ✅ `/api/mongodb/sample-documents`
- ✅ `/api/mongodb/distinct-values`
- ✅ `/api/collections`

## What's NOT Cached (By Design)

1. **Document mutations** (POST/PUT/DELETE to `/api/mongodb/document`)
   - These must always hit the database

2. **Real-time document queries** in DataBrowser
   - Users expect fresh data when paginating
   - SWR's short TTL (30s) can be used for light caching

3. **Authentication/Session endpoints**
   - Security-sensitive, never cached

## Migration Path for DataBrowser

The `DataBrowser` component currently uses raw `fetch()` calls. To enable caching:

### Option A: Use `useDocuments` hook (Recommended)

```tsx
// Before
const fetchDocuments = async () => {
  const response = await fetch('/api/mongodb/query', { ... });
  const data = await response.json();
  setDocuments(data.documents);
};

// After
const { documents, totalCount, isLoading, refresh } = useDocuments({
  connectionString,
  databaseName,
  collection,
  sort: { [sortField]: sortDirection === 'asc' ? 1 : -1 },
  limit: rowsPerPage,
  skip: page * rowsPerPage,
});
```

### Option B: Keep raw fetch for document queries

Documents change frequently, so aggressive caching may not be appropriate.
The server-side MongoDB client caching still provides benefits.

## Best Practices

### For Component Authors

1. **Use SWR hooks for read-only data that doesn't change often**
   - Collection lists, database lists, linked resources

2. **Use raw fetch for**
   - Mutations (create, update, delete)
   - Data that must be real-time

3. **Always invalidate cache after mutations**
   ```tsx
   const { mutate } = useSWRConfig();

   const handleCreate = async () => {
     await fetch('/api/create', { method: 'POST' });
     mutate(cacheKeys.collections(orgId, vaultId, db)); // Refresh cache
   };
   ```

### For API Route Authors

1. **Use `getClient()` from clientCache.ts**
   ```tsx
   import { getClient } from '@/lib/mongodb/clientCache';

   const client = await getClient(connectionString);
   // DON'T call client.close()
   ```

2. **Add Cache-Control headers for cacheable responses**
   ```tsx
   return NextResponse.json(data, {
     headers: {
       'Cache-Control': 'private, max-age=300, stale-while-revalidate=60',
     },
   });
   ```

3. **Use `estimatedDocumentCount()` for unfiltered counts**
   ```tsx
   // Faster than countDocuments() for large collections
   const count = await coll.estimatedDocumentCount();
   ```

## Vercel-Specific Considerations

1. **Serverless function cold starts**: MongoDB client cache survives within a function instance but not across cold starts. This is expected behavior.

2. **Edge runtime**: The MongoDB client cache requires Node.js runtime (`export const runtime = 'nodejs'`).

3. **ISR/SSG**: These features are not used for data explorer (dynamic data).

## Debugging Cache Issues

### Check SWR Cache
```tsx
import { useSWRConfig } from 'swr';

function DebugCache() {
  const { cache } = useSWRConfig();
  console.log('SWR Cache:', Array.from(cache.keys()));
}
```

### Check HTTP Cache
1. Open DevTools → Network
2. Look for "from cache" or "(disk cache)" in Size column

### Check MongoDB Client Cache
```tsx
import { getCacheStats } from '@/lib/mongodb/clientCache';

// In an API route
console.log('MongoDB connections:', getCacheStats());
```
