# NetPad Template Export/Import Strategy

## Executive Summary

This document outlines the current state and future roadmap for NetPad's template export/import capabilities. The goal is to enable users to export forms, workflows, and themes as portable bundles that can be shared, version-controlled, and imported into any NetPad instance.

**Current Status:** Backend infrastructure is **100% complete**. Basic UI components for form export/import are implemented in the Form Builder.

---

## What's Been Built

### 1. Type Definitions (Complete)

**Location:** [src/types/template.ts](../src/types/template.ts)

| Type | Purpose |
|------|---------|
| `TemplateManifest` | Describes bundle contents, metadata, dependencies |
| `FormDefinition` | Cleaned form config for export (no sensitive data) |
| `WorkflowDefinition` | Cleaned workflow config for export |
| `BundleExport` | Complete export response structure |
| `BundleImportRequest` | Import request with options |
| `BundleImportResult` | Import result with success/error tracking |

### 2. Export Utilities (Complete)

**Location:** [src/lib/templates/export.ts](../src/lib/templates/export.ts)

| Function | Purpose |
|----------|---------|
| `cleanFormForExport()` | Removes sensitive fields (orgId, connectionString, accessControl) |
| `cleanWorkflowForExport()` | Removes sensitive fields (orgId, stats, createdBy) |
| `createManifest()` | Generates manifest from bundle contents |
| `createBundleExport()` | Creates complete export structure |

### 3. Import Utilities (Complete)

**Location:** [src/lib/templates/import.ts](../src/lib/templates/import.ts)

| Function | Purpose |
|----------|---------|
| `convertFormDefinitionToConfig()` | Adds org-specific fields, generates new IDs |
| `convertWorkflowDefinitionToDocument()` | Converts to workflow creation format |
| `generateSlug()` | Creates URL-friendly slug from name |
| `validateFormDefinition()` | Validates form structure before import |
| `validateWorkflowDefinition()` | Validates workflow structure before import |

### 4. Import API Endpoint (Complete)

**Location:** [src/app/api/templates/import/route.ts](../src/app/api/templates/import/route.ts)

```
POST /api/templates/import?orgId={orgId}
```

**Features:**
- Imports forms and workflows from bundle
- Validates definitions before import
- Generates new IDs (configurable)
- Handles slug conflicts
- Supports overwrite mode
- Returns detailed success/error results
- Multi-status response (207) for partial success

### 5. Existing Data Export (Complete)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/forms/[formId]/export` | Export form **submissions** to CSV/Excel/JSON/PDF |
| `GET /api/data-export` | Export any MongoDB collection |
| `GET /api/organizations/[orgId]/export` | Export all org submissions |
| `GET /api/user/data-export` | GDPR user data export |

### 6. Data Import System (Complete)

**Location:** [src/app/api/data-import/](../src/app/api/data-import/)

Multi-stage import workflow:
1. Upload & create job
2. Analyze & infer schema
3. Configure field mappings
4. Execute import with validation

### 7. Form Definition Export Endpoint (Complete)

**Location:** [src/app/api/forms/[formId]/definition/route.ts](../src/app/api/forms/[formId]/definition/route.ts)

```
GET /api/forms/[formId]/definition?orgId={orgId}
```

**Features:**
- Exports form configuration as portable JSON
- Uses `cleanFormForExport()` to remove sensitive fields
- Supports both platform (orgId) and legacy session-based access
- Returns with Content-Disposition header for download

### 8. Workflow Definition Export Endpoint (Complete)

**Location:** [src/app/api/workflows/[workflowId]/definition/route.ts](../src/app/api/workflows/[workflowId]/definition/route.ts)

```
GET /api/workflows/[workflowId]/definition?orgId={orgId}
```

**Features:**
- Exports workflow configuration as portable JSON
- Uses `cleanWorkflowForExport()` to remove sensitive fields
- Requires authentication and orgId

### 9. Bundle Export Endpoint (Complete)

**Location:** [src/app/api/forms/[formId]/bundle/route.ts](../src/app/api/forms/[formId]/bundle/route.ts)

```
GET /api/forms/[formId]/bundle?orgId={orgId}&format=json
```

**Features:**
- Exports form + linked workflows + theme as complete bundle
- Auto-generates manifest with metadata
- Currently supports JSON format (ZIP planned for future)
- Uses `createBundleExport()` to create bundle structure

### 10. Example Templates (Complete)

**Location:** [examples/it-helpdesk/templates/](../examples/it-helpdesk/templates/)

- `form.ts` - TypeScript form configuration with @netpad/forms types
- `form.json` - Complete IT Help Desk form definition (portable JSON)
- `manifest.json` - Template metadata and setup instructions

### 11. Form Builder Export/Import UI (Complete)

**Location:** [src/components/FormBuilder/FormBuilder.tsx](../src/components/FormBuilder/FormBuilder.tsx)

Added to the Form Builder's More menu (⋮):
- **Export Form Definition** - Downloads current form as `{form-name}-definition.json`
- **Import Form Definition** - Opens file picker to load a form from JSON

