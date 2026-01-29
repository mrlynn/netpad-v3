# AI Analytics & Centralization Guidelines

**Version**: 1.0
**Last Updated**: January 29, 2026
**Status**: ⚠️ MANDATORY for all AI/LLM operations

---

## Critical Principle: All AI Calls Must Be Tracked

**BLOCKING REQUIREMENT**: Every AI/LLM operation in NetPad MUST go through centralized analytics tracking to ensure visibility in the AI dashboard at `/admin/api-metrics`.

This is non-negotiable for:
- Budget monitoring and cost control
- Usage analytics and billing
- Performance monitoring
- Error tracking and debugging
- Feature adoption metrics

---

## Architecture Overview

NetPad uses a two-layer approach for AI operations:

```
┌─────────────────────────────────────────────────────────┐
│                    APPLICATION CODE                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────┐    ┌─────────────────────┐    │
│  │   aiService        │    │ TrackedEmbedding    │    │
│  │   (LLM calls)      │    │ Provider            │    │
│  │                    │    │ (Embeddings)        │    │
│  └────────┬───────────┘    └──────────┬──────────┘    │
│           │                           │                 │
│           └───────────┬───────────────┘                 │
│                       │                                  │
│                       ▼                                  │
│           ┌───────────────────────┐                     │
│           │   logAIRequest()      │ ◄── SINGLE ENTRY   │
│           │   (aiAnalytics.ts)    │     POINT FOR ALL  │
│           └───────────┬───────────┘     AI TRACKING    │
│                       │                                  │
│                       ▼                                  │
│           ┌───────────────────────┐                     │
│           │  AI Dashboard         │                     │
│           │  /admin/api-metrics   │                     │
│           └───────────────────────┘                     │
└─────────────────────────────────────────────────────────┘
```

---

## 1. LLM Calls (Chat Completions)

### ✅ Correct Pattern

Always use the centralized `aiService` singleton:

```typescript
import { aiService } from '@/lib/ai/aiService';
import { createAIContext } from '@/lib/ai/aiService';

// Create context for tracking
const context = createAIContext(
  userId,
  organizationId,
  'rag_conversational_forms', // Feature name
  '/api/rag/faqs' // Endpoint
);

// Streaming response
const { stream, getUsage } = await aiService.streamChat(context, messages);
for await (const chunk of stream) {
  // Process chunk
}
const usage = await getUsage(); // Tracked automatically!

// Non-streaming response
const result = await aiService.complete(context, messages, {
  responseFormat: { type: 'json_object' }
});
// Also tracked automatically!
```

### ❌ Anti-Patterns (DO NOT DO THIS)

```typescript
// ❌ WRONG: Direct OpenAI client usage
import OpenAI from 'openai';
const openai = new OpenAI();
const completion = await openai.chat.completions.create({...});
// NOT TRACKED - won't show in dashboard!

// ❌ WRONG: Direct provider usage
import { createDefaultProvider } from '@/lib/ai/providers/factory';
const provider = createDefaultProvider();
const stream = provider.streamChat(messages);
// NOT TRACKED - won't show in dashboard!

// ❌ WRONG: Hardcoded model names
const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini', // HARDCODED - breaks Ollama users!
  ...
});
```

### Key Files

- **Service**: [src/lib/ai/aiService.ts](../../src/lib/ai/aiService.ts)
- **Analytics**: [src/lib/ai/aiAnalytics.ts](../../src/lib/ai/aiAnalytics.ts)
- **Dashboard**: [src/app/admin/api-metrics/page.tsx](../../src/app/admin/api-metrics/page.tsx)

---

## 2. Embedding Calls (Text Embeddings)

### ✅ Correct Pattern

Always wrap embedding providers with `TrackedEmbeddingProvider`:

```typescript
import { createDefaultEmbeddingProvider } from '@/lib/ai/embeddings/factory';
import { createTrackedEmbeddingProvider } from '@/lib/ai/embeddings/tracked';

// Create tracked provider
const baseProvider = createDefaultEmbeddingProvider();
if (!baseProvider) {
  throw new Error('No embedding provider configured');
}

const trackedProvider = createTrackedEmbeddingProvider(baseProvider, {
  organizationId,
  userId,
  isGuest: false,
  feature: 'rag_conversational_forms',
  endpoint: '/api/rag/faqs',
});

// Generate embeddings (now tracked!)
const embedding = await trackedProvider.generateQueryEmbedding(query);
const embeddings = await trackedProvider.generateEmbeddings(texts);
```

### ❌ Anti-Patterns (DO NOT DO THIS)

