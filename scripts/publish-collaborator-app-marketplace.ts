/**
 * Publish Collaborator Recruitment App to Marketplace
 *
 * Publishes the collaborator recruitment application bundle from the examples
 * directory to the NetPad marketplace.
 *
 * Run with: npx tsx scripts/publish-collaborator-app-marketplace.ts
 */

import { MongoClient } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || process.env.PLATFORM_MONGODB_URI;
const PLATFORM_DB = process.env.PLATFORM_DB_NAME || 'form_builder_platform';

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is not set');
  process.exit(1);
}

// Path to the collaborator recruitment templates
const TEMPLATES_DIR = path.join(
  __dirname,
  '..',
  'examples',
  'collaborator-recruitment',
  'templates'
);

/**
 * Load JSON file from templates directory
 */
function loadTemplate(filename: string): any {
  const filepath = path.join(TEMPLATES_DIR, filename);
  if (!fs.existsSync(filepath)) {
    throw new Error(`Template file not found: ${filepath}`);
  }
  const content = fs.readFileSync(filepath, 'utf8');
  return JSON.parse(content);
}

async function publishCollaboratorApp() {
  const client = new MongoClient(MONGODB_URI!);

  try {
    await client.connect();
    console.log('Connected to MongoDB\n');

    const platformDb = client.db(PLATFORM_DB);

    // 1. Load all template files
    console.log('1. Loading template files...');
    const manifest = loadTemplate('manifest.json');
    const form = loadTemplate('form.json');
    const workflow = loadTemplate('workflow.json');

    let connections: any[] = [];
    try {
      connections = loadTemplate('connections.json');
    } catch {
      console.log('   No connections.json found, detecting automatically...');
    }

    console.log(`   Manifest: ${manifest.name} v${manifest.version}`);
    console.log(`   Form: ${form.name} (${form.slug})`);
    console.log(`   Workflow: ${workflow.name} (${workflow.slug})`);

    // 2. Auto-detect connections if not provided
    if (connections.length === 0) {
      console.log('\n2. Detecting form-workflow connections...');
      if (workflow.canvas?.nodes) {
        const triggerNode = workflow.canvas.nodes.find(
          (node: any) => node.type === 'trigger'
        );
        if (triggerNode?.config?.formId === form.slug ||
            workflow.settings?.trigger?.formSlug === form.slug ||
            workflow.settings?.trigger?.formId === form.slug) {
          connections.push({
            id: `conn_${form.slug}_${workflow.slug}`,
            formRef: form.slug,
            workflowRef: workflow.slug,
            type: 'trigger',
            config: {
              triggerOn: 'submit',
              conditions: [],
            },
            description: `Workflow "${workflow.name}" triggers on form "${form.name}" submission`,
            enabled: true,
          });
        }
      }
      console.log(`   Found ${connections.length} connection(s)`);
    } else {
      console.log(`\n2. Using ${connections.length} connection(s) from connections.json`);
    }

    // 3. Create the marketplace bundle
    console.log('\n3. Creating marketplace bundle...');
    const appId = 'netpad-collaborator-recruitment';
    const bundle = {
      manifest: {
        ...manifest,
        id: appId,
        color: manifest.color || '#00ED64',
        marketplace: {
          featured: true,
          downloads: 0,
          rating: 0,
          reviews: 0,
        },
        updatedAt: new Date().toISOString(),
      },
      forms: [form],
      workflows: [workflow],
      connections,
      theme: {
        preset: 'mongodb',
        primaryColor: '#00ED64',
        secondaryColor: '#001E2B',
      },
    };

    // 4. Check if already exists in marketplace
    console.log('\n4. Checking marketplace for existing entry...');
    const marketplaceCollection = platformDb.collection('marketplace_applications');
    const existing = await marketplaceCollection.findOne({ id: appId });
    if (existing) {
      console.log(`   Application already exists with status: ${existing.status}`);
      console.log(`   Current version: ${existing.latestVersion}`);
    }

    // 5. Insert/Update in marketplace
    console.log('\n5. Publishing to marketplace...');
    const now = new Date().toISOString();

    const versionEntry = {
      version: manifest.version,
      changelog: manifest.changelog || 'Collaborator recruitment with conversational AI and traditional form modes',
      publishedAt: new Date(),
      publishedBy: 'system',
    };

    const marketplaceDoc = {
      id: appId,
      manifest: bundle.manifest,
      bundle: bundle,
      published: true, // Auto-publish official apps
      status: 'approved', // Auto-approve official apps
      isOfficial: true, // This is an official NetPad app
      publishedBy: 'system',
      publishedAt: now,
      reviewedAt: now,
      reviewedBy: 'system',
      source: 'web',
      versions: existing?.versions
        ? [...existing.versions, versionEntry]
        : [versionEntry],
      latestVersion: manifest.version,
      latestVersionPublishedAt: now,
      stats: existing?.stats || {
        downloads: 0,
        reviews: 0,
      },
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    if (existing) {
      await marketplaceCollection.updateOne({ id: appId }, { $set: marketplaceDoc });
      console.log('   Updated existing marketplace entry');
    } else {
      await marketplaceCollection.insertOne(marketplaceDoc);
      console.log('   Created new marketplace entry');
    }

    // 6. Summary
    console.log('\n' + '='.repeat(50));
    console.log('Publication Summary');
    console.log('='.repeat(50));
    console.log(`App ID:       ${appId}`);
    console.log(`Name:         ${bundle.manifest.name}`);
    console.log(`Version:      ${bundle.manifest.version}`);
    console.log(`Category:     ${bundle.manifest.category}`);
    console.log(`Forms:        ${bundle.forms.length}`);
    console.log(`Workflows:    ${bundle.workflows.length}`);
    console.log(`Connections:  ${bundle.connections.length}`);
    console.log(`Status:       approved (official app)`);
    console.log(`Published:    true`);
    console.log('');
    console.log('Features:');
    if (manifest.instructions?.features) {
      manifest.instructions.features.slice(0, 5).forEach((f: string) => {
        console.log(`  - ${f}`);
      });
    }
    console.log('');
    console.log('The app is now available in the marketplace!');
    console.log('Users can install it from: /marketplace/applications/' + appId);
    console.log('');
    console.log('Done!');
  } catch (error) {
    console.error('Error publishing collaborator app:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

publishCollaboratorApp();
