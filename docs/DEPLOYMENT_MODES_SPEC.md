# Deployment Modes Documentation Specification

**For:** docs.netpad.io Documentation Team
**From:** Engineering
**Date:** January 2025
**Priority:** High - This addresses user confusion about hosting options

---

## Overview

NetPad supports three distinct deployment modes. Users are currently confused about the differences, when to use each, and how data is stored differently. We've added in-app indicators (user menu badge, help content), but external documentation needs to match.

---

## Requested Documentation

### 1. New Page: "Deployment Modes" (Top-Level Navigation)

**URL suggestion:** `/docs/deployment-modes` or `/docs/hosting`

**Purpose:** Comprehensive guide explaining all three modes with clear comparison

**Required Sections:**

#### Introduction
- NetPad can run in three ways: Cloud, Self-Hosted, and Standalone
- Brief (2-3 sentences) on when you'd pick each
- Link to comparison table below

#### Mode 1: Cloud (netpad.io)

| Aspect | Details |
|--------|---------|
| What it is | Fully managed SaaS at netpad.io |
| Best for | Teams wanting zero infrastructure management |
| Data location | Managed by NetPad |
| Multi-tenancy | Yes (organizations, projects, teams) |
| RAG/Vector Search | Requires Team tier + M10+ Atlas cluster |
| Environment variable | `NETPAD_PLATFORM_MODE=cloud` |
| Billing | Stripe-integrated subscription tiers |
| Updates | Automatic, managed by NetPad |

**Key points to emphasize:**
- This is the default/recommended starting point
- Zero setup required
- All features available based on subscription tier
- Data is stored on NetPad's managed infrastructure

#### Mode 2: Self-Hosted

| Aspect | Details |
|--------|---------|
| What it is | Full NetPad platform on your infrastructure |
| Best for | Enterprises with compliance/data residency requirements |
| Data location | Your MongoDB Atlas cluster |
| Multi-tenancy | Yes (same architecture as Cloud) |
| RAG/Vector Search | Available to ALL tiers with Atlas Local |
| Environment variable | `NETPAD_PLATFORM_MODE=self-hosted` |
| Billing | You manage (can disable Stripe features) |
| Updates | Manual - you pull from GitHub |

**Key points to emphasize:**
- Same codebase as Cloud
- Full feature parity
- YOU are responsible for updates, security, backups
- Can use Atlas Local (Docker) for Vector Search without M10 upgrade
- Ideal for: data sovereignty, air-gapped environments, custom integrations

#### Mode 3: Standalone (Exported Apps)

| Aspect | Details |
|--------|---------|
| What it is | Single exported application running independently |
| Best for | Production deployment of specific apps without NetPad dependency |
| Data location | User's own MongoDB (direct connection) |
| Multi-tenancy | No - single application only |
| RAG/Vector Search | User provides OpenAI API key |
| Environment variable | `STANDALONE_MODE=true` |
| Billing | None - completely independent |
| Updates | None - exported code is yours |

**Key points to emphasize:**
- This is the "escape hatch" - true ownership
- No NetPad infrastructure required to run
- User must provide their own:
  - MongoDB connection string
  - OpenAI API key (for conversational forms)
- Simplified architecture (no Platform DB)
- Conversation transcripts stored differently (see Data Architecture)

---

### 2. Comparison Table (Include in main page)

```
| Feature                    | Cloud        | Self-Hosted  | Standalone   |
|----------------------------|--------------|--------------|--------------|
| Infrastructure management  | NetPad       | You          | You          |
| Multi-tenancy             | ✅           | ✅           | ❌           |
| Organizations & Teams     | ✅           | ✅           | ❌           |
| Automatic updates         | ✅           | ❌           | ❌           |
| Data ownership            | NetPad       | You          | You          |
| RAG without M10 cluster   | ❌           | ✅           | N/A          |
| Custom domain             | Premium      | ✅           | ✅           |
| Billing integration       | ✅           | Optional     | ❌           |
| Marketplace access        | ✅           | ✅           | ❌           |
| Export to Standalone      | ✅           | ✅           | N/A          |
```

---

### 3. Data Architecture Section

**Critical for developers to understand:**

#### Conversation Transcript Storage

| Mode | Storage Path | Example |
|------|--------------|---------|
| Cloud | `_formMetadata.conversational` | `{ _formMetadata: { conversational: { transcript: [...] } } }` |
| Self-Hosted | `_formMetadata.conversational` | Same as Cloud |
| Standalone | `conversational` (root level) | `{ conversational: { transcript: [...] }, data: {...} }` |

**Why the difference?**
- Cloud/Self-Hosted use a Platform Database that syncs to target MongoDB
- Standalone writes directly to user's MongoDB with simpler schema
- This is intentional - standalone apps prioritize simplicity

#### Submission Document Structure

