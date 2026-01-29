# NetPad Knowledge Platform: Implementation Plan

**Version:** 1.0
**Created:** January 29, 2026
**Status:** Ready for Execution

---

## Executive Summary

This document provides an **actionable, week-by-week implementation plan** for the NetPad Knowledge Platform. Based on the strategic roadmap, this breaks down the vision into executable tasks with clear owners, dependencies, and acceptance criteria.

**Timeline:** Now through June 2026 (22 weeks)
**Strategic Goal:** Ship "Build once, deploy three ways" - Traditional Forms → Conversational Forms → Knowledge Chatbots

---

## Current State Assessment

### ✅ Already Built (Significant Progress!)

You have **substantial RAG infrastructure already in place**:

| Component | Status | Files |
|-----------|--------|-------|
| Document storage | ✅ Complete | `src/lib/rag/storage/` (4 files) |
| Embedding generation | ✅ Complete | `src/lib/rag/embeddings.ts` |
| Document chunking | ✅ Complete | `src/lib/rag/chunking.ts` |
| Retrieval logic | ✅ Complete | `src/lib/rag/retrieval.ts` |
| Storage providers | ✅ Complete | Platform + User Cluster modes |
| Usage tracking | ✅ Complete | `src/lib/rag/usage/tracking.ts` |
| RAG configuration | ✅ Complete | `src/lib/rag/config.ts` |
| Index management | ✅ Complete | `src/lib/rag/indexManagement.ts` |
| Admin endpoints | ✅ Complete | `/api/rag/admin/*` |
| UI components | ✅ Complete | RAG settings page, cluster setup wizard |

### 🔴 Critical Blocker

**Vector Search Index Creation**: The infrastructure exists, but the index needs to be created on the platform cluster.

**Solution Path**:
1. Call `/api/rag/admin/ensure-index` with platform organizationId
2. Wait 5-10 minutes for index to build (Atlas background process)
3. Verify status with GET endpoint

**Why this matters**: Without this index, zero RAG features work. Everything is blocked on this.

---

## Phase 0: Unblock & Launch (Week 1-2: Jan 27 - Feb 7)

**Goal**: Remove the blocker, verify RAG works end-to-end, launch templates.

### Week 1: Jan 27-31

#### Critical Path: Vector Search Index

| Task | Owner | Hours | Acceptance Criteria |
|------|-------|-------|---------------------|
| Create vector index on platform cluster | Eng | 1h | POST to `/api/rag/admin/ensure-index` succeeds |
| Monitor index build status | Eng | 0.5h | GET shows status: "READY", queryable: true |
| Test document upload | Eng | 1h | Upload test PDF, verify chunks + embeddings created |
| Test retrieval query | Eng | 1h | Query returns relevant chunks with scores |
| Document index creation process | Eng | 2h | Add to ops runbook for new orgs |

**Total**: ~5-6 hours of focused work

**Dependencies**: None (just execution)

**Risk Mitigation**:
- If index creation fails, contact Atlas support immediately
- Have staging environment ready for testing first

#### Templates Package

| Task | Owner | Hours | Acceptance Criteria |
|------|-------|-------|---------------------|
| Finalize @netpad/templates structure | Eng | 4h | Package builds, exports types |
| Add IT Help Desk conversational template | Product | 6h | Template clones successfully |
| Add starter documents/FAQs to template | Product | 4h | Template includes sample knowledge |
| Test template cloning workflow | Eng | 2h | End-to-end clone works |
| Publish to NPM (beta) | Eng | 1h | npm install @netpad/templates works |

**Total**: ~17 hours

**Dependencies**: None

### Week 2: Feb 3-7

#### Templates Launch

| Task | Owner | Hours | Acceptance Criteria |
|------|-------|-------|---------------------|
| Write launch blog post | Marketing | 8h | Published on netpad.io/blog |
| Prepare Hacker News post | Marketing | 2h | Draft ready, scheduled for Mon/Wed |
| Social media content | Marketing | 4h | Twitter, LinkedIn posts ready |
| Update homepage with templates CTA | Eng | 2h | "Browse Templates" prominent |

**Total**: ~16 hours

#### Customer Onboarding

