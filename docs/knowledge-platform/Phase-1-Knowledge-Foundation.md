# Phase 1 Execution Plan: Knowledge Foundation

**Timeline**: Feb 10 - Mar 21 (6 weeks)
**Status**: Ready to Start
**Goal**: Build infrastructure for knowledge management without disrupting current users

---

## Overview

Phase 1 adds the foundational pieces for the Knowledge Platform:
1. **Usage Tracking & Limits** - Monitor and enforce tier-based limits
2. **FAQ Knowledge Type** - High-quality Q&A pairs with hybrid search
3. **Knowledge Tab UI** - Unified management interface

---

## Week-by-Week Breakdown

### Week 1-2: Usage Tracking & Tier Limits (Feb 10-21)

#### Task 1.1: Design Usage Tracking Schema (Day 1-2)

**File to create**: `src/types/rag-usage.ts`

```typescript
export interface RAGUsage {
  _id: ObjectId;
  organizationId: string;
  period: Date;              // Monthly period (first day of month)

  // Document usage
  documents: {
    total: number;           // Total documents uploaded
    storageBytes: number;    // Total storage used
    chunksGenerated: number; // Total chunks created
  };

  // Query usage
  queries: {
    total: number;           // Total retrieval queries
    vectorSearches: number;  // Vector search operations
    embeddingsGenerated: number; // Embedding API calls
  };

  // Costs (for internal tracking)
  estimatedCost?: {
    embeddings: number;      // Cost in USD
    storage: number;
    compute: number;
  };

  createdAt: Date;
  updatedAt: Date;
}

export interface UsageLimits {
  tier: 'free' | 'pro' | 'team' | 'enterprise';

  documents: {
    maxCount: number;        // Max documents
    maxSizeBytes: number;    // Max size per document
    maxTotalBytes: number;   // Max total storage
  };

  queries: {
    maxPerMonth: number;     // Max queries per month
  };
}
```

**Acceptance Criteria**:
- [ ] Schema defined with all metrics
- [ ] TypeScript types exported
- [ ] Default limits configured per tier

---

#### Task 1.2: Implement Tracking Middleware (Day 3-5)

**File to create**: `src/lib/rag/usage/tracking.ts`

```typescript
/**
 * Track document upload
 */
export async function trackDocumentUpload(
  organizationId: string,
  documentSize: number,
  chunksGenerated: number
): Promise<void> {
  const db = await getPlatformDb();
  const usageCollection = db.collection('rag_usage');

  const period = startOfMonth(new Date());

  await usageCollection.updateOne(
    { organizationId, period },
    {
      $inc: {
        'documents.total': 1,
        'documents.storageBytes': documentSize,
        'documents.chunksGenerated': chunksGenerated,
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
      $set: {
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
}

/**
 * Track query execution
 */
export async function trackQuery(
  organizationId: string,
  embeddingsGenerated: number
): Promise<void> {
  const db = await getPlatformDb();
  const usageCollection = db.collection('rag_usage');

  const period = startOfMonth(new Date());

  await usageCollection.updateOne(
    { organizationId, period },
    {
      $inc: {
        'queries.total': 1,
        'queries.vectorSearches': 1,
        'queries.embeddingsGenerated': embeddingsGenerated,
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
      $set: {
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
}

/**
 * Get current usage for organization
 */
export async function getCurrentUsage(
  organizationId: string
): Promise<RAGUsage | null> {
  const db = await getPlatformDb();
  const usageCollection = db.collection<RAGUsage>('rag_usage');

  const period = startOfMonth(new Date());

  return await usageCollection.findOne({
    organizationId,
    period,
  });
}
```

**Files to modify**:
- `src/app/api/rag/documents/upload/route.ts` - Add `trackDocumentUpload()`
- `src/app/api/rag/retrieve/route.ts` - Add `trackQuery()`
- `src/lib/rag/retrieval.ts` - Add tracking to retrieval function

**Acceptance Criteria**:
- [ ] All document uploads tracked
- [ ] All queries tracked
- [ ] Usage persisted to database
- [ ] No performance degradation (<10ms overhead)

---

#### Task 1.3: Build Limits Enforcement (Day 6-7)

