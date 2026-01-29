# Knowledge Platform: RAG, Chatbot & Intelligence

**Overview**: This folder contains all documentation for NetPad's Knowledge Platform initiative - the system that powers "Build once, deploy three ways" (Traditional Forms → Conversational Forms → Knowledge Chatbots).

---

## ⚠️ Critical Guidelines

**MANDATORY READING** before implementing any AI features:

- **[AI-Analytics-Guidelines.md](./AI-Analytics-Guidelines.md)** - ⚠️ **BLOCKING REQUIREMENT**
  - All AI/LLM calls MUST be tracked through centralized analytics
  - All embedding operations MUST use `TrackedEmbeddingProvider`
  - Code review checklist and anti-patterns
  - Testing procedures for dashboard visibility at `/admin/api-metrics`

**Why This Matters**: Without proper tracking, AI costs are invisible, billing breaks, and the admin dashboard shows incomplete data.

---

## Quick Navigation

### 🎯 Start Here
- **[../strategic/NetPad_Knowledge_platform_roadmap.md](../strategic/NetPad_Knowledge_platform_roadmap.md)** - Product vision & competitive positioning
- **[IMPLEMENTATION_OVERVIEW.md](./IMPLEMENTATION_OVERVIEW.md)** - Complete implementation timeline (22 weeks)

### 📋 Phase Execution Plans
- **[Phase-0-RAG-Foundation.md](./Phase-0-RAG-Foundation.md)** - ✅ COMPLETE: Vector search index, RAG unblocked
- **[Phase-1-Knowledge-Foundation.md](./Phase-1-Knowledge-Foundation.md)** - Usage tracking, FAQs, Knowledge UI (6 weeks)
- **[Phase-2-Form-Intelligence.md](./Phase-2-Form-Intelligence.md)** - Rules engine, Conversation paths (7 weeks)
- **[Phase-3-Knowledge-Chatbot.md](./Phase-3-Knowledge-Chatbot.md)** - Chatbot deployment mode (4 weeks)

### 🔧 Technical Documentation
- **[Technical-Architecture.md](./Technical-Architecture.md)** - Data models, APIs, component architecture
- **[Production-Index-Creation.md](./Production-Index-Creation.md)** - Scaling vector search indexes

### 📊 Progress Tracking
- **[RAG-Phase-1-Complete.md](./RAG-Phase-1-Complete.md)** - RAG storage foundation completion report

---

## Folder Structure

```
docs/
├── strategic/
│   └── NetPad_Knowledge_platform_roadmap.md    Strategic vision
│
├── knowledge-platform/                          ← YOU ARE HERE
│   ├── README.md                               This file
│   ├── IMPLEMENTATION_OVERVIEW.md              Complete timeline
│   ├── Phase-0-RAG-Foundation.md               ✅ Complete
│   ├── Phase-1-Knowledge-Foundation.md         6 weeks
│   ├── Phase-2-Form-Intelligence.md            7 weeks
│   ├── Phase-3-Knowledge-Chatbot.md            4 weeks
│   ├── Technical-Architecture.md               Data models & APIs
│   ├── Production-Index-Creation.md            Scaling strategies
│   └── RAG-Phase-1-Complete.md                 Completion report
│
└── implementation/                              General implementation docs
    └── (other project docs)
```

---

## The Three Deployment Modes

After Phase 3, NetPad will offer:

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

## Timeline Summary

| Phase | Status | Duration | Dates | Key Deliverables |
|-------|--------|----------|-------|------------------|
| **Phase 0** | ✅ Complete | 2 weeks | Jan 27 - Feb 7 | RAG unblocked, vector index created |
| **Phase 1** | 📋 Ready | 6 weeks | Feb 10 - Mar 21 | Usage limits, FAQs, Knowledge UI |
| **Phase 2** | 📋 Planned | 7 weeks | Mar 24 - May 9 | Rules engine, Conversation paths |
| **Phase 3** | 📋 Planned | 4 weeks | May 12 - Jun 6 | Chatbot mode, Escalation |
| **Phase 4** | 📋 Planned | 3 weeks | Jun 9 - Jun 27 | Templates 2.0, Market launch |

**Total**: 22 weeks (Now → End of June 2026)

---

## What's Built vs. What's Planned

### ✅ Phase 0 Complete (RAG Foundation)
- Vector search index (programmatically created)
- Document storage & chunking
- Embedding generation (Atlas Embedding API)
- Retrieval working (0.77+ relevance scores)
- Storage provider architecture
- Usage tracking foundation

### 📋 Phase 1 Next (Knowledge Foundation)
- Usage tracking & tier limits enforcement
- FAQ knowledge type with hybrid search
- Knowledge Tab UI for unified management

### 📋 Phase 2 (Form Intelligence)
- Rules engine ("If [trigger], then [action]")
- Conversation paths (guided flows)
- Field extraction from conversation

### 📋 Phase 3 (Knowledge Chatbot)
- Chatbot deployment mode
- Escalation system (chatbot → form handoff)
- Embed widget for websites
- Chatbot analytics

---

## Key Documents

### For Engineers
- [Technical-Architecture.md](./Technical-Architecture.md) - Complete data models, API specs
- [Production-Index-Creation.md](./Production-Index-Creation.md) - Scaling strategies
- Phase execution plans - Week-by-week implementation tasks

### For Product
- [../strategic/NetPad_Knowledge_platform_roadmap.md](../strategic/NetPad_Knowledge_platform_roadmap.md) - Vision & positioning
- [IMPLEMENTATION_OVERVIEW.md](./IMPLEMENTATION_OVERVIEW.md) - Timeline & milestones

### For Leadership
- Strategic roadmap - Competitive moat, use cases, metrics
- Implementation overview - Resource requirements, timeline

---

## Contributing

When adding new knowledge platform documentation:
1. Place it in this folder (`docs/knowledge-platform/`)
2. Update this README with a link
3. Follow the naming convention: `Phase-N-Description.md` or `Topic-Name.md`
4. Include acceptance criteria for any implementation tasks

---

*Last updated: January 29, 2026*
