# NetPad Knowledge Platform: Complete Vision

**Engineering & Product Team**  
**January 2026**

---

## Executive Summary

We're building **NetPad Knowledge Platform**—a system that transforms how organizations collect data and provide support. At its core is a unified knowledge foundation that powers three deployment modes: traditional forms, conversational forms, and knowledge chatbots.

**The thesis:** Organizations maintain knowledge in documents, policies, and FAQs. That same knowledge should power both data collection AND self-service support. Build the knowledge base once, deploy it three ways.

---

## The Vision in One Sentence

> **Build once, deploy three ways: Forms, Conversations, and Chatbots—all powered by the same knowledge.**

---

## What We're Building

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     NETPAD KNOWLEDGE PLATFORM                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                    ┌─────────────────────────────────┐                     │
│                    │      KNOWLEDGE FOUNDATION       │                     │
│                    │                                 │                     │
│                    │  📚 Documents   📋 FAQs        │                     │
│                    │  📊 Lookups     ⚡ Rules        │                     │
│                    │  💬 Conversation Paths          │                     │
│                    │                                 │                     │
│                    │  [Managed once, used everywhere]│                     │
│                    └───────────────┬─────────────────┘                     │
│                                    │                                        │
│              ┌─────────────────────┼─────────────────────┐                 │
│              │                     │                     │                 │
│              ▼                     ▼                     ▼                 │
│  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐        │
│  │                   │ │                   │ │                   │        │
│  │   📝 TRADITIONAL  │ │ 💬 CONVERSATIONAL │ │  🤖 KNOWLEDGE     │        │
│  │      FORM         │ │      FORM         │ │     CHATBOT       │        │
│  │                   │ │                   │ │                   │        │
│  │  Field-based UI   │ │  Chat UI with     │ │  Chat UI for      │        │
│  │  for data entry   │ │  data collection  │ │  Q&A and support  │        │
│  │                   │ │  goal             │ │                   │        │
│  └───────────────────┘ └───────────────────┘ └───────────────────┘        │
│                                                                             │
│       Power users          Guided intake          Self-service             │
│       Bulk entry           Complex topics         24/7 support             │
│       Quick edits          Mobile-first           Ticket deflection        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## The Three Deployment Modes

### Mode 1: Traditional Form

**What it is:** Classic field-based form UI.

**Best for:**
- Power users who know exactly what to enter
- Bulk data entry
- Quick edits to existing records
- Users who prefer structured interfaces

**Knowledge usage:** Validation rules, field-level help text, auto-suggestions.

### Mode 2: Conversational Form

**What it is:** Chat interface that guides users through data collection.

**Best for:**
- Complex intake processes (IT tickets, patient intake, applications)
- Users unfamiliar with the domain
- Mobile-first experiences
- Situations requiring guidance and explanation

**Knowledge usage:** Answer questions mid-flow, enforce rules, guide through topics, explain options.

**Ends when:** Form data is complete → triggers workflow.

### Mode 3: Knowledge Chatbot

**What it is:** AI assistant for answering questions, not collecting data.

**Best for:**
- Self-service support portals
- FAQ/helpdesk deflection
- Policy and procedure questions
- Product support

**Knowledge usage:** Primary function—retrieve and synthesize answers from documents, FAQs, and rules.

**Ends when:** User is satisfied OR escalates to human/form.

---

## How They Connect

The power is in the connections between modes:

```
                         ┌─────────────────┐
                         │    CHATBOT      │
                         │                 │
                         │ "How do I reset │
                         │  my password?"  │
                         └────────┬────────┘
                                  │
                                  │ User: "Actually, I need
                                  │        to report a bug"
                                  ▼
                         ┌─────────────────┐
                         │ CONVERSATIONAL  │
                         │     FORM        │
                         │                 │
                         │ Conversation    │
                         │ context carries │
                         │ over            │
                         └────────┬────────┘
                                  │
                                  │ IT person: "Let me
                                  │ update this ticket"
                                  ▼
                         ┌─────────────────┐
                         │  TRADITIONAL    │
                         │     FORM        │
                         │                 │
                         │ Quick edit to   │
                         │ existing record │
                         └─────────────────┘
```

