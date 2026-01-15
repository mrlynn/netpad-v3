# Application Portability Specification

**Status**: Draft  
**Version**: 1.0.0  
**Date**: January 2026

## Core Principle

> **NetPad builds real applications, not artifacts trapped in a UI.**
>
> Forms, workflows, and data definitions must always be:
> - **Portable** - Exportable as runnable code
> - **Inspectable** - Human-readable, version-controlled
> - **Executable outside NetPad** - No dependency on NetPad runtime to function
>
> If someone leaves NetPad tomorrow, they should still own something valuable.

This principle guides every technical decision in this specification.

---

## 1. Canonical Definition: Code-First, Not UI-First

### 1.1 The UI is an Editor, the Truth is a Declarative Spec

Everything in NetPad must compile down to:
- **JSON / YAML** (human-readable)
- **Stable schema** (versioned, backward-compatible)
- **Versioned** (semantic versioning)
- **Diffable** (Git-friendly)

### 1.2 Application Bundle Schema

The canonical application format is a `bundle.json` file with the following structure:

```json
{
  "application": {
    "name": "Incident Intake",
    "version": "1.3.0",
    "schemaVersion": "1.0.0",
    "netpadVersion": "4.6.0",
    "description": "IT support ticket intake application",
    "author": {
      "name": "Organization Name",
      "email": "contact@example.com"
    },
    "license": "MIT",
    "createdAt": "2026-01-15T00:00:00.000Z",
    "updatedAt": "2026-01-15T00:00:00.000Z"
  },
  "forms": [
    {
      "id": "form_incident_intake",
      "name": "Incident Intake Form",
      "slug": "incident-intake",
      "fieldConfigs": [...],
      "theme": {...},
      "multiPage": {...}
    }
  ],
  "workflows": [
    {
      "id": "workflow_ticket_routing",
      "name": "Ticket Routing",
      "slug": "ticket-routing",
      "canvas": {...},
      "settings": {...}
    }
  ],
  "dataModels": [
    {
      "name": "incidents",
      "schema": {...},
      "indexes": [...]
    }
  ],
  "policies": [
    {
      "name": "access-control",
      "rules": [...]
    }
  ],
  "connections": [
    {
      "id": "conn_form_workflow",
      "formRef": "incident-intake",
      "workflowRef": "ticket-routing",
      "type": "trigger",
      "config": {...}
    }
  ],
  "deployment": {
    "targets": ["netpad-runtime", "self-hosted", "express", "nextjs", "serverless"],
    "environment": {
      "required": [
        {
          "name": "MONGODB_URI",
          "description": "MongoDB connection string",
          "required": true,
          "generator": "none"
        }
      ],
      "optional": []
    },
    "runtime": {
      "version": "1.0.0",
      "dependencies": {
        "@netpad/runtime": "^1.0.0"
      }
    }
  },
  "migrations": [
    {
      "from": "1.2.0",
      "to": "1.3.0",
      "breaking": false,
      "steps": [
        {
          "action": "addField",
          "form": "incident-intake",
          "field": {
            "path": "priority",
            "type": "select",
            "options": ["low", "medium", "high"]
          }
        }
      ]
    }
  ]
}
```

### 1.3 Schema Versioning

- **Schema Version**: Tracks the bundle format itself (e.g., `1.0.0`)
- **Application Version**: Tracks the application content (e.g., `1.3.0`)
- **NetPad Version**: Minimum NetPad version required to import

**Schema Evolution Rules**:
- New schema versions must be backward-compatible
- Breaking schema changes require major version bump
- Migration scripts included in bundle for schema upgrades

### 1.4 Key Rule: If It Can't Be Expressed as a File, It Doesn't Ship

- No hidden state
- No proprietary binary formats
- No UI-only features that can't be exported
- Everything must serialize to JSON/YAML

**Why This Matters**:
- Git-friendly (diff, merge, review)
- CI/CD-friendly (automated testing, deployment)
- Exportable (one command to get everything)
- Rehydratable (import into any runtime)

**Complexity**: Medium  
**Tradeoff**: Requires discipline around schema evolution (worth it)

---

## 2. First-Class Export Targets (Not "Downloads")

### 2.1 Export as Deployment Strategy

Don't treat export as a backup feature. Treat it as a deployment strategy.

