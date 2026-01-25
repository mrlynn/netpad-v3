// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Environment detection (these are replaced at build time by Next.js)
const isProduction = process.env.NODE_ENV === 'production';
const environment = process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || 'development';

// Sample rates: 100% in dev for debugging, lower in production to manage costs
const tracesSampleRate = isProduction ? 0.2 : 1.0;
const replaysSessionSampleRate = isProduction ? 0.05 : 0.1; // 5% in prod, 10% in dev

Sentry.init({
  dsn: "https://26cd444048039a8ec2f4c8dbce9a3cb2@o4510773454438400.ingest.us.sentry.io/4510773455355904",
  environment,
  // Release is auto-detected from Vercel's git commit SHA
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],

  tracesSampleRate,
  enableLogs: true,

  // Replay sampling: lower in production, always capture error sessions
  replaysSessionSampleRate,
  replaysOnErrorSampleRate: 1.0, // Always capture sessions with errors

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
