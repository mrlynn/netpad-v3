# Docusaurus Branding Guide: NetPad Logo Watermark

## Overview

This guide provides implementation patterns for adding the NetPad robot logo (`/static/netpad-logo.svg`) as a subtle, centered watermark throughout the Docusaurus documentation site. These patterns have been successfully implemented in the main NetPad application.

## Logo Asset

Copy the logo from the main app to your Docusaurus static folder:
```
Source: /public/netpad-logo.svg
Destination: /static/netpad-logo.svg
```

The logo is a robot head SVG (557x595 viewBox) that works well as a watermark when rendered in monochrome with low opacity.

## Implementation Pattern

### CSS-Based Watermark (Recommended for Docusaurus)

Add to your custom CSS (`/src/css/custom.css`):

```css
/* NetPad Logo Watermark - applies to main content area */
.main-wrapper::before {
  content: '';
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 200px;
  height: 200px;
  background-image: url('/img/netpad-logo.svg');
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  opacity: 0.03;
  pointer-events: none;
  user-select: none;
  z-index: 0;
  /* Dark mode: invert to white */
  filter: brightness(0);
}

/* Dark mode adjustment */
[data-theme='dark'] .main-wrapper::before {
  filter: brightness(0) invert(1);
}
```

### React Component Watermark

For more control, create a React component:

```tsx
// /src/components/NetPadWatermark.tsx
import React from 'react';
import { useColorMode } from '@docusaurus/theme-common';

interface NetPadWatermarkProps {
  size?: number;
  opacity?: number;
}

export function NetPadWatermark({
  size = 200,
  opacity = 0.035
}: NetPadWatermarkProps) {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 0,
      }}
    >
      <img
        src="/img/netpad-logo.svg"
        alt=""
        style={{
          width: size,
          height: size,
          opacity: opacity,
          filter: isDark ? 'brightness(0) invert(1)' : 'brightness(0)',
        }}
      />
    </div>
  );
}
```

### Swizzle Layout to Include Watermark

To add the watermark globally, swizzle the Layout component:

```bash
npm run swizzle @docusaurus/theme-classic Layout -- --wrap
```

Then modify the wrapper:

```tsx
// /src/theme/Layout/index.tsx
import React from 'react';
import Layout from '@theme-original/Layout';
import { NetPadWatermark } from '@site/src/components/NetPadWatermark';

export default function LayoutWrapper(props) {
  return (
    <>
      <Layout {...props} />
      <NetPadWatermark />
    </>
  );
}
```

## Recommended Placements

| Location | Size | Opacity | Notes |
|----------|------|---------|-------|
| **Main docs pages** | 200px | 3.5% | Centered, fixed position |
| **Landing/hero sections** | 280px | 5% | Larger for impact |
| **Code playground** | 180px | 3% | Subtle behind code |
| **Tutorial pages** | 200px | 3% | Non-distracting |
| **API reference** | 160px | 2.5% | Minimal interference with dense content |

## Design Guidelines

### Opacity
- **Standard pages**: 3-4% opacity (barely visible, professional)
- **Hero/landing**: 5-6% opacity (slightly more prominent)
- **Dense content**: 2-3% opacity (avoid distraction)

### Sizing
- **Standard**: 200px - good default for most pages
- **Large hero areas**: 240-280px
- **Compact areas**: 160-180px

### Theme Awareness
Always implement both light and dark mode:
- **Light mode**: `filter: brightness(0)` (renders black)
- **Dark mode**: `filter: brightness(0) invert(1)` (renders white)

### Accessibility
- Always use `pointer-events: none` to prevent interaction blocking
- Always use `user-select: none` to prevent accidental selection
- Use empty `alt=""` since it's decorative
- Keep opacity low enough to maintain text readability (WCAG contrast)

## Page-Specific Examples

### Hero Section Watermark

```css
.hero::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 300px;
  height: 300px;
  background-image: url('/img/netpad-logo.svg');
  background-size: contain;
  background-repeat: no-repeat;
  opacity: 0.05;
  pointer-events: none;
  filter: brightness(0);
}

[data-theme='dark'] .hero::before {
  filter: brightness(0) invert(1);
}
```

### Docs Sidebar Watermark (Bottom)

```css
.theme-doc-sidebar-container::after {
  content: '';
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 60px;
  background-image: url('/img/netpad-logo.svg');
  background-size: contain;
  background-repeat: no-repeat;
  opacity: 0.08;
  pointer-events: none;
  filter: brightness(0);
}

[data-theme='dark'] .theme-doc-sidebar-container::after {
  filter: brightness(0) invert(1);
}
```

### MDX Page Component

For individual MDX pages that need custom watermarks:

```mdx
import { NetPadWatermark } from '@site/src/components/NetPadWatermark';

# My Page Title

<NetPadWatermark size={240} opacity={0.04} />

Content goes here...
```

## Brand Colors Reference

When combining the watermark with other brand elements:

| Color | Hex | Usage |
|-------|-----|-------|
| **Primary (Dark)** | `#00ED64` | MongoDB Green - accent color |
| **Primary (Light)** | `#00684A` | Darker green for light mode |
| **Accent** | `#00D4AA` | Cyan-green for highlights |

## Testing Checklist

- [ ] Watermark visible in light mode
- [ ] Watermark visible in dark mode (inverted)
- [ ] Watermark doesn't block clicks/interactions
- [ ] Watermark doesn't interfere with text selection
- [ ] Opacity is subtle but visible
- [ ] Watermark stays centered on scroll
- [ ] Watermark responsive on mobile (consider hiding or reducing size)

## Mobile Considerations

Consider hiding or reducing the watermark on small screens:

```css
@media (max-width: 768px) {
  .main-wrapper::before {
    width: 120px;
    height: 120px;
    opacity: 0.02;
  }
}

/* Or hide completely on mobile */
@media (max-width: 480px) {
  .main-wrapper::before {
    display: none;
  }
}
```

---

**Reference Implementation**: See the main NetPad app for working examples:
- `src/components/WorkflowEditor/NetPadBrandedBackground.tsx`
- `src/components/FormBuilder/WYSIWYGFormEditor.tsx`
- `src/components/PipelineCanvas/PipelineCanvas.tsx`
- `src/components/ERD/ERDCanvas.tsx`
