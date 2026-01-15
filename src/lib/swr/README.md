# SWR Caching for Data Explorer

This directory contains SWR hooks for efficient data fetching with automatic caching, deduplication, and revalidation.

## Why SWR?

- **Deduplication**: Multiple components requesting the same data share one request
- **Caching**: Data is cached and served instantly on subsequent requests
- **Stale-While-Revalidate**: Shows cached data immediately, then updates in background
- **Automatic Retry**: Failed requests retry with exponential backoff

## Available Hooks

### `useDatabases(orgId, vaultId)`
Fetches the list of databases for a vault.

```tsx
import { useDatabases } from '@/lib/swr';

function MyComponent() {
  const { data, error, isLoading } = useDatabases(orgId, vaultId);

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return <DatabaseList databases={data?.databases || []} />;
}
```

### `useCollections(orgId, vaultId, database, options?)`
Fetches collections with optional stats.

```tsx
import { useCollections } from '@/lib/swr';

function MyComponent() {
  const { data, error, isLoading } = useCollections(
    orgId,
    vaultId,
    'myDatabase',
    { includeStats: true }
  );

  return <CollectionList collections={data?.collections || []} />;
}
```

### `useLinkedResources(orgId, vaultId, collection)`
Fetches forms and workflows linked to a collection.

```tsx
import { useLinkedResources } from '@/lib/swr';

function MyComponent() {
  const { data, isLoading } = useLinkedResources(orgId, vaultId, 'myCollection');

  return (
    <>
      <FormList forms={data?.forms || []} />
      <WorkflowList workflows={data?.workflows || []} />
    </>
  );
}
```

### `useDocuments(params)`
Fetches paginated documents from a collection.

```tsx
import { useDocuments } from '@/lib/swr';

function MyComponent() {
  const { documents, totalCount, isLoading, refresh } = useDocuments({
    connectionString,
    databaseName: 'myDb',
    collection: 'myCollection',
    sort: { createdAt: -1 },
    limit: 25,
    skip: 0,
  });

  return <DocumentTable documents={documents} total={totalCount} />;
}
```

## Cache Configuration

| Hook | Cache Duration | Stale-While-Revalidate |
|------|----------------|------------------------|
| `useDatabases` | 5 minutes | Yes |
| `useCollections` | 5 minutes | Yes |
| `useLinkedResources` | 10 minutes | Yes |
| `useDocuments` | 30 seconds | Yes |

## Invalidating Cache

Use `mutate` from SWR to invalidate specific cache entries:

```tsx
import { useSWRConfig } from 'swr';
import { cacheKeys } from '@/lib/swr';

function MyComponent() {
  const { mutate } = useSWRConfig();

  const handleRefresh = () => {
    // Invalidate specific cache
    mutate(cacheKeys.databases(orgId, vaultId));

    // Invalidate collections for a database
    mutate(cacheKeys.collections(orgId, vaultId, database));

    // Invalidate linked resources
    mutate(cacheKeys.linkedResources(orgId, collection, vaultId));
  };

  return <Button onClick={handleRefresh}>Refresh</Button>;
}
```

## ⚠️ Common Mistakes to Avoid

### ❌ DON'T: Use raw `fetch` for cached data

```tsx
// BAD - bypasses cache, no deduplication
useEffect(() => {
  fetch(`/api/collections?organizationId=${orgId}&vaultId=${vaultId}`)
    .then(res => res.json())
    .then(setCollections);
}, [orgId, vaultId]);
```

### ✅ DO: Use the SWR hooks

```tsx
// GOOD - cached, deduplicated, auto-revalidates
const { data } = useCollections(orgId, vaultId, database);
```

### ❌ DON'T: Create new hooks for the same data

```tsx
// BAD - creates duplicate cache entries
const useFetchDatabases = (orgId, vaultId) => {
  return useSWR(`/custom/databases/${orgId}/${vaultId}`, fetcher);
};
```

### ✅ DO: Reuse existing hooks

```tsx
// GOOD - uses existing cache
const { data } = useDatabases(orgId, vaultId);
```

### ❌ DON'T: Forget to handle loading states

```tsx
// BAD - shows undefined during loading
const { data } = useCollections(orgId, vaultId, db);
return <List items={data.collections} />; // crashes!
```

### ✅ DO: Handle loading and empty states

```tsx
// GOOD - handles all states
const { data, isLoading, error } = useCollections(orgId, vaultId, db);

if (isLoading) return <Skeleton />;
if (error) return <ErrorMessage error={error} />;
if (!data?.collections?.length) return <EmptyState />;

return <List items={data.collections} />;
```

## MongoDB Client Caching

For server-side API routes, use the MongoDB client cache:

```tsx
// In API routes
import { getClient } from '@/lib/mongodb/clientCache';

export async function GET(request: NextRequest) {
  // Client is cached and reused across requests
  const client = await getClient(connectionString);
  const db = client.db(databaseName);

  // DON'T call client.close() - the cache manages connections

  return NextResponse.json(result);
}
```

## HTTP Cache Headers

API responses include cache headers for browser-level caching:

| Endpoint | Cache-Control |
|----------|---------------|
| `/api/collections` | `private, max-age=300, stale-while-revalidate=60` |
| `/api/data-explorer/linked-resources` | `private, max-age=600, stale-while-revalidate=120` |

These work alongside SWR caching for optimal performance.

## Testing Cache Behavior

To verify caching is working:

1. Open Network tab in DevTools
2. Load data explorer
3. Expand/collapse a cluster
4. Check that repeated requests show "(from cache)" or no network request

To force a fresh request:
- Use the refresh button (calls `mutate()`)
- Hard refresh the page (Cmd+Shift+R)
