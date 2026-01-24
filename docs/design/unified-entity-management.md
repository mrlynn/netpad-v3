# Unified Entity Management Design

## Overview

This document outlines the standardized approach for creating, saving, and managing NetPad entities (Forms, Workflows, and future entity types). The goal is to provide a consistent, familiar user experience across all editors.

## Design Decisions

Based on UX requirements:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Config Panel Save | **Autosave** | Simpler UX, fewer clicks, modern app feel |
| CRUD Interface | **File Menu Dropdown** | Classic File menu familiar to desktop users |
| Entity Save | **Direct Save** | Cmd+S saves immediately; "Save As" for copies |
| Save Feedback | **Always Visible Status** | Permanent status chip showing save state |
| Unsaved Warning | **Both** | Custom modal for in-app nav, browser dialog for tab close |
| Menu Position | **App Header (Left)** | Consistent across all views |

---

## Component Architecture

### 1. EntityStatusChip

A shared component that displays the current save state of the entity.

**Location:** `src/components/common/EntityStatusChip.tsx`

**States:**
- `saved` - "All changes saved" (green checkmark)
- `saving` - "Saving..." (spinner)
- `unsaved` - "Unsaved changes" (yellow dot)
- `error` - "Save failed" (red, with retry option)

**Props:**
```typescript
interface EntityStatusChipProps {
  status: 'saved' | 'saving' | 'unsaved' | 'error';
  lastSaved?: Date;
  onRetry?: () => void;
  entityType: 'form' | 'workflow';
}
```

**Visual Design:**
- Small, unobtrusive chip in the editor toolbar/header area
- Uses subtle colors (not distracting but visible)
- Shows relative time for last saved (e.g., "Saved 2 min ago")

---

### 2. FileMenu Component

A dropdown menu providing standard file operations, positioned in the app header.

**Location:** `src/components/common/FileMenu.tsx`

**Menu Structure:**
```
File ▼
├── New [entityType]        Cmd+N
├── Open...                 Cmd+O
├── Open Recent            ▸
│   ├── [Recent Item 1]
│   ├── [Recent Item 2]
│   └── View All...
├── ─────────────────────
├── Save                    Cmd+S
├── Save As...              Cmd+Shift+S
├── Export...               Cmd+E
├── Import...               Cmd+I
├── ─────────────────────
├── Duplicate
├── Rename...
├── Move to Project...
├── ─────────────────────
├── Delete
└── ─────────────────────
    Close                   Cmd+W
```

**Props:**
```typescript
interface FileMenuProps {
  entityType: 'form' | 'workflow';
  entityName: string;
  entityId?: string;
  isDirty: boolean;

  // Callbacks
  onNew: () => void;
  onOpen: () => void;
  onSave: () => Promise<boolean>;
  onSaveAs: () => void;
  onExport: () => void;
  onImport: () => void;
  onDuplicate: () => void;
  onRename: () => void;
  onMoveToProject: () => void;
  onDelete: () => void;
  onClose: () => void;

  // Optional
  recentItems?: RecentItem[];
  disabled?: boolean;
}
```

---

### 3. useEntityPersistence Hook

A shared hook that manages entity persistence with autosave and debouncing.

**Location:** `src/hooks/useEntityPersistence.ts`

**Features:**
- Debounced autosave (configurable delay, default 1000ms)
- Manual save trigger
- Dirty state tracking
- Save status management
- Error handling with retry
- Optimistic updates

**Interface:**
```typescript
interface UseEntityPersistenceOptions<T> {
  entityType: 'form' | 'workflow';
  entityId?: string;
  initialData: T;
  saveFunction: (data: T) => Promise<void>;
  autosaveDelay?: number; // default 1000ms
  onSaveSuccess?: () => void;
  onSaveError?: (error: Error) => void;
}

interface UseEntityPersistenceReturn<T> {
  // State
  data: T;
  isDirty: boolean;
  saveStatus: 'saved' | 'saving' | 'unsaved' | 'error';
  lastSaved: Date | null;
  error: Error | null;

  // Actions
  updateData: (updates: Partial<T> | ((prev: T) => T)) => void;
  save: () => Promise<boolean>;
  retrySave: () => Promise<boolean>;
  resetDirty: () => void;
}
```

---

### 4. UnsavedChangesModal

A branded modal for handling unsaved changes during in-app navigation.

**Location:** `src/components/common/UnsavedChangesModal.tsx`

**Props:**
```typescript
interface UnsavedChangesModalProps {
  open: boolean;
  entityType: 'form' | 'workflow';
  entityName: string;
  onSave: () => Promise<boolean>;
  onDiscard: () => void;
  onCancel: () => void;
}
```

