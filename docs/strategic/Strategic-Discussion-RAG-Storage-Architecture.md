# Strategic Discussion: RAG Storage Architecture & Free Tier Economics

**Date:** January 28, 2025
**Author:** Michael Lynn
**Purpose:** Seek strategic guidance on RAG feature architecture and free tier sustainability
**Audience:** Strategic advisors, technical advisors, potential investors

---

## Executive Summary

NetPad has successfully implemented Knowledge-Guided Conversational Forms (RAG features), but faces a critical architectural decision that impacts:
- Free tier economics and sustainability
- Product positioning (MongoDB-native vs. managed service)
- Data sovereignty and compliance
- Competitive differentiation
- Path to monetization

**The core question:** Should RAG documents and embeddings be stored in NetPad's infrastructure (centralized) or in users' MongoDB clusters (distributed)?

This decision has cascading implications for pricing, positioning, and platform economics.

---

## Problem Statement

### Current Situation

NetPad offers two data storage patterns that create architectural tension:

| Data Type | Current Storage | Ideal Vision |
|-----------|----------------|--------------|
| **Forms & Workflows** | Intended for user's MongoDB cluster | "Connect your MongoDB" positioning |
| **RAG Documents/Embeddings** | Platform database (NetPad-controlled) | Unclear - causes confusion |

### The Tension

**Original Vision:** "MongoDB-native platform where users bring their own Atlas cluster"
- Users connect their MongoDB Atlas clusters
- Forms write to user's database
- Users own their data completely
- NetPad positions as developer tool, not data warehouse

**Current Reality:** RAG feature stores data centrally
- Documents uploaded to NetPad's Vercel Blob storage
- Embeddings stored in NetPad's MongoDB cluster
- Vector search indexes on NetPad's infrastructure
- Users don't have direct access to their embeddings

**This creates:**
1. **Mixed messaging:** "Connect your MongoDB" but RAG doesn't use it
2. **Cost uncertainty:** Who pays for RAG storage at scale?
3. **Data sovereignty issues:** Enterprise customers may balk at centralized RAG data
4. **Scaling concerns:** NetPad cluster must handle all users' RAG workloads

---

## The Free Tier Challenge

### What We Want to Offer (Free Tier)

To compete with Typeform, JotForm, and attract developers:
- ✅ Unlimited forms (limited by MongoDB cluster tier)
- ✅ Basic workflows
- ✅ **Knowledge-Guided Conversational Forms** (RAG)
- ✅ MongoDB-native storage
- ✅ No credit card required to start

### The Economic Reality

**RAG is expensive at scale:**

| Resource | Cost Driver | Annual Cost (1000 free users) |
|----------|-------------|-------------------------------|
| Vector embeddings | API calls to generate | $500-2,000 (assuming 10 docs/user) |
| Vector storage | MongoDB Atlas Vector Search | $1,200-3,600 (storage + compute) |
| Blob storage | Vercel Blob or S3 | $600-1,800 (document PDFs/files) |
| Vector search queries | Compute for retrieval | $1,200-2,400 (active usage) |
| **Total** | | **$3,500-9,800/year** |

**Per-user cost:** $3.50-9.80/year (if RAG is platform-hosted)

**Problem:** Free tier users can't cover these costs. We need 10-20 paid users to subsidize 100 free users.

### Why RAG is Critical

**Without RAG:**
- NetPad is "yet another form builder"
- Competing on features against established players
- MongoDB-native is niche positioning

**With RAG:**
- **Unique differentiator:** "Build once, deploy twice" (traditional + AI chat)
- **AI-native forms** is a growing category
- **Knowledge-guided forms** solve real problems (compliance, support, HR)
- Positions NetPad as cutting-edge, not commodity

**We cannot launch without RAG in free tier** - it's our key differentiator.

---

## Strategic Options

### Option 1: Centralized Platform Storage (Current)

**Architecture:**
- RAG data stored in NetPad's MongoDB cluster
- NetPad manages vector search indexes
- Users access via API only

**Pros:**
- ✅ Works with M0 free tier (no vector search requirement)
- ✅ Easier onboarding (no cluster setup needed)
- ✅ Consistent performance (our cluster, our control)
- ✅ Can optimize/cache globally
- ✅ Lower barrier to entry

**Cons:**
- ❌ NetPad pays for all storage/compute
- ❌ Doesn't scale economically with free users
- ❌ Data sovereignty concerns for enterprises
- ❌ Conflicts with "MongoDB-native" positioning
- ❌ Users can't query their embeddings directly
- ❌ Lock-in perception (data not truly portable)

**Economics:**
- Cost: $3.50-9.80/user/year
- Revenue model: Must convert 10-20% to paid to break even
- Risk: High CAC, low conversion = unsustainable

