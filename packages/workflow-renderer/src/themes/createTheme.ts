/**
 * Theme creation utilities for @netpad/workflow-renderer
 */

import type { RendererTheme, PartialTheme } from '../types/theme';
import { darkTheme } from './dark';

/**
 * Deep merge two objects
 */
function deepMerge<T>(target: T, source: Partial<T>): T {
  const output = { ...target } as T;

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key as keyof typeof source];
      const targetValue = target[key as keyof T];

      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (output as any)[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        );
      } else if (sourceValue !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (output as any)[key] = sourceValue;
      }
    }
  }

  return output;
}

/**
 * Create a custom theme by extending a base theme
 *
 * @example
 * ```tsx
 * const customTheme = createTheme({
 *   nodeCategories: {
 *     trigger: '#00FF00', // Custom trigger color
 *   },
 * });
 * ```
 */
export function createTheme(overrides: PartialTheme, base: RendererTheme = darkTheme): RendererTheme {
  return deepMerge<RendererTheme>(base, overrides as Partial<RendererTheme>);
}

/**
 * Get CSS variables from a theme
 */
export function getThemeCSSVariables(theme: RendererTheme): Record<string, string> {
  return {
    '--wr-canvas-bg': theme.canvas.background,
    '--wr-canvas-pattern': theme.canvas.backgroundPattern,
    '--wr-node-bg': theme.node.background,
    '--wr-node-border': theme.node.border,
    '--wr-node-radius': `${theme.node.borderRadius}px`,
    '--wr-node-text': theme.node.text,
    '--wr-node-text-secondary': theme.node.textSecondary,
    '--wr-node-shadow': theme.node.shadow,
    '--wr-cat-trigger': theme.nodeCategories.trigger,
    '--wr-cat-logic': theme.nodeCategories.logic,
    '--wr-cat-data': theme.nodeCategories.data,
    '--wr-cat-action': theme.nodeCategories.action,
    '--wr-cat-ai': theme.nodeCategories.ai,
    '--wr-cat-utility': theme.nodeCategories.utility,
    '--wr-edge-default': theme.edge.default,
    '--wr-edge-selected': theme.edge.selected,
    '--wr-edge-animated': theme.edge.animated,
    '--wr-edge-error': theme.edge.error,
    '--wr-edge-label': theme.edge.label,
    '--wr-edge-label-bg': theme.edge.labelBackground,
    '--wr-controls-bg': theme.controls.background,
    '--wr-controls-border': theme.controls.border,
    '--wr-controls-icon': theme.controls.icon,
    '--wr-controls-icon-hover': theme.controls.iconHover,
    '--wr-minimap-bg': theme.minimap.background,
    '--wr-minimap-mask': theme.minimap.mask,
    '--wr-minimap-node': theme.minimap.node,
    '--wr-status-idle': theme.status.idle,
    '--wr-status-running': theme.status.running,
    '--wr-status-success': theme.status.success,
    '--wr-status-error': theme.status.error,
  };
}
