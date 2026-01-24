/**
 * Dark theme for @netpad/workflow-renderer
 * Matches NetPad platform dark mode with signature green accents
 */

import type { RendererTheme } from '../types/theme';

export const darkTheme: RendererTheme = {
  name: 'dark',

  canvas: {
    background: '#0a0e14',
    backgroundPattern: 'rgba(255, 255, 255, 0.03)',
  },

  node: {
    background: '#1a1f2e',
    border: '#2d3548',
    borderRadius: 8,
    text: '#f0f0f0',
    textSecondary: '#9ca3af',
    shadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
  },

  nodeCategories: {
    trigger: '#10B981',   // Green
    logic: '#F59E0B',     // Amber
    data: '#3B82F6',      // Blue
    action: '#8B5CF6',    // Purple
    ai: '#EC4899',        // Pink
    utility: '#64748B',   // Slate
  },

  edge: {
    default: '#00ED64',
    selected: '#00FF7F',
    animated: '#00ED64',
    error: '#EF4444',
    label: '#f0f0f0',
    labelBackground: '#1a1f2e',
  },

  controls: {
    background: '#1a1f2e',
    border: '#2d3548',
    icon: '#9ca3af',
    iconHover: '#f0f0f0',
  },

  minimap: {
    background: '#0a0e14',
    mask: 'rgba(0, 0, 0, 0.6)',
    node: '#00ED64',
  },

  status: {
    idle: '#64748B',
    running: '#3B82F6',
    success: '#10B981',
    error: '#EF4444',
  },
};