**Cloud/Self-Hosted:**
```javascript
{
  _id: ObjectId,
  submissionId: "sub_xxx",
  formId: "form_xxx",
  orgId: "org_xxx",
  data: { /* form field values */ },
  _formMetadata: {
    formName: "Contact Form",
    formSlug: "contact",
    submittedAt: ISODate,
    conversational: {
      conversationId: "conv_xxx",
      transcript: [
        { role: "assistant", content: "Hello!", timestamp: ISODate },
        { role: "user", content: "Hi there", timestamp: ISODate }
      ],
      topicsCovered: [...],
      overallConfidence: 0.95,
      turnCount: 8,
      durationSeconds: 120
    }
  }
}
```

**Standalone:**
```javascript
{
  _id: ObjectId,
  submissionId: "sub_xxx",
  formSlug: "contact",
  data: { /* form field values */ },
  conversational: {
    conversationId: "conv_xxx",
    transcript: [...],
    topicsCovered: [...],
    overallConfidence: 0.95,
    turnCount: 8,
    durationSeconds: 120
  },
  metadata: {
    submittedAt: ISODate,
    isConversational: true
  }
}
```

---

### 4. Environment Variables Reference

Create a dedicated page or section:

#### Cloud Mode
```bash
NETPAD_PLATFORM_MODE=cloud
NEXT_PUBLIC_NETPAD_PLATFORM_MODE=cloud  # For client-side badge
```

#### Self-Hosted Mode
```bash
NETPAD_PLATFORM_MODE=self-hosted
NEXT_PUBLIC_NETPAD_PLATFORM_MODE=self-hosted
MONGODB_URI=mongodb+srv://...
# Optional: Atlas Local for RAG
# docker run -d -p 27017:27017 mongodb/mongodb-atlas-local
```

#### Standalone Mode
```bash
STANDALONE_MODE=true
MONGODB_URI=mongodb+srv://...
MONGODB_DATABASE=my_app_db
OPENAI_API_KEY=sk-...  # Required for conversational forms
NEXT_PUBLIC_APP_URL=https://myapp.com
```

---

### 5. Migration Guides

#### Cloud → Standalone Export
1. Navigate to your application in NetPad Cloud
2. Click "Export" → "Standalone Next.js App"
3. Download the generated project
4. Configure environment variables
5. Deploy to Vercel/Netlify/your infrastructure

#### Self-Hosted → Cloud
- Contact NetPad team for data migration assistance
- Note: Organization structure will need to be recreated

---

### 6. FAQ Section

**Q: Can I start with Cloud and move to Standalone later?**
A: Yes! This is a recommended pattern. Prototype in Cloud, export when ready for production.

**Q: Will my conversational form transcripts work the same in Standalone?**
A: Yes, but they're stored at a different path in the document (`conversational` vs `_formMetadata.conversational`).

**Q: Do I need an M10 Atlas cluster for Self-Hosted?**
A: No! Self-hosted deployments can use Atlas Local (Docker) for Vector Search features without upgrading to M10.

**Q: Can Standalone apps connect back to NetPad?**
A: No, standalone apps are completely independent. They have no connection to NetPad infrastructure.

**Q: How do I know which mode I'm running?**
A: Check the badge in your user menu (top-right avatar dropdown). It shows "Cloud" or "Self-Hosted". Standalone apps don't have this UI.

---

### 7. Visual Assets Needed

1. **Architecture Diagram** showing:
   - Cloud: User → netpad.io → Platform DB → Target MongoDB
   - Self-Hosted: User → Your Vercel → Your Platform DB → Your MongoDB
   - Standalone: User → Your App → Your MongoDB (direct)

2. **Decision Flowchart:**
   - "Do you need zero maintenance?" → Yes → Cloud
   - "Do you have compliance requirements?" → Yes → Self-Hosted
   - "Do you need a dedicated production app?" → Yes → Standalone

3. **Screenshot** of the deployment mode badge in user menu

---

## Cross-References

Update these existing pages to link to the new Deployment Modes page:

1. **Getting Started** - Add "Choose Your Deployment" section after signup
2. **Self-Hosting Guide** - Link to comparison, emphasize it's option 2 of 3
3. **Exporting Applications** - Link to Standalone section
4. **Conversational Forms** - Note about transcript storage differences
5. **RAG/Vector Search** - Note about Atlas Local for self-hosted

---

## In-App Help Alignment

The in-app help system now includes:
- `deployment-modes` - Comprehensive overview (links from user menu)
- `deployment-vercel` - Self-hosting on Vercel
- `self-hosted-rag` - RAG with Atlas Local

Ensure external docs match this content for consistency.

---

## Questions?

Contact engineering if you need:
- Code examples for querying data in each mode
- Additional technical details about the sync process
- Clarification on any architectural decisions
