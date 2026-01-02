# NetPad Brand Kit (v1.0)

This document defines the official NetPad visual identity and usage guidelines.
It is intended for designers, engineers, and anyone producing UI, docs, or marketing assets.

---

## Brand Essence

**NetPad** is the connective tissue between people and data.

Forms are the interface.  
Automation is the intelligence in between.

NetPad balances approachability with technical precision.  
It should feel modern, confident, and quietly powerful.

---

## Primary Logo Mark

The NetPad logo is an icon-first mark built around **negative space**.

### Concept
- Stacked documents represent layered systems (forms → workflows → data)
- The negative space path represents automation and flow
- The documents are the container — the flow is the value

### Primary Logo (Light Mode)

![NetPad Logo – Light Mode](./assets/logo/netpad-logo-light.png)

**Usage**
- Black logo on white or very light backgrounds
- Default for documentation, UI, print, and marketing

---

### Primary Logo (Dark Mode)

![NetPad Logo – Dark Mode](./assets/logo/netpad-logo-dark.png)

**Usage**
- White logo on dark backgrounds
- Preferred for product UI, dashboards, and developer tools

---

## Logo Variants

### Small / Favicon Variant

![NetPad Logo – Icon](./assets/logo/netpad-icon.png)

**Rules**
- Use a single front document layer
- Retain the internal flow path
- No stacked layers at very small sizes
- Must remain legible at 16×16 and 32×32

---

### Accent Variant (Optional)

- Entire logo remains monochrome
- One internal node may use an accent color
- Use sparingly (onboarding, highlights, marketing moments)

---

## Clear Space & Sizing

### Clear Space
Maintain clear space equal to **½ the diameter of the inner node** on all sides.

No text, icons, or UI elements may enter this space.

### Minimum Sizes
| Context            | Minimum Size |
|--------------------|--------------|
| Favicon            | 32×32 px     |
| UI icon            | 16×16 px     |
| Sidebar / Header   | 24–32 px     |
| Marketing / Print  | No limit     |

If the logo does not read clearly at the intended size, do not use that variant.

---

## Color System

### Core Colors

| Color | Hex |
|------|-----|
| Black | `#000000` |
| White | `#FFFFFF` |
| Dark UI Background | `#0B0F14` |

### Accent Colors (Choose One Primary)

| Name | Hex | Usage |
|----|----|----|
| MongoDB Green | `#00ED64` | Preferred (MongoDB-native) |
| Indigo | `#4F46E5` | Tech-forward |
| Cyan | `#06B6D4` | Electric / experimental |

**Rule**
> Accent colors may touch **nodes only**, never the document outline.

---

## Wordmark system

NetPad’s wordmark is designed to pair cleanly with the icon mark in both light and dark modes.

### Typeface
- Primary: **Inter**
- Weight: **600 (Semibold)**
- Case: **Title case** (NetPad)

### Spacing + alignment
- Icon-to-wordmark gap: **0.35× icon width**
- Baseline: align the wordmark baseline to the optical midline of the icon (not the geometric center)
- Recommended lockups:
  - Horizontal (default)
  - Stacked (icon above wordmark) for square avatars

### Color
- Default: monochrome wordmark matching the icon (black on light, white on dark)
- Optional accent: color only **“Pad”** with a single accent color (see Color System)

### Don’t
- Don’t outline the wordmark.
- Don’t use gradients in the wordmark.
- Don’t change letterforms (no pseudo-customization) unless we explicitly approve a custom drawn wordmark later.

## Typography

### Primary Typeface
**Inter**

Weights:
- Regular (400)
- Medium (500)
- Semibold (600)

Usage:
- UI
- Documentation
- Marketing body text

### Optional Display Typeface (Marketing Only)
- Space Grotesk
- Satoshi

Do not use more than **two typefaces** in a single context.

---

## Iconography Style

Icons used alongside the NetPad logo should:
- Use rounded geometry
- Match stroke weight to the logo
- Prefer outlines and negative space
- Avoid filled + stroked combinations

Icons should feel like **extensions of the system**, not decorations.

---

## Motion Guidelines

Motion adds life without altering the mark.

### Approved Motions
- Flow path draws from node → node
- Subtle pulse traveling the path
- Gentle scale-in (98% → 100%) on load

### Not Allowed
- Rotation or spinning
- Glitch effects (except marketing-only experiments)
- Multi-color cycling

Motion should feel inevitable, not flashy.

---

## Do / Don’t

### Do
- Use monochrome by default
- Let negative space breathe
- Trust the viewer to discover the meaning
- Use the icon alone when possible

### Don’t
- Add arrows, labels, or text inside the mark
- Add gradients inside the logo
- Stretch, skew, or distort
- Add shadows, noise, or outlines

If it feels like it needs embellishment — stop.

---

## Brand Voice (Quick Reference)

**Tone**
- Clear
- Calm
- Precise
- Confident, never hype-driven

**Preferred Language**
- Flow
- Route
- Connect
- Trigger
- Orchestrate

**Avoid**
- “Magic”
- “Just works”
- Over-promising language

NetPad doesn’t hype. It executes.

---

## SVG geometric specs (v1.0)

These specs define the icon’s geometry so it can be recreated consistently (SVG, canvas, print, UI).

### Coordinate system
- **Artboard:** 256×256
- **ViewBox:** `0 0 256 256`
- **Stroke-based icon:** no fills for the document outlines (monochrome), internal path may be stroke-only.

