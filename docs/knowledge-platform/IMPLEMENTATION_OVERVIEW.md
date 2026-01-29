# Knowledge Platform Implementation Overview

**Vision**: Build once, deploy three ways (Traditional Forms → Conversational Forms → Knowledge Chatbots)

**Total Timeline**: 22 weeks (January 27 - June 27, 2026)

---

## ⚠️ Critical Implementation Requirement

**MANDATORY**: All phases must follow the [AI Analytics & Centralization Guidelines](./AI-Analytics-Guidelines.md).

- Every AI/LLM operation must use `aiService`
- Every embedding operation must use `TrackedEmbeddingProvider`
- All requests must be visible in the AI dashboard at `/admin/api-metrics`
- Code reviews must verify tracking compliance

**Why**: Cost control, usage monitoring, billing accuracy, and performance tracking depend on centralized analytics.

---

## Executive Summary

This document provides a consolidated view of the NetPad Knowledge Platform implementation. The platform enables organizations to create forms once and deploy them in three distinct modes, all powered by a unified knowledge base, rules engine, and MongoDB Vector Search.

### The Three Deployment Modes

```
┌─────────────────────────────────────────────────────────┐
│        ONE FORM → THREE DEPLOYMENT MODES                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📝 TRADITIONAL FORM                                    │
│     Field-based UI • Power users • Bulk entry          │
│                                                         │
│  💬 CONVERSATIONAL FORM                                 │
│     AI-guided • Rules + Paths • Data collection        │
│                                                         │
│  🤖 KNOWLEDGE CHATBOT                                   │
│     Q&A support • Ticket deflection • Escalation       │
│                                                         │
│  All powered by:                                        │
│  • Unified Knowledge Base (Docs + FAQs)                │
│  • Rules Engine (If/Then logic)                        │
│  • Conversation Paths (Guided flows)                   │
│  • MongoDB Vector Search                               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Complete Timeline

| Phase | Duration | Dates | Status | Key Deliverables |
|-------|----------|-------|--------|------------------|
| **Phase 0** | 2 weeks | Jan 27 - Feb 7 | ✅ Complete | RAG unblocked, vector index created |
| **Phase 1** | 6 weeks | Feb 10 - Mar 21 | 📋 Ready | Usage limits, FAQs, Knowledge UI |
| **Phase 2** | 7 weeks | Mar 24 - May 9 | 📋 Planned | Rules engine, Conversation paths |
| **Phase 3** | 4 weeks | May 12 - Jun 6 | 📋 Planned | Chatbot mode, Escalation |
| **Phase 4** | 3 weeks | Jun 9 - Jun 27 | 📋 Planned | Templates 2.0, Market launch |

**Total**: 22 weeks from start to market launch

---

## Phase Breakdown

### Phase 0: RAG Foundation (✅ COMPLETE)

**Duration**: 2 weeks (Jan 27 - Feb 7, 2026)

**Status**: ✅ Complete - RAG is fully operational

**Completed Deliverables**:
- Vector search index created programmatically (1024 dimensions, cosine similarity)
- Document storage with chunking (500-1000 tokens, 100 token overlap)
- Embedding generation via Atlas Embedding API
- Retrieval working with 0.77+ relevance scores
- Storage provider architecture for multi-tenant isolation
- Usage tracking foundation

**Technical Validation**:
```bash
# Index verification
./scripts/rag/create-index.sh org_SxfbnHiW8-7MuZaa
# Status: READY ✓