### 2.2 Supported Export Targets

#### 2.2.1 NetPad Runtime (Hosted, Default)
- **Format**: Bundle JSON + Runtime API
- **Deployment**: One-click deploy to NetPad cloud
- **Use Case**: Quick deployment, managed infrastructure
- **Command**: `netpad deploy --target=netpad-runtime`

#### 2.2.2 Self-Hosted Runtime (Docker / Node / Edge)
- **Format**: Docker image or Node.js package
- **Deployment**: Docker Compose, Kubernetes, or Node.js server
- **Use Case**: Full control, on-premises deployment
- **Command**: `netpad build --target=self-hosted --output=./dist`

**Output Structure**:
```
dist/
├── bundle.json
├── package.json
├── Dockerfile
├── docker-compose.yml
├── src/
│   ├── runtime/
│   │   ├── server.ts
│   │   ├── forms.ts
│   │   ├── workflows.ts
│   │   └── api.ts
│   └── index.ts
├── README.md
└── .env.example
```

#### 2.2.3 Framework Targets

**Express / Fastify**:
- **Format**: Express/Fastify middleware + routes
- **Deployment**: Standard Node.js application
- **Use Case**: Integration with existing Express/Fastify apps
- **Command**: `netpad build --target=express --output=./routes`

**Output Structure**:
```
routes/
├── netpad/
│   ├── forms.ts
│   ├── workflows.ts
│   └── api.ts
├── bundle.json
└── README.md
```

**Next.js API Routes**:
- **Format**: Next.js API route handlers
- **Deployment**: Next.js application
- **Use Case**: Next.js-based applications
- **Command**: `netpad build --target=nextjs --output=./app/api/netpad`

**Output Structure**:
```
app/
└── api/
    └── netpad/
        ├── forms/
        │   └── [formId]/
        │       └── route.ts
        ├── workflows/
        │   └── [workflowId]/
        │       └── route.ts
        └── bundle.json
```

**Serverless (Lambda / Vercel / Cloudflare)**:
- **Format**: Serverless function handlers
- **Deployment**: AWS Lambda, Vercel Functions, Cloudflare Workers
- **Use Case**: Serverless architecture
- **Command**: `netpad build --target=serverless --platform=vercel`

**Output Structure**:
```
functions/
├── netpad/
│   ├── forms.ts
│   ├── workflows.ts
│   └── handler.ts
├── bundle.json
├── vercel.json
└── README.md
```

### 2.3 Export Output Contents

Each export generates:
- **Runtime code** - Executable application code
- **Config** - Environment variables, database setup
- **Environment variable contracts** - Required/optional env vars with descriptions
- **README** - Deployment instructions, setup guide
- **Migration guide** - How to upgrade from previous versions

### 2.4 Export API

```typescript
// Export application to specific target
POST /api/applications/[applicationId]/export
{
  "target": "express" | "nextjs" | "serverless" | "self-hosted" | "netpad-runtime",
  "platform": "vercel" | "aws" | "cloudflare" | "docker", // For serverless
  "options": {
    "includeSampleData": false,
    "includeMigrations": true,
    "minify": true
  }
}

// Response: ZIP file or download URL
{
  "downloadUrl": "https://...",
  "expiresAt": "2026-01-16T00:00:00.000Z",
  "metadata": {
    "target": "express",
    "size": 1024000,
    "files": 15
  }
}
```

**Why This Matters**:
- Removes fear of lock-in
- Attracts serious engineers
- Makes NetPad feel additive, not risky

**Complexity**: High  
**Tradeoff**: Building a compiler, not just a UI. That's a feature.

---

## 3. NetPad Runtime: Open, Thin, and Boring (On Purpose)

### 3.1 Runtime Philosophy

The NetPad Runtime should be:
- **Small** - Minimal dependencies, fast startup
- **Stateless** - All state in MongoDB, no hidden databases
- **Replaceable** - If someone rewrites it, that's fine

### 3.2 Core Responsibilities Only

The runtime handles:
- **Request validation** - Validate form submissions, workflow inputs
- **Workflow execution** - Execute workflow nodes, manage state
- **Policy enforcement** - Access control, rate limiting
- **Data adapters** - MongoDB operations, external API calls

### 3.3 What the Runtime Does NOT Do

