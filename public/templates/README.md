# Template Preview Images

This directory contains preview images for form and workflow templates.

## Directory Structure

```
public/templates/
├── forms/          # Form template preview images
└── workflows/      # Workflow template preview images
```

## Image Naming Convention

Preview images should be named to match their template IDs:

- Form templates: `{template-id}.png` (e.g., `contact-form.png`)
- Workflow templates: `{template-id}.png` (e.g., `form-to-email.png`)

## Image Specifications

**Recommended dimensions:**
- Card thumbnail: 48×48px or 56×56px (square, 1:1 aspect ratio)
- Preview dialog: 800×450px (16:9 aspect ratio)

**Format:** PNG (preferred) or JPEG

**Tips:**
- Use PNG for images with transparency or crisp edges
- Use JPEG for photographic content
- Optimize images for web (compress without significant quality loss)
- Consider creating both thumbnail and full-size versions if needed

## Adding Preview Images

1. Create the preview image (screenshot or design)
2. Save it in the appropriate directory (`forms/` or `workflows/`)
3. Name it to match the template ID (e.g., `contact-form.png`)
4. Add `previewImageUrl` to the template JSON file:

```json
{
  "id": "contact-form",
  "name": "Contact Form",
  "previewImageUrl": "/templates/forms/contact-form.png",
  ...
}
```

## Fallback Behavior

If a template doesn't have a `previewImageUrl`, the template gallery will fall back to displaying the emoji icon defined in the template's `icon` field.