| Task | Owner | Hours | Acceptance Criteria |
|------|-------|-------|---------------------|
| Identify first 10 waitlist users | Product | 2h | List with contact info, use cases |
| Email onboarding sequence | Product | 4h | 3-email sequence drafted |
| Schedule onboarding calls | Product | 2h | First 5 calls on calendar |
| Prepare demo script | Product | 4h | Conversational form + RAG walkthrough |

**Total**: ~12 hours

#### RAG End-to-End Verification

| Task | Owner | Hours | Acceptance Criteria |
|------|-------|-------|---------------------|
| Create test conversational form | Eng | 2h | Form with RAG enabled |
| Upload 5+ test documents | Eng | 1h | IT policies, FAQs, procedures |
| Test retrieval in conversation | Eng | 2h | AI references uploaded docs correctly |
| Test with different embedding providers | Eng | 2h | Voyage AI, Atlas Embedding API |
| Load test (100 queries) | Eng | 2h | Performance acceptable |

**Total**: ~9 hours

### Phase 0 Success Metrics

- [ ] Vector search index status: READY
- [ ] @netpad/templates v1.0 published to NPM
- [ ] IT Help Desk template live with sample documents
- [ ] 5+ template clones in first week
- [ ] 3+ customer onboarding calls completed
- [ ] 10+ RAG documents uploaded across customers

**Phase 0 Total Effort**: ~60 hours (~1.5 weeks for 1 engineer + product support)

---

## Phase 1: Foundation (Week 3-8: Feb 10 - Mar 21)

**Goal**: Build the infrastructure for Knowledge Platform without disrupting current users.

### Workstream 1: Usage Tracking & Tier Limits (Week 3-4)

**Why now**: Need limits before offering free tier RAG broadly.

| Task | Owner | Hours | Acceptance Criteria |
|------|-------|-------|---------------------|
| Design usage metrics schema | Eng | 4h | Schema covers docs, queries, storage |
| Implement tracking middleware | Eng | 8h | All RAG endpoints track usage |
| Build limits enforcement | Eng | 6h | Block/warn at thresholds by tier |
| Create usage dashboard component | Eng | 8h | Shows usage bars, upgrade prompts |
| Add to organization settings page | Eng | 4h | New "Usage" tab with dashboard |
| Tier-based limit configuration | Eng | 2h | Free/Pro/Team limits in config |
| Test limit enforcement | Eng | 4h | Verify free tier hits limits correctly |

**Total**: ~36 hours (~1 week)

**Success Criteria**:
- [ ] Usage tracked: documents, queries, storage bytes
- [ ] Limits enforced at tier boundaries
- [ ] Users see usage dashboard
- [ ] Upgrade prompts shown when near limits

### Workstream 2: FAQ Knowledge Type (Week 5-6)

**Why now**: FAQs are higher-signal than document chunks and easier for customers to create.

| Task | Owner | Hours | Acceptance Criteria |
|------|-------|-------|---------------------|
| Design FAQ schema | Eng | 4h | Q/A pairs with embeddings, metadata |
| Implement FAQ storage (collection) | Eng | 4h | CRUD operations |
| Build FAQ management UI | Eng | 12h | Add/edit/delete FAQ pairs |
| Implement FAQ retrieval | Eng | 8h | Hybrid: keyword + semantic search |
| Integrate FAQ into conversation context | Eng | 6h | Prioritize FAQs over doc chunks |
| Add FAQ section to Knowledge tab | Eng | 6h | Unified view: docs + FAQs |
| Create starter FAQ content for IT template | Product | 8h | 20+ common IT help desk Q&As |
| Test FAQ retrieval quality | Eng | 4h | FAQs rank higher than doc chunks |

**Total**: ~52 hours (~1.3 weeks)

**Success Criteria**:
- [ ] FAQ storage collection with embeddings
- [ ] FAQ management UI in form builder
- [ ] Retrieval prioritizes exact/close FAQ matches
- [ ] IT template includes starter FAQs
- [ ] 50%+ of conversational forms add ≥1 FAQ

### Workstream 3: Knowledge Tab UI (Week 7-8)

**Why now**: Users need a unified place to manage all knowledge sources.

