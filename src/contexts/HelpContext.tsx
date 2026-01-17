'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { HelpTopic, HelpTopicId } from '@/types/help';
import { HelpModal } from '@/components/Help/HelpModal';
import { HelpSearchModal } from '@/components/Help/HelpSearchModal';
import { helpTopics } from '@/lib/helpContent';
import { useAuth } from './AuthContext';

interface HelpContextValue {
  openHelp: (topicId: HelpTopicId) => void;
  closeHelp: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  currentTopic: HelpTopic | null;
  isOpen: boolean;
  isSearchOpen: boolean;
  setStartTourCallback: (callback: (() => void) | null) => void;
}

const HelpContext = createContext<HelpContextValue | null>(null);

export function HelpProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [currentTopic, setCurrentTopic] = useState<HelpTopic | null>(null);
  const [startTourCallback, setStartTourCallbackState] = useState<(() => void) | null>(null);

  // Check if user is a platform admin
  const isPlatformAdmin = user?.platformRole === 'admin';

  const setStartTourCallback = useCallback((callback: (() => void) | null) => {
    setStartTourCallbackState(() => callback);
  }, []);

  const openHelp = useCallback((topicId: HelpTopicId) => {
    const topic = helpTopics[topicId];
    if (topic) {
      setCurrentTopic(topic);
      setIsSearchOpen(false); // Close search if open
      setIsOpen(true);
    } else {
      console.warn(`Help topic not found: ${topicId}`);
    }
  }, []);

  const closeHelp = useCallback(() => {
    setIsOpen(false);
  }, []);

  const openSearch = useCallback(() => {
    setIsOpen(false); // Close help modal if open
    setIsSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
  }, []);

  const handleNavigateToTopic = useCallback((topicId: string) => {
    const topic = helpTopics[topicId as HelpTopicId];
    if (topic) {
      setCurrentTopic(topic);
    }
  }, []);

  const handleSelectFromSearch = useCallback((topicId: HelpTopicId) => {
    const topic = helpTopics[topicId];
    if (topic) {
      setCurrentTopic(topic);
      setIsSearchOpen(false);
      setIsOpen(true);
    }
  }, []);

  // Global keyboard shortcut: Cmd/Ctrl + / to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+/ or Ctrl+/ to open help search
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        if (isSearchOpen) {
          closeSearch();
        } else {
          openSearch();
        }
      }

      // Also support Cmd+Shift+? (Cmd+Shift+/) as alternative
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === '?') {
        e.preventDefault();
        if (isSearchOpen) {
          closeSearch();
        } else {
          openSearch();
        }
      }

      // F1 key for help (common convention)
      if (e.key === 'F1') {
        e.preventDefault();
        if (isSearchOpen) {
          closeSearch();
        } else {
          openSearch();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, openSearch, closeSearch]);

  return (
    <HelpContext.Provider
      value={{
        openHelp,
        closeHelp,
        openSearch,
        closeSearch,
        currentTopic,
        isOpen,
        isSearchOpen,
        setStartTourCallback,
      }}
    >
      {children}
      <HelpModal
        open={isOpen}
        onClose={closeHelp}
        topic={currentTopic}
        onNavigateToTopic={handleNavigateToTopic}
        onOpenSearch={openSearch}
      />
      <HelpSearchModal
        open={isSearchOpen}
        onClose={closeSearch}
        onSelectTopic={handleSelectFromSearch}
        onStartTour={startTourCallback || undefined}
        showAdminTopics={isPlatformAdmin}
      />
    </HelpContext.Provider>
  );
}

export function useHelp() {
  const context = useContext(HelpContext);
  if (!context) {
    throw new Error('useHelp must be used within a HelpProvider');
  }
  return context;
}
