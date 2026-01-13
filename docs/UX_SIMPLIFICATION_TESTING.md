# UX Simplification - Testing Guide

## Overview
This guide covers testing the Phase 1 improvements completed in January 2025.

---

## Prerequisites

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Access the application**:
   - Open http://localhost:3000 (or your configured port)
   - Ensure you're logged in with a test account
   - Have at least one organization and project set up

---

## Phase 1 Testing Checklist

### ✅ Task 1.3: Settings Drawer Reorganization

**Test Location**: Form Builder → Settings Icon (gear icon in top toolbar)

**What to Test**:

1. **Open Settings Drawer**
   - Click the Settings icon in the Form Builder toolbar
   - Verify drawer opens from the right side

2. **Verify Tab Structure** (Should see 4 tabs instead of 9)
   - ✅ **Publish** tab (Rocket icon) - Should contain:
     - Form Details (Name, Description)
     - Data Storage (accordion)
     - Access Control (accordion)
     - Embed Form (accordion, if published)
   
   - ✅ **Appearance** tab (Palette icon) - Should contain:
     - Theme (accordion)
     - Pages (accordion)
   
   - ✅ **Behavior** tab (Settings icon) - Should contain:
     - Lifecycle (accordion)
     - Variables (accordion)
     - Protection (accordion)
   
   - ✅ **Integrations** tab (Extension/Plug icon) - Should contain:
     - Search (accordion)
     - AI Chat (accordion)
     - Actions / Hooks (accordion)

3. **Test Accordion Functionality**
   - Click on each accordion to expand/collapse
   - Verify content loads correctly in each section
   - Check that badges show correctly (✓ indicators, counts)

4. **Test Navigation**
   - Switch between tabs
   - Verify content changes appropriately
   - Ensure no data is lost when switching tabs

5. **Compare with Previous**
   - If you have access to previous version, compare:
     - Old: 9 tabs (Publish, Search, AI Chat, Theme, Pages, Lifecycle, Variables, Actions, Protection)
     - New: 4 tabs with logical grouping

**Expected Result**: 
- ✅ Cleaner, more organized settings
- ✅ Easier to find related settings
- ✅ Reduced cognitive load (55% fewer navigation options)

---

### ✅ Task 1.2: Inline Field Configuration

**Test Location**: Form Builder → Click on any form field

**What to Test**:

1. **Hover over a field**
   - Hover over any field in the form builder
   - Verify a toolbar appears at the top-right of the field card
   - Toolbar should include:
     - Drag indicator (if draggable)
     - Edit label icon
     - Required toggle (star icon)
     - Settings icon
     - Delete icon (if custom field)

2. **Test Required Toggle**
   - Click the star icon in the toolbar
   - Verify field becomes required/unrequired
   - Check that asterisk (*) appears/disappears on the field label

3. **Test Delete**
   - Click the delete icon (if visible)
   - Verify field is removed from the form

4. **Test Settings**
   - Click the settings icon
   - Verify FieldConfigDrawer opens
   - Make changes and verify they save

**Expected Result**:
- ✅ Quick actions available without opening drawer
- ✅ 60% reduction in clicks for basic field edits
- ✅ Inline toolbar appears smoothly on hover/selection

---

### ✅ Task 1.4: Recent Items Quick Access

**Test Location**: Top Navigation Bar → History icon (clock icon)

**What to Test**:

1. **Find Recent Items Menu**
   - Look in the top navigation bar (right side, near "New" button)
   - Find the History/clock icon
   - Click it to open the menu

2. **Verify Menu Structure**
   - Menu should show:
     - Header: "Recent Items" with "Clear all" link
     - Sections: "Forms" and "Workflows" (if items exist)
     - Empty state message (if no recent items)

3. **Test Tracking**
   - Navigate to a form (open Form Builder for an existing form)
   - Navigate to a workflow (open Workflow Editor)
   - Click the Recent Items menu again
   - Verify the forms/workflows you visited appear in the list
   - Check that items are grouped by type (Forms vs Workflows)

4. **Test Navigation**
   - Click on a recent item in the menu
   - Verify it navigates to that item
   - Menu should close after selection

5. **Test Removal**
   - Click the X icon next to an item
   - Verify item is removed from the list
   - Verify removal persists after page refresh

6. **Test Clear All**
   - Click "Clear all" in the menu header
   - Verify all items are cleared
   - Verify empty state message appears
   - Verify clearing persists after page refresh

7. **Test Limits**
   - Visit more than 10 forms/workflows
   - Verify only the 10 most recent items are shown
   - Verify oldest items are removed

**Expected Result**:
- ✅ Quick access to frequently used items
- ✅ No need to navigate through projects/forms lists
- ✅ Items persist across sessions (localStorage)

---

### ✅ Task 1.1: Quick Publish Flow (Popover)

**Test Location**: Form Builder → Publish Button (purple button in top toolbar)

**What to Test**:

