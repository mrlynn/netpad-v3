/**
 * Workflow Thumbnail Generation
 *
 * Generates thumbnail images for workflows using Canvas API.
 * Creates a visual representation of the workflow nodes and connections.
 */

import { WorkflowNode, WorkflowEdge } from '@/types/workflow';

export interface ThumbnailOptions {
  /** Output width in pixels */
  width?: number;
  /** Output height in pixels */
  height?: number;
  /** Primary accent color */
  primaryColor?: string;
}

export interface WorkflowThumbnailData {
  workflowName: string;
  workflowDescription?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  primaryColor?: string;
  status?: 'draft' | 'active' | 'paused' | 'archived';
}

// Node colors matching the workflow editor
const NODE_COLORS: Record<string, string> = {
  'manual-trigger': '#4CAF50',
  'form-trigger': '#4CAF50',
  'webhook-trigger': '#4CAF50',
  'schedule-trigger': '#4CAF50',
  'conditional': '#9C27B0',
  'switch': '#9C27B0',
  'loop': '#9C27B0',
  'delay': '#9C27B0',
  'http-request': '#FF9800',
  'mongodb-query': '#00897B',
  'mongodb-write': '#00897B',
  'email-send': '#2196F3',
  'notification': '#2196F3',
  'transform': '#607D8B',
  'filter': '#607D8B',
  'merge': '#607D8B',
  'ai-prompt': '#E91E63',
  'ai-classify': '#E91E63',
  'ai-extract': '#E91E63',
  'code': '#795548',
  'sticky-note': '#FFF9C4',
};

// Node icons (simplified representation)
const NODE_ICONS: Record<string, string> = {
  'manual-trigger': '▶',
  'form-trigger': '📝',
  'webhook-trigger': '🔗',
  'schedule-trigger': '⏰',
  'conditional': '❓',
  'switch': '🔀',
  'loop': '🔁',
  'delay': '⏳',
  'http-request': '🌐',
  'mongodb-query': '💾',
  'mongodb-write': '💾',
  'email-send': '✉️',
  'notification': '🔔',
  'transform': '🔄',
  'filter': '🔍',
  'merge': '🔗',
  'ai-prompt': '🤖',
  'ai-classify': '🤖',
  'ai-extract': '🤖',
  'code': '💻',
  'sticky-note': '📄',
};

/**
 * Create a thumbnail by drawing the workflow canvas
 */
