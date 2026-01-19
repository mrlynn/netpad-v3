# NetPad Deployment Phases - Implementation Plan

## Overview

This document outlines the phased approach to implementing NetPad's deployment and distribution strategy.

---

## Phase 1: Hosted Only (Polish Current Experience)

**Goal:** Perfect the `forms.netpad.io/slug` hosted experience before adding complexity.

### Current State
- Forms can be published with slugs
- QuickPublishPopover handles basic publishing
- Forms are hosted within NetPad platform

### Enhancements Needed

#### 1.1 Free Tier Definition
```
Free Tier:
├── 100 submissions/month per form
├── 3 forms per project
├── Basic workflows (email notification, webhook)
├── NetPad branding badge on form
├── forms.netpad.io/your-slug URL
└── 30-day data retention
```

#### 1.2 Pro Tier Definition
```
Pro Tier ($19/month):
├── Unlimited submissions
├── Unlimited forms
├── Advanced workflows (Slack, Sheets, AI processing)
├── Remove NetPad branding
├── Custom domain support (yourform.com)
├── API access
├── 1-year data retention
└── Priority support
```

#### 1.3 Implementation Tasks
- [ ] Add submission counting per form/org
- [ ] Add usage limits enforcement middleware
- [ ] Add "Powered by NetPad" badge component
- [ ] Implement custom domain support (Vercel domains API)
- [ ] Add billing integration (Stripe)
- [ ] Create usage dashboard

### Files to Modify
- `src/middleware.ts` - Add usage limit checks
- `src/app/api/submissions/route.ts` - Add submission counting
- `src/components/FormRenderer/` - Add branding badge
- `src/lib/billing/` - New billing module

---

## Phase 2: Download as Standalone App

**Goal:** Allow users to download a complete, working Next.js app with their form.

### 2.1 Architecture

```
User clicks "Download App"
         ↓
API generates bundle:
├── /app
│   ├── page.tsx              (form page)
│   ├── thank-you/page.tsx    (confirmation)
│   ├── admin/page.tsx        (submissions viewer)
│   └── api/
│       ├── submit/route.ts   (submission handler)
│       └── data/route.ts     (admin data API)
├── /config
│   ├── form.json             (form definition)
│   ├── workflows.json        (workflow definitions)
│   └── theme.json            (styling)
├── /lib
│   ├── db.ts                 (MongoDB connection)
│   └── workflow-runner.ts    (workflow execution)
├── package.json
├── .env.example
├── vercel.json
├── docker-compose.yml
└── README.md
         ↓
ZIP file downloaded
```

### 2.2 NPM Package Strategy

**@netpad/forms** (Already exists at packages/forms/)
- MIT licensed, free forever
- FormRenderer component
- Field components
- Validation utilities
- No cloud dependencies

**@netpad/workflows** (To be created)
- MIT licensed, free forever
- Workflow engine
- Built-in actions (email via SMTP, webhook, delay)
- No cloud dependencies

### 2.3 Implementation Tasks

#### Core Bundle Generator
```typescript
// src/lib/standalone/bundleGenerator.ts

interface BundleOptions {
  projectId: string;
  includeAdmin: boolean;      // Include submissions viewer
  includeWorkflows: boolean;  // Include workflow engine
  deployTarget: 'vercel' | 'docker' | 'generic';
  databaseMode: 'mongodb' | 'sqlite';  // SQLite for simpler deploys
}

async function generateStandaloneBundle(options: BundleOptions): Promise<Buffer> {
  // 1. Load project forms and workflows
  // 2. Clean sensitive data
  // 3. Generate Next.js app from template
  // 4. Inject form/workflow configs
  // 5. Generate .env.example
  // 6. Create ZIP
}
```

#### API Endpoint
```typescript
// src/app/api/projects/[projectId]/download/route.ts

export async function POST(req: Request) {
  const { includeAdmin, includeWorkflows, deployTarget } = await req.json();

  const bundle = await generateStandaloneBundle({
    projectId,
    includeAdmin,
    includeWorkflows,
    deployTarget,
  });

  return new Response(bundle, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${projectName}-app.zip"`,
    },
  });
}
```

#### UI Component
```typescript
// src/components/Download/DownloadAppDialog.tsx

interface DownloadAppDialogProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

