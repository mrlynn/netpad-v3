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

## Asset Structure (Recommended)

```text
assets/
  logo/
    netpad-logo-light.svg
    netpad-logo-dark.svg
    netpad-icon.svg
    netpad-logo-light.png
    netpad-logo-dark.png