export async function createWorkflowThumbnailFromData(
  data: WorkflowThumbnailData
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
      console.error('[Workflow Thumbnail] Could not get canvas context');
      return null;
    }

    // Scale for retina
    ctx.scale(scale, scale);

    const primaryColor = data.primaryColor || '#9C27B0';

    // Draw background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Draw accent bar at top
    ctx.fillStyle = primaryColor;
    roundRect(ctx, 0, 0, width, 8, { tl: 6, tr: 6, bl: 0, br: 0 });
    ctx.fill();

    // Draw workflow title
    ctx.fillStyle = '#1a1a1a';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const title = truncateText(ctx, data.workflowName || 'Untitled Workflow', width - 32);
    ctx.fillText(title, 16, 36);

    let yOffset = 48;

    // Draw description if present
    if (data.workflowDescription) {
      ctx.fillStyle = '#666666';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const desc = truncateText(ctx, data.workflowDescription, width - 32);
      ctx.fillText(desc, 16, yOffset);
      yOffset += 20;
    }

    yOffset += 8;

    // Calculate bounds of all nodes to center them
    if (data.nodes && data.nodes.length > 0) {
      const nodeWidth = 80;
      const nodeHeight = 50;
      const nodeSpacing = 20;
      const padding = 16;

      // Filter out sticky notes for the main visualization
      const visualNodes = data.nodes.filter(n => n.type !== 'sticky-note').slice(0, 6);
      
      if (visualNodes.length > 0) {
        // Calculate layout - simple horizontal flow for thumbnail
        const startX = padding;
        const startY = yOffset;
        const maxNodesPerRow = 3;
        const rows = Math.ceil(visualNodes.length / maxNodesPerRow);
        const availableHeight = height - startY - 20;
        const rowHeight = rows > 1 ? (availableHeight - (rows - 1) * nodeSpacing) / rows : availableHeight;

        visualNodes.forEach((node, index) => {
          const row = Math.floor(index / maxNodesPerRow);
          const col = index % maxNodesPerRow;
          const x = startX + col * (nodeWidth + nodeSpacing);
          const y = startY + row * rowHeight;

          // Get node color
          const nodeColor = NODE_COLORS[node.type] || '#9C27B0';
          const nodeIcon = NODE_ICONS[node.type] || '⚙️';

          // Draw node background
          ctx.fillStyle = nodeColor;
          ctx.globalAlpha = 0.1;
          roundRect(ctx, x, y, nodeWidth, nodeHeight, 8);
          ctx.fill();
          ctx.globalAlpha = 1.0;

          // Draw node border
          ctx.strokeStyle = nodeColor;
          ctx.lineWidth = 2;
          roundRect(ctx, x, y, nodeWidth, nodeHeight, 8);
          ctx.stroke();

          // Draw node icon
          ctx.fillStyle = nodeColor;
          ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(nodeIcon, x + nodeWidth / 2, y + 18);

          // Draw node label
          ctx.fillStyle = '#333333';
          ctx.font = '500 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          const label = truncateText(ctx, node.label || node.type, nodeWidth - 8);
          const labelWidth = ctx.measureText(label).width;
          ctx.fillText(label, x + nodeWidth / 2, y + nodeHeight - 12);

          // Draw connection arrow to next node (if not last in row and not last node)
          if (col < maxNodesPerRow - 1 && index < visualNodes.length - 1) {
            const nextX = x + nodeWidth + nodeSpacing;
            const arrowX = x + nodeWidth;
            const arrowY = y + nodeHeight / 2;
            const arrowEndX = nextX;
            
            ctx.strokeStyle = '#cccccc';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(arrowEndX - 8, arrowY);
            // Draw arrowhead
            ctx.lineTo(arrowEndX - 12, arrowY - 3);
            ctx.moveTo(arrowEndX - 8, arrowY);
            ctx.lineTo(arrowEndX - 12, arrowY + 3);
            ctx.stroke();
          }
        });

        // Draw "more nodes" indicator if there are more than 6 nodes
        if (data.nodes.length > 6) {
          const moreCount = data.nodes.length - 6;
          ctx.fillStyle = '#999999';
          ctx.font = 'italic 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`+${moreCount} more nodes...`, padding, height - 12);
        }
      } else {
        // No nodes - show empty state
        ctx.fillStyle = '#cccccc';
        ctx.font = 'italic 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No nodes yet', width / 2, yOffset + 40);
      }
    } else {
      // No nodes - show empty state
      ctx.fillStyle = '#cccccc';
      ctx.font = 'italic 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No nodes yet', width / 2, yOffset + 40);
    }

    // Draw subtle border around the whole thumbnail
    ctx.strokeStyle = '#e5e5e5';
    ctx.lineWidth = 1;
    roundRect(ctx, 0.5, 0.5, width - 1, height - 1, 6);
    ctx.stroke();

    // Convert to JPEG
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    console.log('[Workflow Thumbnail] Generated thumbnail, size:', dataUrl.length);

    return dataUrl;
  } catch (error) {
    console.error('[Workflow Thumbnail] Failed to create thumbnail:', error);
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
export async function uploadWorkflowThumbnail(
  dataUrl: string,
  workflowId: string,
  organizationId: string
): Promise<string | null> {
  console.log('[Workflow Thumbnail] uploadWorkflowThumbnail called:', { workflowId, organizationId, dataUrlLength: dataUrl.length });
  try {
    const blob = dataUrlToBlob(dataUrl);
    console.log('[Workflow Thumbnail] Blob created, size:', blob.size);

    const formData = new FormData();
    formData.append('thumbnail', blob, `workflow-thumbnail-${workflowId}.jpg`);
    formData.append('workflowId', workflowId);
    formData.append('organizationId', organizationId);

    console.log('[Workflow Thumbnail] Sending POST to /api/workflows/thumbnail');
    const response = await fetch('/api/workflows/thumbnail', {
      method: 'POST',
      body: formData,
    });

    console.log('[Workflow Thumbnail] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Workflow Thumbnail] Upload failed:', response.status, errorText);
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[Workflow Thumbnail] Upload response:', data);
    return data.url || null;
  } catch (error) {
    console.error('[Workflow Thumbnail] Failed to upload:', error);
    return null;
  }
}

/**
 * Main function to generate and upload a workflow thumbnail
 * Call this after saving a workflow
 */
export async function generateWorkflowThumbnail(
  workflowData: WorkflowThumbnailData,
  workflowId: string,
  organizationId: string
): Promise<string | null> {
  console.log('[Workflow Thumbnail] generateWorkflowThumbnail called with:', {
    workflowName: workflowData.workflowName,
    workflowId,
    organizationId,
    nodeCount: workflowData.nodes?.length,
  });

  // Create the thumbnail from workflow data
  const dataUrl = await createWorkflowThumbnailFromData(workflowData);
  if (!dataUrl) {
    console.error('[Workflow Thumbnail] createWorkflowThumbnailFromData returned null');
    return null;
  }

  console.log('[Workflow Thumbnail] dataUrl created, length:', dataUrl.length);

  // Upload to server
  const result = await uploadWorkflowThumbnail(dataUrl, workflowId, organizationId);
  console.log('[Workflow Thumbnail] uploadWorkflowThumbnail result:', result ? 'success' : 'failed');
  return result;
}