**File to create**: `src/lib/rag/usage/limits.ts`

```typescript
export async function checkDocumentUploadLimit(
  organizationId: string,
  documentSize: number
): Promise<{ allowed: boolean; reason?: string }> {
  const config = await getOrganizationRAGConfig(organizationId);
  const usage = await getCurrentUsage(organizationId);

  // Check document count limit
  if (usage && usage.documents.total >= config.limits.documents.maxCount) {
    return {
      allowed: false,
      reason: `Document limit reached (${config.limits.documents.maxCount}). Upgrade to upload more.`,
    };
  }

  // Check storage limit
  if (usage && usage.documents.storageBytes + documentSize > config.limits.documents.maxTotalBytes) {
    return {
      allowed: false,
      reason: `Storage limit reached. Upgrade for more storage.`,
    };
  }

  return { allowed: true };
}

export async function checkQueryLimit(
  organizationId: string
): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
  const config = await getOrganizationRAGConfig(organizationId);
  const usage = await getCurrentUsage(organizationId);

  const queriesUsed = usage?.queries.total || 0;
  const queriesLimit = config.limits.queries.maxPerMonth;

  if (queriesUsed >= queriesLimit) {
    return {
      allowed: false,
      reason: `Monthly query limit reached (${queriesLimit}). Resets on ${formatDate(startOfNextMonth())}.`,
    };
  }

  return {
    allowed: true,
    remaining: queriesLimit - queriesUsed,
  };
}
```

**Files to modify**:
- `src/app/api/rag/documents/upload/route.ts` - Check limits before upload
- `src/app/api/rag/retrieve/route.ts` - Check limits before query

**Acceptance Criteria**:
- [ ] Limits enforced at API level
- [ ] Clear error messages when limits hit
- [ ] Remaining quota returned in responses

---

#### Task 1.4: Usage Dashboard Component (Day 8-10)

**File to create**: `src/components/RAG/UsageDashboard.tsx`

```typescript
export function UsageDashboard({ organizationId }: { organizationId: string }) {
  const { data: usage, isLoading } = useQuery({
    queryKey: ['rag-usage', organizationId],
    queryFn: () => fetch(`/api/rag/usage?organizationId=${organizationId}`).then(r => r.json()),
  });

  const { data: config } = useQuery({
    queryKey: ['rag-config', organizationId],
    queryFn: () => fetch(`/api/rag/config?organizationId=${organizationId}`).then(r => r.json()),
  });

  if (isLoading) return <Skeleton />;

  const documentUsagePercent = (usage?.documents.total / config?.limits.documents.maxCount) * 100;
  const queryUsagePercent = (usage?.queries.total / config?.limits.queries.maxPerMonth) * 100;
  const storageUsagePercent = (usage?.documents.storageBytes / config?.limits.documents.maxTotalBytes) * 100;

  return (
    <Box>
      <Typography variant="h6">RAG Usage</Typography>

      {/* Documents */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2">
          Documents: {usage?.documents.total || 0} / {config?.limits.documents.maxCount}
        </Typography>
        <LinearProgress variant="determinate" value={documentUsagePercent} />
      </Box>

      {/* Storage */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2">
          Storage: {formatBytes(usage?.documents.storageBytes || 0)} / {formatBytes(config?.limits.documents.maxTotalBytes)}
        </Typography>
        <LinearProgress variant="determinate" value={storageUsagePercent} />
      </Box>

      {/* Queries */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2">
          Queries this month: {usage?.queries.total || 0} / {config?.limits.queries.maxPerMonth}
        </Typography>
        <LinearProgress variant="determinate" value={queryUsagePercent} />
      </Box>

      {/* Upgrade prompt if near limits */}
      {(documentUsagePercent > 80 || queryUsagePercent > 80 || storageUsagePercent > 80) && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          You're approaching your plan limits. <Link href="/billing">Upgrade now</Link>
        </Alert>
      )}
    </Box>
  );
}
```

**Acceptance Criteria**:
- [ ] Dashboard shows real-time usage
- [ ] Progress bars for each metric
- [ ] Upgrade prompt when >80% used
- [ ] Responsive design

---

