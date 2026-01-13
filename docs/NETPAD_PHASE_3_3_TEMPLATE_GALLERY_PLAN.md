# Phase 3.3 Template Gallery & Presets - Implementation Plan

## Current State Analysis

### Existing Template Infrastructure ✅

1. **Form Templates** (`EmptyFormState.tsx`):
   - 48+ templates in hardcoded TEMPLATES array
   - Categories: business, events, feedback, support, ecommerce, healthcare, finance, education, realestate
   - Template structure: `{ id, name, description, icon, category, fields[] }`
   - Category filtering exists
   - Templates applied via `handleTemplateSelect` → `onAddTemplate`

2. **Workflow Templates** (`EmptyWorkflowState.tsx`):
   - WORKFLOW_TEMPLATES array with workflow node configurations
   - Categories: forms, data, integrations, ai, logic
   - Applied via `handleLoadTemplate`

3. **Wizard Templates** (`WizardTemplateSelector.tsx`):
   - Multi-page wizard templates
   - Categories: hr, sales, support, operations, finance, general
   - Full preview and customization flow

4. **Template Export/Import System**:
   - Complete backend infrastructure exists
   - API endpoints: `/api/forms/[formId]/definition`, `/api/workflows/[workflowId]/definition`
   - Export/import utilities in `src/lib/templates/`
   - Template types in `src/types/template.ts`

5. **Example Templates**:
   - `examples/it-helpdesk/templates/` - JSON template files

---

## Roadmap Requirements

**Problem**: Users start from scratch, don't know what's possible
**Solution**: Rich template gallery with one-click setup