**Best for:** Managed service positioning, short-term growth

---

### Option 2: User-Cluster Storage (Distributed)

**Architecture:**
- RAG data stored in user's MongoDB Atlas cluster
- User creates vector search indexes
- NetPad provides tools/automation to help

**Pros:**
- ✅ User pays for their own storage
- ✅ True "MongoDB-native" positioning
- ✅ Data sovereignty (user owns everything)
- ✅ Users can query embeddings directly
- ✅ Scalable economics (costs follow value)
- ✅ No lock-in perception

**Cons:**
- ❌ Requires M10+ cluster for vector search ($57/month)
- ❌ **Major barrier for free tier users**
- ❌ Inconsistent performance (different clusters)
- ❌ Harder to support/debug
- ❌ Users must understand Atlas setup
- ❌ Competitive disadvantage vs. Typeform

**Economics:**
- Cost: $0 to NetPad (user pays Atlas directly)
- Revenue model: Upsell to paid for features, not storage
- Risk: Friction kills free tier adoption

**Best for:** Enterprise customers, developer-first positioning

---

### Option 3: Hybrid Tiered Approach (Recommended)

**Architecture:**
- **Free tier:** Platform storage with limits (e.g., 5 documents, 50MB)
- **Pro tier:** User's cluster OR expanded platform storage
- **Enterprise:** User's cluster (data sovereignty)

**Implementation:**

| Tier | RAG Storage | Limits | Annual Cost to NetPad |
|------|-------------|--------|----------------------|
| **Free** | Platform DB | 5 docs, 50MB total, 100 queries/month | $1-3/user |
| **Pro** ($20/mo) | Platform OR user cluster | 100 docs, 5GB, unlimited queries | $0-10/user |
| **Enterprise** | User cluster (required) | Unlimited | $0 |

**Pros:**
- ✅ Free tier can test RAG without friction
- ✅ Limits keep costs manageable
- ✅ Clear upgrade path (more docs = pay)
- ✅ Enterprise gets data sovereignty
- ✅ Aligns costs with value delivered
- ✅ Competitive with free tiers elsewhere

**Cons:**
- ❌ Complexity in implementation (two storage backends)
- ❌ Migration path when upgrading tiers
- ❌ Still subsidizes free tier (but capped)

**Economics:**
- Cost: $1-3/user for free, $0-10/user for paid
- Revenue model: Upsell based on usage, not just features
- Risk: Medium - depends on conversion rates

**Best for:** Balancing growth and sustainability

---

### Option 4: "Freemium with Consumption Credits"

**Architecture:**
- Platform storage for all tiers
- Free tier gets monthly credits (e.g., 100 document uploads, 500 queries)
- Pay-as-you-go beyond credits

**Pricing Model:**
```
Free:    100 uploads/month, 500 queries/month, 50MB storage
Pro:     500 uploads/month, 5K queries/month, 5GB storage ($20/mo)
Add-on:  $5/100 uploads, $10/1K queries, $5/GB storage
```

**Pros:**
- ✅ Aligns costs directly with usage
- ✅ Free tier viable for light usage
- ✅ Predictable NetPad costs
- ✅ Familiar model (like Vercel, AWS)
- ✅ High-value users pay more

**Cons:**
- ❌ Complexity in metering/billing
- ❌ Users may hit limits unexpectedly
- ❌ Still requires platform investment

**Economics:**
- Cost: Variable, capped by credits
- Revenue model: Consumption-based
- Risk: Low - usage correlates with value

**Best for:** SaaS-first companies, usage-based pricing strategy

---

## Competitive Landscape

### How Others Handle This

| Competitor | Free Tier RAG/AI | Storage Model | Limits |
|------------|------------------|---------------|--------|
| **Typeform** | ❌ No AI forms (yet) | Centralized | N/A |
| **JotForm** | ⚠️ Limited AI features | Centralized | 5 forms, 100 submissions |
| **Fillout** | ✅ AI forms | Centralized | 1,000 submissions/mo |
| **Tally** | ❌ No AI | Centralized | Unlimited forms |
| **Retool** | ✅ AI features | User's DB or hosted | Free tier: 5 users |
| **Airtable** | ✅ AI fields | Centralized | 1,000 records |

**Key insight:** Most competitors use centralized storage with usage limits. None offer true "bring your own database" for AI features.

**NetPad advantage:** We could be the ONLY platform offering MongoDB-native RAG with user data sovereignty.

---

## Strategic Questions for Advisors

### 1. Product Positioning

**Question:** What is NetPad's core positioning?

**A. Managed AI Forms Service**
- Platform handles all infrastructure
- Users pay for convenience
- Compete on features/UX
- → Implies centralized storage

**B. MongoDB-Native Developer Platform**
- Users own their infrastructure
- NetPad provides tools/automation
- Compete on openness/flexibility
- → Implies user-cluster storage

