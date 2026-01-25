/**
 * Next.js Instrumentation
 *
 * This file is automatically loaded by Next.js on startup.
 * Used to initialize the extension system, Sentry, and other startup tasks.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import * as Sentry from "@sentry/nextjs";

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';
const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';

// Sample rates: 100% in dev for debugging, lower in production to manage costs
const tracesSampleRate = isProduction ? 0.2 : 1.0;

export async function register() {
  // Initialize Sentry for Node.js runtime
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: "https://26cd444048039a8ec2f4c8dbce9a3cb2@o4510773454438400.ingest.us.sentry.io/4510773455355904",
      environment,
      // Release is auto-detected from VERCEL_GIT_COMMIT_SHA or package.json version
      release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version,
      tracesSampleRate,
      enableLogs: true,
      sendDefaultPii: true,
    });

    console.log('[Instrumentation] Initializing NetPad...');

    // Load extensions
    const { loadExtensions } = await import('@/lib/extensions');
    await loadExtensions();

    console.log('[Instrumentation] NetPad initialized');
  }

  // Initialize Sentry for Edge runtime
  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: "https://26cd444048039a8ec2f4c8dbce9a3cb2@o4510773454438400.ingest.us.sentry.io/4510773455355904",
      environment,
      release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version,
      tracesSampleRate,
      enableLogs: true,
      sendDefaultPii: true,
    });
  }
}