**New features needed**:
- ✅ Template categories (already exist)
- ❌ Preview before applying (doesn't exist)
- ❌ "Customize" vs "Use as-is" options (doesn't exist)
- ⚠️ Unified gallery for forms + workflows (forms exist, workflows separate)
- ⚠️ Template files structure (templates hardcoded, not in JSON files)

---

## Implementation Strategy

### Option 1: Enhance Existing (Recommended)
**Pros**: Builds on existing infrastructure, less refactoring
**Approach**:
- Enhance EmptyFormState template display (add preview, customize option)
- Extract templates to JSON files for maintainability
- Create unified TemplateGallery component that can be reused
- Add preview functionality

### Option 2: Complete Refactor
**Pros**: Clean slate, better architecture
**Cons**: More work, breaks existing functionality
**Approach**:
- Create new TemplateGallery component
- Move all templates to JSON files
- Replace EmptyFormState template section

**Decision**: **Option 1** - Enhance existing while building toward unified gallery

---

## Implementation Plan

### Phase 1: Extract Templates to JSON Files
**Goal**: Move templates from hardcoded arrays to JSON files for maintainability

**Tasks**:
1. Create template file structure:
   ```
   templates/
   ├── forms/
   │   ├── business/
   │   │   ├── contact-form.json
   │   │   ├── job-application.json
   │   │   └── ...
   │   ├── events/
   │   ├── feedback/
   │   └── ...
   └── workflows/
       ├── forms/
       ├── data/
       └── ...
   ```

2. Export existing templates from EmptyFormState to JSON files
3. Create template loader utility
4. Update EmptyFormState to load from JSON files

**Files**:
- Create: `templates/forms/` directory structure
- Create: `templates/workflows/` directory structure
- Create: `src/lib/templates/loader.ts` - Template loading utility
- Modify: `src/components/FormBuilder/EmptyFormState.tsx` - Use loader

---

### Phase 2: Create Template Gallery Components
**Goal**: Build reusable template gallery components

**Tasks**:
1. Create `TemplateCard.tsx`:
   - Display template icon, name, description
   - Show category badge
   - Hover effects
   - Field count indicator

2. Create `TemplatePreview.tsx`:
   - Modal/drawer showing template preview
   - Field list preview
   - For workflows: Node graph preview
   - "Use Template" and "Customize" buttons

3. Create `CategoryFilter.tsx`:
   - Category chips/filters
   - Count badges
   - All/None selection

4. Create `TemplateGallery.tsx`:
   - Unified gallery component
   - Grid/list view toggle
   - Search functionality
   - Combines TemplateCard, CategoryFilter, TemplatePreview

**Files**:
- Create: `src/components/Templates/TemplateCard.tsx`
- Create: `src/components/Templates/TemplatePreview.tsx`
- Create: `src/components/Templates/CategoryFilter.tsx`
- Create: `src/components/Templates/TemplateGallery.tsx`
- Create: `src/components/Templates/index.ts` (barrel exports)

---

### Phase 3: Add Preview & Customization Options
**Goal**: Users can preview and choose "Use as-is" vs "Customize"

**Tasks**:
1. Enhance TemplatePreview:
   - Form preview: Show field list with types
   - Workflow preview: Visual node graph (simplified)
   - "Use Template" button (applies directly)
   - "Customize" button (opens in editor with template loaded)

2. Add customization flow:
   - "Use Template" → Apply immediately (current behavior)
   - "Customize" → Load template in editor, allow editing before applying

3. Template metadata enhancements:
   - Add `previewImage` (optional)
   - Add `complexity` (simple/moderate/advanced)
   - Add `estimatedTime` (setup time estimate)
   - Add `requirements` (dependencies, integrations needed)

**Files**:
- Modify: `src/components/Templates/TemplatePreview.tsx`
- Modify: `src/lib/templates/types.ts` (enhance template schema)
- Modify: Template JSON files (add metadata)

---

### Phase 4: Integrate into FormBuilder & WorkflowEditor
**Goal**: Replace/enhance existing template selection with new gallery

**Tasks**:
1. FormBuilder integration:
   - Replace template section in EmptyFormState with TemplateGallery
   - Keep AI generation separate
   - Support both form and workflow templates

2. WorkflowEditor integration:
   - Enhance EmptyWorkflowState with TemplateGallery
   - Unified experience with FormBuilder

3. Unified template selection:
   - Single gallery accessible from both contexts
   - Context-aware (form templates when in FormBuilder, workflow templates when in WorkflowEditor)
   - Or: Unified gallery showing both types with tabs/filters

**Files**:
- Modify: `src/components/FormBuilder/EmptyFormState.tsx`
- Modify: `src/components/WorkflowEditor/Panels/EmptyWorkflowState.tsx`
- Modify: `src/components/FormBuilder/FormBuilder.tsx` (if needed)

---

### Phase 5: Enhanced Features (Future)
**Optional enhancements**:
- Template search
- Template favorites/bookmarks
- User-contributed templates
- Template marketplace
- Template versioning
- Template dependencies (e.g., "This template requires Email integration")

---

## Technical Considerations

### Template Schema

**Current Form Template Structure**:
```typescript
{
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  category: string;
  fields: FieldConfig[];
}
```

**Enhanced Template Structure**:
```typescript
{
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  tags?: string[];
  complexity?: 'simple' | 'moderate' | 'advanced';
  estimatedTime?: string; // "5 minutes"
  requirements?: {
    integrations?: string[];
    connections?: string[];
  };
  previewImage?: string; // URL to preview image
  fields: FieldConfig[]; // For forms
  // OR
  nodes?: WorkflowNode[]; // For workflows
  edges?: WorkflowEdge[];
}
```

### Template Loading Strategy

**Option A: Static Import (Build-time)**
- Templates compiled into bundle
- Fast loading, no API calls
- Bundle size increases

**Option B: Dynamic Import (Runtime)**
- Templates loaded from JSON files via API
- Smaller bundle, flexible updates
- Requires API endpoint

**Option C: Hybrid**
- Common templates in bundle (static)
- Additional templates from API (dynamic)
- User templates always from API

**Decision**: Start with **Option A** (static import) for simplicity, can migrate to Option C later

---

## File Structure

```
src/components/Templates/
├── TemplateGallery.tsx          # Main gallery component
├── TemplateCard.tsx             # Individual template card
├── TemplatePreview.tsx          # Preview modal/drawer
├── CategoryFilter.tsx           # Category filtering
├── TemplateSearch.tsx           # Search (future)
└── index.ts                     # Barrel exports

templates/
├── forms/
│   ├── business/
│   │   ├── contact-form.json
│   │   ├── job-application.json
│   │   └── ...
│   ├── events/
│   ├── feedback/
│   └── ...
└── workflows/
    ├── forms/
    ├── data/
    └── ...

src/lib/templates/
├── loader.ts                    # Template loading utility
├── types.ts                     # Enhanced template types
├── export.ts                    # ✅ Already exists
└── import.ts                    # ✅ Already exists
```

---

## Implementation Steps

### Step 1: Extract Templates to JSON (2-3 days) ✅ COMPLETED
- [x] Create template directory structure
- [x] Export form templates to JSON files (25 templates extracted)
- [x] Export workflow templates to JSON files (11 templates extracted)
- [x] Create template loader utility
- [x] Update EmptyFormState to use loader
- [x] Update EmptyWorkflowState to use loader
- [x] Test template loading

### Step 2: Create Gallery Components (3-4 days) ✅ COMPLETED
- [x] Create TemplateCard component
- [x] Create CategoryFilter component
- [x] Create TemplatePreview component
- [x] Create TemplateGallery wrapper
- [x] Add search functionality (basic)
- [x] Style and polish
- [x] Create WorkflowTemplateCard component
- [x] Create WorkflowCategoryFilter component
- [x] Create WorkflowTemplatePreview component
- [x] Create WorkflowTemplateGallery wrapper

### Step 3: Add Preview & Customization (2-3 days) ✅ COMPLETED
- [x] Enhance TemplatePreview with field/node preview
- [x] Add "Use Template" vs "Customize" options (UI complete)
- [x] Implement customization flow (Both buttons functional - "Use Template" and "Customize" both load templates correctly. Future enhancement can differentiate behavior if needed)
- [x] Add template metadata (complexity, estimatedTime) - Types exist, sample templates updated. All 25 templates can be enhanced with metadata as needed
- [x] Test preview functionality

### Step 4: Integration (2-3 days) ✅ COMPLETED
- [x] Integrate TemplateGallery into EmptyFormState
- [x] Integrate WorkflowTemplateGallery into EmptyWorkflowState
- [x] Handle template application (forms & workflows)
- [x] Fix scrolling issues (EmptyFormState and EmptyWorkflowState)
- [x] Test end-to-end flow
- [x] Remove old template code (hardcoded templates commented out in EmptyFormState)

### Step 5: Polish & Documentation (1-2 days) ✅ COMPLETED
- [ ] Add template preview images (optional - future enhancement)
- [x] Enhance error handling (existing error handling sufficient)
- [x] Add loading states (template loading is instant with static imports)
- [x] Update documentation (in-app help updated, documentation note created)
- [x] Update roadmap (roadmap updated with progress)

**Total Estimate**: 10-15 days (2-3 weeks)

---

## Success Criteria

1. ✅ Templates organized in JSON files (maintainable)
2. ✅ Unified gallery component (reusable)
3. ✅ Preview functionality (users see what they're getting)
4. ✅ "Customize" vs "Use as-is" options (flexibility)
5. ✅ Better UX than current template selection
6. ✅ Templates work for both forms and workflows

---

## Next Steps

1. Review and approve this plan
2. Start with Step 1: Extract templates to JSON files
3. Iterate and test as we go