**C. Hybrid (Start A, end at B)**
- Free/Pro = managed service
- Enterprise = self-hosted option
- → Implies tiered approach

**Your input:** Which positioning resonates most with our target customers (SMB internal teams)?

---

### 2. Free Tier Economics

**Question:** What should the free tier look like?

**Option A: Generous (Growth-focused)**
- Unlimited forms, 50 docs/RAG, 1K queries/month
- Target: 10K free users → 500 paid (5% conversion)
- Annual cost: $10K-30K for free tier
- Bet: Volume drives paid conversions

**Option B: Conservative (Sustainable)**
- 5 forms, 5 docs/RAG, 100 queries/month
- Target: 2K free users → 200 paid (10% conversion)
- Annual cost: $2K-6K for free tier
- Bet: Quality over quantity

**Option C: Consumption Credits**
- Monthly credits for uploads/queries
- Pay-as-you-go beyond limits
- Cost scales with usage
- Bet: Usage-based aligns costs/value

**Your input:** What conversion rates are realistic for developer tools? What CAC can we sustain?

---

### 3. Differentiation Strategy

**Question:** What makes NetPad worth paying for?

**RAG as Differentiator:**
- If RAG is free AND unlimited → hard to monetize
- If RAG is limited on free tier → clear upsell
- If RAG requires user cluster → barrier to entry

**Alternative Differentiators:**
- Advanced workflows (premium)
- Team collaboration (premium)
- Custom branding (premium)
- Support/SLA (premium)
- Deployment options (premium)

**Your input:** Is RAG our PRIMARY differentiator, or one of many? Should free tier get full RAG or limited?

---

### 4. Data Sovereignty & Compliance

**Question:** How important is data sovereignty for our target market?

**Industries that care:**
- Finance (compliance)
- Healthcare (HIPAA)
- Government (FedRAMP)
- EU companies (GDPR)

**These customers likely:**
- Will pay for Enterprise tier
- Require self-hosted/user-cluster option
- Won't use free tier anyway

**Your input:** Should we optimize free tier for developers/SMBs, and offer user-cluster storage as Enterprise feature?

---

### 5. Path to Monetization

**Question:** What's the most viable path to profitability?

**Path A: SaaS Subscription**
- Free → Pro ($20/mo) → Teams ($50/user/mo) → Enterprise (custom)
- Monetize on features, users, volume
- Platform storage for all (easier)
- Risk: Costs scale with free users

**Path B: Usage-Based**
- Free credits → Pay-as-you-go → Reserved capacity
- Monetize on consumption (queries, storage, uploads)
- Platform storage for all (easier to meter)
- Risk: Complexity in billing

**Path C: Infrastructure-as-Code**
- Free tier (limited) → Paid (user cluster required)
- Monetize on tools/automation, not storage
- Open-source approach, paid support
- Risk: Lower revenue per user

**Your input:** Which model fits developer tool market best? What's our 3-year revenue goal?

---

## Recommended Decision Framework

### Evaluation Criteria

| Criterion | Weight | Option 1 (Platform) | Option 2 (User) | Option 3 (Hybrid) | Option 4 (Credits) |
|-----------|--------|---------------------|-----------------|-------------------|-------------------|
| **Time to market** | 20% | 5 (ready now) | 2 (needs work) | 3 (complex) | 4 (moderate) |
| **Free tier viability** | 25% | 2 (expensive) | 1 (barrier) | 4 (balanced) | 5 (aligned) |
| **Differentiation** | 20% | 3 (managed) | 5 (unique) | 4 (flexible) | 3 (standard) |
| **Scalability** | 15% | 2 (cost scales) | 5 (user pays) | 4 (capped) | 5 (usage-based) |
| **Developer experience** | 20% | 5 (easy) | 2 (complex) | 4 (tiered) | 4 (familiar) |

**Scoring:** 1 = Poor, 5 = Excellent

### Preliminary Recommendation

Based on analysis, **Option 3 (Hybrid Tiered)** or **Option 4 (Consumption Credits)** appear strongest:

**Option 3 (Hybrid):**
- **Pros:** Balances growth and costs, clear upgrade path, serves all segments
- **Cons:** Implementation complexity, two storage backends
- **Best if:** We want both developer adoption AND enterprise sales

**Option 4 (Credits):**
- **Pros:** Aligns costs/value perfectly, familiar model, scales naturally
- **Cons:** Metering complexity, unpredictable user costs
- **Best if:** We're confident in usage-based pricing and have billing infrastructure

---

## Questions for Advisors

### Business Model
1. What free tier limits would you find acceptable as a user?
2. What conversion rate (free → paid) is realistic for developer tools?
3. Should we optimize for user growth or unit economics in year 1?

