# Phase 4 Spec – Applications Releases, Templates, and Insights

**Date:** January 2026  
**Author:** NetPad Applications-First initiative  
**Depends on:**  
- `docs/netpad_applications_first_implementation_spec_v1.md`  
- `docs/PHASE1_IMPLEMENTATION_STATUS.md`  
- `docs/PHASE2_IMPLEMENTATION_STATUS.md`  
- `docs/PHASE3_IMPLEMENTATION_STATUS.md`  

---

## 1. Purpose and Scope

With **Phases 1–3** complete, Applications are now:
- First-class entities with IDs, stats, and CRUD.
- The primary navigation surface (Applications-first).
- The owning context for forms and workflows (with `applicationId` enforced).

**Phase 4** adds the first layer of *product-grade lifecycle* on top of this:
- **Application Releases / Versions** – snapshot, view history, and understand what’s deployed.
- **Template Picker** – make workflows easier to start via reusable templates.
- **Basic Application Insights** – surface releases, usage stats, and “health” in the UI.

> **Explicit Non-goals (Phase 4):**
> - No hard contract enforcement or breaking-change detection (that’s a later “Contracts” phase).
> - No full RBAC overhaul; we’ll only add minimal, opt‑in constraints where clearly needed.
> - No marketplace install/upgrade flows yet (this stays manual/import‑driven for now).

---

## 2. High-level Outcomes

By the end of Phase 4:

1. **Each Application has a Releases panel**:
   - Users can see a list of releases (version + changelog + createdAt).
   - Users can create a new release (snapshot) from the current application state.
   - Users can see which release is the **current/active** one.

2. **Workflow creation supports Templates**:
   - Users can choose “Start from template” when creating a workflow within an application.
   - The system uses `WorkflowTemplate` definitions to seed new workflows.

3. **Application detail shows basic Insights**:
   - Releases tab (history).
   - “Last release” info surfaced in the main Application header.
   - High-level execution stats re-used from existing workflow stats where easy.

---

## 3. Domain Model (Phase-4-specific usage)

Types already exist in `src/types/application.ts`:

- `ApplicationRelease`
- `WorkflowTemplate`

Phase 4 **does not** introduce new core types; instead it **operationalizes** these.

### 3.1 ApplicationRelease – Operational Semantics

**Existing type (for reference):**
- `releaseId`, `applicationId`, `version`, `contractId`, `changelog?`, `manifest`, `createdAt`.

**Phase 4 semantics:**
- A **Release** is a read-only snapshot record that:
  - References the owning `applicationId`.
  - Tracks a **semantic version** string (e.g. `1.0.0`, `1.1.0`).
  - Captures which forms/workflows are “in” the release via `manifest`.
- The **source of truth** for form/workflow documents remains the live forms/workflows collections; Releases reference them by ID only.
- A Release in Phase 4 is **descriptive**, not enforcing:
  - No rollback.
  - No immutable locking.
  - No automatic diffing.

> Later phases may add:
> - Release state machine (draft/active/deprecated).
> - Rollback/pin.
> - Contract validation.

### 3.2 WorkflowTemplate – Operational Semantics

**Existing type (for reference):**
- `templateId`, `name`, `version`, `tags?`, `definition`, `createdBy`, `createdAt`, `updatedAt?`.

**Phase 4 semantics:**
- Templates are **global per org** (or per platform), not bound to a single application.
- A template is used to **seed** a new workflow’s canvas/definition when creating a workflow within an application.
- The template itself is **not mutated** when workflows change.

> Later phases may add:
> - Template governance (who can publish templates).
> - Template usage analytics.

---

## 4. API Shape (Phase 4)

### 4.1 Application Releases API

Base path (App Router):
- `GET /api/applications/[applicationId]/releases`
- `POST /api/applications/[applicationId]/releases`

**GET** – list releases for an application
- **Query params:**
  - `orgId` (required): organization context (same pattern as existing Application APIs).
  - Pagination optional: `page`, `pageSize`.
- **Response:**
  - `success: boolean`
  - `releases: ApplicationRelease[]`

**POST** – create new release
- **Body:**
  - `orgId` (required)
  - `projectId` (required)
  - `version` (required) – semantic version string (e.g., `1.0.0`). UI should pre-fill with server-suggested next version.
  - `changelog?: string`
  - (No client-side manifest; server will compute from current application state.)

**GET** – get suggested next version (helper endpoint)
- **Path:** `GET /api/applications/[applicationId]/releases/next-version?orgId=xxx`
- **Response:** `{ suggestedVersion: "1.1.0" }`
- Used by UI to pre-fill the version field in the create dialog.
- **Server responsibilities:**
  1. Validate `orgId`, `projectId`, and `applicationId` relationship.
  2. Pull current forms/workflows for that `applicationId`.
  3. Build `manifest.forms` and `manifest.workflows` arrays with IDs and basic roles:
     - Phase 4 can set `role: "primary"`/`"secondary"` for forms and `"core"`/`"extension"` for workflows with a simple heuristic (or mark all as `"primary"` / `"core"` as a starting point).
  4. Insert `ApplicationRelease` document into org DB.