```typescript
// ❌ WRONG: Direct untracked usage
import { generateQueryEmbedding } from '@/lib/rag/embeddings';
const embedding = await generateQueryEmbedding(query);
// NOT TRACKED - won't show in dashboard!

// ❌ WRONG: Direct provider usage
import { createDefaultEmbeddingProvider } from '@/lib/ai/embeddings/factory';
const provider = createDefaultEmbeddingProvider();
const embedding = await provider.generateQueryEmbedding(query);
// NOT TRACKED - won't show in dashboard!
```

### Key Files

- **Tracked Wrapper**: [src/lib/ai/embeddings/tracked.ts](../../src/lib/ai/embeddings/tracked.ts)
- **Provider Factory**: [src/lib/ai/embeddings/factory.ts](../../src/lib/ai/embeddings/factory.ts)
- **Base Interface**: [src/lib/ai/embeddings/base.ts](../../src/lib/ai/embeddings/base.ts)

---

## 3. Implementation Checklist

When adding ANY new AI feature, follow this checklist:

### For LLM Operations

- [ ] Import `aiService` from `@/lib/ai/aiService`
- [ ] Create `AIServiceContext` with `createAIContext()`
- [ ] Pass context to `aiService.streamChat()` or `aiService.complete()`
- [ ] NEVER import OpenAI or provider classes directly
- [ ] NEVER hardcode model names (use `config.model` or default)
- [ ] Test that requests appear in `/admin/api-metrics`

### For Embedding Operations

- [ ] Import `createDefaultEmbeddingProvider` from factory
- [ ] Import `createTrackedEmbeddingProvider` from tracked wrapper
- [ ] Wrap provider with tracking context
- [ ] Provide correct feature name and endpoint
- [ ] NEVER call `generateQueryEmbedding()` directly from `@/lib/rag/embeddings`
- [ ] Test that requests appear in `/admin/api-metrics`

### Testing Tracking

After implementing:

1. **Make a test request** through your new endpoint
2. **Check dashboard**: Navigate to `/admin/api-metrics` in your browser
3. **Verify data**:
   - Request appears in recent requests
   - Correct model name shown
   - Token usage recorded
   - Cost estimation displayed
   - Latency captured
   - Success/error status correct

---

## 4. Why This Matters

### Cost Control

Without centralized tracking:
- ❌ Can't monitor AI spending per organization
- ❌ Can't identify cost spikes or anomalies
- ❌ Can't forecast future costs
- ❌ Can't enforce usage limits

With centralized tracking:
- ✅ Real-time cost visibility by org, user, feature
- ✅ Anomaly detection for unusual spikes
- ✅ Accurate billing and tier enforcement
- ✅ Budget alerts and projections

### Performance Monitoring

- Track latency trends across providers (Ollama vs OpenAI vs OpenRouter)
- Identify slow operations that need optimization
- Monitor error rates and success rates
- Compare model performance (GPT-4 vs Claude vs local models)

### Feature Analytics

- Which features use the most tokens?
- Which organizations are power users?
- What's the adoption rate of new AI features?
- Which models are most popular?

### Debugging & Support

- Full audit trail of AI requests
- Error messages and codes logged
- Reproduce issues with request IDs
- Correlate issues with specific features or users

---

## 5. Current Implementation Status

### ✅ Tracked Operations

| Operation | Location | Status |
|-----------|----------|--------|
| Form generation | `/api/ai/generate-form` | ✅ Using `aiService` |
| Field generation | `/api/ai/generate-field` | ✅ Using `aiService` |
| Conversational chat | `/api/conversational/stream` | ✅ Using `aiService` |
| FAQ embeddings | `/api/rag/faqs` (POST) | ✅ Using `TrackedEmbeddingProvider` |
| Document embeddings | `/api/rag/documents/upload` | ⚠️ **NEEDS VERIFICATION** |
| Query embeddings | `/api/rag/retrieve` | ⚠️ **NEEDS VERIFICATION** |

### ⚠️ Operations Needing Review

The following files may need to be updated to use tracked embeddings:

- [ ] [src/app/api/rag/documents/upload/route.ts](../../src/app/api/rag/documents/upload/route.ts) - Document processing
- [ ] [src/app/api/rag/retrieve/route.ts](../../src/app/api/rag/retrieve/route.ts) - Query retrieval
- [ ] [src/app/api/rag/faqs/[faqId]/route.ts](../../src/app/api/rag/faqs/[faqId]/route.ts) - FAQ updates
- [ ] [src/app/api/rag/faqs/search/route.ts](../../src/app/api/rag/faqs/search/route.ts) - FAQ search

