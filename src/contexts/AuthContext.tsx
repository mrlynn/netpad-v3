'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

interface User {
  _id: string;
  userId?: string; // Platform userId (user_xxx format)
  email: string;
  displayName?: string;
  avatarUrl?: string;
  emailVerified: boolean;
  hasPasskey: boolean;
  passkeyCount: number;
  trustedDeviceCount: number;
  createdAt: string;
  lastLoginAt?: string;
  platformRole?: 'admin' | 'support' | null;
  waitlistStatus?: 'pending' | 'approved' | 'rejected';
}

interface SessionInfo {
  isPasskeyAuth: boolean;
  deviceId?: string;
  createdAt?: number;
  waitlistStatus?: 'pending' | 'approved' | 'rejected';
}

interface AuthState {
  user: User | null;
  session: SessionInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  // Magic link methods
  sendMagicLink: (email: string, returnUrl?: string) => Promise<{ success: boolean; message: string }>;
  verifyMagicLink: (token: string, trustDevice?: boolean) => Promise<{ success: boolean; message: string }>;

  // Passkey methods
  registerPasskey: (friendlyName?: string) => Promise<{ success: boolean; message: string }>;
  loginWithPasskey: (email?: string) => Promise<{ success: boolean; message: string }>;

  // Session methods
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Fetch current session on mount
  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();

      setState({
        user: data.user,
        session: data.session,
        isLoading: false,
        isAuthenticated: data.authenticated,
      });
    } catch (error) {
      console.error('Failed to fetch session:', error);
      setState({
        user: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  // Send magic link
  const sendMagicLink = useCallback(async (email: string, returnUrl?: string) => {
    try {
      const response = await fetch('/api/auth/magic-link/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, returnUrl }),
      });

      const data = await response.json();
      return { success: data.success, message: data.message };
    } catch (error) {
      return { success: false, message: 'Network error. Please try again.' };
    }
  }, []);

  // Verify magic link
  const verifyMagicLink = useCallback(async (token: string, trustDevice: boolean = false) => {
    try {
      const response = await fetch('/api/auth/magic-link/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, trustDevice }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        await refreshSession();
      }

      return { success: data.success, message: data.message };
    } catch (error) {
      return { success: false, message: 'Network error. Please try again.' };
    }
  }, [refreshSession]);

  // Register passkey
  const registerPasskey = useCallback(async (friendlyName?: string) => {
    try {
      // Get registration options
      const optionsResponse = await fetch('/api/auth/passkey/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const optionsData = await optionsResponse.json();

      if (!optionsData.success) {
        return { success: false, message: optionsData.message };
      }

      // Start WebAuthn registration
      const credential = await startRegistration({
        optionsJSON: optionsData.options,
      });

      // Verify registration
      const verifyResponse = await fetch('/api/auth/passkey/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId: optionsData.challengeId,
          credential,
          friendlyName,
        }),
      });

      const verifyData = await verifyResponse.json();

      if (verifyData.success) {
        await refreshSession();
      }

      return { success: verifyData.success, message: verifyData.message };
    } catch (error: any) {
      // Handle user cancellation
      if (error.name === 'NotAllowedError') {
        return { success: false, message: 'Passkey registration was cancelled' };
      }
      console.error('Passkey registration error:', error);
      return { success: false, message: 'Failed to register passkey' };
    }
  }, [refreshSession]);

  // Login with passkey
  const loginWithPasskey = useCallback(async (email?: string) => {
    try {
      // Get authentication options
      const optionsResponse = await fetch('/api/auth/passkey/login-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const optionsData = await optionsResponse.json();

      if (!optionsData.success) {
        return { success: false, message: optionsData.message };
      }

      // Start WebAuthn authentication
      const credential = await startAuthentication({
        optionsJSON: optionsData.options,
      });

      // Verify authentication
      const verifyResponse = await fetch('/api/auth/passkey/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId: optionsData.challengeId,
          credential,
        }),
      });

      const verifyData = await verifyResponse.json();

      if (verifyData.success) {
        await refreshSession();
      }

      return { success: verifyData.success, message: verifyData.message };
    } catch (error: any) {
      // Handle user cancellation
      if (error.name === 'NotAllowedError') {
        return { success: false, message: 'Passkey login was cancelled' };
      }
      console.error('Passkey login error:', error);
      return { success: false, message: 'Failed to login with passkey' };
    }
  }, [refreshSession]);

  // Logout
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/session', { method: 'DELETE' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear auth state
      setState({
        user: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
      });
      
      // Clear any cached data in localStorage that might contain user-specific data
      // Note: We don't clear everything, just user-specific items
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('selected_') ||
          key.startsWith('recent_') ||
          key.startsWith('user_') ||
          key.includes('_cache')
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
  }, []);

  const value: AuthContextValue = {
    ...state,
    sendMagicLink,
    verifyMagicLink,
    registerPasskey,
    loginWithPasskey,
    logout,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper hook to require authentication
export function useRequireAuth(redirectTo: string = '/auth/login') {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = redirectTo;
    }
  }, [isAuthenticated, isLoading, redirectTo]);

  return { isAuthenticated, isLoading };
}