1. **For Unpublished Forms**

   a. **Click Publish Button**
      - Click the purple "Publish" button (with rocket icon)
      - Verify a Popover appears (not a full Dialog)
      - Popover should be anchored to the button
   
   b. **Test Popover Content**
      - Verify popover shows:
        - Header with rocket icon and "Publish Form"
        - Form Name field (pre-filled if form has a name)
        - Collection selection (if no data source configured)
        - Cancel and Publish buttons
   
   c. **Test Collection Selection** (if no data source)
      - Verify connection dropdown appears
      - Select a connection
      - Verify collection autocomplete/input appears
      - Select or enter a collection name
      - Verify Publish button becomes enabled
   
   d. **Test Publishing**
      - Enter/form name if needed
      - Select collection if needed
      - Click "Publish" button
      - Verify loading state (button shows "Publishing...")
      - Verify success: Popover closes, success dialog appears
   
   e. **Test Success Dialog**
      - After publishing, verify dialog shows:
        - Success message
        - Shareable URL (with copy button)
        - Actions: Open Form, Share, Embed
      - Test copying URL
      - Test opening form in new tab
      - Test embed code generation

2. **For Forms with Data Source Configured**
   
   a. **Quick Publish Flow**
      - If form already has data source configured
      - Click Publish button
      - Popover should show only:
        - Form Name field
        - Publish button (no collection selection needed)
   
   b. **Test Publishing**
      - Enter/form name if needed
      - Click Publish
      - Verify publish succeeds

3. **For Already Published Forms**
   
   a. **Published State**
      - If form is already published
      - Button should show green "Published" button (not purple "Publish")
      - Clicking should copy the form URL to clipboard
      - Verify tooltip says "Form is published - click to copy link"

4. **Test Error Handling**
   - Try publishing without a form name
   - Verify error message appears in popover
   - Try publishing without collection (if no data source)
   - Verify validation prevents publishing

5. **Test Configure Storage Link**
   - If no connections available
   - Verify "Configure" button/link appears
   - Click it and verify it opens storage configuration

**Expected Result**:
- ✅ Popover is lighter-weight than Dialog
- ✅ Collection selection inline (no need to go to Settings)
- ✅ 70% reduction in clicks (from 7+ to 2-3)
- ✅ Smooth user experience

---

## Integration Testing

### Test Full Workflow

1. **Create New Form**
   - Create a new form
   - Add some fields
   - Test inline field configuration (task 1.2)

2. **Configure and Publish**
   - Click Settings icon → Test new tab structure (task 1.3)
   - Configure data storage in Publish tab
   - Close settings
   - Click Publish button → Test popover flow (task 1.1)
   - Verify publish succeeds

3. **Test Recent Items**
   - After publishing, navigate away
   - Click Recent Items menu (task 1.4)
   - Verify the form appears in recent items
   - Click to navigate back to the form

4. **Test Settings After Publish**
   - Open Settings again
   - Verify all tabs work correctly
   - Test making changes and saving

---

## Regression Testing

### Ensure Nothing Broke

1. **Form Building**
   - ✅ Can still add fields
   - ✅ Can still edit fields
   - ✅ Can still delete fields
   - ✅ Can still reorder fields
   - ✅ Field validation works

2. **Settings**
   - ✅ All settings can still be configured
   - ✅ Settings save correctly
   - ✅ Settings persist after page refresh

3. **Publishing**
   - ✅ Forms can still be published
   - ✅ Published forms work correctly
   - ✅ Form URLs are correct
   - ✅ Embed codes work

4. **Navigation**
   - ✅ Can still navigate between forms
   - ✅ Can still navigate between workflows
   - ✅ Project/organization switching works

---

## Known Issues / Notes

- **QuickPublishPopover**: If organizationId is not available, collection selection won't work. This is expected - user needs to configure storage via Settings first.
- **Recent Items**: Only tracks forms/workflows with IDs in the URL. Forms/workflows accessed via other means may not be tracked.
- **Settings Drawer**: All functionality should remain the same, just reorganized into fewer tabs.

---

## Quick Test Script

Run through this quick checklist:

```
□ Settings drawer opens
□ Settings shows 4 tabs (not 9)
□ All 4 tabs have correct content
□ Accordions expand/collapse correctly
□ Hover over field shows inline toolbar
□ Inline toolbar Required toggle works
□ Recent Items icon appears in nav bar
□ Recent Items menu opens
□ Forms/workflows appear in Recent Items after visiting
□ Publish button opens Popover (not Dialog)
□ Popover shows collection picker if needed
□ Publishing works end-to-end
□ Success dialog shows after publishing
□ No console errors
□ No TypeScript errors
```

---

## Reporting Issues

If you find issues:

1. Note which task/feature (1.1, 1.2, 1.3, or 1.4)
2. Describe the expected behavior
3. Describe the actual behavior
4. Include any console errors
5. Note browser/OS if relevant

---

*Last updated: January 2025*
