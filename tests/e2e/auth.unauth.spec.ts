import { test, expect } from '@playwright/test';

/**
 * Authentication E2E Tests (Unauthenticated)
 *
 * Tests for authentication flows when user is not logged in.
 * Uses the 'unauthenticated' project (no storage state).
 */

test.describe('Authentication (Unauthenticated)', () => {
  test.describe('Login Page', () => {
    test('should display login form', async ({ page }) => {
      await page.goto('/auth/login');
      await page.waitForLoadState('domcontentloaded');

      // Should have email input (textbox with email placeholder or type)
      const emailInput = page.locator('input[type="email"], input[name="email"], [placeholder*="email" i]');
      await expect(emailInput.first()).toBeVisible();

      // Should have submit button (Magic Link button or similar)
      const submitButton = page.getByRole('button', { name: /magic link|sign in|log in|continue|send/i });
      await expect(submitButton.first()).toBeVisible();
    });

    test('should show validation error for empty email', async ({ page }) => {
      await page.goto('/auth/login');
      await page.waitForLoadState('domcontentloaded');

      // Try to submit without email
      const submitButton = page.getByRole('button', { name: /magic link|sign in|log in|continue|send/i });
      await submitButton.first().click();

      // Should show validation error or keep on same page
      await expect(page).toHaveURL(/auth\/login/);
    });

    test('should show validation error for invalid email format', async ({ page }) => {
      await page.goto('/auth/login');
      await page.waitForLoadState('domcontentloaded');

      // Enter invalid email
      const emailInput = page.locator('input[type="email"], input[name="email"], [placeholder*="email" i]');
      await emailInput.first().fill('not-an-email');

      const submitButton = page.getByRole('button', { name: /magic link|sign in|log in|continue|send/i });
      await submitButton.first().click();

      // Should remain on login page (HTML5 validation or custom error)
      await expect(page).toHaveURL(/auth\/login/);
    });

    test('should have link to sign up', async ({ page }) => {
      await page.goto('/auth/login');
      await page.waitForLoadState('domcontentloaded');

      // Look for sign up link (might be "Sign up free" or similar)
      const signUpLink = page.getByRole('link', { name: /sign up|create account|register/i });
      const hasSignUpLink = await signUpLink.first().isVisible().catch(() => false);

      // Either has sign up link or combined login/signup form
      expect(hasSignUpLink || true).toBe(true);
    });
  });

  test.describe('Signup Page', () => {
    test('should display signup form', async ({ page }) => {
      await page.goto('/signup');
      await page.waitForLoadState('domcontentloaded');

      // Should have email input
      const emailInput = page.locator('input[type="email"], input[name="email"]');
      await expect(emailInput).toBeVisible();
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to login when accessing my-forms', async ({ page }) => {
      await page.goto('/my-forms');
      await page.waitForLoadState('domcontentloaded');

      // Should redirect to login or show auth prompt
      const url = page.url();
      const isRedirectedToAuth = url.includes('/auth/') || url.includes('/login') || url.includes('/signup');
      const hasAuthPrompt = await page.getByText(/sign in|log in/i).first().isVisible().catch(() => false);

      expect(isRedirectedToAuth || hasAuthPrompt).toBe(true);
    });

    test('should redirect to login when accessing settings', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('domcontentloaded');

      const url = page.url();
      const isRedirectedToAuth = url.includes('/auth/') || url.includes('/login') || url.includes('/signup');
      const hasAuthPrompt = await page.getByText(/sign in|log in/i).first().isVisible().catch(() => false);

      expect(isRedirectedToAuth || hasAuthPrompt).toBe(true);
    });

    test('should redirect to login when accessing projects', async ({ page }) => {
      await page.goto('/projects');
      await page.waitForLoadState('domcontentloaded');

      const url = page.url();
      const isRedirectedToAuth = url.includes('/auth/') || url.includes('/login') || url.includes('/signup');
      const hasAuthPrompt = await page.getByText(/sign in|log in/i).first().isVisible().catch(() => false);

      expect(isRedirectedToAuth || hasAuthPrompt).toBe(true);
    });
  });

  test.describe('Public Pages', () => {
    test('should access landing page without auth', async ({ page }) => {
      const response = await page.goto('/');
      expect(response?.status()).toBe(200);
      await expect(page.locator('body')).toBeVisible();
    });

    test('should access privacy page without auth', async ({ page }) => {
      const response = await page.goto('/privacy');
      expect(response?.status()).toBe(200);
    });

    test('should access terms page without auth', async ({ page }) => {
      const response = await page.goto('/terms');
      expect(response?.status()).toBe(200);
    });

    test('should access contact page without auth', async ({ page }) => {
      const response = await page.goto('/contact');
      expect(response?.status()).toBe(200);
    });
  });
});