**Key insight:** These aren't three separate products. They're three views of the same underlying form and knowledge base.

---

## The Knowledge Foundation

All three modes are powered by the same knowledge primitives:

### 1. Knowledge Sources

**What:** Information the system can reference.

| Type | Examples | Retrieval |
|------|----------|-----------|
| **Documents** | PDFs, policies, manuals | Vector search (RAG) |
| **FAQs** | Q&A pairs | Keyword + semantic |
| **Lookups** | Asset lists, employee directory | Key-based + semantic |

**Used for:** Answering questions, providing context, informing users.

### 2. Rules

**What:** Business logic that triggers actions.

| Trigger | Actions |
|---------|---------|
| Field value | Inform, warn, block, suggest |
| Keywords detected | Route, require fields, notify |
| Confidence low | Escalate to human |
| Sentiment negative | Escalate, notify |

**Used for:** Enforcing policies, automating decisions, triggering escalation.

### 3. Conversation Paths

**What:** Structured flows for complex topics.

| Component | Purpose |
|-----------|---------|
| Activation | Detect when to engage (keywords, semantics) |
| Questions | Guide information gathering |
| Conditionals | Branch based on responses |
| Mappings | Connect conversation to form fields |

**Used for:** Guided data collection, compliance, complex intake.

---

## Use Cases by Mode

### Traditional Form Use Cases

| Use Case | Why Traditional? |
|----------|-----------------|
| Bulk expense upload | Speed over guidance |
| IT admin updating tickets | Power user, knows the system |
| Data corrections | Quick edits to existing records |
| Import/migration | Structured batch processing |

### Conversational Form Use Cases

| Use Case | Why Conversational? |
|----------|---------------------|
| IT help desk intake | Users don't know categories |
| Patient intake | Medical terminology is complex |
| Employee onboarding | Benefits/tax decisions need explanation |
| Insurance claims | Document requirements vary by claim type |
| Loan applications | Eligibility rules are complex |

### Knowledge Chatbot Use Cases

| Use Case | Why Chatbot? |
|----------|--------------|
| IT self-service | "How do I reset my VPN?" |
| HR policy questions | "How many vacation days do I have?" |
| Product support | "How do I export to PDF?" |
| Compliance guidance | "Can I accept gifts from vendors?" |
| New hire FAQ | "Where do I park?" |

---

## The Customer Journey

### Scenario: IT Department

**Day 1: Start with Conversational Form**
> "We need a better way to collect IT tickets. Users always miscategorize."

Deploy conversational form. AI guides users, auto-categorizes, collects right info.

**Week 2: Add Knowledge Base**
> "Can it answer common questions before creating tickets?"

Upload IT policies, known issues, FAQs. Conversational form now answers questions AND collects tickets.

**Month 2: Deploy Chatbot**
> "Can we put this on the intranet for self-service?"

Enable chatbot mode on same form. Self-service portal deployed. Escalates to ticket when needed.

**Result:**
- 40% ticket deflection (chatbot answers without ticket)
- 60% better ticket quality (conversational form guides)
- 100% less categorization errors (AI handles it)

---

