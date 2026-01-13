# Documentation Note: Template Gallery Feature

**Date**: January 2025  
**Feature**: Template Gallery & Presets (Phase 3.3)  
**Status**: ✅ Completed  
**Target Documentation Site**: docs.netpad.io

---

## Overview

NetPad now includes a comprehensive template gallery system that allows users to quickly start creating forms and workflows using pre-built templates. This feature was implemented as part of the UX Simplification Roadmap (Phase 3.3).

---

## What to Document

### 1. Template Gallery Overview

**Location**: Should be added to the "Form Builder" or "Getting Started" section

**Content to include**:
- What templates are (pre-configured forms/workflows)
- How to access the template gallery (visible in EmptyFormState and EmptyWorkflowState)
- Benefits of using templates (speed, best practices, common use cases)

### 2. Using Form Templates

**Location**: Form Builder documentation section

**Content to include**:
- How to browse templates (categories, search)
- How to preview templates (click on template card)
- How to use a template ("Use Template" button)
- How to customize templates ("Customize" button)
- Template categories and what they contain:
  - Business (contact forms, job applications, lead capture, etc.)
  - Events (registration, RSVP, volunteer signup, webinar)
  - Feedback (customer satisfaction, NPS surveys, product feedback)
  - Support (support tickets, appointment booking)
  - E-commerce (order forms, return requests)
  - Healthcare (patient intake, health screening - with encryption)
  - Finance (expense reports, financial applications - with encryption)
  - Education (course enrollment, scholarship applications)
  - Real Estate (property inquiries, rental applications)

### 3. Using Workflow Templates

**Location**: Workflow Editor documentation section

**Content to include**:
- Workflow template categories:
  - Form Processing (form to email, form to database)
  - Data Processing (scheduled sync, data pipelines)
  - Integrations (webhook processors, API monitoring)
  - AI Workflows (text classification, data extraction)
  - Logic (conditional routing, batch processing)
- How to preview workflow templates (shows nodes and edges)
- How to apply workflow templates

### 4. Template Preview Details

**Content to include**:
- What information is shown in template preview:
  - Template name, description, and category
  - Field/node list with details
  - Complexity level (simple, moderate, advanced)
  - Estimated setup time
  - Field/node count
- How to interpret template metadata
- Encryption indicators (for healthcare/finance templates)

### 5. Template Customization

**Content to include**:
- Templates are starting points - fully customizable after application
- How to modify template fields/nodes after applying
- How to add/remove fields/nodes from templates
- Best practices for customizing templates

---

## Screenshots/Documentation Assets Needed

1. **Template Gallery View** (Form Builder):
   - Screenshot of EmptyFormState with template gallery visible
   - Show category filters
   - Show template cards in grid layout
   - Show search functionality

2. **Template Preview Dialog**:
   - Screenshot of template preview modal
   - Show field list with types
   - Show "Use Template" and "Customize" buttons
   - Show template metadata (complexity, estimated time)

3. **Workflow Template Gallery**:
   - Screenshot of workflow template gallery
   - Show workflow template categories
   - Show workflow template cards with node counts

4. **Workflow Template Preview**:
   - Screenshot of workflow template preview
   - Show nodes and edges list
   - Show workflow template metadata

---

## Technical Details (For Reference)

### Implementation Location

**Form Templates**:
- Template files: `templates/forms/{category}/*.json`
- Template loader: `src/lib/templates/loader.ts`
- Gallery components: `src/components/Templates/`
- Integration: `src/components/FormBuilder/EmptyFormState.tsx`

**Workflow Templates**:
- Templates: Currently hardcoded in `src/components/WorkflowEditor/Panels/EmptyWorkflowState.tsx`
- Gallery components: `src/components/Templates/WorkflowTemplateGallery.tsx` (and related)
- Integration: `src/components/WorkflowEditor/Panels/EmptyWorkflowState.tsx`

### Template Structure

**Form Template JSON Format**:
```json
{
  "id": "contact",
  "name": "Contact Form",
  "description": "Name, email, message",
  "icon": "📧",
  "category": "business",
  "complexity": "simple",
  "estimatedTime": "2 minutes",
  "fields": [
    {
      "path": "name",
      "label": "Your Name",
      "type": "string",
      "included": true,
      "required": true
    }
    // ... more fields
  ]
}
```

**Workflow Template Structure**:
```typescript
{
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  nodeCount: number;
  nodes: Array<{
    type: string;
    label: string;
    position: { x: number; y: number };
  }>;
  edges: Array<{
    source: number;
    target: number;
  }>;
  complexity?: 'simple' | 'moderate' | 'advanced';
  estimatedTime?: string;
}
```

---

## Consistency with In-App Help

The in-app help topic `template-gallery` has been added to `src/lib/helpContent.ts`. The documentation should align with the help content structure:

**In-App Help Topic ID**: `template-gallery`

**Key Points from In-App Help**:
- Templates are pre-configured starting points
- Browse by category or search
- Preview shows fields, complexity, estimated time
- Both "Use Template" and "Customize" options available
- Templates are fully customizable after application
- Workflow templates available for automation scenarios

---

## Related Documentation

- **Form Builder Documentation**: Should link to template gallery section
- **Workflow Editor Documentation**: Should link to workflow templates section
- **Getting Started Guide**: Should mention templates as a quick start option
- **Field Configuration Documentation**: Should note that template fields can be customized

---

## User Workflows to Document

### Workflow 1: Creating a Form from Template

1. Navigate to Forms
2. Click "Create New Form"
3. Click "Templates" tab (or expand "Or start manually" if using AI prompt)
4. Browse categories or search for a template
5. Click on a template card to preview
6. Click "Use Template" or "Customize"
7. Name your form and select target collection
8. Customize fields as needed
9. Save and publish

### Workflow 2: Creating a Workflow from Template

1. Navigate to Workflows
2. Click "Create New Workflow"
3. Click "Templates" tab
4. Browse workflow templates by category
5. Preview template to see nodes and edges
6. Click "Use Template"
7. Customize workflow nodes and connections as needed
8. Save and activate workflow

---

## Questions for Documentation Team

1. Should templates have their own documentation section, or be integrated into Form Builder/Workflow Editor sections?
2. Should we create a template catalog/index page listing all available templates?
3. Do we need screenshots of all template categories, or just representative examples?
4. Should we document the template JSON structure for users who want to create custom templates?

---

## Implementation Status

✅ **Completed Features**:
- Template gallery UI components (form and workflow)
- Template preview functionality
- Category filtering and search
- Template application workflow
- Integration into EmptyFormState and EmptyWorkflowState
- Template metadata (complexity, estimated time)
- 25 form templates extracted to JSON files

🟡 **Future Enhancements** (not blocking documentation):
- Extract workflow templates to JSON files (currently hardcoded)
- Enhanced customization flow differentiation
- Additional template metadata (requirements, dependencies)
- Template preview images

---

## Contact

For questions about this feature, refer to:
- Implementation Plan: `docs/NETPAD_PHASE_3_3_TEMPLATE_GALLERY_PLAN.md`
- UX Roadmap: `docs/UX_SIMPLIFICATION_ROADMAP.md` (Section 3.3)
- Code Location: `src/components/Templates/`, `src/lib/templates/`

---

**Last Updated**: January 2026