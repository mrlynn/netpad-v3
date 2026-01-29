# Knowledge Platform Roadmap: Visual Summary

**22-week journey from RAG foundation to full Knowledge Platform**

---

## Timeline Overview

```
JAN          FEB          MAR          APR          MAY          JUN
 │            │            │            │            │            │
 │  ┌─────────┴────────┐   │            │            │            │
 │  │ PHASE 0          │   │            │            │            │
 │  │ • Unblock RAG    │   │            │            │            │
 │  │ • Launch Templates│  │            │            │            │
 │  │ • First customers│   │            │            │            │
 │  └──────────────────┘   │            │            │            │
 │            │            │            │            │            │
 │            │  ┌─────────┴─────────┐  │            │            │
 │            │  │ PHASE 1           │  │            │            │
 │            │  │ • Usage tracking  │  │            │            │
 │            │  │ • FAQ knowledge   │  │            │            │
 │            │  │ • Knowledge tab   │  │            │            │
 │            │  └───────────────────┘  │            │            │
 │            │            │            │            │            │
 │            │            │  ┌─────────┴─────────┐  │            │
 │            │            │  │ PHASE 2           │  │            │
 │            │            │  │ • Rules engine    │  │            │
 │            │            │  │ • Conversation    │  │            │
 │            │            │  │   paths           │  │            │
 │            │            │  │ • Intelligence UI │  │            │
 │            │            │  └───────────────────┘  │            │
 │            │            │            │            │            │
 │            │            │            │  ┌─────────┴─────────┐  │
 │            │            │            │  │ PHASE 3           │  │
 │            │            │            │  │ • Chatbot mode    │  │
 │            │            │            │  │ • Escalation      │  │
 │            │            │            │  │ • Embed widget    │  │
 │            │            │            │  └───────────────────┘  │
 │            │            │            │            │            │
 │            │            │            │            │  ┌─────────┴─────┐
 │            │            │            │            │  │ PHASE 4       │
 │            │            │            │            │  │ • Templates   │
 │            │            │            │            │  │   2.0         │
 │            │            │            │            │  │ • Launch      │
 │            │            │            │            │  └───────────────┘
```

---

## Phase Breakdown

### Phase 0: Unblock & Launch (2 weeks)
**Jan 27 - Feb 7**

**Goal**: Remove blocker, ship templates, get first customers

**Deliverables**:
- ✅ Vector search index (READY status)
- ✅ @netpad/templates on NPM
- ✅ IT Help Desk template with RAG
- ✅ Templates announcement
- ✅ 5 customer onboarding calls

**Effort**: 60 hours (~1.5 weeks)

**Key Milestone**: RAG features work in production 🎉

---

### Phase 1: Foundation (6 weeks)
**Feb 10 - Mar 21**

**Goal**: Build infrastructure without disrupting users

**3 Workstreams**:
1. **Usage Tracking & Limits** (2 weeks)
   - Track documents, queries, storage
   - Enforce tier limits
   - Usage dashboard in settings

2. **FAQ Knowledge Type** (2 weeks)
   - Q&A pair storage with embeddings
   - Hybrid retrieval (keyword + semantic)
   - FAQ management UI

3. **Knowledge Tab** (2 weeks)
   - Unified view: docs + FAQs
   - Quick-add FAQ modal
   - Status indicators

**Effort**: 124 hours (~3 weeks)

**Success Metric**: 50% of conversational forms add ≥1 FAQ

---

### Phase 2: Form Intelligence (7 weeks)
**Mar 24 - May 9**

**Goal**: Add rules and conversation paths

**3 Workstreams**:
1. **Rules Engine** (3 weeks)
   - Triggers: keyword, field value, sentiment, confidence
   - Actions: inform, warn, suggest, set field, route, escalate
   - Rules UI + testing

2. **Conversation Paths** (3 weeks)
   - Activation: keyword + semantic detection
   - Guided question flows
   - Field extraction from responses
   - Path editor UI (basic)

3. **Enhanced Conversation Engine** (1 week)
   - Integrate rules + paths + knowledge
   - Conversation analytics
   - Updated templates

**Effort**: 218 hours (~5.5 weeks)

**Success Metric**:
- 30% of forms use ≥1 rule
- 20% of forms use ≥1 path
- Form completion >80%
- Data quality >95%

---

### Phase 3: Knowledge Chatbot (4 weeks)
**May 12 - Jun 6**

**Goal**: Enable "Build once, deploy three ways"

**3 Workstreams**:
1. **Chatbot Deployment Mode** (2 weeks)
   - Deployment config (traditional/conversational/chatbot)
   - Persona configuration (name, greeting, personality)
   - Deploy tab in form builder