## Competitive Positioning

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MARKET LANDSCAPE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FORM BUILDERS (Typeform, JotForm)                                         │
│  ├─ ✅ Great form UX                                                       │
│  ├─ ❌ No conversational mode                                              │
│  ├─ ❌ No knowledge base                                                   │
│  └─ ❌ No chatbot capability                                               │
│                                                                             │
│  CHATBOT PLATFORMS (Intercom, Drift)                                        │
│  ├─ ✅ Good chatbot UX                                                     │
│  ├─ ❌ Limited form integration                                            │
│  ├─ ❌ Weak knowledge management                                           │
│  └─ ❌ No form builder                                                     │
│                                                                             │
│  HELPDESK TOOLS (Zendesk, Freshdesk)                                       │
│  ├─ ✅ Good ticket management                                              │
│  ├─ ❌ Basic forms                                                         │
│  ├─ ❌ Chatbot is add-on/limited                                           │
│  └─ ❌ Per-seat pricing                                                    │
│                                                                             │
│  RAG/AI TOOLS (ChatGPT + docs)                                             │
│  ├─ ✅ Good Q&A                                                            │
│  ├─ ❌ No structured data extraction                                       │
│  ├─ ❌ No workflow integration                                             │
│  └─ ❌ No form builder                                                     │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│  NETPAD KNOWLEDGE PLATFORM                                                  │
│  ├─ ✅ Full form builder (30+ field types)                                 │
│  ├─ ✅ Conversational mode with guided paths                               │
│  ├─ ✅ Knowledge chatbot with escalation                                   │
│  ├─ ✅ Unified knowledge base (RAG + rules + paths)                        │
│  ├─ ✅ Workflow automation                                                 │
│  ├─ ✅ MongoDB-native (your data, your database)                           │
│  └─ ✅ "Build once, deploy three ways"                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Why can't competitors just add this?**

1. **Form builders** would need to build RAG infrastructure from scratch
2. **Chatbot platforms** don't have structured data extraction
3. **Helpdesk tools** are locked into their ticketing model
4. **RAG tools** can't do forms or workflows

NetPad is uniquely positioned because we have the form builder, workflow engine, MongoDB integration, AND RAG infrastructure.

---

## Technical Architecture

### Deployment Mode Configuration

```typescript
interface FormDeploymentConfig {
  formId: string;
  
  // Which modes are enabled
  modes: {
    traditional: boolean;
    conversational: boolean;
    chatbot: boolean;
  };
  
  // Chatbot-specific configuration
  chatbot?: {
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
  };
}
```

### Conversation Engine Modes

```typescript
type ConversationMode = 'form' | 'chatbot' | 'hybrid';

interface ConversationConfig {
  mode: ConversationMode;
  
  // Form mode: primary goal is data collection
  form?: {
    requiredFields: string[];
    completionCriteria: 'all_required' | 'user_confirms';
  };
  
  // Chatbot mode: primary goal is answering questions
  chatbot?: {
    persona: ChatbotPersona;
    escalationTriggers: EscalationTrigger[];
  };
  
  // Hybrid mode: answer questions, opportunistically collect data
  hybrid?: {
    primaryMode: 'form' | 'chatbot';
    captureFields: string[];  // Fields to collect if mentioned
  };
}
```

### Retrieval Strategy by Mode

| Mode | Primary Retrieval | Secondary | Goal |
|------|-------------------|-----------|------|
| **Traditional Form** | Rules (validation) | Knowledge (field help) | Data validity |
| **Conversational Form** | Paths → Rules → Knowledge | Document RAG | Data collection |
| **Knowledge Chatbot** | Knowledge → FAQs → Docs | Rules (escalation) | Question resolution |

---

## Implementation Roadmap

### Phase 1: Foundation (Current)
**Status:** In Progress

- ✅ RAG document storage
- ✅ Embedding generation (Voyage AI)
- 🔴 Vector search index (BLOCKER)
- 🟡 Usage tracking and limits
- 🟡 Platform/user-cluster routing

### Phase 2: Form Intelligence (Q1)
**Status:** Planned

- Rules engine (triggers → actions)
- Conversation paths (guided flows)
- Knowledge management UI
- Enhanced conversational form

**Outcome:** Conversational forms with full intelligence capabilities.

### Phase 3: Knowledge Chatbot (Q1-Q2)
**Status:** Planned

- Chatbot deployment mode
- Persona configuration
- Escalation system
- Form ↔ Chatbot handoff
- Embed widget

**Outcome:** Deploy forms as chatbots with one click.

### Phase 4: Templates & Launch (Q2)
**Status:** Future

- Pre-built templates for each mode
- IT Help Desk (form + chatbot)
- Patient Intake (conversational form)
- HR Policy Bot (chatbot)
- Customer Support (hybrid)

**Outcome:** Customers can deploy intelligent forms/chatbots in 15 minutes.

---

## Success Metrics

