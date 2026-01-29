# Form Intelligence: Product Vision

**NetPad Engineering Team**  
**January 2026**

---

## Executive Summary

We're building something bigger than RAG-powered document retrieval. We're creating **Form Intelligence**—a system that transforms NetPad forms from passive data collectors into active, intelligent agents that guide users, enforce business logic, and adapt conversations in real-time.

The RAG infrastructure you're building is the foundation. This document explains what we're building on top of it.

---

## The Vision in One Sentence

> **Forms that think, not just collect.**

---

## What We're Creating

### Today: Forms + RAG

```
User fills form → RAG answers questions from documents → Data saved
```

### Tomorrow: Intelligent Conversational Forms

```
User describes need 
    → Form detects topic
    → Retrieves relevant knowledge (docs + rules + paths)
    → Guides conversation with contextual questions
    → Enforces business rules in real-time
    → Extracts structured data from natural language
    → Routes to appropriate workflow
```

---

## The Three Pillars of Form Intelligence

Form Intelligence extends RAG with two additional knowledge types. Together, they create forms that understand context, enforce rules, and guide conversations.

### Pillar 1: Knowledge (RAG Foundation)

**What you're building now.**

| Source Type | Description | Retrieval Method |
|-------------|-------------|------------------|
| Documents | PDFs, policies, manuals | Semantic vector search |
| FAQs | Structured Q&A pairs | Keyword + semantic hybrid |
| Lookups | Tabular data, catalogs | Key-based + semantic |

**Use in conversation:** Answer questions, provide context, inform users.

**Example:** "Based on our expense policy, meals over $75 require manager approval."

### Pillar 2: Rules (New)

**Business logic that triggers actions based on context.**

| Trigger | Action |
|---------|--------|
| Field value matches condition | Inform, warn, block, suggest |
| Keywords detected in message | Route, require fields, notify |
| Topic identified | Apply specific handling |
| Form about to submit | Validate, enrich, route |

**Use in conversation:** Enforce policies, automate decisions, guide behavior.

**Example:** When user mentions "critical" or "everyone affected" → auto-set priority to Critical, notify on-call team.

### Pillar 3: Conversation Paths (New)

**Structured flows for complex topics.**

| Component | Purpose |
|-----------|---------|
| Activation triggers | Detect when path should engage (keywords, semantics, field values) |
| Required questions | Ensure necessary information is collected |
| Conditional follow-ups | Branch based on responses |
| Field mappings | Extract structured data from conversation |

**Use in conversation:** Guide users through complex intake, ensure compliance, improve data quality.

**Example:** When user mentions "headache" → activate symptom intake path → ask duration, severity, triggers → map to clinical fields.

---

## How It Works Together

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER MESSAGE                                     │
│                   "My laptop has been really slow"                       │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
            ┌───────────┐   ┌───────────┐   ┌───────────┐
            │ KNOWLEDGE │   │   RULES   │   │   PATHS   │
            │           │   │           │   │           │
            │ "Windows  │   │ If slow + │   │ Hardware  │
            │ update    │   │ laptop →  │   │ Issue     │
            │ KB5034441 │   │ check     │   │ Path:     │
            │ known to  │   │ recent    │   │ • Device? │
            │ cause     │   │ updates   │   │ • When?   │
            │ slowdowns"│   │           │   │ • Asset?  │
            └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
                  │               │               │
                  └───────────────┼───────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │    CONTEXT ASSEMBLY     │
                    │                         │
                    │ • Active path questions │
                    │ • Applicable rules      │
                    │ • Relevant knowledge    │
                    │ • Form state            │
                    │ • Conversation history  │
                    └───────────────┬─────────┘
                                    │
                                    ▼
                    ┌─────────────────────────┐
                    │     LLM GENERATION      │
                    │                         │
                    │ System prompt includes  │
                    │ all context + extracted │
                    │ field requirements      │
                    └───────────────┬─────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         RESPONSE                                         │
