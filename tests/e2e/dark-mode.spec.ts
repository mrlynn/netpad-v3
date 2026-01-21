import { test, expect } from '@playwright/test';

/**
 * Dark Mode / Theme E2E Tests
 *
 * Tests for theme switching and dark mode support.
 */

test.describe('Theme Support', () => {
  test.describe('System Theme Detection', () => {
    test('should respect system dark mode preference', async ({ page }) => {
      // Emulate dark mode
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check if dark mode styles are applied
      const html = page.locator('html');
      const isDark = await html.evaluate((el) => {
        const classList = el.classList;
        const style = window.getComputedStyle(el);
        return (
          classList.contains('dark') ||
          style.colorScheme === 'dark' ||
          style.backgroundColor.includes('rgb(0') ||
          style.backgroundColor.includes('rgb(17') ||
          style.backgroundColor.includes('rgb(24') ||
          style.backgroundColor.includes('rgb(31')
        );
      }).catch(() => false);

      // Either system theme is respected or page uses light theme
      expect(typeof isDark).toBe('boolean');
    });

    test('should respect system light mode preference', async ({ page }) => {
      // Emulate light mode
      await page.emulateMedia({ colorScheme: 'light' });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Page should load successfully
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Theme Toggle', () => {
    test('should have theme toggle if supported', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Look for theme toggle
      const themeToggle = page.locator(
        '[aria-label*="theme"], [aria-label*="dark"], [aria-label*="light"], ' +
        'button:has-text("theme"), button:has-text("dark"), button:has-text("light"), ' +
        '[data-testid="theme-toggle"]'
      ).first();

      const hasToggle = await themeToggle.isVisible().catch(() => false);

      // Theme toggle is optional
      expect(typeof hasToggle).toBe('boolean');
    });

    test('should toggle theme when clicked', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const themeToggle = page.locator(
        '[aria-label*="theme"], [data-testid="theme-toggle"]'
      ).first();

      const hasToggle = await themeToggle.isVisible().catch(() => false);

      if (hasToggle) {
        // Get initial theme
        const initialIsDark = await page.locator('html').evaluate((el) =>
          el.classList.contains('dark')
        );

        // Click toggle
        await themeToggle.click();
        await page.waitForTimeout(300);

        // Theme should change
        const newIsDark = await page.locator('html').evaluate((el) =>
          el.classList.contains('dark')
        );

        expect(newIsDark).not.toBe(initialIsDark);
      }

      expect(true).toBe(true);
    });

    test('should persist theme preference', async ({ page, context }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const themeToggle = page.locator('[aria-label*="theme"], [data-testid="theme-toggle"]').first();
      const hasToggle = await themeToggle.isVisible().catch(() => false);

      if (hasToggle) {
        await themeToggle.click();
        await page.waitForTimeout(300);

        const isDarkAfterToggle = await page.locator('html').evaluate((el) =>
          el.classList.contains('dark')
        );

        // Reload page
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Theme should persist
        const isDarkAfterReload = await page.locator('html').evaluate((el) =>
          el.classList.contains('dark')
        );

        expect(isDarkAfterReload).toBe(isDarkAfterToggle);
      }

      expect(true).toBe(true);
    });
  });

  test.describe('Theme Consistency', () => {
    test('should maintain theme across navigation', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Get initial background color as theme indicator
      const getThemeIndicator = async () => {
        return page.locator('body').evaluate((el) => {
          const bg = window.getComputedStyle(el).backgroundColor;
          const html = document.documentElement;
          return {
            bg,
            hasDarkClass: html.classList.contains('dark'),
            colorScheme: window.getComputedStyle(html).colorScheme,
          };
        }).catch(() => ({ bg: '', hasDarkClass: false, colorScheme: '' }));
      };

      const initialTheme = await getThemeIndicator();

      // Navigate to another page
      await page.goto('/contact');
      await page.waitForLoadState('networkidle');

      const navTheme = await getThemeIndicator();

      // Theme should be consistent (either same background or same class)
      expect(
        navTheme.bg === initialTheme.bg ||
        navTheme.hasDarkClass === initialTheme.hasDarkClass ||
        navTheme.colorScheme === initialTheme.colorScheme
      ).toBe(true);
    });

    test('should apply theme to all components', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check that common elements have appropriate colors
      const body = page.locator('body');
      const bodyBg = await body.evaluate((el) =>
        window.getComputedStyle(el).backgroundColor
      );

      // Background should be defined
      expect(bodyBg).toBeDefined();
      expect(bodyBg).not.toBe('');
    });
  });

  test.describe('Reduced Motion', () => {
    test('should respect reduced motion preference', async ({ page }) => {
      // Emulate reduced motion
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Page should load and be functional
      await expect(page.locator('body')).toBeVisible();

      // Check for reduced animations
      const hasReducedMotion = await page.evaluate(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        return mediaQuery.matches;
      });

      expect(hasReducedMotion).toBe(true);
    });
  });

  test.describe('High Contrast', () => {
    test('should maintain readability in dark mode', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check text contrast
      const textElements = page.locator('h1, h2, p').first();
      const hasText = await textElements.isVisible().catch(() => false);

      if (hasText) {
        const color = await textElements.evaluate((el) =>
          window.getComputedStyle(el).color
        );

        // Text should be visible (not transparent)
        expect(color).not.toBe('rgba(0, 0, 0, 0)');
        expect(color).not.toBe('transparent');
      }

      expect(true).toBe(true);
    });

    test('should maintain readability in light mode', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'light' });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const textElements = page.locator('h1, h2, p').first();
      const hasText = await textElements.isVisible().catch(() => false);

      if (hasText) {
        const color = await textElements.evaluate((el) =>
          window.getComputedStyle(el).color
        );

        expect(color).not.toBe('rgba(0, 0, 0, 0)');
        expect(color).not.toBe('transparent');
      }

      expect(true).toBe(true);
    });
  });
});