- No magic databases (all data in MongoDB)
- No hidden services (everything explicit)
- No proprietary queues (use MongoDB or standard message queues)
- No vendor lock-in (standard protocols only)

### 3.4 Runtime Architecture

```typescript
// Minimal runtime interface
interface NetPadRuntime {
  // Form handling
  renderForm(formId: string, config: FormConfig): Promise<FormHTML>;
  submitForm(formId: string, data: FormData): Promise<SubmissionResult>;
  
  // Workflow execution
  executeWorkflow(workflowId: string, input: WorkflowInput): Promise<WorkflowResult>;
  getWorkflowStatus(executionId: string): Promise<WorkflowStatus>;
  
  // Data operations
  queryCollection(collection: string, query: Query): Promise<Document[]>;
  insertDocument(collection: string, document: Document): Promise<InsertResult>;
  
  // Policy enforcement
  checkAccess(userId: string, resource: string, action: string): Promise<boolean>;
}
```

### 3.5 Open Source Runtime

- **Repository**: `github.com/mongodb/netpad-runtime`
- **License**: MIT
- **Documentation**: Full API docs, examples
- **Community**: Accepts contributions, issues, PRs

**Why This Matters**:
- Trust (users can audit the code)
- Longevity (not dependent on NetPad company)
- Enterprise adoption (compliance, security reviews)

**Complexity**: Medium  
**Tradeoff**: Less "secret sauce," more credibility

---

## 4. One-Click "Eject" Path

### 4.1 Psychological Importance

People commit harder when they know they can leave.

### 4.2 UI Implementation

**Location**: Application Settings → Export Application

**Button Label**: "Export Application" (not "Download" or "Backup")

**What Happens Next** (clearly explained):
1. "You will get runnable code"
2. "You can host this anywhere"
3. "NetPad will no longer be required"

### 4.3 Export Dialog

```typescript
interface ExportDialog {
  title: "Export Application";
  description: "Export your application as runnable code. You can deploy this anywhere, and NetPad is no longer required.";
  
  options: {
    target: "netpad-runtime" | "self-hosted" | "express" | "nextjs" | "serverless";
    includeMigrations: boolean;
    includeSampleData: boolean;
  };
  
  warnings: [
    "This export contains all forms, workflows, and configuration.",
    "You will need to set up MongoDB and environment variables.",
    "See README.md for deployment instructions."
  ];
  
  actions: [
    { label: "Export", action: "export" },
    { label: "Cancel", action: "cancel" }
  ];
}
```

### 4.4 Export Flow

1. User clicks "Export Application"
2. Dialog shows export options
3. User selects target (default: self-hosted)
4. System generates export package
5. User downloads ZIP file
6. ZIP contains:
   - `bundle.json` (canonical application definition)
   - Runtime code (for selected target)
   - `README.md` (deployment instructions)
   - `.env.example` (environment variables)
   - `package.json` (dependencies)
   - Migration guides (if applicable)

**Why This Matters**:
- Counterintuitive but powerful
- Builds trust through transparency
- Removes psychological barrier to adoption

---

## 5. Versioning as Migration Story, Not Breaking Story

### 5.1 Every Export Includes Migration Information

```json
{
  "migrations": [
    {
      "from": "1.2.0",
      "to": "1.3.0",
      "breaking": false,
      "description": "Added priority field to incident form",
      "steps": [
        {
          "action": "addField",
          "form": "incident-intake",
          "field": {
            "path": "priority",
            "type": "select",
            "options": ["low", "medium", "high"],
            "defaultValue": "medium"
          }
        }
      ],
      "rollback": {
        "action": "removeField",
        "form": "incident-intake",
        "field": "priority"
      }
    }
  ]
}
```

### 5.2 Migration Hints

- **Breaking changes** clearly marked
- **Automatic migration scripts** included
- **Rollback instructions** provided
- **Backward compatibility notes** documented

### 5.3 Version Comparison API

```typescript
// Compare two application versions
GET /api/applications/[applicationId]/versions/compare?from=1.2.0&to=1.3.0

// Response
{
  "from": "1.2.0",
  "to": "1.3.0",
  "breaking": false,
  "changes": [
    {
      "type": "addField",
      "form": "incident-intake",
      "field": "priority",
      "impact": "low"
    }
  ],
  "migration": {
    "steps": [...],
    "estimatedTime": "5 minutes",
    "rollback": {...}
  }
}
```

