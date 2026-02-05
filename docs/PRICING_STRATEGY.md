# NetPad Pricing Strategy — Competitive Analysis & Recommendations

*Prepared: February 4, 2026*

## Competitive Landscape

### Typeform (Market Leader — Design-Focused)
| Plan | Monthly | Annual (per mo) | Responses/mo | Users | Key Features |
|------|---------|-----------------|--------------|-------|-------------|
| Free | $0 | $0 | 10 | 1 | Basic forms, Typeform branding |
| Basic | $39 | $28 | 100 | 1 | Unlimited forms, unlimited questions |
| Plus | $79 | $56 | 1,000 | 3 | Remove branding, custom subdomain |
| Business | $129 | $91 | 10,000 | 5 | Drop-off rates, conversion tracking, priority support |
| Growth Pro | $379 | $266 | 10,000+ | 5 | Video Q&A, reCAPTCHA, Salesforce, multi-language |
| Enterprise | Custom | Custom | Custom | Custom | SSO, HIPAA, custom domains, dedicated CSM |

**Notes:** Typeform is the premium player. Very expensive per response. No database integration — purely form-based. AI features recently added but limited. No workflow automation.

### Tally (Disruptor — Generous Free Tier)
| Plan | Monthly | Key Features |
|------|---------|-------------|
| Free | $0 | Unlimited forms, unlimited submissions, payments, signatures, conditional logic, integrations |
| Pro | $24 | Remove branding, custom domains, collaboration, partial submissions, analytics, custom CSS |
| Business | $74 | Data retention controls, email verification, version history (90d) |

**Notes:** Tally's free tier is extremely generous — unlimited forms AND submissions. They monetize on branding removal and advanced features. No database connectivity. No workflows. No AI.

### JotForm (Volume Leader — Template-Rich)
| Plan | Monthly | Annual (per mo) | Forms | Submissions/mo | Storage |
|------|---------|-----------------|-------|-----------------|---------|
| Starter | $0 | $0 | 5 | 100 | 100 MB |
| Bronze | $39 | $34 | 25 | 1,000 | 1 GB |
| Silver | $49 | $39 | 50 | 2,500 | 10 GB |
| Gold | $129 | $99 | 100 | 10,000 | 100 GB |
| Enterprise | Custom | Custom | Unlimited | Custom | Unlimited |

**Notes:** JotForm has 35M+ users. Template library is 10,000+. HIPAA on Gold+. No native database integration — uses their own tables. Limited workflow automation.

### Google Forms (Free — Basic)
- Completely free, unlimited forms and responses
- Very limited customization
- No conditional logic (basic), no workflows, no payments
- Data goes to Google Sheets
- No branding control

### Other Notable Competitors
- **Paperform** — $29-$159/mo, design-focused, limited forms on lower tiers
- **Cognito Forms** — Free tier with 500 entries/mo, Pro at $15/mo
- **Fillout** — Free tier, $19-$59/mo, Notion/Airtable integration
- **Formstack** — Enterprise-focused, $59-$249/mo

---

## NetPad's Competitive Advantages

These are features **no competitor offers together**:

1. **Native MongoDB integration** — Direct database read/write, not a proprietary data store
2. **362 API endpoints** — Full platform API, not just form submission
3. **AI-powered form generation** — 15+ AI agents (generate, optimize, audit, translate)
4. **Conversational forms** — Natural language data collection with customizable AI personas
5. **RAG/Knowledge-guided forms** — Document-grounded AI conversations
6. **Visual workflow automation** — 25+ node types, not just Zapier webhooks
7. **Data Explorer** — Browse databases and collections directly
8. **Queryable Encryption** — MongoDB's field-level encryption for HIPAA/PCI
9. **108+ form templates** — Across 15 categories, ready to use
10. **Application portability** — Export/import full application bundles
11. **Self-hostable** — Open source, run on your own infrastructure
12. **MCP integration** — Model Context Protocol tooling for AI agents

---

## Recommended Pricing Tiers

### Tier 1: Free (Starter)
**Goal:** Low-friction onboarding, compete with Tally's generous free tier

| Limit | Value | Rationale |
|-------|-------|-----------|
| Forms | 5 | Match JotForm Starter |
| Submissions/month | 100 | Industry standard |
| Workflows | 1 | Taste of automation |
| Workflow executions/mo | 50 | Enough to evaluate |
| AI generations/mo | 10 | Show the magic |
| Connections | 1 | One MongoDB cluster |
| Storage | 100 MB | For file uploads |
| Data retention | 30 days | |
| Branding | NetPad watermark | Key upgrade driver |

