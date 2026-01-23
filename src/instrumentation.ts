/**
 * Next.js Instrumentation
 *
 * This file is automatically loaded by Next.js on startup.
 * Used to initialize the extension system and other startup tasks.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on the server
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] Initializing NetPad...');

    // Load extensions
    const { loadExtensions } = await import('@/lib/extensions');
    await loadExtensions();

    console.log('[Instrumentation] NetPad initialized');
  }
}
