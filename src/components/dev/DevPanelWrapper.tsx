/**
 * DevPanelWrapper
 *
 * Connects the SubscriptionDevPanel to the OrganizationContext.
 * Only renders when there's a selected organization.
 * Hidden on public form pages and in production.
 *
 * Features:
 * - Persists position and hidden state in localStorage
 * - Shows a small "show" button when hidden
 */

'use client';

import { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { IconButton, Tooltip, useTheme } from '@mui/material';
import { Bug } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { SubscriptionDevPanel, DevPanelPosition } from './SubscriptionDevPanel';

// Routes where the dev panel should NOT appear (public/embedded contexts)
const HIDDEN_ROUTES = [
  '/forms/', // Published form pages
  '/auth/',  // Auth pages
  '/workflows/view/', // Embedded workflow viewer
  '/workflows/executions/', // Embedded workflow execution viewer
];

const STORAGE_KEY = 'devPanel';

interface DevPanelState {
  position: DevPanelPosition;
  hidden: boolean;
}

const DEFAULT_STATE: DevPanelState = {
  position: 'bottom-right',
  hidden: false,
};

function getStoredState(): DevPanelState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_STATE, ...parsed };
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_STATE;
}

function saveState(state: DevPanelState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

export function DevPanelWrapper() {
  // ALL hooks must be called before any early returns
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const theme = useTheme();
  const [state, setState] = useState<DevPanelState>(DEFAULT_STATE);
  const [mounted, setMounted] = useState(false);
  const { currentOrgId, isLoading } = useOrganization();

  // Load state from localStorage on mount
  useEffect(() => {
    setState(getStoredState());
    setMounted(true);
  }, []);

  // Don't render in production
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  // Check if embedded via URL params (only after mount to prevent hydration mismatch)
  // During SSR, isEmbedded will be false, then on client mount it will be re-evaluated
  const isEmbedded = mounted ? searchParams.get('embedded') === 'true' : false;

  // Hide on public form pages, auth pages, workflow viewer/execution pages, and when embedded
  const shouldHide = HIDDEN_ROUTES.some(route => pathname?.startsWith(route)) || isEmbedded;
  if (shouldHide) {
    return null;
  }

  // Don't render if no org selected or still loading
  if (isLoading || !currentOrgId) {
    return null;
  }

  // Wait for client-side mount to avoid hydration mismatch
  if (!mounted) {
    return null;
  }

  const handlePositionChange = (position: DevPanelPosition) => {
    const newState = { ...state, position };
    setState(newState);
    saveState(newState);
  };

  const handleHide = () => {
    const newState = { ...state, hidden: true };
    setState(newState);
    saveState(newState);
  };

  const handleShow = () => {
    const newState = { ...state, hidden: false };
    setState(newState);
    saveState(newState);
  };

  // Position styles for the show button
  const positionStyles = {
    'bottom-right': { bottom: 16, right: 16 },
    'bottom-left': { bottom: 16, left: 16 },
    'top-right': { top: 16, right: 16 },
    'top-left': { top: 16, left: 16 },
  };

  if (state.hidden) {
    return (
      <Tooltip title="Show Dev Panel">
        <IconButton
          onClick={handleShow}
          size="small"
          sx={{
            position: 'fixed',
            ...positionStyles[state.position],
            bgcolor: theme.palette.warning.main,
            color: 'white',
            width: 28,
            height: 28,
            '&:hover': { bgcolor: theme.palette.warning.dark },
            zIndex: 9999,
          }}
        >
          <Bug size={14} />
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <SubscriptionDevPanel
      orgId={currentOrgId}
      position={state.position}
      onPositionChange={handlePositionChange}
      onHide={handleHide}
    />
  );
}

export default DevPanelWrapper;