**Modal Content:**
```
┌─────────────────────────────────────────┐
│  Unsaved Changes                        │
│                                         │
│  You have unsaved changes to            │
│  "Contact Form". What would you         │
│  like to do?                            │
│                                         │
│  [Cancel]  [Discard]  [Save & Continue] │
└─────────────────────────────────────────┘
```

---

## Behavior Changes

### Form Field Configuration (FieldDetailPanel)

**Current:** Already uses autosave (onChange → immediate update)
**Change:** No changes needed - this is the target pattern

### Workflow Node Configuration (NodeConfigPanel)

**Current:** Has explicit "Save" button at bottom of panel
**Change:** Remove "Save" button, apply changes immediately on onChange

**Implementation:**
1. Remove `handleSave()` function and Save button
2. Each input's onChange should call `updateNode()` directly (debounced)
3. Add visual feedback for "applying" state

**Before:**
```typescript
// User changes label → stored in local state
onChange={(e) => setLabel(e.target.value)}

// User clicks Save → applies to workflow
<Button onClick={handleSave}>Save</Button>
```

**After:**
```typescript
// User changes label → immediately updates workflow (debounced)
onChange={(e) => {
  setLabel(e.target.value);
  debouncedUpdateNode({ label: e.target.value });
}}
```

---

## Keyboard Shortcuts

### Global Shortcuts (Both Editors)

| Shortcut | Action | Notes |
|----------|--------|-------|
| Cmd+N | New entity | Opens new form/workflow dialog |
| Cmd+O | Open | Opens entity library/browser |
| Cmd+S | Save | Direct save (no dialog) |
| Cmd+Shift+S | Save As | Opens save-as dialog |
| Cmd+E | Export | Opens export dialog |
| Cmd+W | Close | Closes current entity |

### Current State vs Target

**Forms:**
- Current: Cmd+S opens FormSaveDialog
- Target: Cmd+S saves directly (if entity exists), opens dialog only for new

**Workflows:**
- Current: Cmd+S triggers save directly
- Target: Same behavior (already correct)

---

## Migration Strategy

### Phase 1: Shared Components
1. Create `EntityStatusChip` component
2. Create `FileMenu` component
3. Create `UnsavedChangesModal` component
4. Create `useEntityPersistence` hook

### Phase 2: Workflow Editor Updates
1. Update `NodeConfigPanel` to use autosave
2. Add `EntityStatusChip` to toolbar
3. Replace toolbar buttons with `FileMenu`
4. Wire up `UnsavedChangesModal`

### Phase 3: Form Builder Updates
1. Add `EntityStatusChip` to toolbar
2. Replace current save UI with `FileMenu`
3. Update Cmd+S to save directly
4. Wire up `UnsavedChangesModal`

### Phase 4: Testing & Polish
1. Test all CRUD operations
2. Verify keyboard shortcuts
3. Test navigation warnings
4. Cross-browser testing

---

## File Structure

```
src/
├── components/
│   └── common/
│       ├── EntityStatusChip.tsx       # Save status indicator
│       ├── FileMenu.tsx               # File operations dropdown
│       └── UnsavedChangesModal.tsx    # Navigation warning modal
├── hooks/
│   ├── useEntityPersistence.ts        # Persistence & autosave
│   └── useUnsavedChanges.ts           # (existing, will be enhanced)
```

---

## API Considerations

### Save Endpoint Standardization

Both forms and workflows should use similar API patterns:

**Forms:**
- `POST /api/forms` - Create new
- `PUT /api/forms/[id]` - Update existing
- `DELETE /api/forms/[id]` - Delete

**Workflows:**
- `POST /api/workflows` - Create new
- `PUT /api/workflows/[id]` - Update existing
- `DELETE /api/workflows/[id]` - Delete

**Note:** Current form save uses `/api/forms-save` which handles both create and update. Consider aligning with REST conventions.

---

## Open Questions

1. **Autosave for entity-level changes?** Should the entire form/workflow autosave to the server, or only config panel changes autosave locally?
   - **Recommendation:** Config changes autosave to local state; entity saves to server are manual (Cmd+S)

2. **Recent items storage:** Where should recent items be stored?
   - **Recommendation:** Browser localStorage per user, synced to user preferences in DB

3. **Concurrent editing:** How to handle if user has same entity open in multiple tabs?
   - **Recommendation:** Last-write-wins with warning if server version is newer

---

## Success Metrics

- Users can perform all CRUD operations with consistent UI
- Keyboard shortcuts work identically across editors
- No data loss from accidental navigation
- Config changes feel instant (no save button friction)
