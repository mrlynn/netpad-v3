import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E test configuration
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  // Global setup for authentication
  globalSetup: require.resolve('./tests/e2e/global-setup'),
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Use saved auth state for authenticated tests
    storageState: './playwright/.auth/user.json',
  },

  projects: [
    // Unauthenticated tests (no storage state)
    {
      name: 'unauthenticated',
      use: {
        ...devices['Desktop Chrome'],
        // Use empty storage state to ensure no auth cookies
        storageState: { cookies: [], origins: [] },
      },
      testMatch: /\.unauth\.spec\.ts/,
    },
    // Authenticated tests
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /\.unauth\.spec\.ts/,
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: /\.unauth\.spec\.ts/,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: /\.unauth\.spec\.ts/,
    },
    // Mobile viewports
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testIgnore: /\.unauth\.spec\.ts/,
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
      testIgnore: /\.unauth\.spec\.ts/,
    },
  ],

  // Run local dev server before starting tests
  // In CI, use production server (app is pre-built); locally use dev server
  webServer: {
    command: process.env.CI ? 'npm start' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
