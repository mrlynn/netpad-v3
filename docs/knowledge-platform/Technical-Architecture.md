# Knowledge Platform: Technical Architecture

**Version**: 1.0
**Date**: January 29, 2026
**Audience**: Engineering team

---

## Overview

This document describes the technical architecture of the NetPad Knowledge Platform, covering data models, API design, component structure, and integration points.

---

## System Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        NETPAD PLATFORM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────┐  ┌───────────────────┐                  │
│  │   FORM BUILDER    │  │ WORKFLOW EDITOR   │                  │
│  │   (Existing)      │  │   (Existing)      │                  │
│  └─────────┬─────────┘  └─────────┬─────────┘                  │
│            │                       │                            │
│            └───────────┬───────────┘                            │
│                        │                                        │
│            ┌───────────▼───────────┐                            │
│            │  KNOWLEDGE PLATFORM   │                            │
│            │  (NEW)                │                            │
│            ├───────────────────────┤                            │
│            │ • Knowledge Sources   │                            │
│            │   - Documents (RAG)   │                            │
│            │   - FAQs              │                            │
│            │   - Lookups           │                            │
│            │                       │                            │
│            │ • Intelligence Layer  │                            │
│            │   - Rules             │                            │
│            │   - Paths             │                            │
│            │                       │                            │
│            │ • Conversation Engine │                            │
│            │   - Form mode         │                            │
│            │   - Chatbot mode      │                            │
│            └───────────┬───────────┘                            │
│                        │                                        │
│            ┌───────────▼───────────┐                            │
│            │   DEPLOYMENT MODES    │                            │
│            ├───────────────────────┤                            │
│            │ • Traditional Form    │                            │
│            │ • Conversational Form │                            │
│            │ • Knowledge Chatbot   │                            │
│            └───────────────────────┘                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### 1. RAG Document Storage

**Collection**: `rag_documents`

```typescript
interface RAGDocument {
  _id: ObjectId;
  organizationId: string;
  formId: string;              // Associated form

  // Document metadata
  fileName: string;
  fileType: string;            // 'pdf', 'docx', 'txt', 'md'
  fileSize: number;            // Bytes
  uploadedBy: string;          // User ID
  uploadedAt: Date;

  // Storage
  storageProvider: 'platform' | 'user-cluster';
  blobUrl?: string;            // If stored in blob storage

  // Processing status
  status: 'pending' | 'processing' | 'ready' | 'error';
  processingError?: string;

  // Chunking results
  totalChunks: number;
  chunkIds: string[];          // References to chunk documents

  // Metadata
  tags?: string[];
  description?: string;

  createdAt: Date;
  updatedAt: Date;
}
```

**Collection**: `rag_document_chunks`

```typescript
interface RAGDocumentChunk {
  _id: ObjectId;
  organizationId: string;
  formId: string;
  documentId: string;          // Parent document

  // Chunk data
  chunkIndex: number;          // Position in document
  content: string;             // Text content
  embedding: number[];         // Vector embedding (1536 or 1024 dims)

  // Context
  previousChunk?: string;      // For context continuity
  nextChunk?: string;

  // Metadata (inherited from parent)
  fileName: string;
  fileType: string;
  pageNumber?: number;         // For PDFs

  createdAt: Date;
}
```

**Vector Search Index** (Atlas Search Index):
```json
{
  "name": "rag_vector_index",
  "type": "vectorSearch",
  "definition": {
    "fields": [
      {
        "type": "vector",
        "path": "embedding",
        "numDimensions": 1536,
        "similarity": "cosine"
      },
      {
        "type": "filter",
        "path": "formId"
      },
      {
        "type": "filter",
        "path": "documentId"
      }
    ]
  }
}
```

---

### 2. FAQ Knowledge Type

**Collection**: `rag_faqs`

