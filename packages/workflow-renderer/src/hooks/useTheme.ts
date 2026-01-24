/**
 * Theme hook for @netpad/workflow-renderer
 */

import { createContext, useContext } from 'react';
import type { RendererTheme } from '../types/theme';
import { darkTheme } from '../themes/dark';

/**
 * Theme context
 */
export const ThemeContext = createContext<RendererTheme>(darkTheme);

/**
 * Hook to access the current theme
 */
export function useRendererTheme(): RendererTheme {
  return useContext(ThemeContext);
}