### 5.4 NetPad Never Silently Mutates Behavior

- **Schema changes** are explicit
- **Diffs are visible** in version history
- **Users opt in** to upgrades
- **Breaking changes** require major version bump

**Why This Matters**:
- Earns long-term trust
- Enables safe upgrades
- Supports enterprise requirements

---

## 6. Implementation Roadmap

### Phase 1: Canonical Schema (Weeks 1-2)
- [ ] Define stable `bundle.json` schema v1.0.0
- [ ] Implement schema validation
- [ ] Add schema versioning to exports
- [ ] Create migration framework

### Phase 2: Export Targets (Weeks 3-6)
- [ ] Self-hosted runtime export
- [ ] Express/Fastify middleware export
- [ ] Next.js API routes export
- [ ] Serverless function export
- [ ] Docker/container export

### Phase 3: Open Runtime (Weeks 7-8)
- [ ] Extract runtime to separate package
- [ ] Open source runtime repository
- [ ] Document runtime API
- [ ] Create runtime examples

### Phase 4: Eject UI (Week 9)
- [ ] Add "Export Application" button
- [ ] Create export dialog
- [ ] Implement export flow
- [ ] Add export documentation

### Phase 5: Migration System (Weeks 10-12)
- [ ] Version comparison API
- [ ] Migration script generation
- [ ] Rollback support
- [ ] Migration documentation

### Phase 6: Testing & Documentation (Weeks 13-14)
- [ ] End-to-end export tests
- [ ] Runtime compatibility tests
- [ ] Migration tests
- [ ] User documentation
- [ ] Developer guides

---

## 7. Success Metrics

### Technical Metrics
- **Export success rate**: >99%
- **Export time**: <30 seconds for typical application
- **Bundle size**: <10MB for typical application
- **Schema stability**: No breaking changes for 6 months

### User Metrics
- **Export usage**: % of users who export at least once
- **Re-import success**: % of exports successfully re-imported
- **Runtime adoption**: % of exports deployed to custom runtime
- **User satisfaction**: Survey scores on portability

### Business Metrics
- **Trust signals**: Reduced churn, increased enterprise adoption
- **Developer adoption**: More engineers using NetPad
- **Community growth**: Runtime contributions, examples

---

## 8. Marketing Language

### Core Positioning

**Never say**:
- "No lock-in"
- "We don't trap you"
- "Unlike other tools..."

**Say this instead**:
- "Build applications you actually own."
- "From builder to production—on your terms."
- "NetPad doesn't hold your applications hostage."

### Homepage Section

> **NetPad doesn't hold your applications hostage.**
>
> What you build in NetPad is a real application—defined as code, exportable at any time, and runnable anywhere.
>
> Use NetPad as long as it helps. Leave when you don't. Your app keeps working.

### Feature Bullets

- **Portable application definitions** - Forms, workflows, and data models export as versioned specs
- **Run anywhere** - Host with NetPad or deploy to your own infrastructure
- **Framework-friendly** - Export to Node, serverless, or edge runtimes
- **Git-native** - Diff, review, version, and ship like real software
- **NetPad is optional at runtime** - Your application doesn't depend on us to exist

### Developer-Facing Copy

> NetPad is not a walled garden.
>
> It's a power tool for building applications faster—without deciding how or where they live forever.

### Internal Alignment

**For Engineering + Product**:
> "If a customer can't export their app and keep running it without us, we failed."

**For Marketing**:
> "We sell acceleration, not dependency."

---

## 9. Final Thoughts

Most low-code tools avoid this because it's hard—and because it weakens short-term retention metrics.

But the upside is massive:
- **You attract builders, not hobbyists**
- **You earn trust early**
- **You become infrastructure, not a toy**
- **You age well**

NetPad doesn't need to trap anyone. It needs to be so useful that people stay by choice.

---

## Appendix A: Example Export Output

See `examples/export-output/` for complete examples of:
- Self-hosted runtime export
- Express middleware export
- Next.js API routes export
- Serverless function export

## Appendix B: Schema Reference

See `docs/APPLICATION_BUNDLE_SCHEMA.md` for complete schema documentation.

## Appendix C: Runtime API Reference

See `docs/RUNTIME_API.md` for complete runtime API documentation.