2. **Chatbot Behavior Engine** (1 week)
   - Q&A-focused conversation mode
   - Source citations
   - Escalation triggers
   - Conversation → form handoff
   - Pre-fill from chat history

3. **Chatbot Deployment** (1 week)
   - Standalone chatbot page
   - Embed widget for websites
   - Chatbot analytics
   - Chatbot templates (IT, HR, Support)

**Effort**: 172 hours (~4.3 weeks)

**Success Metric**:
- 20% of forms enable chatbot mode
- 50%+ question resolution rate
- 90%+ escalations have full context
- 10+ chatbots deployed

---

### Phase 4: Templates 2.0 & Launch (3 weeks)
**Jun 9 - Jun 27**

**Goal**: Package for market launch

**3 Workstreams**:
1. **Template Enhancement** (1 week)
   - Update all templates with rules + paths + FAQs
   - Create 5+ dedicated chatbot templates
   - Template setup wizards
   - Template preview/demo mode

2. **Marketing & Launch** (1 week)
   - "Build once, deploy three ways" messaging
   - Comparison content (vs Typeform, Intercom, Zendesk)
   - Case studies (3+)
   - Demo videos
   - Launch campaign (HN, Product Hunt)

3. **Documentation & Onboarding** (1 week)
   - Knowledge Platform docs
   - "Building Your First Chatbot" tutorial
   - Video tutorials
   - Updated onboarding flow

**Effort**: 184 hours (~4.6 weeks, includes marketing)

**Success Metric**:
- 100+ template clones/month
- 50+ chatbots deployed
- 10+ case studies
- HN front page, Product Hunt featured

---

## Resource Requirements

### Engineering Effort Summary

| Phase | Calendar Weeks | Eng Hours | Eng Weeks (40h) |
|-------|----------------|-----------|-----------------|
| Phase 0 | 2 | 60 | 1.5 |
| Phase 1 | 6 | 124 | 3.1 |
| Phase 2 | 7 | 218 | 5.5 |
| Phase 3 | 4 | 172 | 4.3 |
| Phase 4 | 3 | 100* | 2.5 |
| **Total** | **22** | **674** | **16.9** |

*Phase 4 includes ~84 eng + ~100 marketing/product hours

### With 2 Engineers (Parallel Workstreams)

Some phases can be parallelized:
- **Phase 1**: Usage + FAQ work (~4 weeks instead of 6)
- **Phase 2**: Rules + Paths (~5 weeks instead of 7)

**Optimistic Timeline**: ~18 weeks (late Feb → mid-June)

---

## The Three Modes Explained

### Mode 1: Traditional Form
**What**: Classic field-based form UI
**Best for**: Power users, bulk entry, quick edits
**Example**: IT admin updating 20 tickets

### Mode 2: Conversational Form
**What**: Chat UI guiding data collection
**Best for**: Complex intake, unfamiliar users, mobile
**Example**: Patient explaining symptoms → structured medical intake
**Ends when**: Form complete → workflow triggers

### Mode 3: Knowledge Chatbot
**What**: Chat UI answering questions (NOT collecting data)
**Best for**: Self-service support, FAQ deflection, 24/7 help
**Example**: "How do I reset my password?" → Answer from docs
**Ends when**: User satisfied OR escalates to form/human

**The magic**: Same knowledge base powers all three modes.

---

## Decision Gates

### Gate 1: Phase 0 → Phase 1 (Feb 7)
**Required**:
- ✅ Vector index READY
- ✅ 3+ template clones
- ✅ 1+ paying customer
- ✅ RAG retrieval working

**If not met**: Extend Phase 0

### Gate 2: Phase 1 → Phase 2 (Mar 21)
**Required**:
- ✅ Usage tracking deployed (0 issues)
- ✅ 20+ FAQs created by customers
- ✅ Positive feedback
- ✅ Knowledge tab launched

**If not met**: Polish foundation before adding intelligence

### Gate 3: Phase 2 → Phase 3 (May 9)
**Required**:
- ✅ Rules + paths working
- ✅ Measurable improvement in completion/quality
- ✅ 5+ customer requests for chatbot
- ✅ 30%+ adoption of rules/paths

**If not met**: Ensure intelligence features work well

### Gate 4: Phase 3 → Phase 4 (Jun 6)
**Required**:
- ✅ Chatbot mode + escalation working
- ✅ 10+ chatbots deployed
- ✅ Resolution rate >50%
- ✅ Positive "build once, deploy three" feedback

**If not met**: Ensure chatbot is solid before launch

---

## Critical Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Vector index fails** | Critical | Test staging first, Atlas support contact |
| **Retrieval quality poor** | High | Add reranking, prioritize FAQs over doc chunks |
| **Path editor too complex** | Medium | Ship basic form-based editor, iterate to visual |
| **Templates don't convert** | Critical | Focus on IT template, fast feedback loops |
| **Escalation loses context** | High | Design context capture early, test extensively |

