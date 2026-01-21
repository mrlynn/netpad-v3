/**
 * Hook to warn users about unsaved changes when navigating away
 *
 * Usage:
 * const { isDirty, setIsDirty, confirmNavigation } = useUnsavedChanges();
 *
 * // Mark as dirty when changes are made
 * setIsDirty(true);
 *
 * // Mark as clean after saving
 * setIsDirty(false);
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface UseUnsavedChangesOptions {
  /** Message to show in browser confirmation dialog */
  message?: string;
  /** Callback when user confirms navigation */
  onConfirmNavigation?: () => void;
  /** Callback when user cancels navigation */
  onCancelNavigation?: () => void;
}

interface UseUnsavedChangesReturn {
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Set the dirty state */
  setIsDirty: (dirty: boolean) => void;
  /** Mark specific changes (incremental tracking) */
  markDirty: () => void;
  /** Mark as clean (after save) */
  markClean: () => void;
  /** Manually trigger confirmation if needed */
  confirmNavigation: (callback: () => void) => boolean;
}

export function useUnsavedChanges(
  options: UseUnsavedChangesOptions = {}
): UseUnsavedChangesReturn {
  const {
    message = 'You have unsaved changes. Are you sure you want to leave?',
  } = options;

  const [isDirty, setIsDirty] = useState(false);
  const pathname = usePathname();
  const previousPathRef = useRef(pathname);

  // Handle browser navigation (back/forward, close tab)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, message]);

  // Track pathname changes for potential warning
  useEffect(() => {
    if (previousPathRef.current !== pathname) {
      previousPathRef.current = pathname;
    }
  }, [pathname]);

  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  const markClean = useCallback(() => {
    setIsDirty(false);
  }, []);

  // Manual confirmation trigger for programmatic navigation
  const confirmNavigation = useCallback(
    (callback: () => void): boolean => {
      if (!isDirty) {
        callback();
        return true;
      }

      const confirmed = window.confirm(message);
      if (confirmed) {
        setIsDirty(false);
        callback();
        return true;
      }
      return false;
    },
    [isDirty, message]
  );

  return {
    isDirty,
    setIsDirty,
    markDirty,
    markClean,
    confirmNavigation,
  };
}

export default useUnsavedChanges;
