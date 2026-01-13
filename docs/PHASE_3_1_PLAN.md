# Phase 3.1 Form Builder Redesign - Implementation Plan

## Answers to Clarifying Questions

### 1. Best Practices & Popular Systems

**Industry Standard Pattern:**
- **Airtable & Typeform**: Use **right-side sidebars** for field configuration (when you select a field, a panel slides in from the right)
- **Google Forms**: Uses **inline editing** within question blocks (no separate panel)
- **WorkflowEditor** (our codebase): Uses **right-side Drawers** (NodeConfigPanel, EdgeConfigPanel slide in from right)

**However**, the roadmap specifies a **bottom panel** approach, which is also valid and provides:
- Better for long-form field configurations (more vertical space)
- Keeps canvas width consistent
- Better for mobile/responsive designs
- Matches the roadmap vision

**Recommendation**: Follow the roadmap's bottom panel approach. This is a valid UX pattern, even if less common than sidebars.

---

### 2. Collapsible Sidebar Status

**Current State**: `FieldConfigPanel` exists (681 lines) but is **NOT currently used** in `FormBuilder.tsx`. 

The codebase search shows:
- `FieldConfigPanel` is defined but never imported/rendered in `FormBuilder`
- `FieldConfigDrawer` (right-side drawer) is the active implementation
- No collapsible sidebar exists currently

**Action**: We need to implement the collapsible sidebar using `FieldConfigPanel` (or refactor it).

---

### 3. Implementation Strategy: Both Bottom Panel + Sidebar

**Agreed**: Implement both as specified in roadmap:
- **Bottom Panel**: Field configuration (context-sensitive, shows when field selected)
- **Collapsible Sidebar**: Field list (optional, collapsed by default)

---

### 4. Preview/Submissions: Separate Views

**Agreed**: Preview and Submissions should be **separate views/panels**, not in the bottom panel.

The bottom panel is specifically for **field configuration only**.

---

### 5. Migration Strategy for FieldConfigDrawer

**Recommended Phased Approach**:

**Phase 1: Build Bottom Panel**
- Create `BottomConfigPanel.tsx` component
- Reuse `FieldDetailPanel` content (refactor to be reusable)
- Integrate into `FormBuilder` layout
- Use `Allotment` (already in codebase) for resizable bottom panel

**Phase 2: Parallel Run (Soft Launch)**
- Keep `FieldConfigDrawer` as fallback
- Add feature flag or conditional: `useBottomPanel` state
- Allow users to toggle between drawer and bottom panel
- Test and gather feedback

**Phase 3: Remove Drawer**
- Once bottom panel is validated and working well
- Remove `FieldConfigDrawer` component
- Remove all drawer-related code from `FormBuilder`

**Phase 4: Add Sidebar**
- Implement collapsible sidebar using `FieldConfigPanel`
- Add toggle button to show/hide sidebar
- Sidebar shows field list (for navigation/quick access)

---

## Implementation Plan

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Form Builder                                                │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────────────────────────────────┐ │
│ │ Field List  │ │ Canvas (WYSIWYGFormEditor)              │ │
│ │ (collapsible│ │                                         │ │
│ │  sidebar)   │ │  [Selected field shows inline toolbar]  │ │
│ │             │ │                                         │ │
│ │ + Add Field │ │  [Drag to reorder]                      │ │
│ │             │ │                                         │ │
│ └─────────────┘ └─────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Bottom Panel (resizable, context-sensitive)             │ │
│ │ Shows: FieldDetailPanel when field selected             │ │
│ │ Height: Default 40%, min 200px, max 80%                 │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Files to Create/Modify

**New Files:**
1. `src/components/FormBuilder/BottomConfigPanel.tsx` - Bottom panel wrapper with resizable functionality
2. (Optional) `src/components/FormBuilder/FieldListSidebar.tsx` - Collapsible sidebar wrapper (or refactor FieldConfigPanel)

**Modify:**
1. `src/components/FormBuilder/FormBuilder.tsx` - Major refactor:
   - Add bottom panel layout using Allotment
   - Integrate BottomConfigPanel
   - Add sidebar toggle state
   - Remove FieldConfigDrawer (after Phase 3)

2. `src/components/FormBuilder/FieldDetailPanel.tsx` - Minor refactor:
   - Remove `onClose` prop (not needed in bottom panel)
   - Make header optional (bottom panel handles its own header)
   - Ensure it works in both drawer and bottom panel contexts

**Delete (after Phase 3):**
1. `src/components/FormBuilder/FieldConfigDrawer.tsx`

### Technical Approach

**Bottom Panel:**
- Use `Allotment` library (already in codebase: `PipelineBuilder`, `ERDView`)
- Vertical split: Canvas (top, flexible) + Bottom Panel (bottom, resizable)
- Default height: 40% of viewport
- Min height: 200px
- Max height: 80% of viewport
- Panel shows/hides based on `selectedFieldPath`
- When no field selected: panel collapsed or shows empty state

**Sidebar:**
- Use existing `FieldConfigPanel` component
- Wrap in collapsible container (Drawer or Collapse)
- Toggle button in FormBuilder header
- Default: collapsed/hidden
- Shows field list for quick navigation
- Clicking field in sidebar selects it (shows in bottom panel)

**Migration:**
- Start with Phase 1: Build bottom panel
- Keep drawer working in parallel
- Add feature flag for gradual rollout
- Remove drawer after validation

---

## Step-by-Step Implementation

### Step 1: Create BottomConfigPanel Component
- [ ] Create `BottomConfigPanel.tsx`
- [ ] Implement resizable panel using Allotment
- [ ] Integrate FieldDetailPanel content
- [ ] Add empty state (when no field selected)
- [ ] Add close/collapse functionality

### Step 2: Refactor FieldDetailPanel
- [ ] Make header optional
- [ ] Remove `onClose` dependency (or make optional)
- [ ] Ensure it renders correctly in bottom panel context

### Step 3: Integrate into FormBuilder
- [ ] Add Allotment vertical split layout
- [ ] Replace FieldConfigDrawer with BottomConfigPanel
- [ ] Adjust WYSIWYGFormEditor to work with bottom panel layout
- [ ] Test field selection → bottom panel opens

### Step 4: Add Sidebar (FieldConfigPanel)
- [ ] Add sidebar toggle state
- [ ] Wrap FieldConfigPanel in collapsible container
- [ ] Add toggle button to FormBuilder header
- [ ] Connect sidebar field selection to bottom panel

### Step 5: Cleanup
- [ ] Remove FieldConfigDrawer
- [ ] Remove unused imports
- [ ] Update tests
- [ ] Update documentation

---

## Considerations

1. **Performance**: Bottom panel should lazy-load FieldDetailPanel content
2. **Responsive**: Consider mobile behavior (bottom panel might need to be full-screen on mobile)
3. **Accessibility**: Ensure keyboard navigation works (ESC to close, etc.)
4. **State Management**: Bottom panel state (open/closed, height) might need localStorage persistence
5. **User Preferences**: Save user's preferred panel height and sidebar state

---

## Timeline Estimate

- **Step 1-2**: 2-3 days (Create BottomConfigPanel, refactor FieldDetailPanel)
- **Step 3**: 2-3 days (Integrate into FormBuilder)
- **Step 4**: 1-2 days (Add sidebar)
- **Step 5**: 1 day (Cleanup)
- **Total**: 6-9 days (1.5-2 weeks)

---

## Next Steps

1. Review and approve this plan
2. Start with Step 1: Create BottomConfigPanel
3. Iterate and test as we go
4. Gather feedback before removing FieldConfigDrawer
