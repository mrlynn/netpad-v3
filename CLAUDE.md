# NetPad Memory Bank
## AI Assistant Strategic Context Document

**Version:** 1.0.0  
**Last Updated:** January 21, 2025  
**Owner:** Michael (Founder)  
**Purpose:** Canonical context for AI assistants working on NetPad development, documentation, and strategy

---

## Document Usage

This Memory Bank provides definitive strategic context for AI assistants. When helping with NetPad:

- **Trust this document** over inferences or assumptions
- **Quote specific sections** when making recommendations
- **Flag conflicts** if user requests contradict this context
- **Request updates** if information appears outdated

---

## 1. Current Focus & Priorities

NetPad development operates on three tiers with distinct timelines:

### Tier 1: Active Sprint Work (Now)

| Initiative | Description | Status |
|------------|-------------|--------|
| Cloud platform UX | Navigation redesign: hierarchy-first → application-centric | Active |
| Conversational forms | "Build once, deploy twice" positioning as key differentiator | Active |
| Testing infrastructure | Automated + manual QA frameworks (22 test cases, 7 user journeys) | Active |
| Template enhancement | Rich marketing content, SEO metadata, developer documentation | Active |

### Tier 2: Strategic Foundation (Q1 2025)

| Initiative | Description | Target Date |
|------------|-------------|-------------|
| @netpad/templates NPM package | Extract templates from codebase to standalone package | **Feb 1, 2025** (announcement) |
| Documentation overhaul | Developer-focused docs at docs.netpad.io | Ongoing |
| MCP tools refinement | AI-powered form/workflow generation via Model Context Protocol | Ongoing |

**Note on @netpad/templates launch:** Waitlist will remain active post-announcement for UX research with early developers.

### Tier 3: Lower Priority (Active but Not Sprint Focus)

| Initiative | Description | Notes |
|------------|-------------|-------|
| Standalone export | Export NetPad apps as standalone Next.js applications | Important feature, needs better documentation |
| Community marketplace | User-submitted applications with approval workflow | Committed, timeline TBD |
| Self-hosted deployment | Enterprise on-prem installation | Theoretical customers, important for positioning |

**Critical:** Standalone export is NOT deferred—it's a lower-priority but important feature that must stay active.

---

## 2. Target Users & Personas

### Primary Persona: Internal Platform Teams at SMBs

**Profile:** Technical operations or IT teams at companies with 50-500 employees who need MongoDB-connected internal tools.

**Demographics:**
- Company size: 50-500 employees (sweet spot)
- Also relevant: Solopreneurs building internal tools
- Priority verticals: **Finance** and **Healthcare** (huge targets)

**Key characteristics:**
- Technical enough to appreciate MongoDB-native architecture
- Want to move fast without writing full applications
- Building: help desks, onboarding forms, approval workflows, data collection tools
- Pain point: "We need this internal tool but don't have 3 months of dev time"

**What they evaluate:**
- Time to first working app (target: <30 minutes)
- Can it connect to our existing MongoDB?
- Does it handle our workflow/routing needs?
- What does deployment look like?

**Marketing approach:** Organic discovery initially. No active marketing campaigns yet.

### Secondary Persona: Developers Evaluating Build vs. Buy

**Profile:** Senior developers or tech leads researching internal tooling options.

**Key characteristics:**
- Will inspect the schema, TypeScript configs, and architecture first
- Care about extensibility and not being locked in
- Comparing against: building custom, Retool, Appsmith, or Zendesk/Jira for specific use cases

**What they evaluate:**
- Code quality and architecture decisions
- Can I extend this if needed?
- What's the escape hatch if we outgrow it?
- Open source credibility (MIT license, GitHub activity)

**Marketing approach:** Organic discovery. These users find NetPad through GitHub, Hacker News, or technical content.

### Tertiary Persona (Future): External Developers Extending NetPad

**Profile:** Developers building on top of NetPad's ecosystem.