### Product Strategy
4. Is "MongoDB-native" positioning critical, or can we be more pragmatic?
5. Should RAG be the PRIMARY differentiator or one of several?
6. How important is data sovereignty for SMBs (our target)?

### Competitive Position
7. Can we compete with Typeform/JotForm on features alone, or do we need unique positioning?
8. Is "AI-native forms" a big enough market to build around?
9. What's our unfair advantage: MongoDB integration, RAG, or something else?

### Financial
10. What's an acceptable CAC:LTV ratio for this market?
11. Should we raise pricing on Pro tier to subsidize free tier?
12. What annual cost for free tier is sustainable pre-funding?

### Technical
13. Should we build for flexibility (hybrid) or simplicity (one model)?
14. Is implementing two storage backends worth the strategic optionality?
15. Can we migrate users between storage models as they upgrade?

---

## Immediate Next Steps

Regardless of strategic direction, these actions are needed:

### Short-term (This Week)
1. **Create the vector search index** for current platform DB setup
2. **Document current architecture** clearly in codebase
3. **Implement basic usage tracking** for RAG features
4. **Add storage limits** to free tier (5 docs, 50MB as starting point)

### Medium-term (This Month)
1. **Gather user feedback** on RAG feature value
2. **Analyze costs** of first 100 RAG users
3. **Prototype** user-cluster storage option (proof of concept)
4. **Design migration path** between storage models

### Long-term (This Quarter)
1. **Finalize pricing model** based on data
2. **Implement chosen architecture** (platform, user, or hybrid)
3. **Launch paid tiers** with clear RAG limits
4. **Monitor conversion rates** and adjust

---

## Appendix: Technical Details

### Current RAG Implementation

**Stack:**
- Embeddings: OpenAI Ada-002 or Voyage AI (1536 dimensions)
- Storage: MongoDB Atlas (platform cluster)
- Vector Search: MongoDB Atlas Vector Search
- Files: Vercel Blob Storage
- Reranking: Voyage Rerank API (optional)

**Collections:**
```
Database: org_[orgId] (platform cluster)
├── rag_documents (metadata)
└── rag_document_chunks (text + embeddings + vector index)
```

**Indexes:**
```javascript
{
  "name": "rag_vector_index",
  "type": "vectorSearch",
  "fields": [
    { "type": "vector", "path": "embedding", "numDimensions": 1536, "similarity": "cosine" },
    { "type": "filter", "path": "formId" },
    { "type": "filter", "path": "documentId" }
  ]
}
```

### Alternative: User-Cluster Implementation

**Changes required:**
1. Modify storage functions to use `getProjectDb()` instead of `getOrgDb()`
2. Provide UI for users to create vector search indexes
3. Add cluster tier detection (warn if < M10)
4. Handle migration when users upgrade/downgrade
5. Support both models during transition

**Estimated effort:** 1-2 weeks development + 2 weeks testing

### Cost Analysis Assumptions

**Based on:**
- Average user uploads 10 documents (50 pages each)
- 500 pages → 500 chunks → 500 embeddings
- 500 embeddings × $0.0001 = $0.05/user (one-time)
- Storage: 500 chunks × 2KB = 1MB + 500 embeddings × 6KB = 3MB = 4MB/user
- Vector search: $0.10/GB/month = $0.0004/user/month
- Queries: 100 queries/month × $0.001 = $0.10/user/month
- **Total annual:** ~$1.50/user (light usage) to $10/user (heavy usage)

---

## Contact & Feedback

**Please provide feedback on:**
1. Which option (1-4) do you recommend?
2. What free tier limits make sense?
3. What am I missing in this analysis?
4. What additional questions should I be asking?

**Contact:** Michael Lynn
**Timeline:** Seeking input by February 7, 2026
**Decision deadline:** February 14, 2026

---

*This document is intended to frame the strategic discussion. All cost estimates are preliminary and should be validated with actual usage data.*

---

## Advisor Response – AI Assistant (Cursor / GPT‑5.1)

**Date:** January 27, 2026  
**Advisor:** AI Product & Architecture Assistant (Cursor, GPT‑5.1)

### 1. Recommended Strategic Direction

- **Primary recommendation:** Pursue **Option 3 (Hybrid Tiered)** with a **lightweight consumption overlay inspired by Option 4** rather than a pure credits model.
  - **Why:**  
    - Hybrid preserves the **MongoDB‑native, user‑cluster narrative** for Enterprise while giving you a **fast, low‑friction SaaS story** for Free/Pro.  
    - A thin consumption layer (hard free caps + soft Pro caps with “fair use”/overage) lets you **protect unit economics** without forcing users to understand full usage pricing on day one.
  - **Positioning framing:**  
    - “**Managed AI forms by default; MongoDB‑native escape hatch when you grow.**”  
    - Cloud first → Self‑hosted / user‑cluster as the credible enterprise path, not the starting point.