| Task | Owner | Hours | Acceptance Criteria |
|------|-------|-------|---------------------|
| Add "Knowledge" tab to form builder | Eng | 4h | Tab between Workflow and Settings |
| Design unified knowledge view | Design | 4h | Figma mockup approved |
| Implement knowledge overview page | Eng | 8h | Shows all docs + FAQs + stats |
| Add quick-add FAQ modal | Eng | 6h | Inline FAQ creation from Knowledge tab |
| Add document status indicators | Eng | 4h | Processing, ready, error states |
| Add search/filter for knowledge items | Eng | 6h | Find specific docs/FAQs quickly |
| Document knowledge management | Docs | 4h | "Managing Your Knowledge Base" guide |

**Total**: ~36 hours (~1 week)

**Success Criteria**:
- [ ] Knowledge tab visible in form builder
- [ ] Shows all documents + FAQs in unified view
- [ ] Quick-add FAQ works
- [ ] Documentation published

### Phase 1 Success Metrics

- [ ] Usage tracking + limits enforced (0 production issues)
- [ ] FAQ knowledge type deployed
- [ ] Knowledge tab launched
- [ ] 50%+ of conversational forms add ≥1 FAQ
- [ ] <1% of free tier users blocked by limits
- [ ] Measurable retrieval quality improvement (FAQ vs doc-only)

**Phase 1 Total Effort**: ~124 hours (~3 weeks for 1 engineer)

---

## Phase 2: Form Intelligence (Week 9-15: Mar 24 - May 9)

**Goal**: Add rules and conversation paths—the "intelligence" layer.

### Workstream 1: Rules Engine (Week 9-11)

**Vision**: "If [trigger], then [action]" logic for conversational forms.

**Rule Schema**:
```typescript
interface Rule {
  id: string;
  formId: string;
  name: string;
  priority: number;
  enabled: boolean;

  trigger: {
    type: 'keyword_detected' | 'field_value' | 'sentiment' | 'confidence_low' | 'always';
    config: {
      keywords?: string[];        // For keyword_detected
      field?: string;             // For field_value
      operator?: '==' | '!=' | '>' | '<' | 'contains';
      value?: any;
      sentimentThreshold?: number; // For sentiment
      confidenceThreshold?: number; // For confidence_low
    };
  };

  actions: Array<{
    type: 'inform' | 'warn' | 'suggest_value' | 'set_field' | 'route' | 'escalate';
    config: {
      message?: string;           // For inform, warn
      fieldId?: string;           // For suggest_value, set_field
      value?: any;                // For suggest_value, set_field
      destination?: string;       // For route
    };
  }>;
}
```

| Task | Owner | Hours | Acceptance Criteria |
|------|-------|-------|---------------------|
| Design rules schema | Eng | 6h | Schema covers 5+ trigger types, 5+ actions |
| Create rules storage collection | Eng | 4h | CRUD API endpoints |
| Implement rule evaluation engine | Eng | 12h | Evaluates rules on each conversation turn |
| Build Rules UI (list view) | Eng | 8h | Shows all rules, enable/disable toggles |
| Build rule editor modal | Eng | 12h | Add/edit rule with trigger + action config |
| Integrate rules into conversation flow | Eng | 10h | Rules execute during AI response generation |
| Add rule testing UI | Eng | 8h | Test rule with sample conversation |
| Create pre-built rules for IT template | Product | 6h | Escalation, self-service routing, etc. |
| Document rules engine | Docs | 6h | "Building Rule-Based Logic" guide |

**Total**: ~72 hours (~1.8 weeks)

**Example Rules**:
- "If user says 'password reset', inform: 'Check your email for reset link' and set category='password'"
- "If sentiment < -0.6, escalate to human and notify team"
- "If confidence < 0.5, suggest: 'Can you provide more details?'"

**Success Criteria**:
- [ ] Rules storage + API deployed
- [ ] Rules UI functional
- [ ] Rules execute during conversations
- [ ] IT template includes 5+ pre-built rules
- [ ] 30%+ of conversational forms have ≥1 custom rule

### Workstream 2: Conversation Paths (Week 12-14)

**Vision**: Guided flows for complex topics (e.g., "patient intake" path with required questions).

