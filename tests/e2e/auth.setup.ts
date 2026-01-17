/**
 * Playwright Authentication Setup
 *
 * This file provides authentication helpers for E2E tests.
 * It uses the test credentials API to log in programmatically.
 *
 * Usage in tests:
 *
 * ```typescript
 * import { test } from './auth.setup';
 *
 * test('authenticated test', async ({ authenticatedPage }) => {
 *   await authenticatedPage.goto('/builder');
 *   // User is already logged in
 * });
 * ```
 */

import { test as base, expect, Page, BrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Test user credentials
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'testpassword123',
};

// Path to store authentication state
const AUTH_FILE = path.join(__dirname, '../../playwright/.auth/user.json');

/**
 * Ensure the auth directory exists
 */
function ensureAuthDir() {
  const authDir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
}

/**
 * Log in via the API and save session state
 */
export async function loginViaApi(page: Page): Promise<void> {
  const response = await page.request.post('/api/auth/credentials', {
    data: {
      email: TEST_USER.email,
      password: TEST_USER.password,
      createIfNotExists: true,
    },
  });

  if (!response.ok()) {
    throw new Error(`Login failed: ${response.status()} ${await response.text()}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(`Login failed: ${data.error}`);
  }
}

/**
 * Log in via the UI (for testing the login flow itself)
 */
export async function loginViaUI(page: Page): Promise<void> {
  await page.goto('/auth/login');

  // Enter email
  await page.fill('input[type="email"]', TEST_USER.email);

  // Click "Use Test Credentials" to reveal password field
  await page.click('button:has-text("Use Test Credentials")');

  // Enter password
  await page.fill('input[type="password"]', TEST_USER.password);

  // Click sign in
  await page.click('button:has-text("Sign In (Test Mode)")');

  // Wait for redirect to builder
  await page.waitForURL(/\/(builder|settings)/);
}

/**
 * Save authentication state to file for reuse
 */
export async function saveAuthState(context: BrowserContext): Promise<void> {
  ensureAuthDir();
  await context.storageState({ path: AUTH_FILE });
}

/**
 * Check if saved auth state exists and is recent
 */
export function hasValidAuthState(): boolean {
  if (!fs.existsSync(AUTH_FILE)) {
    return false;
  }

  const stats = fs.statSync(AUTH_FILE);
  const ageInHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);

  // Auth state is valid for 1 hour
  return ageInHours < 1;
}

/**
 * Get the path to saved auth state
 */
export function getAuthStatePath(): string {
  return AUTH_FILE;
}

// Extended test fixture with authentication
type AuthFixtures = {
  authenticatedPage: Page;
  testUser: typeof TEST_USER;
};

/**
 * Extended Playwright test with authentication fixture
 */
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ browser }, use) => {
    // Create a new context
    const context = await browser.newContext();
    const page = await context.newPage();

    // Log in via API
    await loginViaApi(page);

    // Verify we're logged in by checking session
    const sessionResponse = await page.request.get('/api/auth/session');
    expect(sessionResponse.ok()).toBeTruthy();

    // Use the authenticated page
    await use(page);

    // Cleanup
    await context.close();
  },

  testUser: async ({}, use) => {
    await use(TEST_USER);
  },
});

export { expect };