### Form Intelligence Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Conversational form completion | >80% | vs. ~60% traditional |
| Data quality (correct categorization) | >95% | vs. ~60% manual |
| Time to complete complex form | -40% | Seconds to submit |

### Knowledge Chatbot Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Question resolution rate | >70% | Resolved without escalation |
| Escalation quality | >90% | Tickets have right info |
| User satisfaction | >4.2/5 | Post-conversation rating |
| Ticket deflection | >40% | vs. baseline ticket volume |

### Platform Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to first deployment | <30 min | Signup to live |
| Knowledge base utilization | >60% | Forms with knowledge enabled |
| Multi-mode deployment | >30% | Forms with 2+ modes enabled |

---

## The Bigger Picture

NetPad started as a MongoDB form builder. Then we added workflows. Now we're adding intelligence.

The Knowledge Platform positions NetPad as:

> **The platform where forms become intelligent agents.**

Every form becomes:
- A data collection interface (traditional)
- A guided assistant (conversational)
- A self-service support channel (chatbot)

All powered by the same knowledge, rules, and conversation paths.

**This is our moat.** Competitors have pieces. We have the complete platform.

---

## What We Need from RAG Infrastructure

The Knowledge Platform vision requires:

### Must Have (Current Sprint)

| Capability | Status | Notes |
|------------|--------|-------|
| Vector search index | 🔴 BLOCKED | Nothing works without this |
| Document retrieval | ✅ Built | Working |
| Embedding generation | ✅ Built | Via Atlas API |

### Must Have (Q1)

| Capability | Status | Notes |
|------------|--------|-------|
| FAQ storage + retrieval | 🟡 Planned | New knowledge type |
| Hybrid search (keyword + semantic) | 🟡 Planned | Better retrieval |
| Usage tracking + limits | 🟡 Planned | Tier enforcement |
| Multi-mode context assembly | 🟡 Planned | Different retrieval by mode |

### Must Have (Q2)

| Capability | Status | Notes |
|------------|--------|-------|
| Reranking | 🟡 Planned | Quality improvement |
| Conversation memory | 🟡 Planned | Multi-turn context |
| Escalation context capture | 🟡 Planned | Form pre-fill from chat |

---

## Summary

We're not building a form builder with AI features. We're building an **intelligent knowledge platform** that happens to include forms.

The RAG infrastructure is the foundation. Form Intelligence adds the rules and paths. Knowledge Chatbot extends it to self-service support.

**"Build once, deploy three ways"** is our differentiator and our story.

---

## Questions?

Reach out to Michael or discuss in #engineering.

---

*Version 2.0 — January 2026*



# NetPad Knowledge Platform: Implementation Roadmap

**Version:** 1.0  
**Date:** January 2026  
**Status:** Draft for Review

---

## Strategic Context

### Business Goals
1. **Near-term (30 days):** First 10 paying customers after Feb 1 @netpad/templates launch
2. **Q1 2026:** Establish NetPad as the MongoDB-native forms platform
3. **Q2 2026:** Launch Knowledge Platform as key differentiator
4. **2026:** Become the default choice for intelligent forms in Finance and Healthcare

### The Tension to Resolve
- **Templates launch (Feb 1)** needs to drive conversions NOW
- **Knowledge Platform** is the bigger vision but takes time to build
- We need to ship what converts customers while building toward the vision

### The Resolution
**Progressive disclosure of the vision:**
1. Launch with what works today (conversational forms + basic RAG)
2. Add intelligence features incrementally (rules, paths)
3. Unlock chatbot mode as the "aha moment" for existing customers

---

