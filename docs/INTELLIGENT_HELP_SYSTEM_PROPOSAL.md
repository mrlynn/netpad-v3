# Intelligent Help System Proposal

## Current State

The help system currently:
- Searches static help content in `src/lib/helpContent.ts`
- Uses simple text matching (keyword-based scoring)
- Has ~100+ help topics organized by category
- Accessible via `CMD+/` keyboard shortcut
- No context-awareness (doesn't know what page/feature user is on)
- No user content search

## The Question

**Should the help system search user content (forms, workflows, apps)?**

### Arguments FOR Searching User Content

✅ **"Show me my contact form"** - Users might search for their own forms
✅ **"How do I configure this workflow?"** - Context from their actual workflows
✅ **"Where is my collaborator form?"** - Quick access to their content
✅ **Learning from examples** - See how they've configured things before

### Arguments AGAINST

❌ **Confusion** - Mixing help docs with user data could be confusing
❌ **Privacy** - User content might be sensitive
❌ **Noise** - User content might not be helpful (poorly named forms, etc.)
❌ **Scope creep** - Help system becomes a general search

## Recommendation: **Hybrid Approach**

### Phase 1: Enhanced Help Search (No User Content)
1. **Context-Aware Help** - Detect current page/feature, highlight relevant topics
2. **Smarter Search** - Better ranking, semantic understanding
3. **Improved UI** - Show context hints, related topics

### Phase 2: Separate "Your Content" Tab (Optional)
1. **Dedicated section** for searching user's forms/workflows/apps
2. **Clear separation** from help documentation
3. **Quick actions** - Open, edit, duplicate from search results

### Phase 3: AI-Powered Help (Future)
1. **Semantic search** using embeddings
2. **Natural language queries** - "How do I add conditional logic?"
3. **Contextual suggestions** - "Based on your form, you might want to..."

---

## Implementation Plan

### Option A: Simple Enhancements (Easiest, Fastest)

**What:** Improve existing search without AI

**Changes:**
1. **Context Detection** - Detect current route/feature
2. **Better Scoring** - Improved keyword matching
3. **Related Topics** - Show related help topics
4. **Search History** - Remember recent searches

**Effort:** 2-3 days
**No dependencies:** Works immediately

### Option B: Semantic Search (Medium Complexity)

**What:** Use embeddings for semantic understanding

**Changes:**
1. **Generate embeddings** for all help topics (one-time)
2. **Vector search** using MongoDB Atlas Vector Search
3. **Hybrid search** - Combine keyword + semantic
4. **Better ranking** - Understand intent, not just keywords

**Effort:** 1 week
**Dependencies:** MongoDB Atlas Vector Search (already have infrastructure)

### Option C: Full AI Help Assistant (Complex)

**What:** AI-powered help that understands context and user content

**Changes:**
1. **RAG for help content** - Embed all help topics
2. **User content indexing** - Index forms/workflows/apps
3. **Context understanding** - Know what user is working on
4. **Natural language** - Answer questions, not just search

**Effort:** 2-3 weeks
**Dependencies:** AI service, embeddings, vector search

---

## Recommended Approach: **Option A + Option B (Phased)**

### Phase 1: Context-Aware Help (Week 1)

**Features:**
- Detect current page/feature from route
- Pre-filter or highlight relevant help topics
- Show "Related to this page" section
- Better search ranking

**Example:**
```
User is on /forms/builder
Help search shows:
  - "Form Builder" (highlighted)
  - "Field Configuration" (related)
  - "Form Library" (related)
```

**Implementation:**
```typescript
// Detect context from route
const context = detectHelpContext(pathname);
// Examples:
// - /forms/builder → 'form-builder'
// - /workflows → 'workflows'
// - /orgs/[orgId]/projects/[projectId]/forms → 'forms'

// Boost relevant topics in search
function searchTopics(query: string, context?: string) {
  // ... existing search logic ...
  
  // Boost context-relevant topics
  if (context) {
    results = results.map(topic => {
      if (topic.id.includes(context) || topic.keywords?.includes(context)) {
        topic.score += 20; // Boost
      }
      return topic;
    });
  }
}
```

### Phase 2: Semantic Search (Week 2-3)

**Features:**
- Generate embeddings for help topics (one-time)
- Hybrid search: keyword + semantic
- Better understanding of user intent

**Implementation:**
```typescript
// Generate embeddings for all help topics
async function indexHelpTopics() {
  for (const topic of Object.values(helpTopics)) {
    const embedding = await generateEmbedding(topic.title + ' ' + topic.description);
    // Store in MongoDB with topic
  }
}

// Hybrid search
async function searchHelp(query: string) {
  // 1. Keyword search (existing)
  const keywordResults = searchTopics(query);
  
  // 2. Semantic search (new)
  const queryEmbedding = await generateEmbedding(query);
  const semanticResults = await vectorSearch(queryEmbedding);
  
  // 3. Combine and rank
  return combineResults(keywordResults, semanticResults);
}
```

### Phase 3: User Content Search (Optional, Future)

**Features:**
- Separate "Your Content" tab in help modal
- Search user's forms, workflows, apps
- Quick actions (open, edit, duplicate)

**UI:**
```
Help Search Modal
├── Help Topics (default tab)
└── Your Content (new tab)
    ├── Forms (3 matches)
    ├── Workflows (1 match)
    └── Applications (2 matches)
```

---

## Should We Search User Content?

### My Recommendation: **Not Initially**

**Reasons:**
1. **Different mental model** - Help is for learning, content search is for navigation
2. **Better UX** - Keep help focused on documentation
3. **Less confusion** - Users won't mix "how to" with "where is"

### Alternative: **Separate Command Palette**

Instead of mixing into help, create a separate `CMD+K` command palette that:
- Searches user content (forms, workflows, apps)
- Quick actions (open, edit, create)
- Keyboard shortcuts
- Recent items

This is a common pattern (VS Code, Linear, etc.) and keeps concerns separated.

---

## Implementation Details

### 1. Context Detection

```typescript
// src/lib/help/context.ts
export function detectHelpContext(pathname: string): string | null {
  // Map routes to help context
  const routeMap: Record<string, string> = {
    '/forms/builder': 'form-builder',
    '/forms': 'forms',
    '/workflows': 'workflows',
    '/workflows/editor': 'workflow-editor',
    '/data': 'data-explorer',
    '/marketplace': 'marketplace',
    '/settings': 'settings',
    // ... etc
  };
  
  // Check exact match first
  if (routeMap[pathname]) {
    return routeMap[pathname];
  }
  
  // Check pattern matches
  for (const [pattern, context] of Object.entries(routeMap)) {
    if (pathname.startsWith(pattern)) {
      return context;
    }
  }
  
  return null;
}
```

### 2. Enhanced Search with Context

```typescript
// src/components/Help/HelpSearchModal.tsx
function searchTopics(
  query: string, 
  showAdminTopics: boolean = false,
  context?: string  // NEW: context parameter
): HelpTopic[] {
  // ... existing search logic ...
  
  // Boost context-relevant topics
  if (context) {
    results = results.map(({ topic, score }) => {
      // Check if topic matches context
      const topicId = topic.id.toLowerCase();
      const contextLower = context.toLowerCase();
      
      if (topicId.includes(contextLower) || 
          topic.keywords?.some(k => k.toLowerCase().includes(contextLower))) {
        score += 30; // Significant boost
      }
      
      // Check related topics
      if (topic.relatedTopics?.some(rt => rt.includes(contextLower))) {
        score += 10;
      }
      
      return { topic, score };
    });
  }
  
  // ... rest of logic ...
}
```

### 3. Context-Aware UI

```typescript
// Show context hint in help modal
{context && (
  <Chip
    label={`Relevant to: ${getContextLabel(context)}`}
    size="small"
    sx={{ mb: 1 }}
  />
)}

// Highlight context-relevant topics
{results.map((topic, index) => {
  const isContextRelevant = context && 
    (topic.id.includes(context) || 
     topic.keywords?.some(k => k.includes(context)));
  
  return (
    <ListItemButton
      sx={{
        ...(isContextRelevant && {
          borderLeft: '3px solid #00ED64',
          bgcolor: alpha('#00ED64', 0.05),
        }),
      }}
    >
      {/* ... */}
    </ListItemButton>
  );
})}
```

### 4. Semantic Search (Phase 2)

```typescript
// src/lib/help/semanticSearch.ts
import { generateQueryEmbedding } from '@/lib/rag/embeddings';
import { getPlatformDb } from '@/lib/platform/db';

// Index help topics (run once)
export async function indexHelpTopics() {
  const db = await getPlatformDb();
  const collection = db.collection('help_topic_embeddings');
  
  for (const [topicId, topic] of Object.entries(helpTopics)) {
    const text = `${topic.title} ${topic.description} ${topic.keywords?.join(' ')}`;
    const embedding = await generateQueryEmbedding(text);
    
    await collection.updateOne(
      { topicId },
      {
        $set: {
          topicId,
          embedding,
          title: topic.title,
          description: topic.description,
          indexedAt: new Date(),
        },
      },
      { upsert: true }
    );
  }
}

// Semantic search
export async function semanticSearchHelp(
  query: string,
  limit: number = 10
): Promise<Array<{ topicId: string; score: number }>> {
  const db = await getPlatformDb();
  const collection = db.collection('help_topic_embeddings');
  
  const queryEmbedding = await generateQueryEmbedding(query);
  
  // MongoDB Atlas Vector Search
  const results = await collection.aggregate([
    {
      $vectorSearch: {
        index: 'help_topics_vector_index',
        path: 'embedding',
        queryVector: queryEmbedding,
        numCandidates: limit * 10,
        limit: limit,
      },
    },
    {
      $addFields: {
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ]).toArray();
  
  return results.map(r => ({
    topicId: r.topicId,
    score: r.score,
  }));
}
```

---

## User Content Search (If We Do It)

### Separate Tab Approach

```typescript
// HelpSearchModal with tabs
<Tabs value={activeTab}>
  <Tab label="Help Topics" />
  <Tab label="Your Content" />
</Tabs>

{activeTab === 0 && (
  // Existing help search
)}

{activeTab === 1 && (
  <UserContentSearch
    organizationId={orgId}
    projectId={projectId}
    onSelectForm={(formId) => router.push(`/forms/${formId}`)}
    onSelectWorkflow={(workflowId) => router.push(`/workflows/${workflowId}`)}
  />
)}
```

### What to Search

**Forms:**
- Name, description
- Field labels, field types
- Form type (data-entry, search, conversational)

**Workflows:**
- Name, description
- Node types, trigger types
- Tags

**Applications:**
- Name, description
- Tags, category

### Privacy Considerations

- Only search user's own content (within their org)
- Respect access control
- Don't index sensitive data (connection strings, etc.)

---

## Decision Matrix

| Approach | Effort | Value | Risk | Recommendation |
|----------|--------|-------|------|----------------|
| Context-aware help | 2-3 days | High | Low | ✅ **Do this first** |
| Semantic search | 1 week | Medium | Low | ✅ **Do this second** |
| User content in help | 1 week | Medium | Medium | ⚠️ **Consider separate** |
| Full AI assistant | 2-3 weeks | High | High | ⏸️ **Future consideration** |

---

## Next Steps

1. **Implement context-aware help** (Phase 1)
   - Add context detection
   - Boost relevant topics
   - Show context hints in UI

2. **Evaluate results** - See if users find it helpful

3. **Consider semantic search** (Phase 2)
   - If Phase 1 is successful
   - Index help topics
   - Add hybrid search

4. **User content search** - Only if there's clear demand
   - Consider separate command palette instead
   - Keep help focused on documentation

---

## Questions to Answer

1. **Do users actually search for their own content in help?**
   - Analytics: Track what users search for
   - User interviews: Ask if they'd find this useful

2. **Would a separate command palette be better?**
   - `CMD+K` for content navigation
   - `CMD+/` for help/documentation
   - Clear separation of concerns

3. **Is semantic search worth it?**
   - Current keyword search might be sufficient
   - Test with real user queries first

---

## Conclusion

**Start with context-aware help** - it's low effort, high value, and addresses the discoverability issue without adding complexity.

**Consider semantic search** if context-aware help shows promise.

**Hold off on user content search** until we understand user needs better. Consider a separate command palette instead.
