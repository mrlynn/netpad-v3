/**
 * Global Keyboard Shortcuts Hook
 *
 * Provides a reusable hook for registering global keyboard shortcuts.
 * Handles platform differences (Mac vs Windows/Linux) and prevents conflicts.
 */

import { useEffect, useCallback, RefObject } from 'react';

// ============================================
// Types
// ============================================

export interface KeyboardShortcut {
  /**
   * Key to listen for (e.g., 'k', 'Enter', 'Escape')
   * Use lowercase for letter keys
   */
  key: string;

  /**
   * Whether to require Cmd (Mac) or Ctrl (Windows/Linux)
   */
  metaOrCtrl?: boolean;

  /**
   * Whether to require Shift
   */
  shift?: boolean;

  /**
   * Whether to require Alt/Option
   */
  alt?: boolean;

  /**
   * Callback when shortcut is triggered
   */
  handler: (event: KeyboardEvent) => void;

  /**
   * Whether to prevent default browser behavior
   * @default true
   */
  preventDefault?: boolean;

  /**
   * Whether to disable the shortcut when user is typing in an input/textarea
   * @default true
   */
  disableInInputs?: boolean;

  /**
   * Optional description for help/documentation
   */
  description?: string;
}

export interface UseKeyboardShortcutsOptions {
  /**
   * Array of shortcuts to register
   */
  shortcuts: KeyboardShortcut[];

  /**
   * Whether shortcuts are enabled
   * @default true
   */
  enabled?: boolean;

  /**
   * Optional ref to an element - shortcuts only work when this element or its children have focus
   * If not provided, shortcuts work globally
   */
  scopeRef?: RefObject<HTMLElement>;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Check if user is typing in an input field
 */
function isInputElement(element: HTMLElement | null): boolean {
  if (!element) return false;

  const tagName = element.tagName.toLowerCase();
  const isInput = tagName === 'input' || tagName === 'textarea';
  const isContentEditable = element.contentEditable === 'true';

  // Check if it's a search input (often we want shortcuts to work in search)
  const isSearchInput = element.getAttribute('type') === 'search' ||
    element.getAttribute('data-shortcuts-enabled') === 'true';

  return (isInput || isContentEditable) && !isSearchInput;
}

/**
 * Check if a keyboard event matches a shortcut definition
 */
function matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
  // Normalize key comparison (case-insensitive for letter keys)
  const eventKey = event.key.toLowerCase();
  const shortcutKey = shortcut.key.toLowerCase();

  if (eventKey !== shortcutKey) {
    return false;
  }

  // Check meta/ctrl requirement
  if (shortcut.metaOrCtrl) {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.platform);
    const hasMetaOrCtrl = isMac ? event.metaKey : event.ctrlKey;
    if (!hasMetaOrCtrl) {
      return false;
    }
  } else {
    // If metaOrCtrl is not required, ensure it's not pressed
    if (event.metaKey || event.ctrlKey) {
      return false;
    }
  }

  // Check shift requirement
  if (shortcut.shift !== undefined) {
    if (event.shiftKey !== shortcut.shift) {
      return false;
    }
  }

  // Check alt requirement
  if (shortcut.alt !== undefined) {
    if (event.altKey !== shortcut.alt) {
      return false;
    }
  }

  return true;
}

// ============================================
// Hook
// ============================================

/**
 * Register global keyboard shortcuts
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts({
 *   shortcuts: [
 *     {
 *       key: 'k',
 *       metaOrCtrl: true,
 *       handler: () => openAppSwitcher(),
 *       description: 'Open application switcher',
 *     },
 *     {
 *       key: 'Escape',
 *       handler: () => closeModal(),
 *     },
 *   ],
 * });
 * ```
 */
export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
  scopeRef,
}: UseKeyboardShortcutsOptions): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Check if event is within scope
      if (scopeRef?.current) {
        const activeElement = document.activeElement as HTMLElement;
        if (!scopeRef.current.contains(activeElement)) {
          return;
        }
      }

      // Find matching shortcut
      const matchingShortcut = shortcuts.find(shortcut =>
        matchesShortcut(event, shortcut)
      );

      if (!matchingShortcut) {
        return;
      }

      // Check if we should disable in inputs
      if (matchingShortcut.disableInInputs !== false) {
        const activeElement = document.activeElement as HTMLElement;
        if (isInputElement(activeElement)) {
          return;
        }
      }

      // Prevent default if requested
      if (matchingShortcut.preventDefault !== false) {
        event.preventDefault();
        event.stopPropagation();
      }

      // Call handler
      matchingShortcut.handler(event);
    },
    [shortcuts, enabled, scopeRef]
  );

  useEffect(() => {
    if (!enabled || shortcuts.length === 0) {
      return;
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled, shortcuts.length]);
}

// ============================================
// Predefined Shortcuts
// ============================================

/**
 * Common keyboard shortcuts used throughout the app
 * These can be imported and used as building blocks
 */
export const COMMON_SHORTCUTS = {
  /**
   * Cmd/Ctrl + K - Common for command palette / switcher
   */
  commandPalette: (handler: () => void): KeyboardShortcut => ({
    key: 'k',
    metaOrCtrl: true,
    handler: () => handler(),
    description: 'Open command palette',
  }),

  /**
   * Escape - Close modals / dialogs
   */
  escape: (handler: () => void): KeyboardShortcut => ({
    key: 'Escape',
    handler: () => handler(),
    description: 'Close modal / dialog',
  }),

  /**
   * Cmd/Ctrl + / - Show keyboard shortcuts help
   */
  showShortcuts: (handler: () => void): KeyboardShortcut => ({
    key: '/',
    metaOrCtrl: true,
    handler: () => handler(),
    description: 'Show keyboard shortcuts',
  }),

  /**
   * Cmd/Ctrl + S - Save
   */
  save: (handler: () => void): KeyboardShortcut => ({
    key: 's',
    metaOrCtrl: true,
    handler: () => handler(),
    description: 'Save',
  }),

  /**
   * Cmd/Ctrl + N - New
   */
  new: (handler: () => void): KeyboardShortcut => ({
    key: 'n',
    metaOrCtrl: true,
    handler: () => handler(),
    description: 'Create new',
  }),
} as const;