### Key measurements
- **Corner radius (documents):** 32
- **Stroke width (documents + path):** 20
- **Node (dot) radius:** 14
- **Document offsets (stack):**
  - Back doc: +26px x, -18px y (relative to front)
  - Mid doc: +13px x, -9px y
  - Front doc: base

### Geometry
- Three rounded rectangles (documents) are stacked with consistent offsets.
- The internal “flow” is a single continuous rounded path with two terminal nodes.
- The internal flow must never touch the outer document outline (leave at least **12px** breathing room).

### Reference SVG (icon only, light mode)

```svg
<!-- netpad-icon-light.svg (reference) -->
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" fill="none">
  <!-- Back document -->
  <rect x="66" y="36" width="156" height="156" rx="32" stroke="#000000" stroke-width="20" stroke-linejoin="round"/>
  <!-- Middle document -->
  <rect x="53" y="45" width="156" height="156" rx="32" stroke="#000000" stroke-width="20" stroke-linejoin="round"/>
  <!-- Front document -->
  <rect x="40" y="54" width="156" height="156" rx="32" stroke="#000000" stroke-width="20" stroke-linejoin="round"/>

  <!-- Internal flow path -->
  <path d="M92 152C92 132 108 116 128 116H162C176 116 188 104 188 90C188 74 175 62 160 62H118C104 62 92 74 92 88" 
        stroke="#000000" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Nodes -->
  <circle cx="128" cy="152" r="14" fill="#000000"/>
  <circle cx="162" cy="116" r="14" fill="#000000"/>
</svg>
```

### Reference SVG (icon only, dark mode)

```svg
<!-- netpad-icon-dark.svg (reference) -->
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" fill="none">
  <rect x="66" y="36" width="156" height="156" rx="32" stroke="#FFFFFF" stroke-width="20" stroke-linejoin="round"/>
  <rect x="53" y="45" width="156" height="156" rx="32" stroke="#FFFFFF" stroke-width="20" stroke-linejoin="round"/>
  <rect x="40" y="54" width="156" height="156" rx="32" stroke="#FFFFFF" stroke-width="20" stroke-linejoin="round"/>

  <path d="M92 152C92 132 108 116 128 116H162C176 116 188 104 188 90C188 74 175 62 160 62H118C104 62 92 74 92 88" 
        stroke="#FFFFFF" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>

  <circle cx="128" cy="152" r="14" fill="#FFFFFF"/>
  <circle cx="162" cy="116" r="14" fill="#FFFFFF"/>
</svg>
```

> Note: these are **reference** SVGs. If we decide to tweak optical balance (stroke taper, offsets, node placement), update the specs here and re-export.

## Wordmark lockup (reference)

The lockup pairs the NetPad icon with the wordmark while preserving hierarchy and negative space.

### Horizontal lockup (default)

```svg
<!-- netpad-lockup-light.svg (reference) -->
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="256" viewBox="0 0 640 256" fill="none">
  <!-- Icon group -->
  <g transform="translate(0,0)">
    <rect x="66" y="36" width="156" height="156" rx="32" stroke="#000000" stroke-width="20"/>
    <rect x="53" y="45" width="156" height="156" rx="32" stroke="#000000" stroke-width="20"/>
    <rect x="40" y="54" width="156" height="156" rx="32" stroke="#000000" stroke-width="20"/>
    <path d="M92 152C92 132 108 116 128 116H162C176 116 188 104 188 90C188 74 175 62 160 62H118C104 62 92 74 92 88"
          stroke="#000000" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="128" cy="152" r="14" fill="#000000"/>
    <circle cx="162" cy="116" r="14" fill="#000000"/>
  </g>

  <!-- Wordmark -->
  <text x="300" y="150" font-family="Inter, system-ui, -apple-system" font-size="96" font-weight="600" fill="#000000">NetPad</text>
</svg>
```

**Rules**
- The icon always comes first.
- Do not shrink the icon to match text height; text scales to the icon.
- Maintain the icon-to-wordmark spacing defined earlier (≈ 0.35× icon width).

---

## SVG animation reference (product-ready)

This example shows a **pure SVG path-draw animation** suitable for inline use in React/Next.js.

```svg
<!-- netpad-icon-animated.svg (reference) -->
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" fill="none">
  <rect x="40" y="54" width="156" height="156" rx="32" stroke="currentColor" stroke-width="20"/>

  <path id="flowPath"
        d="M92 152C92 132 108 116 128 116H162C176 116 188 104 188 90C188 74 175 62 160 62H118C104 62 92 74 92 88"
        stroke="currentColor"
        stroke-width="20"
        stroke-linecap="round"
        stroke-linejoin="round"
        pathLength="1"
        stroke-dasharray="1"
        stroke-dashoffset="1">
    <animate attributeName="stroke-dashoffset"
             from="1" to="0"
             dur="1.2s"
             fill="freeze" />
  </path>

  <circle r="6" fill="currentColor">
    <animateMotion dur="1.2s" fill="freeze" rotate="auto">
      <mpath href="#flowPath" />
    </animateMotion>
  </circle>
</svg>
```

### React usage (example)

```jsx
export function NetPadIconAnimated() {
  return (
    <div style={{ color: '#000' }}>
      {/* inline SVG here so currentColor works */}
    </div>
  );
}
```

**Notes**
- Use `currentColor` so the icon inherits theme color.
- For repeated loops, remove `fill="freeze"` and add `repeatCount="indefinite"`.
- For more control, replace SVG `<animate>` with GSAP.