## Phase Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         2026 ROADMAP                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  JAN          FEB          MAR          APR          MAY          JUN       │
│   │            │            │            │            │            │        │
│   │  ┌─────────┴────────┐   │            │            │            │        │
│   │  │ PHASE 0          │   │            │            │            │        │
│   │  │ Unblock RAG      │   │            │            │            │        │
│   │  │ Templates Launch │   │            │            │            │        │
│   │  └──────────────────┘   │            │            │            │        │
│   │            │            │            │            │            │        │
│   │            │  ┌─────────┴─────────┐  │            │            │        │
│   │            │  │ PHASE 1           │  │            │            │        │
│   │            │  │ Foundation        │  │            │            │        │
│   │            │  │ Usage + Limits    │  │            │            │        │
│   │            │  │ FAQ Knowledge     │  │            │            │        │
│   │            │  └───────────────────┘  │            │            │        │
│   │            │            │            │            │            │        │
│   │            │            │  ┌─────────┴─────────┐  │            │        │
│   │            │            │  │ PHASE 2           │  │            │        │
│   │            │            │  │ Form Intelligence │  │            │        │
│   │            │            │  │ Rules + Paths     │  │            │        │
│   │            │            │  └───────────────────┘  │            │        │
│   │            │            │            │            │            │        │
│   │            │            │            │  ┌─────────┴─────────┐  │        │
│   │            │            │            │  │ PHASE 3           │  │        │
│   │            │            │            │  │ Knowledge Chatbot │  │        │
│   │            │            │            │  │ "Build 1, Deploy 3"│ │        │
│   │            │            │            │  └───────────────────┘  │        │
│   │            │            │            │            │            │        │
│   │            │            │            │            │  ┌─────────┴─────┐  │
│   │            │            │            │            │  │ PHASE 4       │  │
│   │            │            │            │            │  │ Templates 2.0 │  │
│   │            │            │            │            │  │ + Launch      │  │
│   │            │            │            │            │  └───────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 0: Unblock & Launch (Now → Feb 7)

**Goal:** Ship what works, unblock RAG, launch templates.

### Week of Jan 27-31

| Task | Owner | Priority | Notes |
|------|-------|----------|-------|
| Create vector search index on platform cluster | Eng | P0 | **BLOCKER** for all RAG features |
| Verify RAG retrieval works end-to-end | Eng | P0 | Test with real documents |
| Finalize @netpad/templates package | Eng | P0 | Feb 1 announcement |
| Conversational form template (IT Help Desk) | Product | P1 | Flagship for launch |

### Week of Feb 3-7

| Task | Owner | Priority | Notes |
|------|-------|----------|-------|
| Feb 1: Templates announcement | Marketing | P0 | Blog + HN + socials |
| Enable RAG on conversational form templates | Eng | P0 | "Upload your docs" flow |
| Customer onboarding for waitlist users | Product | P0 | First 10 paying customers |
| Collect feedback on conversational forms | Product | P1 | What's working, what's not |

### Deliverables
- ✅ Vector search index live
- ✅ @netpad/templates v1.0 published
- ✅ IT Help Desk conversational template live
- ✅ RAG document upload working in production
- ✅ First paying customers onboarded

### Success Metrics
- 5+ template clones in first week
- 10+ RAG documents uploaded
- 3+ paying customer conversations started

---

## Phase 1: Foundation (Feb → Mid-March)

**Goal:** Build infrastructure for Knowledge Platform without disrupting current users.

### Workstream 1: Usage Tracking & Tier Limits (2 weeks)

**Why now:** Can't safely offer free tier RAG without limits.

| Task | Effort | Notes |
|------|--------|-------|
| Design usage tracking schema | 2d | Documents, queries, storage |
| Implement tracking service | 3d | Middleware on RAG endpoints |
| Build limits enforcement | 2d | Block/warn at thresholds |
| Add usage dashboard to org settings | 2d | "You've used X of Y" |
| Tier-based limit configuration | 1d | Free/Pro/Team limits |

**Deliverable:** Organizations see usage, hit limits, see upgrade prompts.

### Workstream 2: FAQ Knowledge Type (2 weeks)

**Why now:** FAQs are higher-signal than documents and easier for customers to create.

| Task | Effort | Notes |
|------|--------|-------|
| Design FAQ schema (Q/A pairs + embeddings) | 1d | Part of knowledge sources |
| Build FAQ management UI | 3d | Add/edit/delete pairs |
| Implement FAQ retrieval (hybrid search) | 2d | Keyword + semantic |
| Integrate FAQ into conversation context | 2d | Prioritize over doc chunks |
| Starter FAQ content for templates | 2d | IT, HR, Customer Support |

