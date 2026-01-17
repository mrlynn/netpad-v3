/**
 * Playwright Global Setup
 *
 * This runs once before all tests to set up authentication state.
 * The auth state is saved to a file and reused by all tests.
 */

import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const AUTH_FILE = path.join(__dirname, '../../playwright/.auth/user.json');

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'testpassword123',
};

async function globalSetup(config: FullConfig) {
  // Ensure auth directory exists
  const authDir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Skip if auth state is recent (within last hour)
  if (fs.existsSync(AUTH_FILE)) {
    const stats = fs.statSync(AUTH_FILE);
    const ageInHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
    if (ageInHours < 1) {
      console.log('[Global Setup] Using cached auth state');
      return;
    }
  }

  console.log('[Global Setup] Creating fresh auth state...');

  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL: config.projects[0].use?.baseURL || 'http://localhost:3000',
  });
  const page = await context.newPage();

  try {
    // Log in via API
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

    console.log(`[Global Setup] Logged in as: ${TEST_USER.email}`);

    // Check if user has an organization, create one if not
    const orgsResponse = await page.request.get('/api/organizations');
    if (orgsResponse.ok()) {
      const orgsData = await orgsResponse.json();
      if (!orgsData.organizations || orgsData.organizations.length === 0) {
        console.log('[Global Setup] Creating test organization...');

        // Create a test organization
        const createOrgResponse = await page.request.post('/api/organizations', {
          data: {
            name: 'Test Organization',
            slug: 'test-org',
          },
        });

        if (createOrgResponse.ok()) {
          const orgData = await createOrgResponse.json();
          console.log(`[Global Setup] Created organization: ${orgData.organization?.name || 'test-org'}`);
        } else {
          console.warn('[Global Setup] Could not create organization:', await createOrgResponse.text());
        }
      } else {
        console.log(`[Global Setup] User has ${orgsData.organizations.length} organization(s)`);
      }
    }

    // Save storage state
    await context.storageState({ path: AUTH_FILE });
    console.log(`[Global Setup] Auth state saved to: ${AUTH_FILE}`);
  } finally {
    await browser.close();
  }
}

export default globalSetup;