> **Note:** No PATCH/DELETE for releases in v1 to avoid complex lifecycle logic. Viewing and creating releases is sufficient for Phase 4.

### 4.2 Workflow Templates API

Base path:
- `GET /api/workflow-templates` – list templates.

**GET** – list templates usable for workflow creation
- **Query params:**
  - `orgId` (required)
  - Optional filters: `tag`, `search`, `limit`.
- **Response:**
  - `success: boolean`
  - `templates: WorkflowTemplate[]`

> **Create/Update templates:** Out of scope for Phase 4.  
> - Templates can initially be seeded via scripts/fixtures or an admin-only UI later.

### 4.3 Workflow Creation with Template

Existing `/api/workflows` POST already supports:
- `orgId`, `projectId`, `name`, `description`, `applicationId`.

Phase 4 adds **optional** template usage:
- New optional POST body fields:
  - `templateId?: string`
  - `templateVersion?: string`
- Server behavior:
  - If `templateId` is provided:
    1. Look up `WorkflowTemplate` by `templateId` (and optional `templateVersion`).
    2. Use its `definition` as the initial workflow `canvas` when creating the workflow.
  - If `templateId` is not provided, current behavior is unchanged.

---

## 5. UI Surfaces

### 5.1 Application Releases Panel (Application Detail)

**Location:**
- New tab or sub‑section inside Application detail page:
  - Option A: Add a third tab: `Forms | Workflows | Releases`.
  - Option B: Keep tabs as-is and add a **Releases panel** in a right sidebar or “Releases” section below main stats.

> **Recommendation:** Start with a **Releases** tab – simpler mental model.

**UI capabilities:**
- List of releases for that application:
  - Version (`1.0.0`), createdAt, changelog preview (first line), count of forms/workflows in the manifest.
- `Create Release` button:
  - Opens a dialog with:
    - Version (suggested value).
    - Changelog (optional).
  - On confirm, calls `POST /api/applications/[applicationId]/releases`.
- Current/Active release indication:
  - For Phase 4, “active” is implicitly the **latest by createdAt**.
  - UI can show a badge: “Latest” next to the most recent entry.

**No rollback/compare UI** in Phase 4 – read-only history + create new is enough.

### 5.2 Template Picker in Workflow Creation

**Location:**
- In `WorkflowsPage` create workflow dialog (`Create New Workflow`):
  - Add a **secondary option**: “Start from template”.

**UX pattern:**
1. User opens “Create Workflow”.
2. Dialog shows:
   - Basic fields: Name, Description.
   - A “Template” selection area:
     - Option A: Dropdown with templates.
     - Option B: “Browse templates” button that opens a mini gallery dialog.
3. If user selects a template:
   - Template info is recorded as `templateId` (and optional `templateVersion`).
   - On submit, POST includes these fields; backend seeds the definition.

**Scope choice for Phase 4:**
- Start with **simple dropdown**:
  - `Select template (optional)`.
  - Entries: `None`, then list of templates with name + optional tag chip.
  - This keeps implementation small while enabling the concept.

### 5.3 Application Insights in Header (Phase 4-lite)

In `ApplicationDetailPage` header:
- Add:
  - “Last Release: vX.Y.Z on <date>” (if any release exists).
  - If no release exists:
    - Show subtle text: “No releases yet – create your first release to snapshot this application.”

No charts or complex metrics yet – just surfaced meta‑information from `ApplicationRelease`.

---

## 6. Authorization & Permissions

Follow existing patterns:

- **Releases:**
  - `GET` – any org member with access to the project can view releases.
  - `POST` – same permissions as editing the application (org member; not restricted to admin for now).

- **Templates:**
  - `GET` – any org member can list templates.
  - Creating/updating templates is out of scope; if later added, it should require elevated roles.

- **Workflow creation from template:**
  - Same permission checks as current workflow creation (no new roles).

> Future “Application-based permissions” phase can add:
> - Per-application roles.
> - Enforced limits on who can create releases or use certain templates.

---

## 7. Migration / Data Considerations

Phase 4 changes are **additive**:
- New `applicationReleases` usage — collection and indexes already exist.
- `workflowTemplates` usage — collection and indexes already exist.

**No migration is strictly required**, but we may add:
- A **backfill task** (optional) to:
  - Create an initial Release for each existing Application (e.g., version `0.1.0`) for visibility.

This can be a separate script:
- `scripts/migrate-initial-application-releases.ts` (optional, Phase 4.1).

---

## 8. Implementation Plan (High Level)