**Deliverable:** Forms can have FAQs that the conversational form references.

### Workstream 3: Knowledge Tab in Form Builder (1 week)

**Why now:** Users need a place to manage all knowledge types.

| Task | Effort | Notes |
|------|--------|-------|
| Add "Knowledge" tab to form builder | 2d | Between Workflow and Settings |
| Show documents + FAQs in unified view | 2d | With status, counts |
| Quick-add FAQ from Knowledge tab | 1d | Modal for adding pairs |

**Deliverable:** Form builder has Knowledge tab showing all knowledge sources.

### Phase 1 Deliverables Summary
- ✅ Usage tracking + tier limits enforced
- ✅ FAQ knowledge type with hybrid retrieval
- ✅ Knowledge tab in form builder
- ✅ Starter FAQs in templates

### Success Metrics
- 50% of conversational form users add at least 1 FAQ
- <1% of free tier users blocked by limits (most upgrade or stay within)
- Retrieval quality improvement measurable (FAQ answers vs doc chunks)

---

## Phase 2: Form Intelligence (Mid-March → End of April)

**Goal:** Add rules and conversation paths—the "intelligence" layer.

### Workstream 1: Rules Engine (3 weeks)

| Task | Effort | Notes |
|------|--------|-------|
| Design rules schema | 2d | Triggers, actions, priorities |
| Build rules storage + API | 3d | CRUD endpoints |
| Implement rule evaluation engine | 4d | Run on each conversation turn |
| Build Rules UI in form builder | 4d | Add/edit rules with conditions |
| Integrate rules into conversation flow | 3d | Inform, warn, suggest actions |
| Pre-built rules in templates | 2d | Escalation, self-service, etc. |

**Rule types for v1:**
- Trigger: `keyword_detected`, `field_value`, `always`
- Action: `inform`, `warn`, `suggest_value`, `set_field`, `route`

### Workstream 2: Conversation Paths (3 weeks)

| Task | Effort | Notes |
|------|--------|-------|
| Design paths schema | 2d | Activation, questions, mappings |
| Build paths storage + API | 3d | CRUD endpoints |
| Implement path detection + activation | 4d | Keyword + semantic triggers |
| Build Paths UI in form builder | 4d | Visual path editor |
| Integrate paths into conversation flow | 3d | Guide questions, extract fields |
| Pre-built paths in templates | 2d | Per-template paths |

**Path features for v1:**
- Activation: `keyword`, `semantic`, `field_value`
- Questions: Required, optional, conditional
- Mapping: Question → form field extraction

### Workstream 3: Enhanced Conversational Form (2 weeks)

| Task | Effort | Notes |
|------|--------|-------|
| Update conversation engine for rules + paths | 3d | Context assembly |
| Update system prompt builder | 2d | Include rules, active path |
| Build conversation testing UI | 3d | Test with rules/paths applied |
| Update templates with intelligence | 2d | IT Help Desk, Patient Intake |

### Phase 2 Deliverables Summary
- ✅ Rules engine with 5+ trigger types, 5+ action types
- ✅ Conversation paths with guided flows
- ✅ Rules + Paths UI in form builder (under Knowledge tab or new Intelligence tab)
- ✅ Updated templates with pre-configured rules and paths
- ✅ Conversation testing UI

### Success Metrics
- 30% of conversational forms have at least 1 rule
- 20% of conversational forms have at least 1 path
- Measurable improvement in form completion rate
- Measurable improvement in data quality (categorization accuracy)

---

## Phase 3: Knowledge Chatbot (May)

**Goal:** Enable "Build once, deploy three ways" with chatbot mode.

### Workstream 1: Chatbot Deployment Mode (2 weeks)

| Task | Effort | Notes |
|------|--------|-------|
| Add deployment mode concept to forms | 2d | traditional, conversational, chatbot |
| Design chatbot configuration schema | 2d | Persona, behavior, escalation |
| Build Deploy tab in form builder | 3d | Enable/configure each mode |
| Chatbot persona configuration UI | 2d | Name, greeting, personality |

### Workstream 2: Chatbot Behavior Engine (2 weeks)

