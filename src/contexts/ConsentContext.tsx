'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  ConsentPreferences,
  ConsentModalState,
  CONSENT_VERSION,
  COOKIE_DEFINITIONS,
  CookieCategory,
} from '@/types/consent';

// Cookie name for storing consent locally
const CONSENT_COOKIE_NAME = 'mdb_cookie_consent';
const VISITOR_ID_COOKIE_NAME = 'mdb_visitor_id';

interface ConsentContextValue {
  // Current consent state
  preferences: ConsentPreferences;
  hasConsented: boolean;
  isLoading: boolean;
  visitorId: string | null;

  // Modal state
  modalState: ConsentModalState;
  showBanner: () => void;
  showPreferences: () => void;
  hideModal: () => void;

  // Consent actions
  acceptAll: () => Promise<void>;
  rejectAll: () => Promise<void>;
  savePreferences: (prefs: Omit<ConsentPreferences, 'essential'>) => Promise<void>;

  // Utility functions
  hasConsent: (category: CookieCategory) => boolean;
  getCookiesForCategory: (category: CookieCategory) => typeof COOKIE_DEFINITIONS;
}

const defaultPreferences: ConsentPreferences = {
  essential: true,
  functional: false,
  analytics: false,
  marketing: false,
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

// Generate a simple visitor ID
function generateVisitorId(): string {
  return 'v_' + Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
}

// Cookie utilities
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

function setCookie(name: string, value: string, days: number): void {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax${
    window.location.protocol === 'https:' ? '; Secure' : ''
  }`;
}

function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

// Parse stored consent from cookie
function parseStoredConsent(): {
  preferences: ConsentPreferences;
  version: string;
} | null {
  const stored = getCookie(CONSENT_COOKIE_NAME);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(stored));
    return {
      preferences: {
        essential: true,
        functional: !!parsed.functional,
        analytics: !!parsed.analytics,
        marketing: !!parsed.marketing,
      },
      version: parsed.version || '0.0.0',
    };
  } catch {
    return null;
  }
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<ConsentPreferences>(defaultPreferences);
  const [hasConsented, setHasConsented] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [modalState, setModalState] = useState<ConsentModalState>('hidden');
  const [visitorId, setVisitorId] = useState<string | null>(null);

  // Initialize consent state on mount
  useEffect(() => {
    // Check if page is embedded - if so, suppress cookie consent banner
    const isEmbedded = typeof window !== 'undefined' && 
      (new URLSearchParams(window.location.search).get('embedded') === 'true' ||
       window.self !== window.top); // Also check if in iframe
    
    if (isEmbedded) {
      // For embeds, use minimal consent (essential only) and don't show banner
      setPreferences({
        essential: true,
        functional: false,
        analytics: false,
        marketing: false,
      });
      setHasConsented(true);
      setModalState('hidden');
      setIsLoading(false);
      return;
    }

    // Get or create visitor ID
    let vid = getCookie(VISITOR_ID_COOKIE_NAME);
    if (!vid) {
      vid = generateVisitorId();
      setCookie(VISITOR_ID_COOKIE_NAME, vid, 365);
    }
    setVisitorId(vid);

    // Check for stored consent
    const stored = parseStoredConsent();

    if (stored) {
      // Check if consent version matches
      if (stored.version === CONSENT_VERSION) {
        setPreferences(stored.preferences);
        setHasConsented(true);
      } else {
        // Policy changed, need re-consent
        setModalState('banner');
      }
    } else {
      // No consent yet, show banner
      // Small delay to prevent flash
      setTimeout(() => {
        setModalState('banner');
      }, 1000);
    }

    // Check Do Not Track
    const dnt = navigator.doNotTrack === '1' ||
      (window as any).doNotTrack === '1';
    if (dnt && !stored) {
      // Respect DNT by defaulting to minimal cookies
      console.log('[Consent] Do Not Track detected, using minimal cookies');
    }

    setIsLoading(false);
  }, []);

  // Save consent to server and cookie
  const saveToServer = useCallback(async (
    prefs: Omit<ConsentPreferences, 'essential'>,
    source: 'banner' | 'settings'
  ) => {
    try {
      // Save to cookie first for immediate effect
      const cookieValue = encodeURIComponent(JSON.stringify({
        ...prefs,
        version: CONSENT_VERSION,
      }));
      setCookie(CONSENT_COOKIE_NAME, cookieValue, 365);

      // Save to server for audit trail
      await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: prefs,
          source,
          visitorId,
        }),
      });
    } catch (error) {
      console.error('[Consent] Failed to save to server:', error);
      // Cookie is already set, so user experience is not affected
    }
  }, [visitorId]);

  // Delete cookies for disabled categories
  const cleanupCookies = useCallback((prefs: ConsentPreferences) => {
    COOKIE_DEFINITIONS.forEach((cookie) => {
      if (cookie.category !== 'essential' && !prefs[cookie.category]) {
        deleteCookie(cookie.name);
      }
    });
  }, []);

  // Accept all cookies
  const acceptAll = useCallback(async () => {
    const newPrefs: ConsentPreferences = {
      essential: true,
      functional: true,
      analytics: true,
      marketing: true,
    };
    setPreferences(newPrefs);
    setHasConsented(true);
    setModalState('hidden');
    await saveToServer(
      { functional: true, analytics: true, marketing: true },
      'banner'
    );
  }, [saveToServer]);

  // Reject all non-essential cookies
  const rejectAll = useCallback(async () => {
    const newPrefs: ConsentPreferences = {
      essential: true,
      functional: false,
      analytics: false,
      marketing: false,
    };
    setPreferences(newPrefs);
    setHasConsented(true);
    setModalState('hidden');
    cleanupCookies(newPrefs);
    await saveToServer(
      { functional: false, analytics: false, marketing: false },
      'banner'
    );
  }, [saveToServer, cleanupCookies]);

  // Save custom preferences
  const savePreferences = useCallback(async (
    prefs: Omit<ConsentPreferences, 'essential'>
  ) => {
    const newPrefs: ConsentPreferences = {
      essential: true,
      ...prefs,
    };
    setPreferences(newPrefs);
    setHasConsented(true);
    setModalState('hidden');
    cleanupCookies(newPrefs);
    await saveToServer(prefs, 'settings');
  }, [saveToServer, cleanupCookies]);

  // Modal controls
  const showBanner = useCallback(() => setModalState('banner'), []);
  const showPreferences = useCallback(() => setModalState('preferences'), []);
  const hideModal = useCallback(() => setModalState('hidden'), []);

  // Check if consent given for category
  const hasConsent = useCallback(
    (category: CookieCategory) => preferences[category],
    [preferences]
  );

  // Get cookies for a category
  const getCookiesForCategory = useCallback(
    (category: CookieCategory) =>
      COOKIE_DEFINITIONS.filter((c) => c.category === category),
    []
  );

  return (
    <ConsentContext.Provider
      value={{
        preferences,
        hasConsented,
        isLoading,
        visitorId,
        modalState,
        showBanner,
        showPreferences,
        hideModal,
        acceptAll,
        rejectAll,
        savePreferences,
        hasConsent,
        getCookiesForCategory,
      }}
    >
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error('useConsent must be used within a ConsentProvider');
  }
  return context;
}

// Hook to conditionally load scripts based on consent
export function useConsentScript(category: CookieCategory): boolean {
  const { hasConsent, isLoading } = useConsent();

  if (isLoading) return false;
  return hasConsent(category);
}