**Path Schema**:
```typescript
interface ConversationPath {
  id: string;
  formId: string;
  name: string;
  description: string;
  enabled: boolean;

  activation: {
    type: 'keyword' | 'semantic' | 'field_value' | 'manual';
    config: {
      keywords?: string[];          // For keyword
      semanticQuery?: string;       // For semantic (embedding similarity)
      field?: string;               // For field_value
      value?: any;
    };
  };

  steps: Array<{
    id: string;
    type: 'question' | 'inform' | 'conditional';
    question?: string;              // For question type
    message?: string;               // For inform type
    required?: boolean;
    conditional?: {                 // For conditional type
      field: string;
      operator: string;
      value: any;
      thenPath: string;             // Step ID to jump to
      elsePath?: string;
    };

    mapping?: {                     // Extract field from answer
      fieldId: string;
      extractionHint?: string;      // Help AI extract correctly
    };
  }>;
}
```

| Task | Owner | Hours | Acceptance Criteria |
|------|-------|-------|---------------------|
| Design paths schema | Eng | 6h | Schema supports activation, steps, conditionals |
| Create paths storage collection | Eng | 4h | CRUD API endpoints |
| Implement path detection/activation | Eng | 12h | Detect when to activate path (keyword + semantic) |
| Build Paths UI (list view) | Eng | 8h | Shows all paths, enable/disable |
| Build path editor (visual flow) | Eng | 20h | Drag-and-drop step editor (consider ReactFlow) |
| Integrate paths into conversation engine | Eng | 12h | Execute active path's steps |
| Implement field extraction from responses | Eng | 10h | Map conversation answers → form fields |
| Create pre-built paths for templates | Product | 10h | IT: hardware request, HR: onboarding, etc. |
| Add path testing UI | Eng | 8h | Test path with mock conversation |
| Document conversation paths | Docs | 6h | "Building Conversation Paths" guide |

**Total**: ~96 hours (~2.4 weeks)

**Example Path**: "Hardware Request"
1. Activation: Keywords: ["laptop", "computer", "hardware", "equipment"]
2. Steps:
   - Question: "What type of hardware do you need?" → `hardwareType`
   - Question: "What's your department?" → `department`
   - Conditional: If `hardwareType == 'laptop'`, ask "Mac or PC?" → `osPreference`
   - Inform: "Your request will be reviewed by IT within 2 business days."
   - Set: `category = 'hardware_request'`, `status = 'pending_approval'`

**Success Criteria**:
- [ ] Paths storage + API deployed
- [ ] Path editor UI functional (may be basic in v1)
- [ ] Paths activate correctly during conversations
- [ ] Field extraction works (AI maps answers → fields)
- [ ] 3+ templates include pre-built paths
- [ ] 20%+ of conversational forms have ≥1 path

### Workstream 3: Enhanced Conversational Form (Week 15)

**Goal**: Update conversation engine to use rules + paths + knowledge together.

| Task | Owner | Hours | Acceptance Criteria |
|------|-------|-------|---------------------|
| Refactor conversation context assembly | Eng | 8h | Includes: knowledge, rules, active path, form fields |
| Update system prompt builder | Eng | 6h | Generates prompt with all intelligence sources |
| Add conversation turn metadata | Eng | 4h | Track: rules fired, path step, fields extracted |
| Build conversation testing UI | Eng | 10h | Test form with all features enabled |
| Add conversation analytics | Eng | 8h | Show: completion rate, fields extracted, rules fired |
| Update templates with intelligence | Product | 8h | IT, HR, Healthcare templates fully configured |
| Performance testing | Eng | 6h | Ensure <2s response time with all features |

**Total**: ~50 hours (~1.3 weeks)

**Success Criteria**:
- [ ] Conversation engine uses rules + paths + knowledge
- [ ] Testing UI allows iterating on configurations
- [ ] Updated templates demonstrate all features
- [ ] Performance meets targets

### Phase 2 Success Metrics

- [ ] Rules engine deployed with 5+ trigger/action types
- [ ] Conversation paths deployed with visual editor
- [ ] 30%+ of conversational forms use ≥1 rule
- [ ] 20%+ of conversational forms use ≥1 path
- [ ] Measurable improvement in form completion rate (target: >80%)
- [ ] Measurable improvement in data quality (correct categorization >95%)

**Phase 2 Total Effort**: ~218 hours (~5.5 weeks for 1 engineer)

---

## Phase 3: Knowledge Chatbot (Week 16-19: May 12 - Jun 6)

**Goal**: Enable "Build once, deploy three ways" with chatbot deployment mode.