### 2. Concrete Free/Pro Design (Opinionated Defaults)

Assuming SMB internal tools as primary user:

- **Free (growth‑optimized but bounded)**
  - **Forms/Workflows:** 10 forms, 3 workflows.
  - **RAG:** 5 docs, 25MB total, **150 queries/month**.
  - **Intent:** Let a small team fully try “knowledge‑guided forms” for one or two serious use cases without thinking about Atlas or pricing.
  - **Economic target:** Keep effective cost **≤ $2/user/year** via:
    - Aggressive doc/query caps.
    - Background cleanup of obviously abandoned orgs.

- **Pro (flagship monetization tier – target $20–$29/month)**
  - **RAG:** 100 docs, 2–5GB total, 5K queries/month “fair use”; above that, soft‑gated with “you’re hitting heavy usage, talk to us / upgrade to Teams”.
  - **Storage model:** Default to **platform storage**, but allow **opt‑in user‑cluster** for orgs that already run M10+ (early enterprise‑ish teams).
  - **Differentiators at this tier:**
    - Team features, audit trail, richer workflow nodes, basic SSO, no NetPad branding.
    - “Production‑ready” limits and reliability story, not just “bigger numbers”.

- **Enterprise / Self‑Hosted**
  - Make **user‑cluster RAG storage mandatory** here; this is where sovereignty and Atlas expertise are part of the pitch.
  - Lean into “**your data, your cluster, our tooling**” and price for value, not usage.

### 3. How I’d Answer Your Key Questions

- **Product positioning (Q1):**  
  - For SMB internal teams, **C. Hybrid (start as managed, end as MongoDB‑native)** is the most credible.  
  - They want **zero‑friction onboarding now** with a believable story that they can “take it over” later (user cluster, export, self‑host).

- **Free tier economics (Q2):**
  - For a bottoms‑up developer tool with clear time‑to‑value, a **3–8% free→paid conversion** is realistic if you:
    - Make **RAG obviously useful in the free tier** (not just a demo), and
    - Put the first real “ouch” moment behind a Pro paywall (more docs, higher query caps, multi‑team).
  - In year 1 pre‑funding, aim to keep **all‑in free‑tier infra spend ≤ $5k/year**, even if it means nudging some high‑usage “free” teams to talk to you manually.

- **Differentiation (Q3):**
  - Treat **RAG as the hero differentiator for acquisition**, but not the only thing you monetize.
  - Revenue levers should be:
    - RAG capacity (docs/queries/storage).
    - **Workflow sophistication, collaboration, environments, and governance**.
    - Deployment options (Cloud vs self‑hosted vs exported apps).

- **Data sovereignty (Q4):**
  - For SMBs, sovereignty is **“nice‑to‑have until a specific customer says no.”**  
  - That argues for:
    - **Platform storage as the default** for Free/Pro.
    - Having an **enterprise‑grade Atlas/user‑cluster path ready**, but not over‑optimized for self‑serve in 2025.

- **Path to monetization (Q5):**
  - Start with **SaaS subscription (Path A) layered with light usage guards**, not full usage pricing (Path B) or infra‑as‑code (Path C).
  - Over time, you can:
    - Introduce **overage/credits** for high‑usage Pro/Teams orgs.
    - Reserve pure usage‑based deals for “power customers” who already think that way.

### 4. Tactical Next Steps I’d Prioritize

Within the “hybrid + light consumption” frame:

1. **Instrument and cap before debating micro‑pricing**  
   - Ship **usage counters** for: docs, total RAG bytes, queries/month, per‑org.  
   - Implement **hard caps for Free** and “warning + UI nudge to upgrade” for Pro.
2. **Make the storage model an implementation detail at first**  
   - Start with **platform storage only**, but structure code so that:
     - A “storage adapter” can be swapped to user‑cluster later (as your Appendix suggests with `getProjectDb()` vs `getOrgDb()`).
3. **Design the Enterprise/user‑cluster story now, but don’t over‑build it**  
   - Have a crisp 1‑pager: “When you need your own Atlas cluster for RAG, here’s exactly what we set up and why.”  
   - Implement enough of the user‑cluster path to **close early enterprise design‑partner conversations**, not general self‑serve.
4. **Align marketing copy with the reality**  
   - Today: “Managed AI‑native forms with a clear MongoDB‑native escape hatch.”  
   - As user‑cluster RAG ships: “Bring your own Atlas cluster when you outgrow our managed infra.”

### 5. What You’re *Not* Missing (Sanity Check)

