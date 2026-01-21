#!/usr/bin/env node

/**
 * Import Bundle Script for Collaborator Recruitment Application
 *
 * This script imports the collaborator recruitment form and workflow
 * into a NetPad organization/project via the API.
 *
 * Usage:
 *   node import-bundle.js [orgId] [projectId] [baseUrl]
 *
 * Environment Variables (used if args not provided):
 *   NETPAD_ORG_ID     - Organization ID
 *   NETPAD_PROJECT_ID - Project ID
 *   NETPAD_BASE_URL   - Base URL of NetPad instance (default: http://localhost:3000)
 *   NETPAD_API_KEY    - API key for authentication (optional if using session)
 *
 * Examples:
 *   # Using command line arguments
 *   node import-bundle.js org_abc123 proj_xyz789
 *   node import-bundle.js org_abc123 proj_xyz789 https://netpad.io
 *
 *   # Using environment variables
 *   export NETPAD_ORG_ID=org_abc123
 *   export NETPAD_PROJECT_ID=proj_xyz789
 *   node import-bundle.js
 */

const fs = require('fs');
const path = require('path');

// Configuration - support both CLI args and environment variables
const DEFAULT_BASE_URL = 'http://localhost:3000';

// Parse command line arguments
const args = process.argv.slice(2);

// Get values from args or environment variables
const orgId = args[0] || process.env.NETPAD_ORG_ID;
const projectId = args[1] || process.env.NETPAD_PROJECT_ID;
const baseUrl = args[2] || process.env.NETPAD_BASE_URL || DEFAULT_BASE_URL;

// Validate required values
if (!orgId || !projectId) {
  console.error('Usage: node import-bundle.js [orgId] [projectId] [baseUrl]');
  console.error('');
  console.error('Arguments (or use environment variables):');
  console.error('  orgId      - Organization ID (or set NETPAD_ORG_ID)');
  console.error('  projectId  - Project ID (or set NETPAD_PROJECT_ID)');
  console.error('  baseUrl    - Optional: NetPad instance URL (or set NETPAD_BASE_URL)');
  console.error('');
  console.error('Environment Variables:');
  console.error('  NETPAD_ORG_ID     - Organization ID');
  console.error('  NETPAD_PROJECT_ID - Project ID');
  console.error('  NETPAD_BASE_URL   - Base URL (default: http://localhost:3000)');
  console.error('  NETPAD_API_KEY    - API key for authentication');
  console.error('');
  console.error('Current values:');
  console.error(`  NETPAD_ORG_ID     = ${process.env.NETPAD_ORG_ID || '(not set)'}`);
  console.error(`  NETPAD_PROJECT_ID = ${process.env.NETPAD_PROJECT_ID || '(not set)'}`);
  console.error(`  NETPAD_BASE_URL   = ${process.env.NETPAD_BASE_URL || '(not set)'}`);
  process.exit(1);
}

// Load template files
const templatesDir = path.join(__dirname, 'templates');

function loadJsonFile(filename) {
  const filePath = path.join(templatesDir, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function importBundle() {
  console.log('='.repeat(60));
  console.log('Collaborator Recruitment - Import Bundle');
  console.log('='.repeat(60));
  console.log('');
  console.log(`Organization: ${orgId}`);
  console.log(`Project:      ${projectId}`);
  console.log(`Base URL:     ${baseUrl}`);
  console.log('');

  try {
    // Load all template files
    console.log('Loading template files...');
    const manifest = loadJsonFile('manifest.json');
    const form = loadJsonFile('form.json');
    const workflow = loadJsonFile('workflow.json');
    console.log('  ✓ manifest.json');
    console.log('  ✓ form.json');
    console.log('  ✓ workflow.json');
    console.log('');

    // Build the import bundle
    const bundle = {
      manifest: {
        ...manifest,
        importedAt: new Date().toISOString(),
        importedTo: {
          organizationId: orgId,
          projectId: projectId,
        },
      },
      forms: [form],
      workflows: [workflow],
    };

    // Import the bundle
    console.log('Importing bundle to NetPad...');

    const importUrl = `${baseUrl}/api/templates/import`;
    const headers = {
      'Content-Type': 'application/json',
    };

    // Add API key if provided
    if (process.env.NETPAD_API_KEY) {
      headers['Authorization'] = `Bearer ${process.env.NETPAD_API_KEY}`;
    }

    const response = await fetch(importUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        bundle,
        organizationId: orgId,
        projectId: projectId,
        options: {
          generateNewIds: true,
          preserveSlugs: true,
          overwriteExisting: false,
        },
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    console.log('');
    console.log('✅ Import successful!');
    console.log('');
    console.log('Imported assets:');

    // Show application info
    if (result.imported?.application) {
      const app = result.imported.application;
      console.log(`  Application: ${app.name} (${app.applicationId})`);
      console.log(`    Slug: ${app.slug}`);
    }

    // Show forms
    if (result.imported?.forms?.length) {
      result.imported.forms.forEach((f) => {
        console.log(`  Form: ${f.name} (${f.newId})`);
        console.log(`    Slug: ${f.slug}`);
      });
    }

    // Show workflows
    if (result.imported?.workflows?.length) {
      result.imported.workflows.forEach((w) => {
        console.log(`  Workflow: ${w.name} (${w.newId})`);
        console.log(`    Slug: ${w.slug}`);
      });
    }

    // Show any warnings/errors
    if (result.errors?.length) {
      console.log('');
      console.log('⚠️  Warnings:');
      result.errors.forEach((e) => {
        console.log(`  ${e.type}: ${e.name} - ${e.error}`);
      });
    }

    console.log('');
    console.log('Next steps:');
    console.log('  1. Configure MongoDB connection in Settings → Connections');
    console.log('  2. Configure email integration in Settings → Integrations');
    console.log('  3. Update workflow variables with your email address');
    console.log('  4. Publish the form');
    console.log('  5. Activate the workflow');
    console.log('');

    // Build the application URL
    if (result.imported?.application) {
      const appSlug = result.imported.application.slug;
      console.log(`  Application: ${baseUrl}/apps/${appSlug}`);
    }
    console.log(`  Dashboard: ${baseUrl}/orgs/${orgId}/projects/${projectId}/applications`);

  } catch (error) {
    console.error('');
    console.error('❌ Import failed:', error.message);
    console.error('');

    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.error('Authentication required. Set NETPAD_API_KEY environment variable.');
    } else if (error.message.includes('404')) {
      console.error('Import endpoint not found. Ensure NetPad is running and accessible.');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error(`Could not connect to ${baseUrl}. Ensure NetPad is running.`);
    }

    process.exit(1);
  }
}

// Alternative: Direct database seeding (for local development)
async function seedDirectly() {
  console.log('');
  console.log('Alternative: For local development, you can also run:');
  console.log('  npm run seed:collaborator-form');
  console.log('');
  console.log('This seeds the form directly to the database without using the API.');
}

// Run
importBundle().then(() => {
  seedDirectly();
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
