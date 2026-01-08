# NetPad Brand Standards

**Version:** 1.0  
**Last Updated:** January 2026  
**Audience:** Engineering Team

This document codifies NetPad's brand standards for implementation across all sites, applications, and assets. All engineering work must conform to these standards.

---

## Table of Contents

1. [Brand Essence](#brand-essence)
2. [Logo Usage](#logo-usage)
3. [Color System](#color-system)
4. [Typography](#typography)
5. [Spacing & Layout](#spacing--layout)
6. [Component Standards](#component-standards)
7. [Iconography](#iconography)
8. [Motion & Animation](#motion--animation)
9. [Implementation Guidelines](#implementation-guidelines)
10. [Asset Specifications](#asset-specifications)

---

## Brand Essence

**NetPad** is the connective tissue between people and data.

- Forms are the interface
- Automation is the intelligence in between
- NetPad balances approachability with technical precision
- Should feel modern, confident, and quietly powerful

**Brand Voice:**
- Clear, calm, precise, confident
- Never hype-driven
- Preferred language: Flow, Route, Connect, Trigger, Orchestrate
- Avoid: "Magic", "Just works", over-promising language

---

## Logo Usage

### Logo Concept

The NetPad logo is an icon-first mark built around **negative space**:
- Stacked documents represent layered systems (forms → workflows → data)
- The negative space path represents automation and flow
- The documents are the container — the flow is the value

### Logo Variants

#### Primary Logo (Full Mark)
- **Light Mode:** Black logo on white or very light backgrounds
- **Dark Mode:** White logo on dark backgrounds
- **Usage:** Default for documentation, UI, print, and marketing

#### Icon-Only Variant (Favicon/Small)
- Use a single front document layer
- Retain the internal flow path
- No stacked layers at very small sizes
- Must remain legible at 16×16 and 32×32

#### Accent Variant (Optional)
- Entire logo remains monochrome
- One internal node may use an accent color
- Use sparingly (onboarding, highlights, marketing moments)
- **Rule:** Accent colors may touch **nodes only**, never the document outline

### Clear Space & Sizing

**Clear Space:** Maintain clear space equal to **½ the diameter of the inner node** on all sides. No text, icons, or UI elements may enter this space.

**Minimum Sizes:**

| Context            | Minimum Size |
|--------------------|--------------|
| Favicon            | 32×32 px     |
| UI icon            | 16×16 px     |
| Sidebar / Header   | 24–32 px     |
| Marketing / Print  | No limit     |

### Logo Don'ts

❌ **Do NOT:**
- Add arrows, labels, or text inside the mark
- Add gradients inside the logo
- Stretch, skew, or distort
- Add shadows, noise, or outlines
- Rotate or spin the logo
- Use multiple colors in the document outline

✅ **Do:**
- Use monochrome by default
- Let negative space breathe
- Trust the viewer to discover the meaning
- Use the icon alone when possible

### Logo Assets

**Location:** `/public/`
- `logo.svg` - Primary SVG logo
- `logo.png` - Primary PNG logo
- `logo-sm.svg` - Small variant
- `netpad.svg` - Icon variant
- `favicon.ico` - Favicon (multi-size)
- `favicon-16x16.png` - 16×16 favicon
- `favicon-32x32.png` - 32×32 favicon
- `apple-touch-icon.png` - iOS home screen icon (180×180)
- `icon.png` - Next.js app icon (32×32)

---

## Color System

### Core Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Black | `#000000` | Logo (light mode), text (light mode) |
| White | `#FFFFFF` | Logo (dark mode), text (dark mode) |
| Dark UI Background | `#0B0F14` | Dark mode background |

### Primary Color Palette

**MongoDB Green (Primary - Dark Mode)**
- Primary: `#00ED64`
- Light: `#4DFF9F`
- Dark: `#00B84A`

**MongoDB Green (Primary - Light Mode)**
- Primary: `#00684A`
- Light: `#00966B`
- Dark: `#004A33`

**NetPad Accent (Cyan-Green)**
- Accent: `#00D4AA`
- Light: `#4DFFE0`
- Dark: `#00684A`

### Gradients

**Dark Mode:**
```css
background: linear-gradient(135deg, #00ED64 0%, #00D4AA 100%);
```

**Light Mode:**
```css
background: linear-gradient(135deg, #00684A 0%, #00966B 100%);
```

**Reverse Gradient:**
```css
background: linear-gradient(135deg, #00D4AA 0%, #00ED64 100%);
```

### Theme Colors

#### Dark Mode Palette

```typescript
{
  primary: {
    main: '#00ED64',
    light: '#4DFF9F',
    dark: '#00B84A',
    contrastText: '#000'
  },
  secondary: {
    main: '#00D4AA',
    light: '#4DFFE0',
    dark: '#00684A'
  },
  background: {
    default: '#0a0e14',
    paper: '#141920'
  },
  text: {
    primary: '#e6edf3',
    secondary: '#8b949e'
  },
  success: {
    main: '#00ED64',
    light: '#4DFF9F',
    dark: '#00B84A'
  },
  error: {
    main: '#f85149',
    light: '#ff6b6b',
    dark: '#d32f2f'
  },
  warning: {
    main: '#d29922',
    light: '#f1a43c',
    dark: '#b08800'
  },
  info: {
    main: '#58a6ff',
    light: '#79c0ff',
    dark: '#388bfd'
  }
}
```

#### Light Mode Palette

```typescript
{
  primary: {
    main: '#00684A',
    light: '#00966B',
    dark: '#004A33',
    contrastText: '#fff'
  },
  secondary: {
    main: '#00D4AA',
    light: '#4DFF9F',
    dark: '#00B84A'
  },
  background: {
    default: '#F8FAF9',
    paper: '#ffffff'
  },
  text: {
    primary: '#1a1a2e',
    secondary: '#5c6370'
  },
  success: {
    main: '#00684A',
    light: '#00966B',
    dark: '#004A33'
  },
  error: {
    main: '#d32f2f',
    light: '#ef5350',
    dark: '#c62828'
  },
  warning: {
    main: '#ed6c02',
    light: '#ff9800',
    dark: '#e65100'
  },
  info: {
    main: '#0288d1',
    light: '#03a9f4',
    dark: '#01579b'
  }
}
```

### Effects

#### Glow Effects (Dark Mode)
```css
/* Primary glow */
box-shadow: 0 4px 16px rgba(0, 237, 100, 0.3);

/* Primary glow (hover) */
box-shadow: 0 6px 24px rgba(0, 237, 100, 0.4);

/* Subtle glow */
box-shadow: 0 0 30px rgba(0, 237, 100, 0.1);
```

#### Shadow Effects (Light Mode)
```css
/* Primary shadow */
box-shadow: 0 4px 16px rgba(0, 104, 74, 0.15);

/* Primary shadow (hover) */
box-shadow: 0 6px 24px rgba(0, 104, 74, 0.22);

/* Subtle shadow */
box-shadow: 0 2px 12px rgba(0, 104, 74, 0.08);
```

#### Grid Pattern (NetPad Identity)
```css
/* Dark mode */
background-image: radial-gradient(circle at 1px 1px, rgba(0, 237, 100, 0.03) 1px, transparent 0);
background-size: 24px 24px;

/* Light mode */
background-image: radial-gradient(circle at 1px 1px, rgba(0, 104, 74, 0.06) 1px, transparent 0);
background-size: 24px 24px;
```

---

## Typography

### Primary Typeface

**Font Family:** `Inter`

**Fallback Stack:**
```css
font-family: "Inter", -apple-system, "Segoe UI", "Roboto", "Helvetica Neue", sans-serif;
```

### Font Weights

- **Regular:** 400
- **Medium:** 500
- **Semibold:** 600
- **Bold:** 700

### Typography Scale

```typescript
{
  h1: {
    fontWeight: 700,
    letterSpacing: '-0.02em'
  },
  h2: {
    fontWeight: 700,
    letterSpacing: '-0.01em'
  },
  h3: {
    fontWeight: 600,
    letterSpacing: '-0.01em'
  },
  h4: {
    fontWeight: 600
  },
  h5: {
    fontWeight: 600
  },
  h6: {
    fontWeight: 600,
    fontSize: '1rem'
  },
  body1: {
    fontSize: '0.9375rem',
    lineHeight: 1.6
  },
  body2: {
    fontSize: '0.875rem',
    lineHeight: 1.5
  },
  button: {
    textTransform: 'none',
    fontWeight: 500
  }
}
```

### Wordmark

**Typeface:** Inter  
**Weight:** 600 (Semibold)  
**Case:** Title case (NetPad)  
**Spacing:** Icon-to-wordmark gap = 0.35× icon width  
**Alignment:** Baseline aligned to optical midline of icon

**Optional Accent:** Color only "Pad" with a single accent color

**Don't:**
- Outline the wordmark
- Use gradients in the wordmark
- Change letterforms

### Optional Display Typeface (Marketing Only)

- Space Grotesk
- Satoshi

**Rule:** Do not use more than **two typefaces** in a single context.

---

## Spacing & Layout

### Border Radius

| Element | Radius | Value |
|---------|--------|-------|
| Base | 8px | Default for buttons, inputs, cards |
| Small | 4px | Menu items, chips |
| Medium | 6px | Chips, tooltips, list items |
| Large | 12px | Dialogs, cards, papers |

### Spacing Scale

**Button Padding:**
- Default: `8px 16px`
- Small: `6px 12px`

**Input Padding:**
- Default: `8px 12px`

**Card Padding:**
- Default: `1.5rem` (24px)

**Component Margins:**
- Menu items: `2px 6px`
- List items: `2px 0`
- Accordion content: `10px 0`

### Grid System

**Grid Pattern Size:** `24px × 24px`

**Container Max Width:** `1200px` (with padding)

---

## Component Standards

### Buttons

**Base Styles:**
```css
border-radius: 8px;
padding: 8px 16px;
font-weight: 500;
text-transform: none;
transition: all 0.15s ease;
```

**Contained Button (Dark Mode):**
```css
background: linear-gradient(135deg, #00ED64 0%, #00D4AA 100%);
box-shadow: 0 4px 16px rgba(0, 237, 100, 0.3);
color: #000;
```

**Contained Button (Light Mode):**
```css
background: linear-gradient(135deg, #00684A 0%, #00966B 100%);
box-shadow: 0 4px 16px rgba(0, 104, 74, 0.15);
color: #fff;
```

**Hover State:**
```css
transform: translateY(-2px);
/* Increase shadow intensity */
```

**Outlined Button:**
```css
border-radius: 8px;
border: 1px solid rgba(110, 118, 129, 0.3);
transition: all 0.15s ease;
```

**Outlined Button Hover:**
```css
border-color: rgba(0, 237, 100, 0.5);
background-color: rgba(0, 237, 100, 0.04);
transform: translateY(-1px);
```

### Input Fields

**Base Styles:**
```css
border-radius: 8px;
transition: all 0.2s ease;
```

**Focus State:**
```css
border-width: 2px;
border-color: /* accent color */;
box-shadow: 0 0 0 3px rgba(0, 212, 170, 0.1);
```

**Dark Mode Focus:**
```css
border-color: #00D4AA;
box-shadow: 0 0 0 3px rgba(0, 212, 170, 0.1);
```

**Light Mode Focus:**
```css
border-color: #00966B;
box-shadow: 0 0 0 3px rgba(0, 150, 107, 0.1);
```

### Cards & Papers

**Base Styles:**
```css
border-radius: 12px;
border: 1px solid /* theme-appropriate border */;
transition: all 0.2s ease;
/* Grid pattern background */
```

**Dark Mode:**
```css
border: 1px solid rgba(110, 118, 129, 0.12);
background-image: radial-gradient(circle at 1px 1px, rgba(0, 237, 100, 0.03) 1px, transparent 0);
background-size: 24px 24px;
box-shadow: inset 0 1px 0 rgba(0, 237, 100, 0.05);
```

**Light Mode:**
```css
border: 1px solid rgba(0, 104, 74, 0.1);
background-image: radial-gradient(circle at 1px 1px, rgba(0, 104, 74, 0.06) 1px, transparent 0);
background-size: 24px 24px;
box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
```

**Hover State:**
```css
border-color: /* primary color with opacity */;
/* Subtle glow/shadow increase */
```

### Dialogs

**Border Radius:** `12px`

### Menus

**Border Radius:** `8px`  
**Margin Top:** `4px`

### Menu Items

**Border Radius:** `4px`  
**Margin:** `2px 6px`  
**Padding:** `8px 12px`

### Chips

**Border Radius:** `6px`  
**Font Weight:** `500`

### Tooltips

**Border Radius:** `6px`  
**Padding:** `6px 10px`  
**Font Size:** `0.75rem`  
**Font Weight:** `500`  
**Enter Delay:** `400ms`  
**Leave Delay:** `100ms`

---

## Iconography

### Style Guidelines

Icons used alongside the NetPad logo should:
- Use rounded geometry
- Match stroke weight to the logo
- Prefer outlines and negative space
- Avoid filled + stroked combinations

Icons should feel like **extensions of the system**, not decorations.

### Stroke Weight

Match the logo's stroke weight (20px at 256×256 scale, proportional at other sizes).

---

## Motion & Animation

### Approved Motions

✅ **Allowed:**
- Flow path draws from node → node
- Subtle pulse traveling the path
- Gentle scale-in (98% → 100%) on load
- Hover transforms: `translateY(-1px)` or `translateY(-2px)`
- Transition duration: `0.15s` to `0.2s` with `ease` timing

### Not Allowed

❌ **Do NOT:**
- Rotate or spin the logo
- Glitch effects (except marketing-only experiments)
- Multi-color cycling
- Abrupt or jarring animations

**Principle:** Motion should feel inevitable, not flashy.

### Transition Standards

```css
/* Standard transitions */
transition: all 0.15s ease;  /* Buttons, quick interactions */
transition: all 0.2s ease;   /* Cards, inputs, hover states */
```

---

## Implementation Guidelines

### Material-UI Theme

**Reference File:** `src/theme/theme.ts`

**Usage:**
```typescript
import { getDesignTokens } from '@/theme/theme';
import { createTheme } from '@mui/material/styles';

const theme = createTheme(getDesignTokens('dark')); // or 'light'
```

### Color Tokens

**Reference:** `netpadColors` object in `src/theme/theme.ts`

**Export:**
```typescript
import { netpadColors } from '@/theme/theme';
```

### CSS Variables (Alternative)

For non-MUI implementations:

```css
:root {
  --netpad-primary: #00ED64;
  --netpad-primary-light: #4DFF9F;
  --netpad-primary-dark: #00B84A;
  --netpad-accent: #00D4AA;
  --netpad-secondary: #00684A;
  --netpad-secondary-light: #00966B;
  --netpad-secondary-dark: #004A33;
  
  --netpad-gradient: linear-gradient(135deg, #00ED64 0%, #00D4AA 100%);
  --netpad-gradient-light: linear-gradient(135deg, #00684A 0%, #00966B 100%);
  
  --netpad-glow-primary: 0 4px 16px rgba(0, 237, 100, 0.3);
  --netpad-shadow-primary: 0 4px 16px rgba(0, 104, 74, 0.15);
  
  --netpad-border-radius: 8px;
  --netpad-border-radius-small: 4px;
  --netpad-border-radius-medium: 6px;
  --netpad-border-radius-large: 12px;
}
```

### Font Loading

**Inter Font:**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

Or via npm:
```bash
npm install @fontsource/inter
```

```typescript
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
```

### Logo Implementation

**SVG (Recommended):**
```tsx
import Image from 'next/image';

<Image
  src="/logo.svg"
  alt="NetPad"
  width={120}
  height={120}
  style={{ color: 'currentColor' }} // For theme-aware coloring
/>
```

**Inline SVG (for theme-aware coloring):**
```tsx
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="256"
  height="256"
  viewBox="0 0 256 256"
  fill="none"
>
  {/* Use currentColor for theme-aware coloring */}
  <rect stroke="currentColor" ... />
</svg>
```

### Favicon Implementation

**Next.js App Directory:**
- Place `icon.png` (32×32) in `src/app/`
- Next.js automatically detects and uses it

**Traditional HTML:**
```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon-32x32.png" type="image/png">
<link rel="icon" href="/favicon-16x16.png" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

---

## Asset Specifications

### Logo Assets

| Asset | Size | Format | Location | Usage |
|-------|------|--------|----------|-------|
| logo.svg | Vector | SVG | `/public/logo.svg` | Primary logo |
| logo.png | Variable | PNG | `/public/logo.png` | Fallback |
| logo-sm.svg | Vector | SVG | `/public/logo-sm.svg` | Small variant |
| netpad.svg | Vector | SVG | `/public/netpad.svg` | Icon only |
| favicon.ico | Multi-size | ICO | `/public/favicon.ico` | Browser favicon |
| favicon-16x16.png | 16×16 | PNG | `/public/favicon-16x16.png` | Modern browsers |
| favicon-32x32.png | 32×32 | PNG | `/public/favicon-32x32.png` | Modern browsers |
| apple-touch-icon.png | 180×180 | PNG | `/public/apple-touch-icon.png` | iOS home screen |
| icon.png | 32×32 | PNG | `/src/app/icon.png` | Next.js app icon |

### Logo Geometric Specs

**Coordinate System:**
- Artboard: 256×256
- ViewBox: `0 0 256 256`
- Stroke-based icon (no fills for document outlines)

**Key Measurements:**
- Corner radius (documents): 32px
- Stroke width (documents + path): 20px
- Node (dot) radius: 14px
- Document offsets (stack):
  - Back doc: +26px x, -18px y (relative to front)
  - Mid doc: +13px x, -9px y
  - Front doc: base

**Breathing Room:**
- Internal flow must never touch outer document outline
- Minimum gap: 12px

### Image Assets

| Asset | Size | Format | Usage |
|-------|------|--------|-------|
| og-image.png | 1200×630 | PNG | Open Graph / Social sharing |
| logo-large.png | Variable | PNG | Marketing materials |
| logo-300px.png | 300×300 | PNG | Reference size |

---

## Code Examples

### Button Component

```tsx
import { Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';

export function NetPadButton({ children, variant = 'contained', ...props }) {
  const theme = useTheme();
  
  return (
    <Button
      variant={variant}
      sx={{
        borderRadius: 2, // 8px
        textTransform: 'none',
        fontWeight: 500,
        transition: 'all 0.15s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
        },
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
```

### Card Component

```tsx
import { Card } from '@mui/material';
import { netpadColors } from '@/theme/theme';

export function NetPadCard({ children, ...props }) {
  return (
    <Card
      sx={{
        borderRadius: 3, // 12px
        border: '1px solid',
        borderColor: 'divider',
        backgroundImage: netpadColors.gridPatternDark,
        backgroundSize: netpadColors.gridSize,
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: netpadColors.glowSubtle,
        },
      }}
      {...props}
    >
      {children}
    </Card>
  );
}
```

### Input Component

```tsx
import { TextField } from '@mui/material';

export function NetPadInput({ ...props }) {
  return (
    <TextField
      variant="outlined"
      size="small"
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: 2, // 8px
          transition: 'all 0.2s ease',
          '&.Mui-focused': {
            '& .MuiOutlinedInput-notchedOutline': {
              borderWidth: 2,
            },
            boxShadow: '0 0 0 3px rgba(0, 212, 170, 0.1)',
          },
        },
      }}
      {...props}
    />
  );
}
```

---

## Checklist for New Implementations

When creating new components or pages, verify:

- [ ] Colors match the defined palette
- [ ] Typography uses Inter font family
- [ ] Border radius follows the scale (4px, 6px, 8px, 12px)
- [ ] Spacing is consistent with defined scale
- [ ] Transitions use 0.15s or 0.2s with ease timing
- [ ] Logo usage follows clear space rules
- [ ] Dark and light modes are both supported
- [ ] Grid pattern is applied to cards/papers
- [ ] Hover states include appropriate transforms
- [ ] Focus states include appropriate shadows/glows

---

## Questions or Updates

For questions about these standards or to propose updates, please:
1. Review existing implementations in `src/theme/theme.ts`
2. Check the design system in Material-UI components
3. Consult with the design team before deviating from standards

**Remember:** Consistency is key. When in doubt, reference the existing theme implementation.

---

## Version History

- **v1.0** (January 2026): Initial codification of brand standards