### The Key Difference: Form vs Chatbot Mode

| Aspect | Conversational Form (Current) | Knowledge Chatbot (New) |
|--------|------------------------------|-------------------------|
| **Primary goal** | Collect structured data | Answer questions |
| **Ends when** | Form fields complete → workflow triggers | User satisfied OR escalates |
| **Success metric** | Form completion rate | Question resolution rate |
| **System prompt focus** | "Collect these fields" | "Answer from knowledge base" |
| **Form schema** | Required for field extraction | Optional (only needed for escalation) |

### Workstream 1: Chatbot Deployment Mode (Week 16-17)

**Configuration Schema**:
```typescript
interface FormDeploymentConfig {
  formId: string;

  modes: {
    traditional: boolean;        // Field-based form UI
    conversational: boolean;     // Chat UI with data collection goal
    chatbot: boolean;            // Chat UI with Q&A goal
  };

  chatbot?: {
    persona: {
      name: string;              // "IT Support Bot"
      greeting: string;          // "Hi! How can I help you today?"
      personality: 'professional' | 'friendly' | 'casual';
    };

    behavior: {
      primaryFunction: 'answer_questions' | 'guide_users' | 'triage';
      unknownHandling: 'admit' | 'suggest' | 'escalate';
      citeSources: boolean;      // Include document citations
    };

    escalation: {
      triggers: Array<{
        type: 'user_request' | 'confidence_low' | 'sentiment_negative' | 'keyword';
        config: any;
      }>;
      action: 'show_form' | 'create_ticket' | 'notify_team';
      prefillFromConversation: boolean;
    };
  };
}
```

| Task | Owner | Hours | Acceptance Criteria |
|------|-------|-------|---------------------|
| Add deployment mode concept to forms | Eng | 6h | Form has `deploymentConfig` field |
| Design chatbot config schema | Eng | 4h | Schema covers persona, behavior, escalation |
| Build Deploy tab in form builder | Eng | 10h | New tab: enable/configure each mode |
| Create chatbot persona editor | Eng | 8h | Edit name, greeting, personality |
| Create chatbot behavior editor | Eng | 8h | Configure primary function, citations |
| Add mode toggle to form settings | Eng | 4h | Enable traditional/conversational/chatbot |
| Update form renderer routing | Eng | 6h | Route to correct UI based on mode |

**Total**: ~46 hours (~1.2 weeks)

**Success Criteria**:
- [ ] Forms have deploymentConfig
- [ ] Deploy tab UI functional
- [ ] Can toggle between 3 modes
- [ ] Chatbot persona configurable

### Workstream 2: Chatbot Behavior Engine (Week 17-18)

| Task | Owner | Hours | Acceptance Criteria |
|------|-------|-------|---------------------|
| Create chatbot conversation mode | Eng | 10h | Separate from form collection mode |
| Update system prompt for chatbot | Eng | 6h | Focus on Q&A, not data collection |
| Implement source citations | Eng | 8h | Include document/FAQ references in responses |
| Build escalation trigger system | Eng | 10h | Detect: low confidence, negative sentiment, user request |
| Implement escalation flow UI | Eng | 12h | Smooth transition: chatbot → form |
| Build conversation-to-form pre-fill | Eng | 10h | Extract mentioned data → pre-fill form fields |
| Add chatbot analytics tracking | Eng | 8h | Track: conversations, resolutions, escalations |

**Total**: ~64 hours (~1.6 weeks)

**Example Escalation Flow**:
1. User: "My laptop screen is broken, I need a replacement"
2. Chatbot: "I understand you need a laptop replacement. Let me create a hardware request for you."
3. Transition to form (conversational mode)
4. Pre-filled fields: `issue = "broken screen"`, `hardwareType = "laptop"`, `requestType = "replacement"`
5. Form: "What's your current laptop model?" (continues data collection)

**Success Criteria**:
- [ ] Chatbot mode conversation works (Q&A focused)
- [ ] Source citations appear in responses
- [ ] Escalation triggers activate correctly
- [ ] Conversation context carries to form
- [ ] Pre-fill extracts data from chat history

### Workstream 3: Chatbot Deployment (Week 18-19)