**Timeline:** Not a current optimization target. Becomes relevant when:
- @netpad/* packages are stable and documented
- Marketplace supports third-party submissions
- API surface is finalized and versioned

**Do not optimize documentation or features for this persona in 2025-H1.**

---

## 3. Technical Architecture

### Stack Summary

| Layer | Technology | Notes |
|-------|------------|-------|
| Framework | Next.js 14+ (App Router) | Required |
| UI Library | React 18+ | Required |
| Component Library | Material-UI (MUI) 5 | **Prefer over Tailwind** |
| Language | TypeScript | Strict typing required |
| Database | MongoDB Atlas | **Only supported database** |
| DB Driver | MongoDB Driver 6.5+ | Minimum version |
| Vector Search | MongoDB Atlas Vector Search | For RAG features |
| AI/LLM | Centralized provider | Priority: Ollama → OpenAI → OpenRouter |

### Repository Structure

```
netpad-3/
├── src/                    # Main Next.js application
│   ├── app/               # App Router pages and API routes (165+ endpoints)
│   ├── components/        # React components
│   │   ├── FormBuilder/   # Form building UI
│   │   ├── WorkflowEditor/# Workflow building UI (ReactFlow)
│   │   └── ConversationalForm/  # AI chat interface
│   ├── lib/               # Core libraries
│   │   ├── ai/           # AI service layer, agents, RAG
│   │   ├── platform/     # Database connections (SERVER ONLY)
│   │   └── storage/      # Blob storage utilities
│   ├── hooks/            # Client-side React hooks
│   └── types/            # TypeScript definitions
├── packages/             # NPM packages
│   ├── templates/        # @netpad/templates (Feb 1 launch)
│   ├── mcp-server/       # MCP tools for AI assistants
│   └── cli/              # CLI package (ACTIVE - keep current)
└── docs/                 # Documentation source (Docusaurus)
```

### Critical Architecture Rules

| Rule | Description | Why |
|------|-------------|-----|
| Client/server boundary | Never import MongoDB or `platform/db` in client components | Prevents build errors with native modules |
| LLM operations | Always use centralized `aiService`, never hardcode model names | Ensures metrics tracking, provider flexibility |
| Batch operations | Use `onAddTemplate()` for multiple items, not loops | Prevents UI bugs with repeated dialogs |
| Database | MongoDB Atlas only | No local MongoDB, DocumentDB, or CosmosDB |
| MongoDB version | 6.5+ minimum | Required for latest features and Atlas Vector Search |

### Packages Status

| Package | Status | Priority |
|---------|--------|----------|
| @netpad/templates | Extracting, Feb 1 announcement | High |
| @netpad/mcp-server | Active | High |
| @netpad/cli | **Active - must stay current** | Medium |
| @netpad/forms | Future | Low |
| @netpad/workflows | Future | Low |

---

## 4. Deployment Modes

### Hierarchy of Emphasis

```
1. NetPad Cloud (PRIMARY) ─────────────────────────────────────────────────
   └─ Default recommendation for docs, marketing, onboarding

2. Self-Hosted NetPad (SECONDARY) ─────────────────────────────────────────
   └─ For compliance/data residency requirements
   └─ Theoretical customers currently (important for positioning)

3. Exported Standalone Apps (TERTIARY but IMPORTANT) ──────────────────────
   └─ Critical feature, needs better documentation
   └─ Do not defer or deprecate
```

### NetPad Cloud (Primary)

**What it is:** Fully managed SaaS at netpad.io

**Target users:** SMB teams who want zero infrastructure management

**Key value props:**
- Instant start, no setup
- Managed upgrades and scaling
- Team collaboration built-in
- Premium features (advanced RAG, priority support)

**Pricing status:** Model exists but will likely change before release. Considering 3-day free trial (all features). Not yet documented or implemented.

**Documentation approach:** This is the default. All getting-started guides assume cloud deployment.

### Self-Hosted NetPad (Secondary)

**What it is:** Deploy NetPad on your own infrastructure

**Target users:** Enterprises with compliance/data residency requirements

**Current customer status:** Theoretical (no production enterprise customers yet)

**Key value props:**
- Data stays in your environment
- Connect to existing MongoDB Atlas clusters
- Full feature parity with cloud (minus managed services)

**Documentation approach:** Separate self-hosted installation guide. Do not intersperse with cloud docs.

### Exported Standalone Apps (Tertiary but Critical)

**What it is:** Export a NetPad application as a standalone Next.js app

**Status:** 
- Feature exists and works
- **Under-documented** (needs improvement)
- Lower priority but **must stay active**

**Value prop:** True ownership—eject from NetPad if needed, no lock-in

**Documentation approach:** Needs dedicated guide. Important for developer trust and "escape hatch" positioning.

### "Build Once, Deploy Twice" Clarification

**This phrase refers to form experience modes, NOT deployment infrastructure:**

| Mode | Description |
|------|-------------|
| Traditional form | Field-based UI with validation, conditional logic, multi-page |
| Conversational form | AI-powered chat interface collecting the same data |

Same schema → two user experiences. **This is NetPad's key differentiator.**

Do not confuse with cloud vs. self-hosted vs. standalone deployment.

---

## 5. Templates & Marketplace

### Two Distinct Concepts

| Concept | What It Is | Management |
|---------|------------|------------|
| **Template Gallery** | Pre-built form templates | @netpad/templates NPM package |
| **Application Marketplace** | Full applications with approval workflow | In-platform, "Official App" badges |

### Template Gallery (Current - Core Feature)

**What exists today:**
- 100+ templates across 14 categories
- 25+ form templates, 11 workflow templates
- Pre-built for common use cases
- Managed via @netpad/templates package (launching Feb 1)

**Categories:**

| Category | Description |
|----------|-------------|
| Business | Contact forms, lead capture |
| Events | Registration, RSVP |
| Feedback | Surveys, NPS |
| Support | Help desk, bug reports |
| Healthcare | Patient intake (priority vertical) |
| HR | Job applications, onboarding |
| Finance | Expense reports (priority vertical) |
| Education | Course evaluations, enrollment |
| E-commerce | Order forms |
| Real Estate | Listing inquiries |

**Note:** Category counts are approximate and may need verification against actual template data.

**Documentation approach:** Templates are first-class. Every use case guide should reference relevant templates.

### Application Marketplace (Committed - Timeline TBD)

**What's planned:**
- User-submitted applications with approval workflow
- **"Official App" badge** for NetPad-verified applications
- Anyone can submit applications for approval
- Third-party integrations and workflow nodes
- Analytics and download tracking

**Current status:** Committed feature, no specific timeline yet (likely 2025-H2 or later)

**Documentation approach:**
- Don't promise specific marketplace features that don't exist yet
- Use "Template Gallery" for current template browsing
- Use "Application Marketplace" for future app ecosystem
- Roadmap section can describe marketplace vision

---

## 6. AI Assistant Guidance Rules

### Always Do

1. **Recommend cloud deployment first** unless user specifically asks about self-hosted or standalone
2. **Reference templates** when discussing use cases—there's probably a template for it
3. **Use MUI components** in code suggestions, not Tailwind
4. **Check MongoDB version compatibility** (6.5+ minimum)
5. **Route LLM operations through centralized aiService** in code suggestions
6. **Emphasize "build once, deploy twice"** when discussing conversational forms
7. **Mention finance and healthcare** as priority verticals when relevant
8. **Keep CLI package suggestions current**—it's actively maintained

### Never Do

1. **Never suggest local MongoDB** for production—Atlas only
2. **Never hardcode LLM model names** like 'gpt-4o-mini'—use provider config
3. **Never import server code in client components** (platform/db, MongoDB driver)
4. **Never describe standalone export as deprecated or abandoned**—it's important
5. **Never promise specific marketplace features** that don't exist yet
6. **Never conflate "build once, deploy twice" with deployment modes**—it's about form UX
7. **Never suggest Tailwind over MUI** for component styling
8. **Never assume marketing channels exist**—growth is organic currently

### Clarification Prompts

When user requests are ambiguous, ask:

| Ambiguity | Clarification |
|-----------|---------------|
| "Deploy my app" | "Do you mean publish to NetPad Cloud, set up self-hosted, or export as standalone?" |
| "Add a template" | "Do you mean use an existing template from the gallery, or create a new template for @netpad/templates?" |
| "Marketplace" | "Are you referring to the Template Gallery (forms) or the Application Marketplace (full apps)?" |
| "Mobile app" | "NetPad forms are responsive web apps. Are you asking about mobile browser experience or native app export?" |

---

## 7. Anti-Patterns to Avoid

### Strategic Anti-Patterns

| Anti-Pattern | Why It's Wrong | Correct Approach |
|--------------|----------------|------------------|
| "NetPad competes with Typeform" | Wrong positioning | "NetPad is MongoDB-native, competing with Atlas + form builders" |
| "Self-hosted is the main use case" | Inverts priority | Cloud is primary, self-hosted is for compliance edge cases |
| "The CLI is optional/deprecated" | Factually wrong | CLI is active and must stay current |
| "Standalone export is a workaround" | Undermines feature | It's a deliberate escape hatch for developer trust |

### Technical Anti-Patterns

| Anti-Pattern | Why It's Wrong | Correct Approach |
|--------------|----------------|------------------|
| `import { db } from '@/lib/platform/db'` in client | Build error | Server components or API routes only |
| `model: 'gpt-4o-mini'` hardcoded | Breaks Ollama users | Use `getDefaultModel()` from provider config |
| `for (field of fields) { onAddField(field) }` | Only adds last field | Use `onAddTemplate(fields)` for batch |
| Suggesting MongoDB 5.x compatibility | Below minimum | MongoDB 6.5+ required |

### Documentation Anti-Patterns

| Anti-Pattern | Why It's Wrong | Correct Approach |
|--------------|----------------|------------------|
| Mixing cloud and self-hosted instructions | Confuses readers | Separate guides for each deployment mode |
| Promising community marketplace features | Doesn't exist yet | Describe as roadmap/future |
| Ignoring templates in use case guides | Misses acceleration | Always reference relevant templates |
| Using "Marketplace" for template browsing | Wrong term | "Template Gallery" for forms, "Marketplace" for apps |

---

## 8. Key Dates & Milestones

| Date | Milestone | Notes |
|------|-----------|-------|
| **Feb 1, 2025** | @netpad/templates announcement | Waitlist stays active for UX research |
| TBD | Application Marketplace launch | Committed, no date set |
| TBD | First enterprise self-hosted customer | Currently theoretical |
| TBD | Pricing finalization | Model exists, will change; 3-day trial planned |

---

## 9. Competitive Positioning

### NetPad Is

- MongoDB-native development platform
- "MongoDB Atlas + form builder + workflow automation" in one
- Open source (MIT license) with cloud option
- Optimized for internal tools at SMBs

### NetPad Is Not

- A Typeform/JotForm competitor (we're developer-focused, not marketing-focused)
- A general-purpose database tool (MongoDB only)
- An enterprise-first platform (SMBs are primary)
- A no-code-only tool (developers can access configs, schemas, code)

### Comparison Framework

| Comparing Against | NetPad Advantage |
|-------------------|------------------|
| Retool/Appsmith | MongoDB-native, conversational forms, open source |
| Zendesk/Jira Service Desk | Self-hosted option, no per-seat pricing, schema ownership |
| Custom development | 30 minutes vs. 3 months, templates, maintained platform |
| Typeform + Zapier + MongoDB | Single platform, no integration tax, native data model |

---

## 10. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Jan 21, 2025 | Initial Memory Bank creation |

---

## Document Maintenance

**Update triggers:**
- Tier 1 priorities change
- New package launches (@netpad/*)
- Deployment mode priorities shift
- Pricing model finalizes
- First enterprise customer signs
- Marketplace launches

**Update process:**
1. Increment version number
2. Update "Last Updated" date
3. Add entry to Version History
4. Notify AI assistants of changes via context update

---

*End of Memory Bank Document*
