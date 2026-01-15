# NetPad Applications: Summary and Implementation Roadmap

## Executive Summary

NetPad Applications are **portable, self-contained packages** that combine forms, workflows, and their connections into complete, deployable solutions. This enables:

- ✅ **Portability**: Move complete applications between NetPad instances
- ✅ **Marketplace**: Share applications with the community
- ✅ **Rapid Deployment**: Import and deploy complete solutions in minutes
- ✅ **Version Control**: Track application versions and updates
- ✅ **Reusability**: Build once, deploy everywhere

## Current State

### What Exists Today

1. **Form Templates**: 48+ form templates organized by category
2. **Workflow Templates**: 10+ workflow templates for common patterns
3. **Bundle Export/Import**: Basic infrastructure exists
   - `BundleExport` type with forms, workflows, manifest, deployment
   - Export endpoints: `/api/forms/[formId]/bundle`, `/api/projects/[projectId]/bundle`
   - Import endpoint: `/api/templates/import`
4. **Form-Workflow Connection**: Workflows can trigger on form submissions via `form-trigger` nodes

### What's Missing

1. **Explicit Connections**: No explicit tracking of form-workflow relationships
2. **Connection Resolution**: Import doesn't automatically resolve form references in workflows
3. **Application Structure**: No unified "application" concept that packages everything
4. **Marketplace**: No discovery or sharing mechanism
5. **Connection Detection**: Export doesn't automatically detect form-workflow connections

## Design Overview

### Core Concept: Form-Workflow Connections

Forms and workflows connect through **form-trigger nodes** in workflows:

```typescript
// Workflow node that triggers on form submission
{
  type: "form-trigger",
  config: {
    formId: "form_abc123",  // References a form
    waitForValidation: false
  }
}
```

**Key Insight**: We need to:
1. **Detect** these connections during export
2. **Store** them explicitly in the application bundle
3. **Resolve** them during import (update form IDs)

### Application Structure

```typescript
interface NetPadApplication {
  manifest: ApplicationManifest;      // Metadata, version, author
  forms: FormDefinition[];             // All forms in the application
  workflows: WorkflowDefinition[];     // All workflows in the application
  connections: FormWorkflowConnection[]; // Explicit form-workflow links
  deployment?: DeploymentConfig;        // How to deploy
  project?: ProjectMetadata;            // Project-level metadata
}
```

## Implementation Roadmap

### Phase 1: Core Types and Connection Detection (Week 1)

**Goal**: Add connection types and detection logic

**Tasks**:
1. ✅ Extend `BundleExport` type to include `connections` array
2. ✅ Create `FormWorkflowConnection` type
3. ✅ Create `ApplicationManifest` type (enhanced from `TemplateManifest`)
4. ✅ Build connection detection function
5. ✅ Update export utilities to detect connections

**Files to Modify**:
- `src/types/template.ts` - Add connection types
- `src/lib/templates/export.ts` - Add connection detection
- `src/app/api/projects/[projectId]/bundle/route.ts` - Include connections

**Deliverable**: Export includes explicit connections

### Phase 2: Reference Resolution on Import (Week 1-2)

**Goal**: Automatically resolve form references in workflows during import

**Tasks**:
1. ✅ Build reference resolution function
2. ✅ Update workflow nodes with new form IDs
3. ✅ Update import utilities to resolve references
4. ✅ Test import/export roundtrip

**Files to Modify**:
- `src/lib/templates/import.ts` - Add reference resolution
- `src/app/api/templates/import/route.ts` - Use resolution logic

**Deliverable**: Import correctly links forms and workflows

### Phase 3: Application Export UI (Week 2)

**Goal**: UI for exporting complete applications

**Tasks**:
1. ✅ Add "Export Application" button to project view
2. ✅ Create application export dialog
3. ✅ Show detected connections in preview
4. ✅ Allow customization of manifest metadata

**Files to Create/Modify**:
- `src/components/Projects/ApplicationExportDialog.tsx`
- `src/components/Projects/ProjectView.tsx` - Add export button

**Deliverable**: Users can export applications from UI

### Phase 4: Application Import UI (Week 2-3)

**Goal**: UI for importing applications with preview

**Tasks**:
1. ✅ Add "Import Application" to project view
2. ✅ Create import dialog with preview
3. ✅ Show forms, workflows, connections
4. ✅ Configuration wizard for environment variables
5. ✅ Import progress indicator