---

## Feature Progression

```
PHASE 0: RAG Foundation
└─ Documents
   └─ Embeddings
      └─ Vector retrieval
         └─ Conversational forms reference docs

PHASE 1: Knowledge Sources
└─ Documents (existing)
   └─ FAQs (NEW)
      └─ Hybrid retrieval (keyword + semantic)
         └─ Usage limits (by tier)

PHASE 2: Intelligence Layer
└─ Knowledge (existing)
   └─ Rules (NEW) - "If [trigger], then [action]"
      └─ Paths (NEW) - Guided question flows
         └─ Field extraction from conversation

PHASE 3: Deployment Modes
└─ Traditional form (existing)
   └─ Conversational form (existing, enhanced)
      └─ Chatbot mode (NEW)
         └─ Escalation → handoff with context

PHASE 4: Market Package
└─ Templates with full intelligence
   └─ "Build once, deploy three ways" story
      └─ Launch campaign
```

---

## What You Get at Each Phase

### After Phase 0
**You can**: Launch templates, customers use conversational forms with RAG

**You cannot**: Enforce limits, use FAQs, configure rules/paths, deploy chatbots

**Customer value**: ⭐⭐⭐ (Good - RAG-powered conversational forms work)

### After Phase 1
**You can**: Everything above + FAQs, usage tracking, Knowledge management UI

**You cannot**: Use rules/paths, deploy chatbots

**Customer value**: ⭐⭐⭐⭐ (Great - Knowledge management is complete)

### After Phase 2
**You can**: Everything above + Rules, Conversation paths, Form intelligence

**You cannot**: Deploy chatbots

**Customer value**: ⭐⭐⭐⭐⭐ (Excellent - Intelligent conversational forms)

### After Phase 3
**You can**: Everything above + Chatbot deployment mode, Escalation, Embed widget

**You cannot**: (Nothing - feature complete!)

**Customer value**: ⭐⭐⭐⭐⭐⭐ (Outstanding - Full "build once, deploy three ways")

### After Phase 4
**You have**: Market-ready Knowledge Platform, Templates 2.0, Launch campaign

**Customer value**: Same as Phase 3, but with **market awareness** and **polish**

---

## The Competitive Moat

### What NetPad Will Have (Post-Phase 3)

```
┌─────────────────────────────────────────────────────────┐
│         NETPAD KNOWLEDGE PLATFORM (UNIQUE)              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✅ Form builder (30+ field types)                     │
│  ✅ Conversational forms (AI-guided data collection)   │
│  ✅ Knowledge chatbots (Q&A support bots)              │
│  ✅ Unified knowledge base (docs + FAQs + rules)       │
│  ✅ Conversation paths (guided flows)                  │
│  ✅ Escalation system (chatbot → form handoff)         │
│  ✅ Workflow automation (MongoDB-native)               │
│  ✅ "Build once, deploy three ways"                    │
│  ✅ MongoDB Atlas integration (vector search)          │
│  ✅ Open source (MIT) + cloud option                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### What Competitors Have

| Competitor | Form Builder | Conversational | Chatbot | Knowledge Base | Workflows | MongoDB-Native |
|------------|--------------|----------------|---------|----------------|-----------|----------------|
| **Typeform** | ✅ Great | ❌ No | ❌ No | ❌ No | ❌ Zapier only | ❌ No |
| **Intercom** | ❌ Basic | ❌ Limited | ✅ Good | ❌ Weak | ❌ Limited | ❌ No |
| **Zendesk** | ❌ Basic | ❌ No | ❌ Add-on | ❌ Limited | ❌ Ticketing only | ❌ No |
| **Retool** | ✅ Good | ❌ No | ❌ No | ❌ No | ❌ Limited | ❌ Multi-DB |
| **ChatGPT + Docs** | ❌ No | ❌ No | ✅ Good | ✅ Good | ❌ No | ❌ No |

**NetPad's advantage**: Only platform with all features natively integrated.

---

## Summary

**In one sentence**:

> Ship templates now (Feb 1), add intelligence features through Q1 (rules, paths), unlock chatbot mode in Q2 (May), and launch "Build once, deploy three ways" in June.

**Why this works**:
1. Each phase delivers customer value independently
2. RAG infrastructure is already 60% built
3. Blocker is simple: create one vector index (1 hour)
4. Timeline is realistic: 22 weeks, ~17 eng-weeks of effort
5. If stopped after any phase, still shipped meaningful improvements

**This is your competitive moat**: Unified knowledge platform that powers forms, conversations, and chatbots—all from one configuration.

---

**Ready to start?** See [Quick Start Checklist](./QUICK_START_CHECKLIST.md) for this week's action items.

---

*Last updated: January 29, 2026*
