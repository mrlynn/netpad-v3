# NetPad applications-first model — implementation spec (v1)

_Prepared for Mike • January 14, 2026_

---

## 1. executive summary

This document turns the Applications-first model into buildable primitives: data entities, enforcement rules, API shape, migration plan, and the minimum UI behavior required to make Applications authoritative without adding friction for simple use cases.

---

## 2. non-negotiables (design constraints)

- Applications are authoritative. Nothing meaningful exists outside an application long-term.
- Forms always belong to an application. The platform may create a default application silently to avoid friction.
- Workflow instances belong to exactly one application. Cross-app reuse happens via workflow templates, not shared instances.
- Applications define contracts. Internal edits are allowed only if the contract remains valid.
- Marketplace distributes applications (and optional templates), never standalone forms/workflows.

---

## 3. domain model additions

You already have Application, Form, Workflow. To support install/upgrade/fork, protection, and marketplace trust, add the following first-class entities.

### 3.1 application contract

**Purpose:** the stable “API surface” of an application.  
**Complexity:** Medium  
**Tradeoff:** requires enforcement — worth it.

```ts
interface ApplicationContract {
  contractId: string;
  applicationId: string;
  version: string;
  status: "draft" | "active" | "deprecated";

  inputs: Array<{ key: string; type: string; required: boolean; source?: "form"|"api"|"webhook" }>;
  outputs: Array<{ key: string; type: string; guaranteed: boolean }>;
  events: Array<{ name: string; payloadSchemaRef?: string }>;
  extensionPoints: Array<{ key: string; type: "hook" | "workflow"; description?: string }>;

  createdAt: Date;
  updatedAt: Date;
}
```

---

### 3.2 application release

**Purpose:** packaging spine for install, upgrade, rollback, marketplace history.

```ts
interface ApplicationRelease {
  releaseId: string;
  applicationId: string;
  version: string;
  contractId: string;
  changelog?: string;

  manifest: {
    forms: Array<{ formId: string; role: "primary"|"secondary" }>;
    workflows: Array<{ workflowId: string; role: "core"|"extension" }>;
    configSchemaId: string;
  };

  createdAt: Date;
}
```

---

### 3.3 configuration schema

```ts
interface ConfigSchema {
  configSchemaId: string;
  applicationId: string;
  version: string;

  fields: Array<{
    key: string;
    type: "string"|"number"|"boolean"|"secret"|"select";
    required: boolean;
    default?: any;
    description?: string;
  }>;

  createdAt: Date;
}
```

---

### 3.4 workflow templates and instances

```ts
interface WorkflowTemplate {
  templateId: string;
  name: string;
  version: string;
  tags?: string[];
  definition: any;
  createdBy: string;
  createdAt: Date;
}

interface WorkflowInstance {
  workflowId: string;
  applicationId: string;
  templateId?: string;
  templateVersion?: string;
  definition: any;
  locked: boolean;
  createdAt: Date;
}
```

---

## 4. enforcement rules (locked vs editable)

### 4.1 contract-defining assets

- Assets listed as `primary` or `core` in the active release are contract-defining
- Contract-defining assets are locked by default
- Locked means **constrained edits**, not immutable

### 4.2 mutation zones

**Forms**
- Editable: labels, help text, ordering, styling
- Constrained: fields mapped to contract inputs
- Forbidden: deleting required contract inputs without fork/version bump

**Workflows**
- Editable: nodes at extension points
- Constrained: core path rewiring
- Forbidden: removing guaranteed outputs/events

### 4.3 forking

Violations trigger:
1. Block with explanation
2. Offer major version bump
3. Offer fork (new application + contract)

---

## 5. default application behavior

Every project gets a system-created default application.

### 5.1 behavior

1. Project created → default application
2. Create form → assigned silently
3. Add workflow → still default
4. Threshold crossed → surface application UI

### 5.2 thresholds

- Second form
- First workflow connection
- First config secret
- Marketplace install

---

## 6. API shape

### canonical
- `/applications/<built-in function id>`
- `/applications/<built-in function id>/forms`
- `/applications/<built-in function id>/workflows`
- `/applications/<built-in function id>/releases`
- `/applications/<built-in function id>/fork`
- `/applications/<built-in function id>/upgrade`

### migration-only
- `/projects/<built-in function id>/forms`
- `/projects/<built-in function id>/workflows`

---

## 7. MongoDB modeling

**Collections**
- applications
- applicationContracts
- applicationReleases
- forms
- workflows
- workflowTemplates
- configSchemas
- connections

**Indexes**
- applications: { organizationId, projectId, updatedAt }
- forms/workflows: { applicationId, updatedAt }
- releases: { applicationId, version }

---

## 8. migration plan

### phase 1
- Add application entity
- Add applicationId to assets
- Default app per project

### phase 2
- Backfill existing assets into default app
- Allow manual split later

### phase 3
- Applications-first navigation
- Deprecate project-level create endpoints

---

## 9. minimum UI surfaces

- Applications list (default landing)
- Application detail (tabs)
- Release / version panel
- Template picker (optional v1)

---

## 10. open decisions (non-blocking)

- Surface contracts to users or keep internal?
- Require contract draft to publish?
- Rollback vs pin-only?
- Templates standalone vs bundled?

---

_End of document._
