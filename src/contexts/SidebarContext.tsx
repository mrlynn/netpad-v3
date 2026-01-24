'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';

// ============================================
// Constants
// ============================================

const STORAGE_KEY = 'netpad_sidebar_collapsed';

// ============================================
// Types
// ============================================

interface SidebarContextValue {
  isCollapsed: boolean;
  isAutoCollapsed: boolean;
  toggle: () => void;
  expand: () => void;
  collapse: () => void;
}

// ============================================
// Helpers
// ============================================

/**
 * Detects if the current route is an editor route that should trigger auto-collapse
 */
const isEditorRoute = (pathname: string): boolean => {
  // Form editor: /apps/[slug]/forms/[id]/edit
  if (/^\/apps\/[^/]+\/forms\/[^/]+\/edit/.test(pathname)) return true;
  // Workflow editor: /apps/[slug]/workflows/[id] (not the list or /new)
  if (/^\/apps\/[^/]+\/workflows\/[^/]+$/.test(pathname) &&
      !pathname.endsWith('/workflows') &&
      !pathname.endsWith('/new')) return true;
  return false;
};

/**
 * Safe localStorage getter
 */
const getFromStorage = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

/**
 * Safe localStorage setter
 */
const setToStorage = (key: string, value: unknown): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors
  }
};

// ============================================
// Context
// ============================================

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined);

// ============================================
// Provider
// ============================================

interface SidebarProviderProps {
  children: React.ReactNode;
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  const pathname = usePathname();

  // Track if collapse was triggered by editor route
  const [isAutoCollapsed, setIsAutoCollapsed] = useState(false);

  // User's manual preference (null = use auto behavior)
  const [manualOverride, setManualOverride] = useState<boolean | null>(null);

  // The actual collapsed state
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Track previous pathname for route change detection
  const prevPathnameRef = useRef<string | null>(null);

  // Track if we've initialized from localStorage
  const initializedRef = useRef(false);

  // Initialize from localStorage on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const storedPreference = getFromStorage<boolean | null>(STORAGE_KEY, null);
    if (storedPreference !== null) {
      setManualOverride(storedPreference);
      setIsCollapsed(storedPreference);
    }
  }, []);

  // Handle route changes for auto-collapse
  useEffect(() => {
    if (!pathname || prevPathnameRef.current === pathname) return;

    const wasEditor = prevPathnameRef.current ? isEditorRoute(prevPathnameRef.current) : false;
    const isEditor = isEditorRoute(pathname);

    prevPathnameRef.current = pathname;

    // Only apply auto-collapse if user hasn't manually overridden
    if (manualOverride !== null) return;

    if (isEditor && !wasEditor) {
      // Entering editor - auto collapse
      setIsCollapsed(true);
      setIsAutoCollapsed(true);
    } else if (!isEditor && wasEditor && isAutoCollapsed) {
      // Leaving editor after auto-collapse - expand
      setIsCollapsed(false);
      setIsAutoCollapsed(false);
    }
  }, [pathname, manualOverride, isAutoCollapsed]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+B or Ctrl+B to toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        // Don't toggle if user is typing in an input
        if (e.target instanceof HTMLInputElement ||
            e.target instanceof HTMLTextAreaElement ||
            (e.target instanceof HTMLElement && e.target.isContentEditable)) {
          return;
        }
        e.preventDefault();
        toggle();
      }
      // Alternative: Cmd+\ or Ctrl+\
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        toggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCollapsed]);

  const toggle = useCallback(() => {
    setIsCollapsed(prev => {
      const newValue = !prev;
      setManualOverride(newValue);
      setToStorage(STORAGE_KEY, newValue);
      setIsAutoCollapsed(false); // Clear auto-collapse since user manually toggled
      return newValue;
    });
  }, []);

  const expand = useCallback(() => {
    setIsCollapsed(false);
    setManualOverride(false);
    setToStorage(STORAGE_KEY, false);
    setIsAutoCollapsed(false);
  }, []);

  const collapse = useCallback(() => {
    setIsCollapsed(true);
    setManualOverride(true);
    setToStorage(STORAGE_KEY, true);
    setIsAutoCollapsed(false);
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        isAutoCollapsed,
        toggle,
        expand,
        collapse,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useSidebar(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

/**
 * Safe hook that returns default values if used outside provider
 * Useful for components that may render outside the sidebar context
 */
export function useSidebarSafe(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    return {
      isCollapsed: false,
      isAutoCollapsed: false,
      toggle: () => {},
      expand: () => {},
      collapse: () => {},
    };
  }
  return context;
}