**Files to Create/Modify**:
- `src/components/Projects/ApplicationImportDialog.tsx`
- `src/app/api/applications/import/route.ts` - New import endpoint

**Deliverable**: Users can import applications from UI

### Phase 5: Marketplace Foundation (Week 3-4)

**Goal**: Basic marketplace API and UI

**Tasks**:
1. ✅ Create marketplace API endpoints
2. ✅ Application listing page
3. ✅ Application detail page
4. ✅ Search and filtering
5. ✅ Import from marketplace

**Files to Create**:
- `src/app/api/marketplace/applications/route.ts`
- `src/app/api/marketplace/applications/[id]/route.ts`
- `src/components/Marketplace/MarketplaceView.tsx`
- `src/components/Marketplace/ApplicationCard.tsx`

**Deliverable**: Basic marketplace for browsing and importing

### Phase 6: Enhanced Features (Week 4+)

**Goal**: Polish and advanced features

**Tasks**:
1. ✅ Application versioning
2. ✅ Update existing applications
3. ✅ Application dependencies
4. ✅ Application templates/generator
5. ✅ Analytics and usage tracking

## Key Implementation Details

### Connection Detection

```typescript
function detectConnections(
  forms: FormDefinition[],
  workflows: WorkflowDefinition[]
): FormWorkflowConnection[] {
  const connections: FormWorkflowConnection[] = [];
  
  for (const workflow of workflows) {
    const formTriggerNodes = workflow.canvas.nodes.filter(
      node => node.type === 'form-trigger'
    );
    
    for (const node of formTriggerNodes) {
      const formId = node.config?.formId;
      const form = forms.find(f => f.id === formId || f.slug === formId);
      
      if (form) {
        connections.push({
          id: `conn_${workflow.slug}_${form.slug}`,
          formRef: form.slug || form.id!,
          workflowRef: workflow.slug || workflow.id!,
          type: 'trigger',
          config: { triggerOn: 'submit' }
        });
      }
    }
  }
  
  return connections;
}
```

### Reference Resolution

```typescript
async function resolveReferences(
  application: NetPadApplication,
  importedForms: Map<string, string>,  // oldId -> newId
  importedWorkflows: Map<string, string>
): Promise<void> {
  // Update workflow nodes
  for (const workflow of application.workflows) {
    const formTriggerNodes = workflow.canvas.nodes.filter(
      node => node.type === 'form-trigger'
    );
    
    for (const node of formTriggerNodes) {
      const oldFormRef = node.config?.formId;
      const form = application.forms.find(
        f => f.slug === oldFormRef || f.id === oldFormRef
      );
      
      if (form) {
        const newFormId = importedForms.get(form.id || form.slug || '');
        if (newFormId) {
          node.config.formId = newFormId;
        }
      }
    }
  }
}
```

## Migration Path

### For Existing Bundles

Existing bundles without connections will still work:
- Import detects missing connections
- Automatically generates connections from workflow nodes
- Backward compatible

### For New Applications

New applications will:
- Include explicit connections
- Have better metadata
- Support marketplace features

## Success Metrics

1. **Portability**: Can export and import complete applications successfully
2. **Connection Preservation**: Form-workflow links work after import
3. **User Adoption**: Users export/import applications regularly
4. **Marketplace Growth**: Applications shared and downloaded

## Next Steps

1. **Review Design**: Get feedback on the application structure
2. **Start Phase 1**: Implement core types and connection detection
3. **Test with IT Help Desk**: Use existing example as test case
4. **Iterate**: Refine based on real-world usage

## Questions to Resolve

1. **Slug vs ID**: Should we prefer slugs for references? (Recommendation: Yes, slugs are more stable)
2. **Connection Types**: Do we need webhook/manual connections now? (Recommendation: Start with trigger, add others later)
3. **Marketplace Hosting**: Where will marketplace be hosted? (Recommendation: Start with NetPad cloud, allow self-hosted)
4. **Versioning**: How to handle application updates? (Recommendation: Semantic versioning, update wizard)

## Related Documents

- [NETPAD_APPLICATIONS_DESIGN.md](./NETPAD_APPLICATIONS_DESIGN.md) - Full design specification
- [NETPAD_APPLICATIONS_EXAMPLES.md](./NETPAD_APPLICATIONS_EXAMPLES.md) - Examples and implementation guide
- [TEMPLATE_EXPORT_STRATEGY.md](./TEMPLATE_EXPORT_STRATEGY.md) - Current export/import strategy