```typescript
interface RAGFAQ {
  _id: ObjectId;
  organizationId: string;
  formId: string;

  // FAQ content
  question: string;
  answer: string;

  // Embeddings (for semantic search)
  questionEmbedding: number[];
  answerEmbedding: number[];

  // Metadata
  category?: string;
  tags?: string[];
  priority?: number;           // Higher = more important

  // Usage tracking
  timesRetrieved: number;
  lastRetrieved?: Date;

  // Management
  createdBy: string;           // User ID
  createdAt: Date;
  updatedAt: Date;
}
```

**Search Strategy**:
1. **Keyword match**: Exact/fuzzy match on question text
2. **Semantic match**: Vector similarity on questionEmbedding
3. **Ranking**: Combine keyword + semantic scores, prioritize by `priority` field

---

### 3. Rules Engine

**Collection**: `form_rules`

```typescript
interface FormRule {
  _id: ObjectId;
  formId: string;
  organizationId: string;

  // Rule configuration
  name: string;
  description?: string;
  priority: number;            // Higher = evaluated first
  enabled: boolean;

  // Trigger
  trigger: {
    type: 'keyword_detected' | 'field_value' | 'sentiment' | 'confidence_low' | 'always';
    config: {
      // For keyword_detected
      keywords?: string[];
      caseSensitive?: boolean;

      // For field_value
      field?: string;
      operator?: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'regex';
      value?: any;

      // For sentiment
      sentimentThreshold?: number;  // -1 to 1

      // For confidence_low
      confidenceThreshold?: number; // 0 to 1
    };
  };

  // Actions (executed in order)
  actions: Array<{
    type: 'inform' | 'warn' | 'suggest_value' | 'set_field' | 'route' | 'escalate';
    config: {
      // For inform, warn
      message?: string;

      // For suggest_value, set_field
      fieldId?: string;
      value?: any;

      // For route
      destination?: string;      // Workflow step ID or form section

      // For escalate
      escalationType?: 'human' | 'form' | 'workflow';
      notifyTeam?: boolean;
    };
  }>;

  // Analytics
  timesTriggered: number;
  lastTriggered?: Date;

  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Evaluation Engine**:
```typescript
async function evaluateRules(
  formId: string,
  context: {
    userMessage: string;
    formData: Record<string, any>;
    conversationHistory: Message[];
    sentiment?: number;
    confidence?: number;
  }
): Promise<Array<{ rule: FormRule; actions: Action[] }>> {
  // 1. Fetch rules for form (enabled only, sorted by priority desc)
  // 2. For each rule, evaluate trigger
  // 3. If trigger matches, collect actions
  // 4. Return matched rules with their actions
}
```

---

### 4. Conversation Paths

**Collection**: `conversation_paths`

```typescript
interface ConversationPath {
  _id: ObjectId;
  formId: string;
  organizationId: string;

  // Path configuration
  name: string;
  description?: string;
  enabled: boolean;

  // Activation (when to start this path)
  activation: {
    type: 'keyword' | 'semantic' | 'field_value' | 'manual';
    config: {
      // For keyword
      keywords?: string[];

      // For semantic (embedding similarity)
      semanticQuery?: string;
      semanticThreshold?: number; // 0-1

      // For field_value
      field?: string;
      operator?: string;
      value?: any;
    };
  };

  // Steps (ordered)
  steps: Array<{
    id: string;                // UUID
    type: 'question' | 'inform' | 'conditional';

    // For question type
    question?: string;
    required?: boolean;
    expectedType?: 'text' | 'number' | 'date' | 'boolean' | 'choice';
    choices?: string[];        // For choice type

    // For inform type
    message?: string;

    // For conditional type
    conditional?: {
      field: string;           // Field or variable to check
      operator: string;
      value: any;
      thenStep: string;        // Step ID to jump to if true
      elseStep?: string;       // Step ID to jump to if false
    };

    // Field mapping (extract data from answer)
    mapping?: {
      fieldId: string;         // Target form field
      extractionHint?: string; // Help AI extract correctly
      validator?: string;      // Optional validation rule
    };
  }>;

