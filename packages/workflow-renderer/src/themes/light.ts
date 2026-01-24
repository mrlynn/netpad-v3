/**
 * Light theme for @netpad/workflow-renderer
 * Clean light mode with NetPad green accents
 */

import type { RendererTheme } from '../types/theme';

export const lightTheme: RendererTheme = {
  name: 'light',

  canvas: {
    background: '#f8faf9',
    backgroundPattern: 'rgba(0, 104, 74, 0.05)',
  },

  node: {
    background: '#ffffff',
    border: '#e5e7eb',
    borderRadius: 8,
    text: '#1f2937',
    textSecondary: '#6b7280',
    shadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  },

  nodeCategories: {
    trigger: '#059669',   // Green (darker for light bg)
    logic: '#D97706',     // Amber
    data: '#2563EB',      // Blue
    action: '#7C3AED',    // Purple
    ai: '#DB2777',        // Pink
    utility: '#475569',   // Slate
  },

  edge: {
    default: '#00684A',
    selected: '#059669',
    animated: '#00684A',
    error: '#DC2626',
    label: '#1f2937',
    labelBackground: '#ffffff',
  },

  controls: {
    background: '#ffffff',
    border: '#e5e7eb',
    icon: '#6b7280',
    iconHover: '#1f2937',
  },

  minimap: {
    background: '#f8faf9',
    mask: 'rgba(255, 255, 255, 0.7)',
    node: '#00684A',
  },

  status: {
    idle: '#9ca3af',
    running: '#2563EB',
    success: '#059669',
    error: '#DC2626',
  },
};