│                                                                          │
│  "I understand your laptop is running slowly - that's frustrating.      │
│   I noticed there was a Windows update 8 days ago that's known to       │
│   cause performance issues with some systems.                           │
│                                                                          │
│   A few questions: When did you first notice the slowness? Is it        │
│   slow all the time, or just with certain applications?"                │
│                                                                          │
│  + Extracted: { "issue.category": "hardware/performance" }              │
│  + Active path: hardware-issue                                          │
│  + Rule triggered: check-recent-updates                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Use Cases We'll Support

Form Intelligence is **use-case agnostic**. The product provides primitives; templates provide configurations for specific scenarios.

### Tier 1: Launch Use Cases (Templates Included)

| Use Case | Industry | Key Intelligence Features |
|----------|----------|---------------------------|
| **IT Help Desk** | Cross-industry | Auto-categorization, self-service suggestions, priority escalation |
| **Patient Intake** | Healthcare | Symptom-guided paths, compliance questions, clinical field extraction |
| **Employee Onboarding** | HR | Benefits guidance, tax form assistance, policy explanations |
| **Customer Feedback** | Cross-industry | Sentiment detection, escalation rules, follow-up routing |

### Tier 2: High-Value Verticals

| Use Case | Industry | Key Intelligence Features |
|----------|----------|---------------------------|
| **Expense Reporting** | Finance | Policy enforcement, approval routing, receipt validation |
| **Loan Application** | Finance | Document requirements, eligibility rules, compliance paths |
| **Insurance Claims** | Insurance | Claim type detection, required documentation, adjuster routing |
| **Vendor Onboarding** | Procurement | Compliance checks, document collection, approval workflows |

### Tier 3: Platform Capabilities (Any Use Case)

Customers can build their own intelligent forms by:

1. **Uploading knowledge** — Documents, FAQs, lookup tables
2. **Defining rules** — Triggers and actions for their business logic
3. **Creating paths** — Guided conversations for their complex topics
4. **Mapping fields** — Connecting conversation to structured data

---

## Why This Matters

### For Customers

| Pain Point | How Form Intelligence Solves It |
|------------|--------------------------------|
| "Users fill out forms wrong" | Guided paths ensure correct data collection |
| "We answer the same questions repeatedly" | Knowledge base provides instant answers |
| "Tickets are always miscategorized" | Rules auto-categorize based on content |
| "Complex forms have high abandonment" | Conversation feels easier than 50 fields |
| "We can't enforce policies consistently" | Rules engine applies logic automatically |

### For NetPad

| Business Goal | How Form Intelligence Achieves It |
|---------------|----------------------------------|
| Differentiation | No competitor has this depth of conversational intelligence |
| Stickiness | Knowledge bases and rules represent invested configuration |
| Upsell path | Free → Pro (more knowledge) → Team (user-cluster for scale) |
| Vertical expansion | Same engine, different templates for each industry |

### Competitive Moat

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        COMPETITIVE LANDSCAPE                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Typeform + ChatGPT:                                                    │
│  ├─ ❌ No structured data extraction                                    │
│  ├─ ❌ No workflow integration                                          │
│  ├─ ❌ No persistent knowledge base                                     │
│  └─ ❌ No rules engine                                                  │
│                                                                          │
│  Retool + AI:                                                           │
│  ├─ ❌ Not conversational                                               │
│  ├─ ❌ No guided paths                                                  │
│  └─ ❌ Complex setup required                                           │
│                                                                          │
│  Custom Development:                                                     │
│  ├─ ❌ 3-6 months to build                                              │
│  ├─ ❌ Ongoing maintenance burden                                       │
│  └─ ❌ No template acceleration                                         │
│                                                                          │
│  NetPad Form Intelligence:                                              │
│  ├─ ✅ Structured extraction + workflows                                │
│  ├─ ✅ Persistent, searchable knowledge                                 │
│  ├─ ✅ Rules engine with actions                                        │
│  ├─ ✅ Guided conversation paths                                        │
│  ├─ ✅ Templates for quick start                                        │
│  └─ ✅ "Build once, deploy twice" (traditional + conversational)        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Technical Architecture Summary

