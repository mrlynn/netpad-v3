# Phase 2.2 Testing Guide: Node Configuration Simplification

## Overview

This guide tests the **TriggerNodeEditor** proof of concept - the first category extracted from `NodeConfigPanel`. This validates the extraction pattern before proceeding with the remaining 7 categories.

---

## What Changed

**Before:** All node configuration fields were rendered directly in `NodeConfigPanel.tsx` using a large `renderConfigField` function (315+ lines).

**After:** Trigger nodes (manual-trigger, form-trigger, webhook-trigger, schedule-trigger) now use the new `TriggerNodeEditor` component, which delegates to shared `ConfigFieldRenderer`.

**Files Created:**
- `src/components/WorkflowEditor/NodeEditors/shared/utils.ts` - Types and interfaces
- `src/components/WorkflowEditor/NodeEditors/shared/ConfigFieldRenderer.tsx` - Shared field renderer
- `src/components/WorkflowEditor/NodeEditors/shared/SwitchCasesEditor.tsx` - Switch cases component
- `src/components/WorkflowEditor/NodeEditors/TriggerNodeEditor.tsx` - Trigger nodes editor

**Files Modified:**
- `src/components/WorkflowEditor/Panels/NodeConfigPanel.tsx` - Now imports and uses TriggerNodeEditor for trigger nodes

---

## Test Scenarios

### 1. Manual Trigger Node

**Steps:**
1. Open Workflow Editor
2. Add a "Manual Start" node (manual-trigger)
3. Select the node to open Node Config Panel
4. Verify the Configuration accordion shows (it should be empty/hidden since manual-trigger has no config fields)

**Expected:**
- Node Config Panel opens correctly
- Basic Settings section works (Label, Notes, Enabled toggle)
- Configuration section should not appear (manual-trigger has no config)
- Execution and Retry Policy sections work normally
- Node can be saved and deleted

---

### 2. Form Trigger Node

**Steps:**
1. Create/open a workflow
2. Add a "Form Submission" node (form-trigger)
3. Select the node to open Node Config Panel
4. In the Configuration section, test:
   - **Form ID dropdown:** Should show list of available forms
   - **Wait for Validation toggle:** Should toggle on/off
   - **Include Submission Metadata toggle:** Should toggle on/off

**Expected:**
- Form ID dropdown loads and displays forms correctly
- Forms show "Published" badge when applicable
- Form ID displays correctly (with validation warning if invalid)
- Both boolean toggles work and save correctly
- Variable picker button appears on Form ID field (if applicable)
- Changes persist when saving and reopening the node

**Critical Checks:**
- ✅ Form selection saves the form ID correctly
- ✅ Boolean values persist after save/reopen
- ✅ Forms list loads without errors
- ✅ No console errors

---

### 3. Webhook Trigger Node

**Steps:**
1. Add a "Webhook" node (webhook-trigger)
2. Select the node to open Node Config Panel
3. In the Configuration section, test:
   - **Webhook Path (text field):** Enter a path like `/webhook/test`
   - **HTTP Method (dropdown):** Select POST, GET, PUT, DELETE
   - **Secret Key (password field):** Enter a secret value
   - Test variable picker on Webhook Path field

**Expected:**
- Text field accepts input and displays variable picker button
- Dropdown shows all HTTP methods and selection works
- Password field masks input correctly
- All values save and persist correctly
- Variable picker works (inserts `{{variable}}` syntax)

**Critical Checks:**
- ✅ Text field with variable picker works
- ✅ Password field masks input
- ✅ Dropdown selection persists
- ✅ All fields save correctly

---

### 4. Schedule Trigger Node

**Steps:**
1. Add a "Schedule" node (schedule-trigger)
2. Select the node to open Node Config Panel
3. In the Configuration section, test:
   - **Cron Expression (text field):** Enter `0 9 * * *` (9 AM daily)
   - **Timezone (text field):** Enter `America/New_York`
   - Test variable picker on both fields

**Expected:**
- Both text fields accept input
- Variable picker appears and works on both fields
- Values save and persist correctly
- No validation errors for valid cron expressions

