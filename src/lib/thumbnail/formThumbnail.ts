/**
 * Form Thumbnail Generation
 *
 * Generates thumbnail images for forms using Canvas API for reliable rendering.
 * Creates consistent, readable thumbnails regardless of form configuration.
 */

import { FieldConfig } from '@/types/form';

export interface ThumbnailOptions {
  /** Output width in pixels */
  width?: number;
  /** Output height in pixels */
  height?: number;
  /** Primary accent color */
  primaryColor?: string;
}

export interface FormThumbnailData {
  formName: string;
  formDescription?: string;
  fields: FieldConfig[];
  primaryColor?: string;
}

/**
 * Create a thumbnail by drawing directly to canvas
 * This bypasses html2canvas issues and gives us full control
 */
export async function createFormThumbnailFromData(
  data: FormThumbnailData
): Promise<string | null> {
  try {
    const width = 400;
    const height = 240;
    const scale = 2; // For retina quality

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.error('[Thumbnail] Could not get canvas context');
      return null;
    }

    // Scale for retina
    ctx.scale(scale, scale);

    // Debug: Log field info
    console.log('[Thumbnail] Raw fields:', data.fields?.slice(0, 5).map(f => ({
      label: f.label,
      type: f.type,
      included: f.included,
      layout: f.layout,
    })));

    // Get only data fields (not layout fields) and limit to first 4
    const dataFields = data.fields
      ?.filter(f => {
        const isDataField = f.included && !f.layout && f.type !== 'section-header' && f.type !== 'divider' && f.type !== 'spacer' && f.type !== 'description';
        return isDataField;
      })
      .slice(0, 4) || [];

    console.log('[Thumbnail] Filtered dataFields:', dataFields.length, dataFields.map(f => f.label));

    const primaryColor = data.primaryColor || '#00ED64';
    const totalIncludedFields = data.fields?.filter(f => f.included && !f.layout).length || 0;
    const moreFieldsCount = Math.max(0, totalIncludedFields - 4);

    // Draw background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Draw accent bar at top
    ctx.fillStyle = primaryColor;
    roundRect(ctx, 0, 0, width, 8, { tl: 6, tr: 6, bl: 0, br: 0 });
    ctx.fill();

    // Draw form title
    ctx.fillStyle = '#1a1a1a';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const title = truncateText(ctx, data.formName || 'Untitled Form', width - 32);
    ctx.fillText(title, 16, 36);

    let yOffset = 48;

    // Draw description if present
    if (data.formDescription) {
      ctx.fillStyle = '#666666';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const desc = truncateText(ctx, data.formDescription, width - 32);
      ctx.fillText(desc, 16, yOffset);
      yOffset += 20;
    }

    yOffset += 8;

    // Draw fields
    const fieldHeight = 38;
    const fieldSpacing = 6;

    dataFields.forEach((field, index) => {
      if (yOffset + fieldHeight > height - 20) return; // Don't overflow

      // Field label
      ctx.fillStyle = '#333333';
      ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const label = truncateText(ctx, field.label, width - 50);
      ctx.fillText(label, 16, yOffset + 12);

      // Required asterisk
      if (field.required) {
        const labelWidth = ctx.measureText(label).width;
        ctx.fillStyle = '#dc2626';
        ctx.fillText(' *', 16 + labelWidth, yOffset + 12);
      }

      // Field input placeholder
      ctx.fillStyle = '#f5f5f5';
      roundRect(ctx, 16, yOffset + 16, width - 32, 20, 4);
      ctx.fill();

      // Field border
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1;
      roundRect(ctx, 16, yOffset + 16, width - 32, 20, 4);
      ctx.stroke();

      yOffset += fieldHeight + fieldSpacing;
    });

    // Draw "more fields" indicator if needed
    if (moreFieldsCount > 0 && yOffset + 20 <= height) {
      ctx.fillStyle = '#999999';
      ctx.font = 'italic 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`+${moreFieldsCount} more fields...`, 16, yOffset + 10);
    }

    // Draw subtle border around the whole thumbnail
    ctx.strokeStyle = '#e5e5e5';
    ctx.lineWidth = 1;
    roundRect(ctx, 0.5, 0.5, width - 1, height - 1, 6);
    ctx.stroke();

    // Convert to JPEG
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    console.log('[Thumbnail] Generated thumbnail, size:', dataUrl.length);

    return dataUrl;
  } catch (error) {
    console.error('[Thumbnail] Failed to create thumbnail:', error);
    return null;
  }
}

/**
 * Draw a rounded rectangle path
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number | { tl: number; tr: number; bl: number; br: number }
) {
  const r = typeof radius === 'number'
    ? { tl: radius, tr: radius, bl: radius, br: radius }
    : radius;

  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + width - r.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r.tr);
  ctx.lineTo(x + width, y + height - r.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r.br, y + height);
  ctx.lineTo(x + r.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.quadraticCurveTo(x, y, x + r.tl, y);
  ctx.closePath();
}

/**
 * Truncate text to fit within maxWidth, adding ellipsis if needed
 */
function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  const measured = ctx.measureText(text);
  if (measured.width <= maxWidth) {
    return text;
  }

  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}

/**
 * Convert base64 data URL to Blob for uploading
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binary = atob(parts[1]);
  const array = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }

  return new Blob([array], { type: mime });
}

/**
 * Upload thumbnail to server
 * Returns the URL of the uploaded thumbnail or null if failed
 */
export async function uploadThumbnail(
  dataUrl: string,
  formId: string,
  organizationId: string
): Promise<string | null> {
  console.log('[Thumbnail] uploadThumbnail called:', { formId, organizationId, dataUrlLength: dataUrl.length });
  try {
    const blob = dataUrlToBlob(dataUrl);
    console.log('[Thumbnail] Blob created, size:', blob.size);

    const formData = new FormData();
    formData.append('thumbnail', blob, `thumbnail-${formId}.jpg`);
    formData.append('formId', formId);
    formData.append('organizationId', organizationId);

    console.log('[Thumbnail] Sending POST to /api/forms/thumbnail');
    const response = await fetch('/api/forms/thumbnail', {
      method: 'POST',
      body: formData,
    });

    console.log('[Thumbnail] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Thumbnail] Upload failed:', response.status, errorText);
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[Thumbnail] Upload response:', data);
    return data.url || null;
  } catch (error) {
    console.error('[Thumbnail] Failed to upload:', error);
    return null;
  }
}

/**
 * Main function to generate and upload a form thumbnail
 * Call this after saving a form
 */
export async function generateFormThumbnail(
  formData: FormThumbnailData,
  formId: string,
  organizationId: string
): Promise<string | null> {
  console.log('[Thumbnail] generateFormThumbnail called with:', {
    formName: formData.formName,
    formId,
    organizationId,
    fieldCount: formData.fields?.length,
  });

  // Create the thumbnail from form data
  const dataUrl = await createFormThumbnailFromData(formData);
  if (!dataUrl) {
    console.error('[Thumbnail] createFormThumbnailFromData returned null');
    return null;
  }

  console.log('[Thumbnail] dataUrl created, length:', dataUrl.length);

  // Upload to server
  const result = await uploadThumbnail(dataUrl, formId, organizationId);
  console.log('[Thumbnail] uploadThumbnail result:', result ? 'success' : 'failed');
  return result;
}