  // Analytics
  timesActivated: number;
  completionRate: number;      // % of times path completed successfully
  averageSteps: number;
  lastActivated?: Date;

  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Path Execution**:
```typescript
interface PathExecutionState {
  pathId: string;
  currentStep: string;         // Step ID
  completedSteps: string[];
  variables: Record<string, any>; // Collected data
  startedAt: Date;
  updatedAt: Date;
}
```

---

### 5. Deployment Configuration

**Embedded in Form Document**:

```typescript
interface Form {
  // ... existing form fields

  deploymentConfig?: {
    modes: {
      traditional: boolean;
      conversational: boolean;
      chatbot: boolean;
    };

    // Chatbot-specific configuration
    chatbot?: {
      persona: {
        name: string;          // "IT Support Bot"
        greeting: string;      // "Hi! How can I help?"
        personality: 'professional' | 'friendly' | 'casual';
        avatar?: string;       // URL or emoji
      };

      behavior: {
        primaryFunction: 'answer_questions' | 'guide_users' | 'triage';
        unknownHandling: 'admit' | 'suggest' | 'escalate';
        citeSources: boolean;
        maxTurnsBeforeEscalation?: number;
      };

      escalation: {
        triggers: Array<{
          type: 'user_request' | 'confidence_low' | 'sentiment_negative' | 'keyword' | 'max_turns';
          config: any;
        }>;
        action: 'show_form' | 'create_ticket' | 'notify_team';
        prefillFromConversation: boolean;
        transitionMessage?: string;
      };

      appearance?: {
        primaryColor?: string;
        position?: 'bottom-right' | 'bottom-left';
        size?: 'small' | 'medium' | 'large';
      };
    };
  };
}
```

---

## API Endpoints

### RAG Endpoints (Existing)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rag/documents/upload` | Upload document |
| GET | `/api/rag/documents` | List documents for form |
| GET | `/api/rag/documents/[documentId]` | Get document details |
| DELETE | `/api/rag/documents/[documentId]` | Delete document |
| POST | `/api/rag/retrieve` | Retrieve relevant chunks |
| POST | `/api/rag/admin/ensure-index` | Create vector index |
| GET | `/api/rag/admin/ensure-index` | Check index status |

### FAQ Endpoints (Phase 1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rag/faqs` | Create FAQ |
| GET | `/api/rag/faqs` | List FAQs for form |
| GET | `/api/rag/faqs/[faqId]` | Get FAQ details |
| PUT | `/api/rag/faqs/[faqId]` | Update FAQ |
| DELETE | `/api/rag/faqs/[faqId]` | Delete FAQ |
| POST | `/api/rag/faqs/retrieve` | Search FAQs (hybrid) |
| POST | `/api/rag/faqs/batch` | Bulk create FAQs |

### Rules Endpoints (Phase 2)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/forms/[formId]/rules` | Create rule |
| GET | `/api/forms/[formId]/rules` | List rules |
| GET | `/api/forms/[formId]/rules/[ruleId]` | Get rule details |
| PUT | `/api/forms/[formId]/rules/[ruleId]` | Update rule |
| DELETE | `/api/forms/[formId]/rules/[ruleId]` | Delete rule |
| POST | `/api/forms/[formId]/rules/[ruleId]/test` | Test rule with sample data |
| POST | `/api/forms/[formId]/rules/evaluate` | Evaluate all rules for context |

### Paths Endpoints (Phase 2)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/forms/[formId]/paths` | Create path |
| GET | `/api/forms/[formId]/paths` | List paths |
| GET | `/api/forms/[formId]/paths/[pathId]` | Get path details |
| PUT | `/api/forms/[formId]/paths/[pathId]` | Update path |
| DELETE | `/api/forms/[formId]/paths/[pathId]` | Delete path |
| POST | `/api/forms/[formId]/paths/detect` | Detect which path to activate |
| POST | `/api/forms/[formId]/paths/[pathId]/test` | Test path execution |

### Conversation Endpoints (Enhanced)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/conversational/stream` | Stream conversation response (existing, enhanced) |
| POST | `/api/conversational/extract-fields` | Extract fields from conversation (new) |
| GET | `/api/conversational/[sessionId]/context` | Get full conversation context (new) |
| POST | `/api/conversational/escalate` | Trigger escalation flow (new) |

---

## Component Architecture

### Frontend Components

```
src/components/
├── FormBuilder/                    # Existing form builder
│   ├── FieldDetailPanel.tsx
│   ├── FormBuilder.tsx
│   └── ...
│
├── RAG/                            # RAG UI components (existing)
│   ├── ClusterSetupWizard.tsx
│   ├── DocumentAttachmentPanel.tsx
│   ├── StorageModeSettings.tsx
│   └── UsageDashboard.tsx
│
├── Knowledge/                      # NEW - Phase 1
│   ├── KnowledgeTab.tsx           # Unified knowledge view
│   ├── FAQManager.tsx             # FAQ CRUD UI
│   ├── FAQList.tsx
│   ├── FAQEditor.tsx
│   └── DocumentList.tsx           # Enhanced with FAQs
│
├── Intelligence/                   # NEW - Phase 2
│   ├── RulesTab.tsx               # Rules management
│   ├── RulesList.tsx
│   ├── RuleEditor.tsx
│   ├── RuleTester.tsx
│   ├── PathsTab.tsx               # Paths management
│   ├── PathsList.tsx
│   ├── PathEditor.tsx             # Visual flow editor
│   └── PathTester.tsx
│
├── Chatbot/                        # NEW - Phase 3
│   ├── ChatbotDeployTab.tsx       # Deployment configuration
│   ├── ChatbotPersonaEditor.tsx
│   ├── ChatbotBehaviorEditor.tsx
│   ├── ChatbotEscalationEditor.tsx
│   ├── ChatbotAppearanceEditor.tsx
│   ├── ChatbotAnalytics.tsx
│   └── EmbedWidgetConfig.tsx
│
└── ConversationalForm/             # Existing, enhanced
    ├── ConversationalForm.tsx     # Support both form + chatbot modes
    ├── ChatInterface.tsx
    ├── MessageBubble.tsx
    ├── SourceCitation.tsx         # NEW - Phase 3
    └── EscalationPrompt.tsx       # NEW - Phase 3
```

---

## Conversation Engine Modes

### Mode: Conversational Form (Existing, Enhanced)

**Goal**: Collect structured data via conversation

**System Prompt Template**:
```
You are a helpful assistant collecting information for a form.

FORM FIELDS TO COLLECT:
{{formFields}}

KNOWLEDGE BASE:
{{retrievedKnowledge}}

RULES:
{{activeRules}}

ACTIVE PATH:
{{activePath}}

INSTRUCTIONS:
1. Ask questions to collect the required form fields
2. Use knowledge base to answer questions
3. Follow active conversation path if one is triggered
4. Apply rules when triggered
5. Be conversational and helpful
6. Extract field values from natural language responses
7. Confirm collected data before submission

CURRENT CONVERSATION:
{{conversationHistory}}

USER MESSAGE: {{userMessage}}
```

**Context Assembly**:
1. Retrieve relevant knowledge (docs + FAQs)
2. Evaluate rules → get triggered rules
3. Detect/continue active path → get current step
4. Assemble system prompt with all context
5. Call LLM with streaming

**Field Extraction**:
```typescript
async function extractFieldsFromMessage(
  message: string,
  formFields: FormField[],
  conversationHistory: Message[]
): Promise<Record<string, any>> {
  // Use LLM to extract field values from natural language
  // Return { fieldId: extractedValue }
}
```

---

### Mode: Knowledge Chatbot (NEW - Phase 3)

**Goal**: Answer questions, optionally escalate to form

**System Prompt Template**:
```
You are {{botName}}, a {{personality}} assistant.

PRIMARY FUNCTION: {{primaryFunction}}

KNOWLEDGE BASE:
{{retrievedKnowledge}}

RULES:
{{activeRules}}

INSTRUCTIONS:
1. Answer questions using the knowledge base
2. Cite sources when providing information
3. If you don't know, {{unknownHandling}}
4. Watch for escalation triggers
5. Be {{personality}} in tone

ESCALATION TRIGGERS:
{{escalationTriggers}}

CURRENT CONVERSATION:
{{conversationHistory}}

USER MESSAGE: {{userMessage}}
```

**Context Assembly**:
1. Retrieve relevant knowledge (docs + FAQs)
2. Evaluate rules → check for escalation triggers
3. Assemble system prompt (NO form fields, NO active path)
4. Call LLM with streaming
5. If escalation triggered → transition to form mode

**Source Citations**:
```typescript
interface CitedResponse {
  message: string;
  sources: Array<{
    type: 'document' | 'faq';
    title: string;
    excerpt: string;
    score: number;
  }>;
}
```

**Escalation Flow**:
1. Detect escalation trigger (rule, sentiment, user request)
2. Show transition message
3. Extract fields from conversation history
4. Pre-fill form with extracted data
5. Switch to conversational form mode

---

## Retrieval Strategy

### Knowledge Retrieval Pipeline

```typescript
async function retrieveKnowledge(
  formId: string,
  query: string,
  mode: 'form' | 'chatbot',
  options?: {
    maxDocChunks?: number;
    maxFAQs?: number;
    minScore?: number;
  }
): Promise<{
  faqs: RAGFAQ[];
  docChunks: RAGDocumentChunk[];
  totalScore: number;
}> {
  // 1. Search FAQs (hybrid: keyword + semantic)
  const faqs = await searchFAQs(formId, query, options?.maxFAQs || 3);

  // 2. Search document chunks (vector search)
  const docChunks = await searchDocumentChunks(
    formId,
    query,
    options?.maxDocChunks || 5
  );

  // 3. Combine and rank
  // Priority: FAQs > doc chunks (FAQs are curated, higher quality)

  // 4. Filter by minimum score
  const filtered = filterByScore([...faqs, ...docChunks], options?.minScore || 0.7);

  return {
    faqs: filtered.filter(r => r.type === 'faq'),
    docChunks: filtered.filter(r => r.type === 'doc'),
    totalScore: calculateCombinedScore(filtered),
  };
}
```

### Retrieval by Mode

| Mode | Primary Retrieval | Secondary | Goal |
|------|-------------------|-----------|------|
| **Traditional Form** | Rules (validation) | Knowledge (field help) | Data validity |
| **Conversational Form** | Paths → Rules → Knowledge | Document RAG | Data collection |
| **Knowledge Chatbot** | Knowledge (FAQs + Docs) | Rules (escalation) | Question resolution |

---

## Embedding Strategy

### Embedding Providers

**Priority**: Atlas Embedding API → Voyage AI → OpenAI

**Configuration**:
```typescript
// src/lib/ai/embeddings/factory.ts
export async function getEmbeddingProvider(): Promise<EmbeddingProvider> {
  // Try Atlas Embedding API first (free, no quota)
  if (process.env.ATLAS_EMBEDDING_ENABLED === 'true') {
    return new AtlasEmbeddingProvider();
  }

  // Fallback to Voyage AI
  if (process.env.VOYAGE_API_KEY) {
    return new VoyageEmbeddingProvider();
  }

  // Fallback to OpenAI
  if (process.env.OPENAI_API_KEY) {
    return new OpenAIEmbeddingProvider();
  }

  throw new Error('No embedding provider configured');
}
```

**Dimensions**:
- OpenAI: 1536
- Voyage AI: 1024
- Atlas Embedding API: 1024

**Note**: Vector index must match embedding dimensions.

---

## Performance Considerations

### Caching Strategy

```typescript
// Cache retrieval results for 5 minutes
const RETRIEVAL_CACHE_TTL = 5 * 60 * 1000;

const retrievalCache = new Map<string, {
  result: any;
  timestamp: number;
}>();

async function cachedRetrieve(
  formId: string,
  query: string,
  mode: string
): Promise<any> {
  const cacheKey = `${formId}:${query}:${mode}`;
  const cached = retrievalCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < RETRIEVAL_CACHE_TTL) {
    return cached.result;
  }

  const result = await retrieveKnowledge(formId, query, mode);
  retrievalCache.set(cacheKey, { result, timestamp: Date.now() });

  return result;
}
```

### Batch Operations

When processing multiple documents:
```typescript
// Process chunks in batches of 10
async function batchProcessChunks(chunks: string[]): Promise<void> {
  const BATCH_SIZE = 10;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(chunk => processChunk(chunk)));
  }
}
```

### Index Optimization

**Compound Indexes**:
```javascript
// For FAQ retrieval
db.rag_faqs.createIndex({ formId: 1, createdAt: -1 });
db.rag_faqs.createIndex({ formId: 1, category: 1 });

// For rules evaluation
db.form_rules.createIndex({ formId: 1, enabled: 1, priority: -1 });

// For paths detection
db.conversation_paths.createIndex({ formId: 1, enabled: 1 });
```

---

## Security Considerations

### Data Isolation

**Organizational Isolation**:
- All queries filtered by `organizationId`
- All queries filtered by `formId` where applicable
- Vector search includes `formId` filter

**Example**:
```typescript
// BAD - No filter
const chunks = await collection.aggregate([
  {
    $vectorSearch: {
      index: 'rag_vector_index',
      queryVector: embedding,
      path: 'embedding',
      numCandidates: 100,
      limit: 5,
    },
  },
]);

// GOOD - Filtered by formId
const chunks = await collection.aggregate([
  {
    $vectorSearch: {
      index: 'rag_vector_index',
      queryVector: embedding,
      path: 'embedding',
      numCandidates: 100,
      limit: 5,
      filter: { formId: userFormId },
    },
  },
]);
```

### Sensitive Data

**Do NOT embed/store**:
- Passwords
- API keys
- PII without explicit consent
- Credit card numbers

**Implement**:
- Content sanitization before embedding
- PII detection (regex patterns)
- Redaction for sensitive fields

---

## Testing Strategy

### Unit Tests

```typescript
// Test rule evaluation
describe('Rules Engine', () => {
  test('keyword trigger matches', async () => {
    const rule = createKeywordRule(['password', 'reset']);
    const result = await evaluateRule(rule, {
      userMessage: 'I need to reset my password',
      formData: {},
      conversationHistory: [],
    });
    expect(result.matched).toBe(true);
  });
});

// Test path detection
describe('Conversation Paths', () => {
  test('semantic activation detects hardware request', async () => {
    const path = createHardwareRequestPath();
    const result = await detectPath(path, 'My laptop is broken');
    expect(result.shouldActivate).toBe(true);
  });
});

// Test FAQ retrieval
describe('FAQ Retrieval', () => {
  test('hybrid search ranks exact match higher', async () => {
    const results = await searchFAQs(formId, 'password reset');
    expect(results[0].question).toContain('password reset');
  });
});
```

### Integration Tests

```typescript
// Test end-to-end conversation flow
describe('Conversational Form', () => {
  test('collects fields and triggers workflow', async () => {
    const session = await startConversation(formId);

    await sendMessage(session, 'I need a new laptop');
    await sendMessage(session, 'MacBook Pro');
    await sendMessage(session, 'Engineering department');

    const formData = await getFormData(session);
    expect(formData.hardwareType).toBe('laptop');
    expect(formData.model).toBe('MacBook Pro');
    expect(formData.department).toBe('Engineering');
  });
});
```

---

## Monitoring & Observability

### Key Metrics

**RAG Performance**:
- Retrieval latency (p50, p95, p99)
- Embedding generation time
- Vector search query time
- Cache hit rate

**Conversation Quality**:
- Average conversation length (turns)
- Form completion rate
- Field extraction accuracy
- Escalation rate (chatbot → form)

**Knowledge Quality**:
- FAQ retrieval rate (% of queries using FAQs)
- Document retrieval rate
- Average retrieval score
- Zero-result queries

**Rules & Paths**:
- Rule trigger rate
- Path activation rate
- Path completion rate
- Average path length

### Logging

```typescript
// Structured logging for debugging
logger.info('RAG retrieval', {
  formId,
  query,
  mode,
  faqCount: results.faqs.length,
  docChunkCount: results.docChunks.length,
  totalScore: results.totalScore,
  latency: retrievalTime,
});

logger.info('Rule triggered', {
  formId,
  ruleId,
  ruleName: rule.name,
  trigger: rule.trigger.type,
  actions: rule.actions.map(a => a.type),
});

logger.info('Path activated', {
  formId,
  pathId,
  pathName: path.name,
  trigger: path.activation.type,
});
```

---

## Migration Plan

### Phase 0 → Phase 1

**Database Migrations**:
- Create `rag_faqs` collection
- Add indexes for FAQ retrieval
- Update organizations with usage tracking fields

**Code Changes**:
- Add FAQ API endpoints
- Add FAQ management UI components
- Integrate FAQ retrieval into conversation engine

**Testing**:
- Test FAQ CRUD operations
- Test hybrid search (keyword + semantic)
- Test FAQ priority over doc chunks

### Phase 1 → Phase 2

**Database Migrations**:
- Create `form_rules` collection
- Create `conversation_paths` collection
- Add indexes for rules/paths queries

**Code Changes**:
- Add rules engine
- Add path detection/execution
- Add rules/paths management UI
- Update conversation engine to use rules + paths

**Testing**:
- Test rule evaluation with various triggers
- Test path activation and execution
- Test field extraction from conversation

### Phase 2 → Phase 3

**Database Migrations**:
- Add `deploymentConfig` field to forms
- Add `chatbot_analytics` collection

**Code Changes**:
- Add chatbot mode to conversation engine
- Add escalation flow logic
- Add chatbot configuration UI
- Build embed widget

**Testing**:
- Test chatbot Q&A mode
- Test escalation triggers
- Test conversation → form handoff
- Test embed widget integration

---

## Questions & Decisions

### Open Questions

1. **Path Editor UI**: Form-based or visual (ReactFlow)?
   - **Decision**: Start with form-based (Phase 2), iterate to visual editor post-launch

2. **Reranking**: Add reranking layer for retrieval?
   - **Decision**: Monitor retrieval quality; add if needed in Phase 1

3. **Conversation Memory**: How long to retain conversation history?
   - **Decision**: 7 days for active sessions, 30 days archived

4. **Embedding Cache**: Cache embeddings for common queries?
   - **Decision**: Yes, cache with 24-hour TTL

### Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| FAQs prioritized over doc chunks | Curated FAQs are higher quality than auto-chunked docs |
| Rules evaluated before paths | Rules are simpler, faster; check first |
| Conversation context includes full history | LLMs need full context for coherent responses |
| Vector index per organization | Better isolation, simpler queries |
| Embed widget as standalone JS | Easy integration, no framework dependencies |

---

## References

- [MongoDB Atlas Vector Search Documentation](https://www.mongodb.com/docs/atlas/atlas-vector-search/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Material-UI Components](https://mui.com/material-ui/)
- [ReactFlow (for Path Editor)](https://reactflow.dev/)

---

*Last updated: January 29, 2026*
