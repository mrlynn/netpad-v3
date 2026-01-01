'use client';

import { useState, useEffect, useCallback } from 'react';

const WELCOME_SEEN_KEY = 'netpad_welcome_seen';

/**
 * Hook to manage the welcome modal state for first-time users.
 * Uses localStorage to track whether the user has seen the welcome modal.
 */
export function useWelcomeModal() {
  const [showWelcome, setShowWelcome] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem(WELCOME_SEEN_KEY) === 'true';
    setShowWelcome(!hasSeenWelcome);
    setIsInitialized(true);
  }, []);

  // Dismiss the welcome modal and save to localStorage
  const dismissWelcome = useCallback(() => {
    localStorage.setItem(WELCOME_SEEN_KEY, 'true');
    setShowWelcome(false);
  }, []);

  // Reset welcome state (useful for testing)
  const resetWelcome = useCallback(() => {
    localStorage.removeItem(WELCOME_SEEN_KEY);
    setShowWelcome(true);
  }, []);

  return {
    showWelcome: isInitialized && showWelcome,
    dismissWelcome,
    resetWelcome,
    isInitialized,
  };
}