**Critical Checks:**
- ✅ Multiple text fields work correctly
- ✅ Variable picker works on all text fields
- ✅ Values persist after save

---

## Regression Testing: Non-Trigger Nodes

**Critical:** Verify that non-trigger nodes still work correctly (they should use the old `renderConfigField` function).

### Test These Node Types:

1. **Conditional Node** (logic category)
   - Should show visual condition builder (not affected by our changes)
   - Should work exactly as before

2. **HTTP Request Node** (integrations category)
   - Should show URL, Method, Headers, Body fields
   - Should use old renderConfigField (not TriggerNodeEditor)
   - Should work exactly as before

3. **Email Send Node** (actions category)
   - Should show To, Subject, Body, From fields
   - Should work exactly as before

4. **Code Node** (custom category)
   - Should show Code and Timeout fields
   - Should work exactly as before

5. **Sticky Note Node** (annotations category)
   - Should show special styling UI (not affected)
   - Should work exactly as before

---

## Edge Cases & Error Handling

### 1. Missing Form Data
- **Test:** Open form-trigger node when no forms exist
- **Expected:** Form dropdown should show empty state or loading state
- **No errors:** Should not crash

### 2. Invalid Form ID
- **Test:** Manually enter an invalid form ID in form-trigger
- **Expected:** Shows warning message but doesn't block saving
- **Expected:** Warning appears in orange/yellow box below field

### 3. Empty Config Values
- **Test:** Create new trigger node (all fields empty)
- **Expected:** Should save successfully with empty/default values
- **Expected:** Reopening should show empty fields (not undefined/null errors)

### 4. Variable Picker Integration
- **Test:** Click variable picker button on text fields
- **Expected:** Variable picker popover opens
- **Expected:** Selecting a variable inserts `{{variable.path}}` syntax
- **Expected:** Variable appears in the text field

---

## Performance & UI Responsiveness

### Checklist:
- [ ] Node Config Panel opens quickly (< 200ms)
- [ ] Form dropdown loads within 1-2 seconds
- [ ] No lag when typing in text fields
- [ ] No flickering or re-rendering issues
- [ ] Accordions expand/collapse smoothly

---

## Browser Compatibility

Test in:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)

---

## Comparison: Before vs After

### Visual Comparison
The UI should look **identical** to before - we only changed the implementation, not the visual appearance.

### Functional Comparison
All functionality should work **exactly the same** as before. If anything behaves differently, that's a bug.

---

## Known Limitations

This is a **proof of concept** - only trigger nodes use the new editor. All other node types still use the old `renderConfigField` function. This is intentional for safe incremental migration.

---

## Success Criteria

✅ **All trigger nodes work correctly:**
- Manual trigger: No config (works as before)
- Form trigger: All 3 fields work and save correctly
- Webhook trigger: All 3 fields work and save correctly  
- Schedule trigger: Both fields work and save correctly

✅ **No regressions:**
- All non-trigger nodes work exactly as before
- No console errors
- No TypeScript/lint errors

✅ **Code quality:**
- New components are well-structured
- Shared utilities work correctly
- Pattern is ready for extracting other categories

---

## If Issues Are Found

1. **UI doesn't match:** Check that TriggerNodeEditor is being used (check browser dev tools React component tree)
2. **Fields don't save:** Check handleConfigChange function in NodeConfigPanel
3. **Forms don't load:** Check availableForms state and API call
4. **Variable picker broken:** Check ConfigFieldRenderer props
5. **Type errors:** Check TypeScript interfaces match between components

---

## Next Steps (After Successful Testing)

Once this proof of concept is validated, we'll extract the remaining categories:
- Logic nodes (conditional, switch, loop, delay)
- Integration nodes (http-request, mongodb-query, mongodb-write, google-sheets, atlas-cluster, atlas-data-api)
- Action nodes (email-send, notification)
- Data nodes (transform, filter)
- AI nodes (ai-prompt, ai-classify, ai-extract)
- Custom nodes (code)
- Annotation nodes (sticky-note)

Each will follow the same pattern established here.

---

*Testing guide created: January 2025*
*Phase 2.2 - Node Configuration Simplification - Proof of Concept*