### Week 3-4: FAQ Knowledge Type (Feb 24 - Mar 7)

#### Task 2.1: FAQ Schema & Storage (Day 1-2)

**File to create**: `src/types/rag-faq.ts`

```typescript
export interface RAGFAQ {
  _id: ObjectId;
  organizationId: string;
  formId: string;

  // FAQ content
  question: string;
  answer: string;

  // Embeddings for semantic search
  questionEmbedding: number[];
  answerEmbedding?: number[];  // Optional: can embed answer too

  // Metadata
  category?: string;
  tags?: string[];
  priority: number;            // 1-10, higher = more important

  // Usage analytics
  timesRetrieved: number;
  lastRetrieved?: Date;
  helpfulVotes?: number;       // Future: user feedback

  // Management
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**API Endpoints to create**:
- `POST /api/rag/faqs` - Create FAQ
- `GET /api/rag/faqs?formId=...` - List FAQs
- `PUT /api/rag/faqs/[faqId]` - Update FAQ
- `DELETE /api/rag/faqs/[faqId]` - Delete FAQ
- `POST /api/rag/faqs/batch` - Bulk import FAQs

**Acceptance Criteria**:
- [ ] Collection created with indexes
- [ ] CRUD APIs working
- [ ] Embeddings generated on create/update

---

#### Task 2.2: Hybrid FAQ Retrieval (Day 3-5)

**File to create**: `src/lib/rag/faq-retrieval.ts`

```typescript
export async function searchFAQs(
  formId: string,
  query: string,
  options?: {
    maxResults?: number;
    minScore?: number;
  }
): Promise<Array<RAGFAQ & { score: number; matchType: 'keyword' | 'semantic' }>> {
  const db = await getOrgDb(organizationId);
  const faqCollection = db.collection<RAGFAQ>('rag_faqs');

  // 1. Keyword search (exact/fuzzy match on question text)
  const keywordResults = await faqCollection.find({
    formId,
    $text: { $search: query },
  })
  .project({ score: { $meta: 'textScore' } })
  .sort({ score: { $meta: 'textScore' } })
  .limit(5)
  .toArray();

  // 2. Semantic search (vector similarity)
  const queryEmbedding = await generateEmbedding(query);
  const semanticResults = await faqCollection.aggregate([
    {
      $vectorSearch: {
        index: 'faq_vector_index',
        queryVector: queryEmbedding,
        path: 'questionEmbedding',
        numCandidates: 50,
        limit: 5,
        filter: { formId },
      },
    },
    {
      $addFields: {
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ]).toArray();

  // 3. Merge and deduplicate
  const merged = mergeResults(keywordResults, semanticResults);

  // 4. Sort by combined score (keyword matches weighted higher)
  merged.sort((a, b) => {
    const scoreA = a.matchType === 'keyword' ? a.score * 1.5 : a.score;
    const scoreB = b.matchType === 'keyword' ? b.score * 1.5 : b.score;
    return scoreB - scoreA;
  });

  return merged.slice(0, options?.maxResults || 3);
}
```

**Acceptance Criteria**:
- [ ] Keyword search working
- [ ] Semantic search working
- [ ] Hybrid results merge correctly
- [ ] Keyword matches prioritized

---

#### Task 2.3: FAQ Management UI (Day 6-10)

**Files to create**:
- `src/components/Knowledge/FAQManager.tsx` - Main FAQ management interface
- `src/components/Knowledge/FAQList.tsx` - List of FAQs with search/filter
- `src/components/Knowledge/FAQEditor.tsx` - Modal for add/edit FAQ
- `src/components/Knowledge/FAQImporter.tsx` - Bulk import from CSV/JSON

**Features**:
- Add/edit/delete FAQs
- Organize by category
- Tag management
- Set priority levels
- Bulk import
- Search/filter FAQs
- Usage analytics per FAQ

**Acceptance Criteria**:
- [ ] CRUD operations work from UI
- [ ] Categories and tags managed
- [ ] CSV import working
- [ ] Analytics showing retrieval counts

---

### Week 5-6: Knowledge Tab UI (Mar 10-21)

#### Task 3.1: Knowledge Tab Layout (Day 1-3)

**File to create**: `src/components/FormBuilder/KnowledgeTab.tsx`

```typescript
export function KnowledgeTab({ formId }: { formId: string }) {
  const [selectedView, setSelectedView] = useState<'documents' | 'faqs' | 'overview'>('overview');

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Knowledge Base</Typography>
        <Stack direction="row" spacing={2}>
          <Button onClick={() => setSelectedView('documents')}>
            Documents ({documentCount})
          </Button>
          <Button onClick={() => setSelectedView('faqs')}>
            FAQs ({faqCount})
          </Button>
        </Stack>
      </Box>

      {/* Overview Stats */}
      {selectedView === 'overview' && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <KnowledgeStatsCard
              title="Documents"
              count={documentCount}
              icon={<DocumentIcon />}
              action={() => setSelectedView('documents')}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <KnowledgeStatsCard
              title="FAQs"
              count={faqCount}
              icon={<FAQIcon />}
              action={() => setSelectedView('faqs')}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <KnowledgeStatsCard
              title="Total Chunks"
              count={chunkCount}
              icon={<ChunkIcon />}
            />
          </Grid>
        </Grid>
      )}

      {/* Document List */}
      {selectedView === 'documents' && (
        <DocumentList formId={formId} />
      )}

      {/* FAQ Manager */}
      {selectedView === 'faqs' && (
        <FAQManager formId={formId} />
      )}
    </Box>
  );
}
```

**Acceptance Criteria**:
- [ ] Tab added to form builder
- [ ] Unified view of all knowledge
- [ ] Quick navigation between sections
- [ ] Stats cards showing counts

---

#### Task 3.2: Quick-Add FAQ Modal (Day 4-5)

**File to create**: `src/components/Knowledge/QuickAddFAQModal.tsx`

Simple modal for adding FAQs inline from any view.

**Acceptance Criteria**:
- [ ] Opens from Knowledge tab
- [ ] Simple Q&A input fields
- [ ] Optional category/tags
- [ ] Creates FAQ with embedding

---

#### Task 3.3: Knowledge Search & Filter (Day 6-8)

**Features**:
- Global search across documents + FAQs
- Filter by category/tags
- Sort by relevance/date/usage
- Export knowledge base (JSON/CSV)

**Acceptance Criteria**:
- [ ] Search works across all knowledge types
- [ ] Filters functional
- [ ] Export generates downloadable file

---

## Success Metrics for Phase 1

At the end of Phase 1, we should have:

### Quantitative Metrics
- [ ] **Usage tracking**: 100% of RAG operations tracked
- [ ] **Limits enforcement**: 0 bypassed limit checks
- [ ] **FAQ adoption**: 50%+ of conversational forms add ≥1 FAQ
- [ ] **Knowledge tab usage**: 30%+ of users visit Knowledge tab
- [ ] **Free tier compliance**: <1% of free tier users blocked by limits

### Qualitative Metrics
- [ ] Users can self-serve on usage monitoring
- [ ] FAQ creation is intuitive
- [ ] Knowledge management feels unified
- [ ] No performance degradation

---

## Deployment Checklist

Before marking Phase 1 complete:

1. **Database Migrations**:
   - [ ] `rag_usage` collection created
   - [ ] `rag_faqs` collection created
   - [ ] FAQ vector index created
   - [ ] Text search index on FAQs

2. **API Endpoints**:
   - [ ] Usage tracking endpoints
   - [ ] FAQ CRUD endpoints
   - [ ] FAQ search endpoint

3. **UI Components**:
   - [ ] Usage dashboard deployed
   - [ ] Knowledge tab live
   - [ ] FAQ manager functional

4. **Testing**:
   - [ ] Unit tests pass
   - [ ] Integration tests pass
   - [ ] Manual QA on staging

5. **Documentation**:
   - [ ] FAQ management guide published
   - [ ] Usage limits documented
   - [ ] API docs updated

---

## Next: Phase 2

Once Phase 1 is complete, we move to **Phase 2: Form Intelligence** (Rules Engine + Conversation Paths).

See [PHASE_2_EXECUTION_PLAN.md](./PHASE_2_EXECUTION_PLAN.md) for details.

---

*Created: January 29, 2026*