**Action Items**:
1. Audit all embedding calls in Phase 1
2. Update to use `TrackedEmbeddingProvider`
3. Verify tracking in dashboard

---

## 6. Future Phases: Requirements

### Phase 2: Form Intelligence (Rules Engine, Conversation Paths)

When implementing rules engine that uses AI:

```typescript
// ✅ CORRECT
const context = createAIContext(
  userId,
  organizationId,
  'form_intelligence_rules', // New feature name
  '/api/forms/[formId]/rules/evaluate'
);

const result = await aiService.complete(context, messages);
```

### Phase 3: Knowledge Chatbot

When implementing chatbot mode:

```typescript
// ✅ CORRECT - Chatbot Q&A
const context = createAIContext(
  userId,
  organizationId,
  'knowledge_chatbot_qa', // New feature name
  '/api/chatbot/[formId]/message'
);

// ✅ CORRECT - Chatbot embeddings for search
const trackedProvider = createTrackedEmbeddingProvider(baseProvider, {
  organizationId,
  userId,
  feature: 'knowledge_chatbot_qa',
  endpoint: '/api/chatbot/[formId]/message',
});
```

### Phase 4: Templates 2.0

All template-powered AI features must also be tracked.

---

## 7. Code Review Checklist

When reviewing PRs that add AI features:

### Required Questions

1. ✅ Does this use `aiService` for LLM calls?
2. ✅ Does this use `TrackedEmbeddingProvider` for embeddings?
3. ✅ Is the feature name descriptive and unique?
4. ✅ Is the endpoint path correct?
5. ✅ Are there any direct OpenAI/provider imports?
6. ✅ Are there any hardcoded model names?
7. ✅ Was tracking verified in `/admin/api-metrics`?

### Red Flags

- ❌ `import OpenAI from 'openai'` in application code
- ❌ `import { createDefaultProvider }` without tracking
- ❌ `generateQueryEmbedding()` called directly
- ❌ Hardcoded model strings like `'gpt-4o-mini'`
- ❌ No context object created
- ❌ PR description doesn't mention testing dashboard

---

## 8. Emergency Procedures

### If Tracking is Broken

**Symptoms**:
- Dashboard shows no recent requests
- Token counts are all zeros
- Costs not calculating

**Diagnosis**:
1. Check MongoDB connection to `ai_request_logs` collection
2. Check console for `[AI Analytics]` error messages
3. Verify `logAIRequest()` is being called (add console.log)
4. Check database indexes on `ai_request_logs`

**Quick Fix**:
```typescript
// Temporary: Add explicit logging to debug
import { logAIRequest } from '@/lib/ai/aiAnalytics';

// After AI call:
console.log('Logging AI request...');
await logAIRequest({...});
console.log('Logged successfully');
```

### If Costs are Inaccurate

**Problem**: Token estimates vs actual usage mismatch

**Solution**: Update pricing in [src/lib/ai/pricing.ts](../../src/lib/ai/pricing.ts)

OpenAI provides actual token usage in responses. For other providers (Ollama, OpenRouter), we estimate using ~4 chars/token.

---

## 9. Related Documentation

- **[aiService Implementation](../../src/lib/ai/aiService.ts)** - Main service class
- **[AI Analytics](../../src/lib/ai/aiAnalytics.ts)** - Logging and aggregation
- **[Pricing Calculator](../../src/lib/ai/pricing.ts)** - Cost estimation
- **[AI Types](../../src/types/ai-analytics.ts)** - TypeScript definitions
- **[Dashboard UI](../../src/app/admin/api-metrics/page.tsx)** - Admin interface

---

## 10. Version History

| Date | Version | Changes |
|------|---------|---------|
| Jan 29, 2026 | 1.0 | Initial guidelines created after Phase 1 FAQ implementation |

---

## Summary: The Golden Rules

1. **🔴 NEVER** import OpenAI, Anthropic, or provider classes directly in application code
2. **🔴 NEVER** call embedding functions without tracking wrapper
3. **🔴 NEVER** hardcode model names - use configuration
4. **🟢 ALWAYS** use `aiService` for LLM operations
5. **🟢 ALWAYS** use `TrackedEmbeddingProvider` for embeddings
6. **🟢 ALWAYS** verify tracking in `/admin/api-metrics` after implementation
7. **🟢 ALWAYS** include feature name and endpoint in tracking context

**When in doubt, ask**: "Will this show up in the AI dashboard?" If the answer is no, you're doing it wrong.

---

*This is a living document. Update it as new patterns emerge or requirements change.*