### Data Model

```
Organization
└── Form
    └── Form Intelligence
        ├── Knowledge Sources        (documents, FAQs, lookups)
        │   └── [Stored in RAG cluster - platform or user]
        │
        ├── Rules                    (triggers → actions)
        │   └── [Stored in main NetPad database]
        │
        └── Conversation Paths       (guided flows)
            └── [Stored in main NetPad database]
```

### Storage Strategy

| Data Type | Storage Location | Why |
|-----------|------------------|-----|
| Documents + Chunks + Embeddings | RAG cluster (platform or user) | Vector search, scale, isolation |
| FAQs (with embeddings) | RAG cluster | Semantic retrieval |
| Rules | Main NetPad database | Transactional, no vector search needed |
| Paths | Main NetPad database | Transactional, no vector search needed |
| Conversation State | Main NetPad database | Session management |

### Retrieval Flow

```
1. User message received
2. Parallel retrieval:
   a. Topic detection (keyword + semantic)
   b. Rule evaluation (condition matching)
   c. Knowledge retrieval (vector search + reranking)
3. Context assembly
4. LLM generation with full context
5. Response + field extraction + action execution
```

---

## What We Need From RAG Infrastructure

The Form Intelligence vision requires these RAG capabilities:

### Must Have (Current Sprint)

| Capability | Status | Notes |
|------------|--------|-------|
| Vector search index | 🔴 Blocked | Need this to ship anything |
| Document upload + chunking | ✅ Built | Working |
| Embedding generation | ✅ Built | Via Voyage/Atlas API |
| Basic retrieval | ✅ Built | Single query → top K chunks |

### Must Have (Q1)

| Capability | Status | Notes |
|------------|--------|-------|
| FAQ storage with embeddings | 🟡 Planned | New knowledge source type |
| Hybrid retrieval | 🟡 Planned | Keyword + semantic combined |
| Usage tracking + limits | 🟡 Planned | For tier enforcement |
| Platform vs user-cluster routing | 🟡 Planned | Storage mode selection |

### Nice to Have (Q2)

| Capability | Status | Notes |
|------------|--------|-------|
| Reranking | 🟡 Planned | Two-stage retrieval for quality |
| Lookup table integration | ⚪ Future | Connect to MongoDB collections |
| Cross-form knowledge sharing | ⚪ Future | Organization-level knowledge |

---

## Implementation Phases

### Phase 1: Foundation (Current)
- ✅ RAG document storage and retrieval
- 🔴 Vector search index creation
- 🟡 Usage tracking and limits
- 🟡 Platform/user-cluster routing

### Phase 2: Rules Engine (Q1)
- Rules schema and storage
- Rule evaluation in conversation flow
- Rules management UI
- Basic triggers: field_value, keyword_detected, always

### Phase 3: Conversation Paths (Q1-Q2)
- Paths schema and storage
- Topic detection (keyword + semantic)
- Path activation and flow management
- Paths management UI
- Field extraction from conversation

### Phase 4: Templates & Polish (Q2)
- Pre-built templates with intelligence configurations
- IT Help Desk, Patient Intake, Employee Onboarding, Customer Feedback
- Setup wizards for each template
- Testing and refinement

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Conversational form completion rate | >80% | vs. ~60% for complex traditional forms |
| Time to first intelligent form | <30 minutes | From signup to deployed conversational form |
| Knowledge retrieval relevance | >85% useful | User feedback on responses |
| Rule accuracy | >95% | Correct trigger/action execution |
| Path completion | >90% | Users complete guided paths |

---

## The Bigger Picture

Form Intelligence positions NetPad as more than a form builder or even a MongoDB tool. It positions us as:

> **The platform where data collection becomes intelligent.**

Every form becomes an opportunity to:
- Guide users to better outcomes
- Enforce business logic automatically
- Learn from accumulated knowledge
- Connect to workflows and systems

The RAG infrastructure is the engine. Form Intelligence is what we're building with it.

---

## Questions?

Reach out to Michael or discuss in #engineering.

---

*Last updated: January 2026*