| Task | Effort | Notes |
|------|--------|-------|
| Modify conversation engine for chatbot mode | 3d | Q&A focus vs data collection |
| Implement escalation triggers | 3d | Sentiment, confidence, keywords, user request |
| Build escalation flow | 3d | Chatbot → Form handoff with context |
| Conversation-to-form pre-fill | 2d | Extract fields from chat history |

### Workstream 3: Chatbot Deployment (2 weeks)

| Task | Effort | Notes |
|------|--------|-------|
| Chatbot standalone page | 2d | /chat/{org}/{slug} |
| Chatbot embed widget | 3d | JavaScript snippet for websites |
| Chatbot analytics | 3d | Conversations, resolutions, escalations |
| Chatbot templates | 2d | IT Support Bot, HR Policy Bot |

### Phase 3 Deliverables Summary
- ✅ Chatbot deployment mode
- ✅ Persona + behavior configuration
- ✅ Escalation system with form handoff
- ✅ Embed widget for websites
- ✅ Chatbot analytics
- ✅ Pre-built chatbot templates

### Success Metrics
- 20% of forms with conversational mode also enable chatbot mode
- 50%+ question resolution rate (no escalation needed)
- 90%+ escalated tickets have complete context from conversation
- Net new customers acquired specifically for chatbot capability

---

## Phase 4: Templates 2.0 & Market Launch (June)

**Goal:** Package the Knowledge Platform for market launch.

### Workstream 1: Template Enhancement (2 weeks)

| Task | Effort | Notes |
|------|--------|-------|
| Update all templates with intelligence | 5d | Rules, paths, FAQs |
| Create chatbot variants of key templates | 3d | IT Bot, HR Bot, Support Bot |
| Template setup wizards | 4d | Guided configuration |
| Template preview/demo mode | 3d | Try before you clone |

### Workstream 2: Marketing & Launch (2 weeks)

| Task | Effort | Notes |
|------|--------|-------|
| "Build once, deploy three ways" messaging | 3d | Website, docs, blog |
| Case studies / testimonials | 5d | Early customer stories |
| Comparison content | 3d | vs Typeform, Intercom, Zendesk |
| Launch campaign | 5d | HN, Product Hunt, socials |

### Workstream 3: Documentation & Onboarding (2 weeks)

| Task | Effort | Notes |
|------|--------|-------|
| Knowledge Platform documentation | 5d | Concepts, tutorials, reference |
| Video tutorials | 4d | "Build a chatbot in 10 minutes" |
| Updated onboarding flow | 3d | Highlight all three modes |
| Self-service template customization | 3d | Fork + customize flow |

### Phase 4 Deliverables Summary
- ✅ All templates updated with full intelligence
- ✅ Dedicated chatbot templates
- ✅ "Build once, deploy three ways" market positioning
- ✅ Case studies and comparison content
- ✅ Comprehensive documentation
- ✅ Market launch campaign

### Success Metrics
- 100+ template clones per month
- 50+ chatbots deployed
- 10+ case studies / testimonials
- Coverage in relevant publications
- Clear differentiation recognized in market

---

## Resource Allocation

### Engineering Effort by Phase

| Phase | Duration | Eng Weeks | Focus |
|-------|----------|-----------|-------|
| Phase 0 | 2 weeks | 2-3 | Unblock RAG, templates |
| Phase 1 | 6 weeks | 8-10 | Usage tracking, FAQs, Knowledge UI |
| Phase 2 | 7 weeks | 12-15 | Rules engine, Paths, Intelligence UI |
| Phase 3 | 6 weeks | 10-12 | Chatbot mode, Escalation, Embed |
| Phase 4 | 4 weeks | 6-8 | Templates 2.0, Docs, Launch |

**Total:** ~25 weeks, 38-48 eng weeks

### Parallel Workstreams

```
Phase 0: [████] Unblock + Launch
Phase 1:        [████████████] Foundation
Phase 2:                    [██████████████] Intelligence
Phase 3:                                  [████████████] Chatbot
Phase 4:                                              [████████] Launch
         ─────────────────────────────────────────────────────────────▶
         Jan     Feb     Mar     Apr     May     Jun
```