**Features:**
- Uses `cleanFormForExport()` to remove sensitive data before export
- Validates imported JSON structure before loading
- Loads all form properties (fieldConfigs, theme, variables, etc.)
- Creates imported form as new unsaved form (clears ID)
- Shows success/error notifications

### 12. Workflow Editor Export/Import UI (Complete)

**Location:** [src/components/WorkflowEditor/index.tsx](../src/components/WorkflowEditor/index.tsx)

Added to the Workflow Editor's More menu (⋮):
- **Export Workflow Definition** - Downloads current workflow as `{workflow-name}-definition.json`
- **Import Workflow Definition** - Opens file picker to load nodes from a workflow JSON

**Features:**
- Uses `cleanWorkflowForExport()` to remove sensitive data before export
- Validates imported JSON structure (requires canvas.nodes array)
- Imports all nodes with new IDs to avoid conflicts
- Updates workflow settings if present in imported definition
- Shows success/error notifications

---

## What's Missing

### 1. Enhanced UI Components

**Priority:** Medium
**Effort:** Medium

#### 2.1 Template Gallery (Future)

**Location:** New top-level section or modal

**Requirements:**
- Browse available templates
- Filter by category (helpdesk, onboarding, survey, etc.)
- Preview template details
- One-click import

### 5. Hooks & Integration Points

**Priority:** Medium
**Effort:** Medium

#### 5.1 Form Editor Hooks

```typescript
// Hook to enable export button
useFormExport(formId: string) => {
  exportDefinition: () => Promise<void>,
  exportBundle: () => Promise<void>,
  copyToClipboard: () => Promise<void>,
  isExporting: boolean,
}
```

#### 5.2 Import Hooks

```typescript
// Hook to handle template imports
useTemplateImport(orgId: string) => {
  importFromFile: (file: File) => Promise<BundleImportResult>,
  importFromJson: (json: any) => Promise<BundleImportResult>,
  validateBundle: (json: any) => ValidationResult,
  isImporting: boolean,
  progress: ImportProgress,
}
```

#### 5.3 Event Hooks

```typescript
// Events for integration
onFormExported?: (form: FormDefinition) => void
onWorkflowExported?: (workflow: WorkflowDefinition) => void
onBundleImported?: (result: BundleImportResult) => void
```

### 6. CLI Package

**Priority:** Low
**Effort:** Large

Create `@netpad/cli` package for programmatic asset management:

```bash
# Export
npx @netpad/cli export form <formId> --output ./templates/
npx @netpad/cli export workflow <workflowId> --output ./templates/

# Import
npx @netpad/cli import ./templates/bundle.json --org <orgId>

# Sync (GitOps)
npx @netpad/cli sync ./definitions/ --org <orgId>
```

**Deferred:** This requires significant effort and should be planned after UI components are complete.

---

## Implementation Roadmap

### Phase 1: Complete Export APIs ✅ DONE

- [x] Create `GET /api/forms/[formId]/definition`
- [x] Create `GET /api/workflows/[workflowId]/definition`
- [x] Create `GET /api/forms/[formId]/bundle`
- [x] Create `POST /api/templates/import`
- [ ] Add tests for new endpoints

### Phase 2: Example Templates ✅ DONE

- [x] Create template files for IT Helpdesk example
- [x] Update example READMEs with import instructions
- [ ] Create template files for Employee Onboarding example
- [ ] Test round-trip export/import

### Phase 3: Basic UI Components ✅ DONE

- [x] Add "Export Form Definition" to form editor More menu
- [x] Add "Import Form Definition" to form editor More menu
- [x] Add "Export Workflow Definition" to workflow editor More menu
- [x] Add "Import Workflow Definition" to workflow editor More menu

### Phase 4: Enhanced Import Experience

- [ ] Add import preview (show what will be created)
- [ ] Add import options UI (generate IDs, overwrite, etc.)
- [ ] Add progress indicator for large imports
- [ ] Add success/error summary dialog

### Phase 5: Template Gallery (Future)

- [ ] Design template gallery UI
- [ ] Create template catalog API
- [ ] Add built-in templates
- [ ] Consider community template submissions

---

## Bundle Format Specification

### Directory Structure (ZIP)

```
template-name/
├── manifest.json           # Required: metadata and asset paths
├── forms/
│   └── form.json          # Form definition
├── workflows/
│   └── workflow.json      # Workflow definition (optional)
└── theme.json             # Theme customization (optional)
```

### JSON Bundle Structure

```json
{
  "manifest": {
    "name": "IT Help Desk",
    "version": "1.0.0",
    "description": "Complete IT support ticketing system",
    "author": "NetPad Examples",
    "category": "helpdesk",
    "tags": ["support", "ticketing", "it"],
    "assets": {
      "forms": ["forms/form.json"],
      "workflows": ["workflows/ticket-routing.json"]
    },
    "dependencies": {
      "integrations": ["email"]
    },
    "instructions": {
      "setup": [
        "Configure email integration for notifications",
        "Update department list to match your organization"
      ]
    }
  },
  "forms": [{ /* FormDefinition */ }],
  "workflows": [{ /* WorkflowDefinition */ }]
}
```