1. **Releases backend**
   - Implement `getApplicationReleases` and `createApplicationRelease` in a new module (`src/lib/platform/applicationReleases.ts` or within `applications.ts`).
   - Implement `GET`/`POST` under `/api/applications/[applicationId]/releases`.

2. **Releases UI**
   - Add Releases tab/section to `ApplicationDetailPage`.
   - Implement Releases list + “Create Release” dialog.

3. **Templates backend**
   - Implement `GET /api/workflow-templates` (org-scoped).

4. **Templates UI**
   - Extend workflow creation dialog to include a simple Template dropdown.
   - Wire through `templateId` (+ optional `templateVersion`) to workflow creation POST.

5. **Insights**
   - Surface last release info in Application header (using releases endpoint).

6. **Docs & Testing**
   - Create `docs/PHASE4_IMPLEMENTATION_STATUS.md`.
   - Extend `docs/IMPLEMENTATION_SUMMARY.md` with Phase 4 section.
   - Add test checklist for Releases + Templates paths.

---

## 9. Decisions (Confirmed January 13, 2026)

All open questions have been resolved. Here are the confirmed decisions:

### 9.1 Release Versioning Strategy

**Decision: Server suggests, client can override**

- Server **suggests** the next version based on latest release:
  - If no releases exist → suggest `1.0.0`
  - If latest is `X.Y.Z` → suggest `X.(Y+1).0` (increment minor)
- Client can **accept or modify** the suggested version
- Server **validates** format (must be semver-like: `X.Y.Z`)
- Version field is **required** in POST body (but UI pre-fills suggestion)

**Rationale:** Balances user control with convenience. Users aren't burdened with inventing versions but retain full control when needed.

---

### 9.2 Initial Backfill of Releases

**Decision: Start empty (no backfill script)**

- Applications start with **no release history**
- Users create their first release intentionally when ready
- UI handles "No releases yet" state gracefully (already specified in section 5.3)

**Rationale:** Releases should represent intentional snapshots, not synthetic history. Avoids questions like "what was in version 0.1.0?" when it was auto-generated.

**Future option:** Could add a "Create Initial Release" button that's prominently displayed when no releases exist.

---

### 9.3 Template Catalog Source

**Decision: Org-specific templates + seeded built-in templates**

- Templates are stored **per-org** in the `workflowTemplates` collection
- A **seed script** will create a few **built-in starter templates** for each org:
  - "Basic Approval Workflow" - simple request → approve/reject flow
  - "Data Pipeline" - fetch → transform → store pattern
  - "Notification Flow" - trigger → send notification
- Built-in templates marked with `createdBy: 'system'` or `isBuiltIn: true`
- API can filter by `includeBuiltIn` if needed later

**Rationale:** Provides immediate value (users see templates on day 1) while keeping architecture simple. Seed script: `scripts/seed-workflow-templates.ts`.

---

### 9.4 UI Placement for Releases

**Decision: Dedicated Releases tab**

- Application detail page tabs: `Forms | Workflows | Releases`
- Releases tab contains:
  - List of releases (version, date, changelog preview, manifest counts)
  - "Create Release" button
  - "Latest" badge on most recent release

**Rationale:**
- Matches spec's "minimum UI surfaces" which lists "Release / version panel" separately
- Room to grow (changelog, manifest preview, compare features later)
- Keeps Forms/Workflows tabs focused
- Header insight ("Last Release: v1.2.0") provides visibility without requiring tab navigation

---

### 9.5 Who Can Create Releases

**Decision: Any org member with project access**

- Consistent with existing permission patterns (UPDATE operations are permissive)
- Releases in Phase 4 are descriptive/informational, not enforcing
- Low risk - releases are read-only snapshots, no destructive action

**Future consideration:** Add rate limiting or confirmation if someone creates many releases in quick succession ("You created a release 5 minutes ago. Create another?"). Can tighten permissions later when releases become more consequential (contracts, rollback).

---

## 10. Summary of Decisions

| Question | Decision | Key Detail |
|----------|----------|------------|
| Version strategy | Suggest + allow override | Server suggests `X.(Y+1).0`, client can modify |
| Initial backfill | Start empty | Releases should be intentional |
| Template catalog | Org-specific + seeded built-ins | Seed script creates 3 starter templates |
| Releases UI | Dedicated tab | `Forms | Workflows | Releases` |
| Who creates releases | Any org member | Matches existing permission patterns |

---

## 11. Ready for Implementation

All decisions are confirmed. Phase 4 can now be broken into implementation tasks:

1. **Releases Backend** - API endpoints + library functions
2. **Releases UI** - Tab, list, create dialog
3. **Templates Backend** - API endpoint + seed script
4. **Templates UI** - Dropdown in workflow creation dialog
5. **Insights** - Last release info in application header
6. **Testing & Docs** - Phase 4 status doc, test checklist