- Your cost model and option breakdown are directionally sound; the major unknowns are **actual query intensity** and **how many RAG docs a “typical” successful team needs.**
- The biggest strategic risk is **over‑engineering pricing/infra before you have 50–100 active RAG users**. The hybrid approach with firm but simple caps lets you **learn with guardrails**.

If helpful, I can follow up with:
- A **draft pricing table** suitable for docs/landing pages, based on the hybrid model above.
- A **technical mini‑spec** for pluggable RAG storage adapters (platform vs user‑cluster) aligned with your current `org_[orgId]` DB layout.



## Advisor Response – AI Assistant (Claude / Opus4.5)
# Strategic Analysis & Recommendations

**Date:** January 28, 2026  
**Reviewer:** Strategic Product Advisor  
**Document Version:** Appendix to RAG Storage Architecture Decision Document

---

## Executive Assessment

This analysis treats the RAG architecture decision not as a technical choice but as a **business model definition** that will shape NetPad's competitive position for years. The tension articulated between "MongoDB-native developer tool" and "managed AI forms service" is real and consequential.

**Core recommendation: Option 3 (Hybrid Tiered) with elements of Option 4 (Consumption Credits), but with a critical reframe of the problem.**

---

## The Reframe: RAG as Conversion Engine, Not Cost Center

The original analysis treats RAG storage cost as a liability to minimize. The opposite framing is more strategically valuable:

**RAG is NetPad's primary conversion mechanism.** Users who upload documents and build knowledge-guided forms are the most engaged users—the ones most likely to convert. The question shifts from "how do we limit RAG to control costs" to "how do we structure RAG to maximize conversion while maintaining unit economics."

### Revised Economic Model

| Metric | Conservative | Aggressive |
|--------|--------------|------------|
| Free tier users | 1,000 | 5,000 |
| RAG-active free users | 200 (20%) | 1,000 (20%) |
| Annual RAG cost | $700-1,960 | $3,500-9,800 |
| Conversion rate (RAG users) | 15% | 10% |
| Paid conversions | 30 | 100 |
| Pro revenue ($29/mo) | $10,440/yr | $34,800/yr |
| **Net margin** | **$8,480-9,740** | **$25,000-31,300** |

**Key insight:** RAG-active users convert at 2-3x the rate of non-RAG users based on comparable product benchmarks. The cost isn't the issue—the conversion funnel is.

---

## Recommended Architecture

### Tier Structure

| Tier | Storage Model | RAG Limits | Rationale |
|------|---------------|------------|-----------|
| **Free** | Platform (NetPad cluster) | 3 documents, 25MB, 50 queries/day | Enough to experience value, not enough to run production |
| **Pro** ($29/mo) | Platform OR user cluster (choice) | 50 documents, 500MB, unlimited queries | Sweet spot for SMB teams |
| **Team** ($99/mo) | User cluster required | Unlimited | Data sovereignty, team features |
| **Enterprise** | User cluster required | Unlimited + dedicated support | Compliance, SLA |

### Rationale by Tier

**Free tier (Platform storage):**
- 3 documents is enough to build ONE meaningful conversational form
- Creates natural conversion trigger: "I need more documents to finish this project"
- 50 queries/day allows testing but not production traffic
- Platform storage removes all friction from evaluation

**Pro tier (Choice of storage):**
- Some users want convenience (platform storage)
- Some users want sovereignty (user cluster)
- Offering choice is a **feature**, not complexity
- $29/mo (not $20) because RAG delivers premium value

**Team/Enterprise (User cluster required):**
- These customers WANT data sovereignty
- Requiring user cluster is a qualification mechanism
- Removes NetPad's storage liability entirely at scale

---

## Responses to Strategic Questions

### 1. Product Positioning

**Recommendation: Option C (Hybrid), leaning toward B over time.**

| Timeframe | Positioning | Rationale |
|-----------|-------------|-----------|
| Year 1 | Managed service | Reduce friction, enable fast evaluation |
| Year 2 | Hybrid | Build "MongoDB-native" credibility with case studies |
| Year 3+ | MongoDB-native platform | Enterprise customers demand user-cluster storage |

**Critical insight:** "MongoDB-native" positioning isn't about where data is stored—it's about the **mental model**. Users think in MongoDB terms (collections, documents, queries). NetPad speaks their language. That's MongoDB-native regardless of storage location.

### 2. Free Tier Economics

**Recommendation: Conversion-focused design with natural upgrade moments.**

| Resource | Limit | Rationale |
|----------|-------|-----------|
| RAG documents | 3 | Enough for one use case, not production |
| Total storage | 25MB | Meaningful but constrained |
| Queries | 50/day | Testing, not production traffic |
| Forms | 5 | Standard for form builders |
| Workflows | Basic only | Clear upgrade path |