| Task | Owner | Hours | Acceptance Criteria |
|------|-------|-------|---------------------|
| Create chatbot standalone page | Eng | 8h | Route: `/chat/{org}/{formSlug}` |
| Build chatbot embed widget | Eng | 12h | JavaScript snippet for websites |
| Add widget customization UI | Eng | 8h | Color, position, greeting, size |
| Create chatbot analytics dashboard | Eng | 10h | Show: conversations, resolution rate, escalations |
| Build chatbot template (IT Support Bot) | Product | 6h | Pre-configured with IT knowledge |
| Build chatbot template (HR Policy Bot) | Product | 6h | Pre-configured with HR FAQs |
| Document chatbot deployment | Docs | 8h | "Deploying a Knowledge Chatbot" guide |
| Create embed widget documentation | Docs | 4h | Code examples, customization options |

**Total**: ~62 hours (~1.6 weeks)

**Embed Widget Example**:
```html
<script src="https://netpad.io/embed/widget.js"></script>
<script>
  NetPadChatbot.init({
    org: 'acme-corp',
    formSlug: 'it-support-bot',
    position: 'bottom-right',
    primaryColor: '#0066cc',
    greeting: 'Need IT help?'
  });
</script>
```

**Success Criteria**:
- [ ] Chatbot standalone page works
- [ ] Embed widget functional
- [ ] Widget customization UI complete
- [ ] Analytics dashboard shows key metrics
- [ ] 2+ chatbot templates available

### Phase 3 Success Metrics

- [ ] Chatbot deployment mode launched
- [ ] 20%+ of forms with conversational mode also enable chatbot mode
- [ ] 50%+ question resolution rate (no escalation needed)
- [ ] 90%+ escalated tickets have complete context from conversation
- [ ] 10+ chatbots deployed across customers
- [ ] Net new customers acquired specifically for chatbot capability

**Phase 3 Total Effort**: ~172 hours (~4.3 weeks for 1 engineer)

---

## Phase 4: Templates 2.0 & Market Launch (Week 20-22: Jun 9 - Jun 27)

**Goal**: Package the Knowledge Platform for market launch.

### Workstream 1: Template Enhancement (Week 20)

| Task | Owner | Hours | Acceptance Criteria |
|------|-------|-------|---------------------|
| Update all templates with intelligence | Product | 16h | Rules, paths, FAQs added to all templates |
| Create chatbot variants | Product | 12h | IT Bot, HR Bot, Support Bot, Sales Bot |
| Build template setup wizards | Eng | 12h | Guided configuration for each template |
| Add template preview/demo mode | Eng | 10h | Try before you clone (read-only chat) |
| Create template showcase page | Eng | 8h | Browse templates by mode/category |
| Add template ratings/reviews | Eng | 6h | Users can rate templates |

**Total**: ~64 hours (~1.6 weeks)

**Success Criteria**:
- [ ] All templates updated with full intelligence
- [ ] 5+ dedicated chatbot templates
- [ ] Setup wizards guide configuration
- [ ] Template preview works

### Workstream 2: Marketing & Launch (Week 21)

| Task | Owner | Hours | Acceptance Criteria |
|------|-------|-------|---------------------|
| "Build once, deploy three ways" messaging | Marketing | 12h | Website copy, positioning doc |
| Create comparison content | Marketing | 10h | vs Typeform, Intercom, Zendesk, ChatGPT |
| Gather case studies | Product | 16h | 3+ customer stories with metrics |
| Create demo videos | Marketing | 12h | 3-5 min videos for each use case |
| Prepare launch campaign | Marketing | 10h | HN, Product Hunt, social media |
| Update website homepage | Eng | 8h | Feature Knowledge Platform prominently |

**Total**: ~68 hours (~1.7 weeks)

**Case Study Format**:
- **Customer**: [Company name, industry, size]
- **Problem**: [What they needed]
- **Solution**: [How they used NetPad]
- **Results**: [Metrics - ticket deflection, completion rate, etc.]

**Success Criteria**:
- [ ] "Build once, deploy three ways" messaging finalized
- [ ] Comparison pages published
- [ ] 3+ case studies with metrics
- [ ] Demo videos published
- [ ] Launch campaign ready

### Workstream 3: Documentation & Onboarding (Week 22)

