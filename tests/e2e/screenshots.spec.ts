/**
 * Screenshot Capture Script
 *
 * Run with: npx playwright test tests/e2e/screenshots.spec.ts --project=chromium
 *
 * Screenshots are saved to: screenshots/
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Ensure screenshots directory exists
const SCREENSHOTS_DIR = path.join(process.cwd(), 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Helper to dismiss cookie banner
async function dismissCookieBanner(page: any) {
  try {
    // Look for common cookie banner dismiss buttons
    const acceptButton = page.getByRole('button', { name: /Accept All/i });
    if (await acceptButton.isVisible({ timeout: 1000 })) {
      await acceptButton.click();
      await page.waitForTimeout(300); // Wait for animation
    }
  } catch {
    // Banner not present or already dismissed
  }
}

// Helper to take a screenshot with consistent settings
async function capture(page: any, name: string, options: { fullPage?: boolean; delay?: number } = {}) {
  const { fullPage = true, delay = 500 } = options;

  // Wait for network to be idle
  await page.waitForLoadState('networkidle').catch(() => {});

  // Dismiss cookie banner if present
  await dismissCookieBanner(page);

  // Wait for animations to settle
  await page.waitForTimeout(delay);

  const filePath = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage });
  console.log(`Captured: ${filePath}`);
}

test.describe('Screenshot Capture', () => {

  // Set cookie consent before each test to prevent banner from appearing
  test.beforeEach(async ({ page }) => {
    // Set cookie consent to accepted (matches ConsentContext.tsx format)
    const consentValue = JSON.stringify({
      essential: true,
      analytics: true,
      personalization: true,
      version: '1.0',
    });
    await page.context().addCookies([
      {
        name: 'mdb_cookie_consent',
        value: encodeURIComponent(consentValue),
        domain: 'localhost',
        path: '/',
      },
    ]);
  });

  test.describe('Public Pages', () => {
    test('landing page', async ({ page }) => {
      await page.goto('/');
      await capture(page, 'landing-page');
    });

    test('login page', async ({ page }) => {
      // Clear auth for this test
      await page.context().clearCookies();
      await page.goto('/auth/login');
      await capture(page, 'login-page');
    });

    test('pricing page', async ({ page }) => {
      await page.goto('/pricing');
      await capture(page, 'pricing-page');
    });

    test('marketplace page', async ({ page }) => {
      await page.goto('/marketplace');
      await capture(page, 'marketplace-page');
    });
  });

  test.describe('Authenticated Pages', () => {
    test('settings page', async ({ page }) => {
      await page.goto('/settings');
      await capture(page, 'settings-page');
    });

    test('projects page', async ({ page }) => {
      await page.goto('/projects');
      await capture(page, 'projects-page');
    });

    test('forms list', async ({ page }) => {
      await page.goto('/my-forms');
      await capture(page, 'forms-list');
    });

    test('workflows page', async ({ page }) => {
      await page.goto('/workflows');
      await capture(page, 'workflows-page');
    });

    test('data page', async ({ page }) => {
      await page.goto('/data');
      await capture(page, 'data-page');
    });

    test('applications page', async ({ page }) => {
      await page.goto('/applications');
      await capture(page, 'applications-page');
    });
  });

  test.describe('Different Viewports', () => {
    test('landing page - mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/');
      await capture(page, 'landing-page-mobile');
    });

    test('landing page - tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/');
      await capture(page, 'landing-page-tablet');
    });

    test('landing page - desktop wide', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/');
      await capture(page, 'landing-page-desktop-wide');
    });
  });

  test.describe('Dark Mode', () => {
    test('landing page - dark mode', async ({ page }) => {
      // Emulate dark color scheme
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto('/');
      await capture(page, 'landing-page-dark');
    });

    test('login page - dark mode', async ({ page }) => {
      await page.context().clearCookies();
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto('/auth/login');
      await capture(page, 'login-page-dark');
    });

    test('settings page - dark mode', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto('/settings');
      await capture(page, 'settings-page-dark');
    });
  });
});
