# Context-Sensitive Help System

## Overview

NetPad has an extensive in-app help system accessible via `CMD+/` (or `F1`), but users need visible indicators to discover it. We've added:

1. **Global Help Button** - Always visible in the navbar (upper right)
2. **ContextHelpButton** - Subtle help buttons for specific features
3. **InlineHelpIcon** - Tiny inline help icons within text/labels

## Components

### 1. Global Help Button (Navbar)

Already added to `AppNavBar.tsx` - appears in the upper right corner next to the marketplace icon. Opens the help search dialog.

### 2. ContextHelpButton

A subtle, context-sensitive help button that can be placed near complex features.

```tsx
import { ContextHelpButton } from '@/components/Help/ContextHelpButton';

// Context-specific help (opens specific topic)
<ContextHelpButton topicId="form-builder" placement="top-start" />

// General help (opens search)
<ContextHelpButton placement="top-start" />
```

**Props:**
- `topicId?: HelpTopicId` - Specific help topic to open (optional)
- `placement?: 'top' | 'bottom' | 'left' | 'right' | ...` - Tooltip placement
- `size?: 'small' | 'medium'` - Icon size
- `tooltip?: string` - Custom tooltip text
- `variant?: 'subtle' | 'visible'` - Visibility level (default: 'subtle')
- `sx?: SxProps<Theme>` - Custom styles

**Variants:**
- `subtle` (default): Very low opacity (0.4), becomes visible on hover
- `visible`: More prominent (0.7 opacity)

### 3. InlineHelpIcon

A tiny inline help icon for use within text or labels.

```tsx
import { InlineHelpIcon } from '@/components/Help/ContextHelpButton';

<Typography>
  Form Builder
  <InlineHelpIcon topicId="form-builder" />
</Typography>
```

## Where to Add Help Buttons

### High Priority (Complex Features)

1. **Form Builder**
   - Near field configuration panels
   - Next to advanced settings
   - Near conditional logic setup

2. **Workflow Editor**
   - Near node configuration
   - Next to trigger setup
   - Near action configuration

3. **Data Source Setup**
   - Connection vault configuration
   - Collection selection
   - Encryption settings

4. **Conversational Forms**
   - AI persona configuration
   - Topic setup
   - Extraction schema

### Medium Priority (Settings & Configuration)

1. **Application Settings**
   - Project configuration
   - Organization settings
   - Access control

2. **Form Settings**
   - Theme customization
   - Multi-page setup
   - Validation rules

3. **Workflow Settings**
   - Trigger configuration
   - Node settings
   - Error handling

### Low Priority (Simple Features)

- Use inline help icons for simple labels
- Or rely on tooltips for basic features

## Best Practices

### 1. Placement

- **Top-right corner** of complex sections/panels
- **Next to labels** for inline help
- **Near action buttons** that might be confusing
- **Avoid cluttering** - use sparingly

### 2. Visibility

- Use `variant="subtle"` for most cases (doesn't distract)
- Use `variant="visible"` only for critical, complex features
- Always show on hover (built-in)

### 3. Context

- Use specific `topicId` when possible (better UX)
- Use general help (no topicId) for broad areas
- Match help topic to the actual feature

### 4. Consistency

- Use same placement pattern across similar features
- Keep size consistent (`small` for most cases)
- Use same tooltip style

## Examples

### Form Builder - Field Configuration

```tsx
<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
  <Typography variant="subtitle2">Field Configuration</Typography>
  <ContextHelpButton topicId="form-builder-fields" placement="top-start" />
</Box>
```

### Workflow Editor - Node Settings

```tsx
<Paper sx={{ p: 2, position: 'relative' }}>
  <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
    <ContextHelpButton topicId="workflow-nodes" />
  </Box>
  {/* Node configuration content */}
</Paper>
```

### Inline Help in Labels

```tsx
<FormLabel>
  MongoDB Connection
  <InlineHelpIcon topicId="mongodb-connections" />
</FormLabel>
```

### Settings Panel

```tsx
<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
  <Typography variant="h6">Advanced Settings</Typography>
  <ContextHelpButton topicId="advanced-settings" variant="visible" />
</Box>
```

## Keyboard Shortcuts

Users can always access help via:
- `CMD+/` or `CTRL+/` - Open help search
- `F1` - Open help search
- `CMD+Shift+?` - Alternative shortcut

The help buttons are visual reminders of these shortcuts.

## Implementation Checklist

- [x] Global help button in navbar
- [ ] Form Builder - Field configuration help
- [ ] Form Builder - Conditional logic help
- [ ] Form Builder - Multi-page setup help
- [ ] Workflow Editor - Node configuration help
- [ ] Workflow Editor - Trigger setup help
- [ ] Data Source - Connection vault help
- [ ] Conversational Forms - AI configuration help
- [ ] Application Settings - Project setup help
- [ ] Settings - Organization management help

## Testing

When adding help buttons:
1. Test that the correct topic opens
2. Verify tooltip shows on hover
3. Check that button is discoverable but not distracting
4. Ensure keyboard navigation works
5. Test on mobile (help buttons should still work)