| Task | Owner | Hours | Acceptance Criteria |
|------|-------|-------|---------------------|
| Knowledge Platform overview doc | Docs | 8h | "What is the Knowledge Platform?" |
| "Building Your First Chatbot" tutorial | Docs | 10h | Step-by-step guide (30 min to complete) |
| Video tutorial | Docs | 8h | "Build a chatbot in 10 minutes" screencast |
| Update onboarding flow | Product | 8h | Highlight all three modes |
| Create knowledge management guide | Docs | 8h | Best practices for docs, FAQs, rules, paths |
| Self-service template customization | Docs | 6h | "Customizing a Template" guide |
| Launch day coordination | All | 4h | Synchronized publish, monitoring |

**Total**: ~52 hours (~1.3 weeks)

**Success Criteria**:
- [ ] Comprehensive documentation published
- [ ] Tutorial takes <30 min to complete
- [ ] Video tutorials published
- [ ] Onboarding updated
- [ ] Launch executes smoothly

### Phase 4 Success Metrics

- [ ] 100+ template clones per month
- [ ] 50+ chatbots deployed
- [ ] 10+ case studies / testimonials
- [ ] Coverage in relevant publications (HN front page, Product Hunt, etc.)
- [ ] Clear differentiation recognized in market
- [ ] 5+ enterprise self-hosted inquiries

**Phase 4 Total Effort**: ~184 hours (~4.6 weeks for 1 eng + marketing + product)

---

## Resource Summary

### Total Engineering Effort

| Phase | Duration | Eng Hours | Eng Weeks (40h) | Calendar Weeks |
|-------|----------|-----------|-----------------|----------------|
| Phase 0 | 2 weeks | 60 | 1.5 | 2 |
| Phase 1 | 6 weeks | 124 | 3.1 | 6 |
| Phase 2 | 7 weeks | 218 | 5.5 | 7 |
| Phase 3 | 4 weeks | 172 | 4.3 | 4 |
| Phase 4 | 3 weeks | 100* | 2.5 | 3 |
| **Total** | **22 weeks** | **674** | **16.9** | **22** |

*Phase 4 includes ~84 eng hours + ~100 marketing/product hours

### Parallelization Opportunities

Some workstreams can overlap:

- **Phase 1**: Usage tracking + FAQ work can partially parallel (saves ~1 week)
- **Phase 2**: Rules + Paths can partially parallel if 2 engineers (saves ~1.5 weeks)
- **Phase 4**: Marketing + Engineering + Docs can fully parallel

**Optimistic Timeline with 2 Engineers**: ~18 weeks (late February → mid-June)

---

## Critical Path & Dependencies

### Dependency Chain

```
Phase 0: Vector Index Creation
    ↓
Phase 0: Templates Launch (parallel)
    ↓
Phase 1: Usage Tracking → FAQ Type → Knowledge UI
    ↓
Phase 2: Rules Engine → Paths → Enhanced Conversation Engine
    ↓
Phase 3: Chatbot Mode Config → Chatbot Behavior → Chatbot Deployment
    ↓
Phase 4: Templates 2.0 → Marketing Launch
```

### Blockers to Watch

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Vector index creation fails | Low | Critical | Test in staging first; have Atlas support contact |
| Path editor complexity exceeds estimates | Medium | High | Ship basic version (form-based), iterate to visual editor |
| Retrieval quality poor | Medium | High | Invest in reranking (add to Phase 1 if needed) |
| Templates don't convert customers | Medium | Critical | Get feedback fast; iterate on IT template first |
| Chatbot escalation loses context | Medium | High | Design context capture early; test extensively |

---

## Decision Gates

### Gate 1: Phase 0 → Phase 1 (Feb 7)

**Go criteria**:
- ✅ Vector index status: READY
- ✅ At least 3 template clones
- ✅ At least 1 paying customer conversation
- ✅ RAG retrieval working end-to-end

**If no**: Extend Phase 0; do not proceed until unblocked.

### Gate 2: Phase 1 → Phase 2 (Mar 21)

**Go criteria**:
- ✅ Usage tracking deployed (0 production issues)
- ✅ FAQs being used by customers (20+ FAQs created)
- ✅ Positive feedback on conversational forms
- ✅ Knowledge tab launched

**If no**: Extend Phase 1; polish foundation before adding intelligence.

### Gate 3: Phase 2 → Phase 3 (May 9)