---

## Risk Mitigation

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Vector index creation fails | Low | High | Test in staging first, have Atlas support contact |
| RAG quality is poor | Medium | High | Invest in reranking (Phase 1), FAQ prioritization |
| Rules engine is complex | Medium | Medium | Start with simple triggers, iterate |
| Chatbot escalation loses context | Medium | High | Design context capture early |

### Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Templates don't convert | Medium | High | Focus on IT Help Desk, get feedback fast |
| Vision takes too long to ship | Medium | High | Ship incrementally, each phase is usable |
| Competitors copy the approach | Low | Medium | Move fast, build brand, accumulate templates |

### Dependencies

| Dependency | Owner | Risk if Delayed |
|------------|-------|-----------------|
| Vector search index | Eng | Blocks all RAG work |
| Voyage AI API availability | External | Have OpenAI fallback |
| Customer feedback | Product | Build wrong things |
| Marketing content | Marketing | Launch falls flat |

---

## Decision Points

### Phase 0 → Phase 1 (Feb 7)
- ✅ Vector index working in production?
- ✅ At least 3 template clones?
- ✅ At least 1 paying customer conversation?

**If no:** Extend Phase 0, focus on unblocking.

### Phase 1 → Phase 2 (Mid-March)
- ✅ Usage tracking deployed?
- ✅ FAQs being used by customers?
- ✅ Positive feedback on conversational forms?

**If no:** Extend Phase 1, improve foundation before adding intelligence.

### Phase 2 → Phase 3 (End of April)
- ✅ Rules and paths working in production?
- ✅ Measurable improvement in form completion/quality?
- ✅ Customer demand for chatbot mode?

**If no:** Extend Phase 2, polish intelligence features.

### Phase 3 → Phase 4 (End of May)
- ✅ Chatbot mode working with escalation?
- ✅ At least 10 chatbots deployed?
- ✅ Positive feedback on "build once, deploy three"?

**If no:** Extend Phase 3, ensure chatbot is solid before big launch.

---

## Immediate Next Steps (This Week)

### For Engineering
1. **Create vector search index** — This unblocks everything
2. **Test RAG end-to-end** — Upload doc, ask question, verify retrieval
3. **Finalize templates package** — Ready for Feb 1

### For Product
1. **Finalize IT Help Desk template** — Form + starter FAQ + basic knowledge
2. **Prepare announcement content** — Blog post, social posts
3. **Identify first 5 waitlist users to onboard** — High-touch for feedback

### For Michael
1. **Review this roadmap** — Adjust timelines and priorities
2. **Decide on team allocation** — Who owns each workstream?
3. **Communicate vision to team** — Share the Knowledge Platform vision doc

---

## Summary

**The plan in one sentence:**

> Ship templates now (Feb 1), add intelligence features through Q1 (rules, paths), unlock chatbot mode in Q2 (May), and launch "Build once, deploy three ways" as the market story in June.

Each phase delivers customer value while building toward the full vision. No phase requires the next one to be useful—if we stopped after Phase 1, we'd still have a better product than today.

---

## Appendix: Feature Mapping to Phases

| Feature | Phase | Notes |
|---------|-------|-------|
| Vector search index | 0 | BLOCKER |
| Templates v1 | 0 | Feb 1 launch |
| Basic RAG (documents) | 0 | Already built, just needs index |
| Usage tracking | 1 | Required for tier limits |
| Tier limits enforcement | 1 | Required for free tier |
| FAQ knowledge type | 1 | Higher signal than docs |
| Knowledge tab in UI | 1 | Unified knowledge management |
| Rules engine | 2 | Triggers → actions |
| Conversation paths | 2 | Guided flows |
| Intelligence UI | 2 | Rules + paths management |
| Chatbot mode | 3 | New deployment option |
| Escalation system | 3 | Chatbot → form handoff |
| Embed widget | 3 | Website integration |
| Templates v2 (with intelligence) | 4 | Full Knowledge Platform |
| Market launch | 4 | "Build once, deploy three" |

---

*Last updated: January 2026*