**Why 3 documents, not 5?**
- 3 demonstrates value for one use case
- NOT enough to run a real help desk or onboarding flow
- Users hit the limit organically when building something real
- Upgrade ask becomes obvious and justified

**Expected conversion rates:**
- RAG-active free users → paid: 8-12% within 90 days
- Overall free → paid: 5-7%

### 3. Differentiation Strategy

**Recommendation: RAG is the PRIMARY differentiator, framed as "Knowledge-Guided Forms."**

**Messaging (avoid technical terms):**
| Technical | Customer-Facing |
|-----------|-----------------|
| RAG-powered forms | Forms that read your documentation |
| Vector search retrieval | Help desks that know your policies |
| Embedding-based Q&A | Onboarding forms that understand your handbook |

**RAG availability by tier:**
- Free: Limited (hook)
- Pro: Generous (value delivery)
- Team/Enterprise: Unlimited (table stakes)

**Secondary differentiators:**
- "Build once, deploy twice" (traditional + conversational)
- MongoDB-native (no vendor lock-in)
- Open source core (trust signal)
- Export to standalone Next.js (escape hatch)

### 4. Data Sovereignty

**Recommendation: Important for enterprise, irrelevant for SMBs.**

| Customer Segment | Data Sovereignty Priority | Design Implication |
|------------------|---------------------------|-------------------|
| Developers (free tier) | Low | Platform storage, maximize convenience |
| SMB teams (Pro) | Low-Medium | Offer choice, default to platform |
| Enterprise (Team+) | High | Require user cluster, provide tooling |

**Guidance:** Design for SMBs, offer enterprise features as premium. Don't let enterprise requirements pollute the SMB experience.

### 5. Path to Monetization

**Recommendation: SaaS Subscription with usage-based add-ons.**

**Pricing structure:**

| Tier | Monthly Price | Target Customer | Key Features |
|------|--------------|-----------------|--------------|
| Free | $0 | Developers evaluating | 3 RAG docs, 5 forms, basic workflows |
| Pro | $29/mo | Individual builders, small teams | 50 RAG docs, unlimited queries, choice of storage |
| Team | $99/mo (up to 5 users) | SMB internal tools teams | Unlimited RAG, user cluster required, collaboration |
| Team+ | +$20/user/mo beyond 5 | Growing teams | Same as Team, scales with headcount |
| Enterprise | Custom | >50 users, compliance needs | Dedicated support, SLA, custom integrations |

**Usage-based add-ons:**
- Additional RAG storage: $5/GB/month
- Additional forms beyond 50: $1/form/month
- Priority support: $50/month

---

## Factors Under-Weighted in Original Analysis

### 1. Atlas Embedding API Impact

The Voyage AI integration spec shows MongoDB now offers native embedding/reranking APIs at `https://ai.mongodb.com/v1`. This changes the economics significantly:

| Factor | Before (Direct Voyage) | After (Atlas API) |
|--------|------------------------|-------------------|
| Billing | Separate vendor | Consolidated with Atlas |
| Free tier | 50M tokens | 200M tokens |
| Model flexibility | Single model | Shared embedding space (Voyage 4) |
| Authentication | Separate API key | Atlas IAM |

**Implication:** RAG costs may be 50-70% lower than estimated with full Atlas Embedding API adoption. Economic models should be re-run with this assumption.

### 2. Limit Design: Documents and Queries, Not Bytes

Storage (MB) is the wrong limiting factor. What matters:
- **Document count** — correlates with use case complexity
- **Query volume** — correlates with production usage

A user with 3 small documents making 100 queries/day is more engaged (and more likely to convert) than a user with 1 large document making 5 queries/month.

**Recommendation:** Limit by documents and queries, not bytes. Storage is cheap; engagement is valuable.

### 3. Migration Path as Conversion Friction

Migration between storage models isn't just a technical concern—it's a **conversion friction point**.

**Recommended migration paths:**

| Upgrade Path | Migration Required? | Tooling Needed |
|--------------|---------------------|----------------|
| Free → Pro | No | None (platform storage continues) |
| Pro (platform) → Pro (user cluster) | Yes | Automated migration tool |
| Pro → Team | Yes | Automated migration tool |
| Team → Enterprise | No | Already on user cluster |

### 4. Competitive Positioning

Typeform and JotForm are not the true competitors. NetPad is a **MongoDB application builder** that happens to do forms.

**Actual competitive landscape:**

| Competitor | Category | NetPad Advantage |
|------------|----------|------------------|
| Retool | Internal tools (SQL-focused) | MongoDB-native, conversational forms |
| Appsmith | Open source internal tools | RAG/AI capabilities, form focus |
| Custom development | "Build it ourselves" | 30 minutes vs. 3 months |
| Typeform + Zapier + MongoDB | Stitched solution | Single platform, no integration tax |