**Go criteria**:
- ✅ Rules and paths working in production
- ✅ Measurable improvement in form completion/quality
- ✅ Customer demand for chatbot mode (5+ requests)
- ✅ 30%+ of forms use rules or paths

**If no**: Extend Phase 2; ensure intelligence features work well before chatbot.

### Gate 4: Phase 3 → Phase 4 (Jun 6)

**Go criteria**:
- ✅ Chatbot mode working with escalation
- ✅ At least 10 chatbots deployed
- ✅ Positive feedback on "build once, deploy three"
- ✅ Resolution rate >50%

**If no**: Extend Phase 3; ensure chatbot is solid before big launch.

---

## Immediate Next Steps (This Week)

### For Engineering

1. **Create vector search index** (P0)
   - Run: `POST /api/rag/admin/ensure-index`
   - Organization: [platform org ID]
   - Monitor: Wait 5-10 min, verify status: READY

2. **Test RAG end-to-end** (P0)
   - Upload test document via UI
   - Ask question in conversational form
   - Verify retrieval returns relevant chunks

3. **Finalize @netpad/templates** (P0)
   - Build package
   - Test import in fresh project
   - Publish to NPM (beta)

### For Product

1. **Finalize IT Help Desk template** (P0)
   - Add sample IT policies (5+ documents)
   - Add starter FAQs (10+ Q&As)
   - Test cloning workflow

2. **Prepare announcement content** (P1)
   - Draft blog post
   - Draft Hacker News post
   - Draft social posts

3. **Identify first 5 waitlist users** (P1)
   - High-value users
   - Willing to give feedback
   - Schedule onboarding calls

### For Michael

1. **Review this implementation plan** (P0)
   - Adjust timelines if needed
   - Approve priorities
   - Confirm resource allocation

2. **Decide on team allocation** (P0)
   - Who owns each workstream?
   - Can we parallelize with 2 engineers?
   - Marketing/product support timeline?

3. **Communicate vision to team** (P1)
   - Share strategic roadmap
   - Share this implementation plan
   - Align on "build once, deploy three ways" messaging

---

## Summary

**The plan in one sentence**:

> Ship templates now (Feb 1), unblock RAG (this week), add intelligence features through Q1 (rules, paths), unlock chatbot mode in Q2 (May), and launch "Build once, deploy three ways" as the market story in June.

**Key insight**: You've already built ~60% of the RAG infrastructure. The blocker is **one vector index creation** (1 hour). Once unblocked, you can focus on:
1. Making it useful (FAQs, limits, UI)
2. Making it intelligent (rules, paths)
3. Making it versatile (chatbot mode)

Each phase delivers customer value while building toward the full vision. If you stopped after any phase, you'd still have shipped meaningful improvements.

**This is achievable.** With focused execution, you'll have a differentiated Knowledge Platform by mid-2026.

---

## Appendix: Feature Checklist

### Phase 0: Unblock & Launch
- [ ] Vector search index created (READY status)
- [ ] RAG retrieval tested end-to-end
- [ ] @netpad/templates published to NPM
- [ ] IT Help Desk template live
- [ ] Templates announcement (blog + HN)
- [ ] First 5 customers onboarded

### Phase 1: Foundation
- [ ] Usage tracking + tier limits
- [ ] FAQ knowledge type
- [ ] Knowledge tab in form builder
- [ ] Starter FAQs in templates

### Phase 2: Form Intelligence
- [ ] Rules engine (5+ triggers, 5+ actions)
- [ ] Conversation paths (guided flows)
- [ ] Rules UI + Path editor
- [ ] Pre-built rules + paths in templates
- [ ] Conversation testing UI

### Phase 3: Knowledge Chatbot
- [ ] Chatbot deployment mode
- [ ] Persona + behavior configuration
- [ ] Escalation system (chatbot → form)
- [ ] Chatbot embed widget
- [ ] Chatbot analytics dashboard
- [ ] Chatbot templates (IT, HR, Support)

### Phase 4: Launch
- [ ] All templates updated with intelligence
- [ ] "Build once, deploy three ways" messaging
- [ ] Comparison content published
- [ ] 3+ case studies
- [ ] Demo videos
- [ ] Launch campaign executed

---

*End of Implementation Plan*
