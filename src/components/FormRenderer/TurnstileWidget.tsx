'use client';

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Box, Typography } from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: TurnstileOptions
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      getResponse: (widgetId: string) => string | undefined;
    };
    onTurnstileLoad?: () => void;
  }
}

interface TurnstileOptions {
  sitekey: string;
  callback?: (token: string) => void;
  'error-callback'?: (error: any) => void;
  'expired-callback'?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  appearance?: 'always' | 'execute' | 'interaction-only';
  action?: string;
  cData?: string;
  size?: 'normal' | 'compact';
}

interface TurnstileWidgetProps {
  siteKey: string;
  theme?: 'light' | 'dark' | 'auto';
  appearance?: 'always' | 'execute' | 'interaction-only';
  action?: string;
  onSuccess?: (token: string) => void;
  onError?: (error: any) => void;
  onExpired?: () => void;
}

export interface TurnstileWidgetRef {
  getToken: () => string | undefined;
  reset: () => void;
  execute: () => void;
}

const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

/**
 * Cloudflare Turnstile widget component
 * A privacy-focused, user-friendly CAPTCHA alternative
 */
export const TurnstileWidget = forwardRef<TurnstileWidgetRef, TurnstileWidgetProps>(
  function TurnstileWidget(
    {
      siteKey,
      theme = 'auto',
      appearance = 'always',
      action,
      onSuccess,
      onError,
      onExpired,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [token, setToken] = useState<string | undefined>(undefined);

    // Callback handlers
    const handleSuccess = useCallback(
      (newToken: string) => {
        setToken(newToken);
        setError(null);
        onSuccess?.(newToken);
      },
      [onSuccess]
    );

    const handleError = useCallback(
      (err: any) => {
        setError('Verification failed. Please try again.');
        setToken(undefined);
        onError?.(err);
      },
      [onError]
    );

    const handleExpired = useCallback(() => {
      setToken(undefined);
      onExpired?.();
    }, [onExpired]);

    // Load Turnstile script
    useEffect(() => {
      // Check if already loaded
      if (window.turnstile) {
        setIsLoading(false);
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector(
        `script[src^="${TURNSTILE_SCRIPT_URL}"]`
      );
      if (existingScript) {
        const checkLoaded = setInterval(() => {
          if (window.turnstile) {
            setIsLoading(false);
            clearInterval(checkLoaded);
          }
        }, 100);
        return () => clearInterval(checkLoaded);
      }

      // Load the script
      const script = document.createElement('script');
      script.src = `${TURNSTILE_SCRIPT_URL}?onload=onTurnstileLoad`;
      script.async = true;
      script.defer = true;

      window.onTurnstileLoad = () => {
        setIsLoading(false);
      };

      script.onerror = () => {
        setError('Failed to load verification service');
        setIsLoading(false);
      };

      document.head.appendChild(script);

      return () => {
        // Cleanup on unmount
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
        }
      };
    }, []);

    // Render the widget when script is loaded
    useEffect(() => {
      if (isLoading || !window.turnstile || !containerRef.current) return;

      // Clear any existing widget
      if (widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }

      // Render new widget
      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          appearance,
          action,
          callback: handleSuccess,
          'error-callback': handleError,
          'expired-callback': handleExpired,
        });
      } catch (err) {
        console.error('Failed to render Turnstile widget:', err);
        setError('Failed to initialize verification');
      }
    }, [isLoading, siteKey, theme, appearance, action, handleSuccess, handleError, handleExpired]);

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        getToken: () => {
          if (widgetIdRef.current && window.turnstile) {
            return window.turnstile.getResponse(widgetIdRef.current);
          }
          return token;
        },
        reset: () => {
          if (widgetIdRef.current && window.turnstile) {
            window.turnstile.reset(widgetIdRef.current);
            setToken(undefined);
          }
        },
        execute: () => {
          // For 'execute' appearance mode - trigger verification
          // The widget handles this automatically for other modes
        },
      }),
      [token]
    );

    if (error) {
      return (
        <Box
          sx={{
            py: 2,
            textAlign: 'center',
          }}
        >
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        </Box>
      );
    }

    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: appearance === 'always' ? 65 : 0,
          py: 1,
        }}
      >
        {isLoading && (
          <NetPadLoader size="small" variant="svg" showPhrases={false} />
        )}
        <Box
          ref={containerRef}
          sx={{
            display: isLoading ? 'none' : 'block',
          }}
        />
      </Box>
    );
  }
);

export default TurnstileWidget;
