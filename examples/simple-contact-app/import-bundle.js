#!/usr/bin/env node

/**
 * Import Bundle Script
 * 
 * Helper script to import the contact form application bundle into NetPad
 * 
 * Usage:
 *   node import-bundle.js <orgId> <projectId> [baseUrl]
 * 
 * Example:
 *   node import-bundle.js org_abc123 proj_xyz789 http://localhost:3000
 */

const fs = require('fs');
const path = require('path');

// Get command line arguments
const [,, orgId, projectId, baseUrl = 'http://localhost:3000'] = process.argv;

if (!orgId || !projectId) {
  console.error('Usage: node import-bundle.js <orgId> <projectId> [baseUrl]');
  console.error('');
  console.error('Example:');
  console.error('  node import-bundle.js org_abc123 proj_xyz789 http://localhost:3000');
  process.exit(1);
}

// Read template files
const templatesDir = path.join(__dirname, 'templates');

let manifest, form, workflow;

try {
  manifest = JSON.parse(fs.readFileSync(path.join(templatesDir, 'manifest.json'), 'utf8'));
  form = JSON.parse(fs.readFileSync(path.join(templatesDir, 'form.json'), 'utf8'));
  workflow = JSON.parse(fs.readFileSync(path.join(templatesDir, 'workflow.json'), 'utf8'));
} catch (error) {
  console.error('Error reading template files:', error.message);
  process.exit(1);
}

// Prepare bundle
const bundle = {
  manifest,
  forms: [form],
  workflows: [workflow],
  options: {
    generateNewIds: true,
    preserveSlugs: false,
    overwriteExisting: false,
  },
};

// Import via API
async function importBundle() {
  const url = `${baseUrl}/api/templates/import?orgId=${orgId}&projectId=${projectId}`;
  
  console.log('Importing bundle...');
  console.log(`  Organization: ${orgId}`);
  console.log(`  Project: ${projectId}`);
  console.log(`  URL: ${url}`);
  console.log('');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bundle),
      credentials: 'include', // Include cookies for authentication
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Import failed:', result.error || result.message || 'Unknown error');
      console.error('Response:', JSON.stringify(result, null, 2));
      process.exit(1);
    }

    if (result.success) {
      console.log('✅ Bundle imported successfully!');
      console.log('');
      console.log('Imported:');
      
      if (result.imported?.forms?.length > 0) {
        console.log('  Forms:');
        result.imported.forms.forEach((f) => {
          console.log(`    - ${f.name} (ID: ${f.newId || f.id}, Slug: ${f.slug})`);
        });
      }
      
      if (result.imported?.workflows?.length > 0) {
        console.log('  Workflows:');
        result.imported.workflows.forEach((w) => {
          console.log(`    - ${w.name} (ID: ${w.newId || w.id}, Slug: ${w.slug})`);
        });
      }
      
      if (result.errors && result.errors.length > 0) {
        console.log('');
        console.log('⚠️  Warnings/Errors:');
        result.errors.forEach((error) => {
          console.log(`    - ${error}`);
        });
      }
      
      console.log('');
      console.log('Next steps:');
      console.log('  1. Go to Applications → Your application');
      console.log('  2. Configure MongoDB connection');
      console.log('  3. Configure email integration');
      console.log('  4. Update workflow configuration (form IDs, connection IDs, etc.)');
      console.log('  5. Publish the form and activate the workflow');
      console.log('');
      console.log('See TESTING.md for detailed instructions.');
    } else {
      console.error('Import failed:', result.error || 'Unknown error');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error importing bundle:', error.message);
    console.error('');
    console.error('Make sure:');
    console.error('  1. NetPad is running at', baseUrl);
    console.error('  2. You are authenticated (logged in)');
    console.error('  3. The orgId and projectId are correct');
    console.error('  4. You have permission to create forms and workflows');
    process.exit(1);
  }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.error('This script requires Node.js 18+ (for native fetch support)');
  console.error('Or install node-fetch: npm install node-fetch');
  process.exit(1);
}

importBundle();