// Options:
// - Include admin panel (view submissions)
// - Include workflows
// - Deploy target (Vercel recommended, Docker, Generic)
// - Database (MongoDB Atlas, Local MongoDB, SQLite)
```

### 2.4 Template Structure

Location: `templates/standalone-app-v2/`

```
standalone-app-v2/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Dynamic form page
│   │   ├── [slug]/page.tsx             # Multi-form support
│   │   ├── thank-you/page.tsx          # Confirmation page
│   │   ├── admin/
│   │   │   ├── page.tsx                # Submissions dashboard
│   │   │   └── layout.tsx              # Admin layout with auth
│   │   └── api/
│   │       ├── submit/route.ts         # Form submission
│   │       ├── submissions/route.ts    # List submissions
│   │       └── webhook/route.ts        # Workflow webhooks
│   ├── components/
│   │   └── (uses @netpad/forms)
│   ├── lib/
│   │   ├── db.ts                       # Database connection
│   │   ├── auth.ts                     # Simple admin auth
│   │   └── workflows.ts                # Workflow runner
│   └── config/
│       └── (injected at bundle time)
├── package.json
├── tsconfig.json
├── next.config.js
├── vercel.json
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

### 2.5 Files to Create

```
src/lib/standalone/
├── bundleGenerator.ts        # Main bundle generation logic
├── templateInjector.ts       # Injects config into template
├── envGenerator.ts           # Generates .env.example
├── zipCreator.ts             # Creates ZIP file
└── index.ts                  # Exports

src/app/api/projects/[projectId]/download/
└── route.ts                  # Download endpoint

src/components/Download/
├── DownloadAppDialog.tsx     # Download options dialog
├── DeploymentOptions.tsx     # Deploy target selection
└── index.ts

templates/standalone-app-v2/
└── (complete template)

packages/workflows/           # New package
├── src/
│   ├── engine.ts            # Workflow execution engine
│   ├── actions/
│   │   ├── email.ts         # SMTP email action
│   │   ├── webhook.ts       # HTTP webhook action
│   │   ├── delay.ts         # Delay action
│   │   └── index.ts
│   └── index.ts
├── package.json
└── README.md
```

### 2.6 Dependencies to Add

```json
{
  "devDependencies": {
    "archiver": "^6.0.0",      // ZIP creation
    "ejs": "^3.1.9"            // Template rendering
  }
}
```

---

## Phase 3: One-Click Deploy (Future)

**Goal:** Direct deployment to Vercel/GitHub with one click.

### Prerequisites
- Phase 2 complete and validated
- User demand demonstrated
- GitHub OAuth app registered
- Vercel integration enhanced

### 3.1 Flow

```
User clicks "Deploy to Vercel"
         ↓
OAuth: Connect GitHub account
         ↓
OAuth: Connect Vercel account
         ↓
Create GitHub repo with generated code
         ↓
Connect Vercel to GitHub repo
         ↓
Provision MongoDB Atlas (optional)
         ↓
Set environment variables
         ↓
Deploy!
         ↓
User gets:
- Live URL
- GitHub repo link
- Vercel dashboard link
```

### 3.2 Considerations
- Could be Pro-only feature
- Requires GitHub OAuth integration
- Already have partial Vercel integration
- Atlas provisioning already implemented

---

## Implementation Priority

### Week 1-2: Phase 2 Foundation
1. Create `bundleGenerator.ts` core logic
2. Create `standalone-app-v2` template
3. Implement ZIP creation
4. Basic download endpoint

### Week 3: Phase 2 UI & Polish
1. Download dialog component
2. Options selection (admin, workflows, deploy target)
3. Environment variable documentation
4. README generation

### Week 4: Phase 2 Testing & Workflows Package
1. Test generated apps deploy correctly
2. Create `@netpad/workflows` package
3. Documentation

### Future: Phase 1 & 3
- Phase 1 (billing/limits) can be done in parallel
- Phase 3 depends on Phase 2 traction

---

## Success Metrics

### Phase 2
- Downloads per week
- Successful deployments (via optional ping-back)
- GitHub stars on generated repos
- Support tickets related to standalone apps

### Phase 1
- Conversion rate free → pro
- Submission volume
- Custom domain usage

---

## Open Questions

1. **SQLite option?** - Would make deployment much simpler for small forms
2. **Include sample data?** - Seed the database with example submissions?
3. **Workflow limitations?** - Which workflows work standalone vs. need cloud?
4. **Versioning?** - How to handle updates to @netpad/forms after user downloads?
5. **Analytics opt-in?** - Optional telemetry to understand standalone usage?