### Manifest Schema

```typescript
interface TemplateManifest {
  // Required
  name: string;
  version: string;
  assets: {
    forms?: string[];
    workflows?: string[];
    theme?: string;
  };

  // Optional metadata
  description?: string;
  author?: string;
  license?: string;
  tags?: string[];
  category?: string;

  // Version compatibility
  netpadVersion?: string;
  minimumNetpadVersion?: string;

  // Dependencies
  dependencies?: {
    integrations?: string[];
    connections?: string[];
  };

  // User guidance
  instructions?: {
    import?: string;
    setup?: string[];
    customization?: string[];
  };

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}
```

---

## Security Considerations

### Data Sanitization on Export

The following fields are **always removed** during export:

**Forms:**
- `connectionString` (legacy database credentials)
- `dataSource` (vault connection IDs - org-specific)
- `organizationId`
- `createdBy`
- `accessControl` (permissions - org-specific)
- `id` (regenerated on import)

**Workflows:**
- `_id`, `id` (regenerated on import)
- `orgId`
- `createdBy`, `lastModifiedBy`
- `stats` (execution statistics)

### Import Validation

- All definitions validated before import
- New IDs generated by default (prevents ID collisions)
- Slug conflicts handled gracefully
- No code execution during import (JSON only)

### Access Control

- Export requires read access to form/workflow
- Import requires create permission in target org
- Bundle import checks all asset permissions

---

## Testing Strategy

### Unit Tests

- [ ] `cleanFormForExport()` removes all sensitive fields
- [ ] `cleanWorkflowForExport()` removes all sensitive fields
- [ ] `validateFormDefinition()` catches invalid structures
- [ ] `validateWorkflowDefinition()` catches invalid structures
- [ ] `convertFormDefinitionToConfig()` generates valid config
- [ ] `convertWorkflowDefinitionToDocument()` generates valid doc

### Integration Tests

- [ ] Export form definition endpoint
- [ ] Export workflow definition endpoint
- [ ] Export bundle endpoint
- [ ] Import bundle endpoint (success case)
- [ ] Import bundle endpoint (validation errors)
- [ ] Import bundle endpoint (slug conflicts)
- [ ] Round-trip: export → import → compare

### E2E Tests

- [ ] Export button downloads file
- [ ] Import dialog accepts file
- [ ] Import preview shows correct assets
- [ ] Import creates forms in correct org
- [ ] Imported form renders correctly

---

## Open Questions

1. **ZIP vs JSON:** Should bundles be ZIP files (for larger templates with assets) or JSON-only?
   - *Recommendation:* Start with JSON-only, add ZIP support later if needed

2. **Workflow Linking:** How should we handle workflows that reference specific form IDs?
   - *Recommendation:* Use slug-based references in exports, resolve on import

3. **Theme Export:** Should themes be org-level or per-form?
   - *Recommendation:* Per-form themes only for now

4. **Version Compatibility:** How strict should version checking be?
   - *Recommendation:* Warn but allow import; let validation catch incompatibilities

5. **Community Templates:** Should we support user-submitted templates?
   - *Recommendation:* Defer to Phase 5+; focus on built-in examples first

---

## Appendix: File Locations

### Core Types & Utilities

| Component | Path |
|-----------|------|
| Type definitions | `src/types/template.ts` |
| Export utilities | `src/lib/templates/export.ts` |
| Import utilities | `src/lib/templates/import.ts` |

### API Endpoints

| Endpoint | Path |
|----------|------|
| Form definition export | `src/app/api/forms/[formId]/definition/route.ts` |
| Workflow definition export | `src/app/api/workflows/[workflowId]/definition/route.ts` |
| Bundle export | `src/app/api/forms/[formId]/bundle/route.ts` |
| Template import | `src/app/api/templates/import/route.ts` |
| Form submissions export | `src/app/api/forms/[formId]/export/route.ts` |
| Data export | `src/app/api/data-export/route.ts` |
| Data import | `src/app/api/data-import/` |

### Example Templates

| Example | Path |
|---------|------|
| IT Helpdesk form (JSON) | `examples/it-helpdesk/templates/form.json` |
| IT Helpdesk form (TypeScript) | `examples/it-helpdesk/templates/form.ts` |
| IT Helpdesk workflow (JSON) | `examples/it-helpdesk/templates/workflow.json` |
| IT Helpdesk workflow (TypeScript) | `examples/it-helpdesk/templates/workflow.ts` |
| IT Helpdesk manifest | `examples/it-helpdesk/templates/manifest.json` |

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-04 | 1.4 | Added Workflow Editor UI for export/import (Phase 3 complete) |
| 2026-01-04 | 1.3 | Added workflow template (workflow.json, workflow.ts) to IT Helpdesk example |
| 2026-01-04 | 1.2 | Added Form Builder UI for export/import, added form.ts TypeScript template |
| 2026-01-04 | 1.1 | Updated status: Backend APIs complete, added example templates |
| 2026-01-04 | 1.0 | Initial strategy document |