# Retrieval test
npx tsx scripts/rag/test-rag-retrieval.ts
# Results: 0.7724, 0.7733, 0.7261 relevance scores ✓
```

**Key Files**:
- [RAG-Phase-1-Complete.md](./RAG-Phase-1-Complete.md) - Detailed completion report
- [Production-Index-Creation.md](./Production-Index-Creation.md) - Scaling strategies

---

### Phase 1: Knowledge Foundation (📋 Ready)

**Duration**: 6 weeks (Feb 10 - Mar 21, 2026)

**Goal**: Add usage tracking, FAQs, and unified Knowledge Tab UI

**Key Deliverables**:
1. **Usage Tracking & Tier Limits** (2 weeks)
   - Track documents, chunks, queries per organization
   - Enforce tier-based limits (Free: 10 docs, Pro: 100 docs, Team: 500 docs)
   - Usage dashboard in UI

2. **FAQ Knowledge Type** (2 weeks)
   - Hybrid search: keyword + semantic vector search
   - Q&A pair management UI
   - Integration with conversational forms

3. **Knowledge Tab UI** (2 weeks)
   - Unified interface for Documents + FAQs
   - Drag-and-drop document upload
   - FAQ creation/editing
   - Search/filtering

**Effort**: ~120 hours (developer + QA)

**Full Details**: [Phase-1-Knowledge-Foundation.md](./Phase-1-Knowledge-Foundation.md)

---

### Phase 2: Form Intelligence (📋 Planned)

**Duration**: 7 weeks (Mar 24 - May 9, 2026)

**Goal**: Add rules engine and conversation paths for intelligent forms

**Key Deliverables**:
1. **Rules Engine** (4 weeks)
   - Trigger types: keyword_detected, field_value, sentiment, confidence_low, always
   - Actions: show_message, collect_field, change_path, escalate, set_variable
   - Priority-based rule execution
   - Rules editor UI

2. **Conversation Paths** (3 weeks)
   - Define question sequences
   - Branching based on answers
   - Field extraction from natural language
   - Path visualization UI

**Example Rule**:
```typescript
{
  "trigger": {
    "type": "keyword_detected",
    "config": { "keywords": ["urgent", "emergency"], "matchAny": true }
  },
  "actions": [
    { "type": "set_variable", "config": { "name": "priority", "value": "high" } },
    { "type": "show_message", "config": { "message": "I see this is urgent..." } }
  ]
}
```

**Effort**: ~160 hours

**Full Details**: [Phase-2-Form-Intelligence.md](./Phase-2-Form-Intelligence.md)

---

### Phase 3: Knowledge Chatbot (📋 Planned)

**Duration**: 4 weeks (May 12 - Jun 6, 2026)

**Goal**: Enable chatbot deployment mode with escalation

**Key Deliverables**:
1. **Chatbot Deployment Mode** (2 weeks)
   - Distinct mode selection: form vs. chatbot
   - Chatbot configuration (persona, behavior)
   - Dedicated chatbot canvas
   - Public chatbot endpoints (no auth)

2. **Escalation System** (1 week)
   - Detect when chatbot should hand off to form
   - Prefill form fields from conversation context
   - Smooth transition UI

3. **Embed Widget** (1 week)
   - Embeddable chatbot widget for websites
   - Customizable appearance
   - Analytics integration

**Chatbot Config Example**:
```typescript
{
  "persona": {
    "name": "Support Assistant",
    "greeting": "Hi! How can I help you today?",
    "personality": "friendly"
  },
  "behavior": {
    "primaryFunction": "answer_questions",
    "unknownHandling": "admit",
    "citeSources": true
  },
  "escalation": {
    "triggers": [
      { "type": "explicit_request", "keywords": ["talk to human", "submit form"] },
      { "type": "repeated_confusion", "threshold": 3 }
    ],
    "action": "show_form",
    "prefillFromConversation": true
  }
}
```

**Effort**: ~80 hours

**Full Details**: [Phase-3-Knowledge-Chatbot.md](./Phase-3-Knowledge-Chatbot.md)

---

### Phase 4: Templates 2.0 & Launch (📋 Planned)

**Duration**: 3 weeks (Jun 9 - Jun 27, 2026)

**Goal**: Package as templates, polish, and launch

**Key Deliverables**:
1. **Knowledge-Powered Templates** (1 week)
   - Update existing templates with knowledge configurations
   - Create new templates (IT Help Desk, Employee Onboarding, Customer Support)
   - Each template includes pre-configured FAQs, rules, and conversation paths

2. **Documentation & Marketing** (1 week)
   - Complete user guides
   - Video tutorials
   - Case studies
   - Blog posts announcing the platform

3. **Launch Preparation** (1 week)
   - Beta testing with existing customers
   - Performance optimization
   - Final QA pass
   - Marketing campaign launch

**Effort**: ~60 hours

---

## Technical Architecture

### Data Models

The platform introduces several new collections and schema changes:

#### RAG Documents
```typescript
interface RAGDocument {
  _id: ObjectId;
  documentId: string;
  organizationId: string;
  formId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: Date;
  uploadedBy: string;
  status: 'processing' | 'ready' | 'failed';
  chunkCount: number;
  metadata: {
    title?: string;
    description?: string;
    tags?: string[];
    source?: string;
  };
}
```

#### FAQ Knowledge
```typescript
interface RAGFaq {
  _id: ObjectId;
  faqId: string;
  organizationId: string;
  formId: string;
  question: string;
  answer: string;
  keywords: string[];
  embedding: number[];
  category?: string;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
}
```

#### Form Rules
```typescript
interface FormRule {
  _id: ObjectId;
  formId: string;
  organizationId: string;
  name: string;
  priority: number;
  enabled: boolean;
  trigger: {
    type: 'keyword_detected' | 'field_value' | 'sentiment' | 'confidence_low' | 'always';
    config: Record<string, any>;
  };
  actions: RuleAction[];
}
```

#### Conversation Paths
```typescript
interface ConversationPath {
  _id: ObjectId;
  pathId: string;
  formId: string;
  organizationId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  steps: PathStep[];
  branches: PathBranch[];
}
```

#### Chatbot Config
```typescript
interface ChatbotConfig {
  persona: {
    name: string;
    greeting: string;
    personality: 'professional' | 'friendly' | 'casual';
  };
  behavior: {
    primaryFunction: 'answer_questions' | 'guide_users' | 'triage';
    unknownHandling: 'admit' | 'suggest' | 'escalate';
    citeSources: boolean;
  };
  escalation: {
    triggers: EscalationTrigger[];
    action: 'show_form' | 'create_ticket' | 'notify_team';
    prefillFromConversation: boolean;
  };
}
```

**Full Details**: [Technical-Architecture.md](./Technical-Architecture.md)

---

## Key API Endpoints

### Phase 1 APIs
```
POST   /api/rag/documents/upload      # Upload documents
GET    /api/rag/documents              # List documents
DELETE /api/rag/documents/:id          # Delete document
POST   /api/rag/faqs                   # Create FAQ
GET    /api/rag/faqs                   # List FAQs
PATCH  /api/rag/faqs/:id               # Update FAQ
DELETE /api/rag/faqs/:id               # Delete FAQ
GET    /api/rag/usage                  # Get usage stats
```

### Phase 2 APIs
```
POST   /api/forms/:id/rules            # Create rule
GET    /api/forms/:id/rules            # List rules
PATCH  /api/forms/:id/rules/:ruleId    # Update rule
DELETE /api/forms/:id/rules/:ruleId    # Delete rule
POST   /api/forms/:id/paths            # Create path
GET    /api/forms/:id/paths            # List paths
PATCH  /api/forms/:id/paths/:pathId    # Update path
```

### Phase 3 APIs
```
GET    /api/chatbot/:formId/config     # Get chatbot config
PATCH  /api/chatbot/:formId/config     # Update config
POST   /api/chatbot/:formId/message    # Send message (public)
GET    /api/chatbot/:formId/widget.js  # Embed script
POST   /api/chatbot/:formId/escalate   # Trigger escalation
```

---

## Resource Requirements

### Development Team
- **Lead Engineer**: Full-stack, MongoDB + React expertise
- **Frontend Engineer**: React, MUI, form builders
- **Backend Engineer**: MongoDB, Node.js, AI/LLM integration
- **QA Engineer**: Testing, validation, acceptance criteria

### Tools & Services
- **MongoDB Atlas**: M10+ cluster for production vector search
- **Atlas Embedding API**: Text embedding generation (1024 dimensions)
- **LLM Provider**: OpenAI, Anthropic, or Ollama for conversational logic
- **Blob Storage**: For document uploads (GridFS or S3)

### Estimated Effort
- **Phase 0**: ✅ 40 hours (complete)
- **Phase 1**: 120 hours (6 weeks)
- **Phase 2**: 160 hours (7 weeks)
- **Phase 3**: 80 hours (4 weeks)
- **Phase 4**: 60 hours (3 weeks)
- **Total**: ~460 hours (22 weeks with QA, testing, polish)

---

## Success Metrics

### Phase 1 Success Criteria
- Usage tracking accurately reflects document/query counts
- Tier limits enforced correctly (free users blocked at 10 docs)
- FAQs return relevant results with hybrid search
- Knowledge Tab UI allows document + FAQ management

### Phase 2 Success Criteria
- Rules execute in correct priority order
- All trigger types work (keyword, field value, sentiment, confidence)
- Conversation paths guide users through multi-step flows
- Field extraction accurately populates form fields from conversation

### Phase 3 Success Criteria
- Chatbot mode deploys as standalone Q&A interface
- Escalation seamlessly transitions from chatbot to form
- Embed widget works on external websites
- Analytics track chatbot usage and escalation rates

### Platform-Wide Success Metrics
- **Time to first knowledge-powered form**: <30 minutes
- **Chatbot answer accuracy**: >80% (based on RAG relevance scores)
- **Escalation rate**: <20% (chatbot can answer most questions)
- **Template adoption**: 50%+ of new forms use knowledge templates

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Vector search index creation fails at scale | High | Programmatic index creation with retry logic, monitoring |
| Embedding API rate limits hit | Medium | Implement queueing, batch processing, caching |
| Rules engine becomes too complex for users | Medium | Start with simple triggers/actions, add complexity incrementally |
| Chatbot escalation feels jarring | Medium | Smooth transition UI, context prefilling, user testing |
| Performance degrades with large knowledge bases | High | Implement pagination, lazy loading, index optimization |

---

## Next Steps

### Immediate Actions (Phase 1 Start)
1. ✅ Phase 0 complete - RAG foundation verified
2. 📋 Begin Phase 1, Week 1: Usage tracking backend implementation
3. Set up monitoring for vector search performance
4. Create initial UI mockups for Knowledge Tab

### Phase 1 Kick-Off Checklist
- [ ] Usage tracking schema finalized ([Technical-Architecture.md](./Technical-Architecture.md))
- [ ] Tier limits defined in config ([src/lib/rag/config.ts](../../src/lib/rag/config.ts))
- [ ] FAQ schema designed with hybrid search support
- [ ] Knowledge Tab wireframes approved
- [ ] Testing strategy defined (22 test cases + 7 user journeys)

---

## Documentation Index

### Phase Execution Plans
- [Phase-0-RAG-Foundation.md](./Phase-0-RAG-Foundation.md) - ✅ Complete
- [Phase-1-Knowledge-Foundation.md](./Phase-1-Knowledge-Foundation.md) - 📋 Ready to start
- [Phase-2-Form-Intelligence.md](./Phase-2-Form-Intelligence.md) - 📋 Planned
- [Phase-3-Knowledge-Chatbot.md](./Phase-3-Knowledge-Chatbot.md) - 📋 Planned

### Technical Documentation
- [Technical-Architecture.md](./Technical-Architecture.md) - Data models, APIs, components
- [Production-Index-Creation.md](./Production-Index-Creation.md) - Scaling vector search

### Progress Reports
- [RAG-Phase-1-Complete.md](./RAG-Phase-1-Complete.md) - Phase 0 completion validation

### Strategic Context
- [../strategic/NetPad_Knowledge_platform_roadmap.md](../strategic/NetPad_Knowledge_platform_roadmap.md) - Product vision

---

## Questions & Support

**For engineering questions**: See [Technical-Architecture.md](./Technical-Architecture.md)

**For timeline/scope questions**: See phase execution plans (Phase-1, Phase-2, Phase-3)

**For strategic context**: See [../strategic/NetPad_Knowledge_platform_roadmap.md](../strategic/NetPad_Knowledge_platform_roadmap.md)

---

*Last updated: January 29, 2026*