### Tier 2: Pro — $29/mo ($19/mo annual)
**Goal:** Affordable for freelancers and small teams, undercut Typeform Basic significantly

| Limit | Value | Rationale |
|-------|-------|-----------|
| Forms | 25 | |
| Submissions/month | 2,000 | 20x Typeform Basic for less money |
| Workflows | 10 | |
| Workflow executions/mo | 500 | |
| AI generations/mo | 100 | |
| Connections | 3 | Multiple databases |
| Users | 2 | |
| Storage | 1 GB | |
| Remove branding | ✅ | |
| Custom form slugs | ✅ | |
| Google Forms import | ✅ | Migration hook |
| Form analytics | ✅ | |
| Priority email support | ✅ | |

### Tier 3: Team — $79/mo ($59/mo annual)
**Goal:** Growing teams, compete with Typeform Plus/Business

| Limit | Value | Rationale |
|-------|-------|-----------|
| Forms | 100 | |
| Submissions/month | 10,000 | Match Typeform Business at lower price |
| Workflows | 50 | |
| Workflow executions/mo | 5,000 | |
| AI generations/mo | 500 | |
| Connections | 10 | |
| Users | 10 | |
| Storage | 10 GB | |
| Conversational forms | ✅ | Premium differentiator |
| RAG/Knowledge forms | ✅ | Premium differentiator |
| Custom domains | ✅ | |
| Advanced analytics | ✅ | Drop-off, conversion |
| Workflow templates | ✅ | |
| API access | ✅ | |
| Data Explorer | Full access | |
| Collaboration | ✅ | |

### Tier 4: Business — $199/mo ($149/mo annual)
**Goal:** Enterprise features without enterprise pricing

| Limit | Value | Rationale |
|-------|-------|-----------|
| Forms | Unlimited | |
| Submissions/month | 50,000 | |
| Workflows | Unlimited | |
| Workflow executions/mo | 25,000 | |
| AI generations/mo | 2,000 | |
| Connections | Unlimited | |
| Users | 25 | |
| Storage | 50 GB | |
| Queryable Encryption | ✅ | HIPAA/PCI compliance |
| SSO (SAML) | ✅ | |
| Audit logs | ✅ | |
| Custom branding | ✅ | Full white-label |
| Dedicated support | ✅ | |
| SLA | 99.9% uptime | |

### Tier 5: Enterprise — Custom
**Goal:** Large orgs, custom needs

- Unlimited everything
- Dedicated infrastructure
- Custom SLA
- Dedicated success manager
- On-premise deployment option
- Custom integrations
- Training & onboarding

---

## Key Pricing Insights

### Why This Works

1. **Undercuts Typeform by 50-70%** at every tier while offering MORE features
2. **More generous than JotForm** on submission limits
3. **Competes with Tally's free tier** — 5 forms + 100 submissions is standard
4. **Unique value prop** — MongoDB integration + AI + Workflows have no direct competitor
5. **Clear upgrade path** — Each tier unlocks genuinely new capabilities, not just higher limits
6. **Self-hosted option** — Enterprise customers can run their own instance (reduces hosting costs)

### Revenue Projections (Conservative)

Assuming Year 1 targets:
- 1,000 free users (funnel)
- 100 Pro users × $19/mo = $1,900/mo
- 30 Team users × $59/mo = $1,770/mo
- 10 Business users × $149/mo = $1,490/mo
- 2 Enterprise × $500/mo = $1,000/mo

**Year 1 ARR target: ~$74,000**

### Key Decisions to Make

1. **Free tier generosity** — More generous = more users = more conversion opportunities. Tally proves this works. But NetPad has real costs (AI, MongoDB).
2. **AI generation limits** — This is the most expensive feature to provide. Should be the primary upgrade driver.
3. **Self-hosted pricing** — One-time license? Per-seat? Honor system? Community edition vs Enterprise edition?
4. **Annual discount depth** — 30-35% is industry standard. Helps with cash flow.
5. **Education/nonprofit discount** — JotForm does 50%. Good PR and pipeline builder.

---

## Next Steps

- [ ] Finalize tier limits based on actual infrastructure costs
- [ ] Implement billing with Stripe (billing endpoints already exist)
- [ ] Create pricing page component
- [ ] Set up usage tracking per organization
- [ ] Implement soft limits (warn at 80%, block at 100%)
- [ ] Create upgrade prompts in the UI
- [ ] Build admin dashboard for subscription management