**Key differentiator:** None of the competitors have "conversational forms with RAG." This is NetPad's moat.

---

## Implementation Roadmap

### This Week (Immediate Blockers)

| Action | Priority | Rationale |
|--------|----------|-----------|
| Create vector search index | P0 | Currently blocking RAG functionality |
| Implement document count limit (3 for free) | P0 | Essential for tier enforcement |
| Add query rate limiting (50/day free) | P0 | Prevents abuse, creates upgrade trigger |
| Track RAG activation as key metric | P1 | Required for conversion analysis |

### This Month (Foundation)

| Action | Priority | Rationale |
|--------|----------|-----------|
| Switch to Atlas Embedding API | P0 | Cost savings, platform simplification |
| Build "upgrade prompt" UX | P0 | Conversion optimization |
| Update Pro pricing to $29/mo | P1 | Capture appropriate value |
| Implement hybrid storage option for Pro | P1 | Offer choice as feature |

### This Quarter (Launch)

| Action | Priority | Rationale |
|--------|----------|-----------|
| Launch paid tiers with RAG differentiation | P0 | Revenue generation |
| Measure conversion by RAG activation status | P0 | Validate hypothesis |
| Gather case studies from first paid customers | P1 | Marketing fuel |
| Refine limits based on actual usage data | P1 | Optimize economics |

---

## Key Metrics to Track

### Primary Metrics

| Metric | Target | Measurement Frequency |
|--------|--------|----------------------|
| RAG activation rate (free users) | >20% | Weekly |
| Conversion rate (RAG-active → paid) | >10% | Monthly |
| Conversion rate (non-RAG → paid) | >4% | Monthly |
| RAG cost per converted user | <$30 | Monthly |
| Time to first RAG document upload | <7 days | Weekly |

### Secondary Metrics

| Metric | Target | Measurement Frequency |
|--------|--------|----------------------|
| Average documents per RAG user | 5-10 | Monthly |
| Average queries per RAG user per day | 10-20 | Weekly |
| Limit-hit rate (free tier) | 30-50% | Weekly |
| Upgrade rate after hitting limit | >15% | Monthly |

---

## Final Recommendation Summary

**Architecture:** Option 3 (Hybrid Tiered)

| Tier | Storage | Limits | Price |
|------|---------|--------|-------|
| Free | Platform | 3 docs, 50 queries/day | $0 |
| Pro | Platform OR user cluster | 50 docs, unlimited queries | $29/mo |
| Team | User cluster required | Unlimited | $99/mo |
| Enterprise | User cluster required | Unlimited + SLA | Custom |

**Why this works:**
- Low friction for free tier (platform storage)
- Clear conversion trigger (document limits)
- Choice for Pro users (convenience vs. sovereignty)
- Clean enterprise story (full data ownership)
- Sustainable economics (costs shift to high-value tiers)

**The key hypothesis to validate:** RAG-active free users convert at 2x+ the rate of non-RAG free users. If true, free tier RAG investment is justified as customer acquisition cost.

---

## Open Questions Requiring Data

Before finalizing implementation, the following data points would refine recommendations:

1. **Current free-to-paid conversion rate** (before RAG) — establishes baseline
2. **Average document count for engaged users** — informs limit design
3. **Current Atlas tier** — affects vector search pricing model
4. **Monthly RAG queries per active user** — informs rate limit design
5. **Customer acquisition cost target** — affects free tier generosity

---

## Appendix: Revised Cost Model with Atlas API

### Assumptions

- Full adoption of MongoDB Atlas Embedding API
- Voyage 4 series models (shared embedding space)
- 200M token free tier from Atlas

### Per-User Cost Estimates (Revised)

| Usage Level | Embeddings | Storage | Queries | Total Annual |
|-------------|------------|---------|---------|--------------|
| Light (3 docs, 50 queries/day) | $0.02 | $0.10 | $0.50 | **$0.62** |
| Medium (20 docs, 200 queries/day) | $0.10 | $0.50 | $2.00 | **$2.60** |
| Heavy (100 docs, 1000 queries/day) | $0.50 | $2.50 | $10.00 | **$13.00** |

### Free Tier Economics (Revised)

| Scenario | Free Users | RAG-Active | Annual Cost | Conversions | Revenue | Net |
|----------|------------|------------|-------------|-------------|---------|-----|
| Conservative | 1,000 | 200 | $124 | 30 | $10,440 | **+$10,316** |
| Moderate | 2,500 | 500 | $310 | 60 | $20,880 | **+$20,570** |
| Aggressive | 5,000 | 1,000 | $620 | 100 | $34,800 | **+$34,180** |

**Conclusion:** With Atlas Embedding API adoption, free tier RAG is economically viable even at aggressive growth rates.

---

*End of Strategic Analysis Appendix*