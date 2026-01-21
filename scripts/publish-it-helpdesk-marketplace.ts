/**
 * Publish IT Help Desk Application to Marketplace
 *
 * Loads the IT helpdesk bundle from examples/it-helpdesk/templates/
 * and publishes it to the NetPad marketplace.
 *
 * Run with: npx tsx scripts/publish-it-helpdesk-marketplace.ts
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const PLATFORM_DB = process.env.PLATFORM_DB_NAME || 'form_builder_platform';

// Publisher user ID - in production this would be the NetPad team user
const PUBLISHER_USER_ID = process.env.PUBLISHER_USER_ID || 'user_netpad_team';

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is not set');
  process.exit(1);
}

/**
 * Load JSON file from examples/it-helpdesk/templates/
 */
function loadTemplateFile(filename: string) {
  const templatesDir = path.join(__dirname, '..', 'examples', 'it-helpdesk', 'templates');
  const filePath = path.join(templatesDir, filename);
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

async function publishITHelpdesk() {
  const client = new MongoClient(MONGODB_URI!);

  try {
    await client.connect();
    console.log('Connected to MongoDB\n');

    const platformDb = client.db(PLATFORM_DB);
    const marketplaceCollection = platformDb.collection('marketplace_applications');

    // 1. Load the IT helpdesk bundle files
    console.log('1. Loading IT Help Desk bundle from examples/it-helpdesk/templates/...');
    const manifest = loadTemplateFile('manifest.json');
    const form = loadTemplateFile('form.json');
    const searchForm = loadTemplateFile('search-form.json');
    const workflow = loadTemplateFile('workflow.json');

    console.log(`   ✓ Loaded manifest: ${manifest.name} v${manifest.version}`);
    console.log(`   ✓ Loaded form: ${form.name || 'IT Support Request'}`);
    console.log(`   ✓ Loaded search form: ${searchForm.name || 'Ticket Search'}`);
    console.log(`   ✓ Loaded workflow: ${workflow.name || 'IT Ticket Routing'}`);

    // 2. Create the marketplace bundle
    console.log('\n2. Creating marketplace bundle...');
    const appId = 'netpad-it-helpdesk';

    const marketplaceApp = {
      id: appId,
      manifest: {
        id: appId,
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        summary: manifest.summary,
        author: manifest.author.name,
        category: manifest.category,
        tags: manifest.tags,
        icon: manifest.icon,
        color: manifest.color,
        license: manifest.license,
        netpadVersion: manifest.netpadVersion,
        contract: manifest.contract,
      },
      bundle: {
        forms: [form, searchForm],
        workflows: [workflow],
        connections: [],
      },
      published: true,
      status: 'approved',
      publishedAt: new Date(),
      publishedBy: PUBLISHER_USER_ID,
      latestVersion: manifest.version,
      versions: [
        {
          version: manifest.version,
          publishedAt: new Date(),
          changelog: [
            'Updated manifest format with contract and better metadata',
            'Added conversational AI support for ticket submission',
            'Improved search form with smart dropdowns',
            'Enhanced workflow with parallel execution',
            'Better mobile responsiveness',
          ],
        },
      ],
      stats: {
        downloads: 0,
        installs: 0,
        rating: 0,
        reviews: 0,
      },
      metadata: {
        readme: manifest.instructions,
        screenshots: manifest.screenshots || [],
        documentation: {
          setup: manifest.instructions.setup,
          features: manifest.instructions.features,
          customization: manifest.instructions.customization,
        },
      },
    };

    // 3. Insert or update the marketplace application
    console.log('\n3. Publishing to marketplace...');
    const result = await marketplaceCollection.replaceOne(
      { id: appId },
      marketplaceApp,
      { upsert: true }
    );

    if (result.upsertedCount > 0) {
      console.log(`   ✓ Created new marketplace entry: ${appId}`);
    } else if (result.modifiedCount > 0) {
      console.log(`   ✓ Updated existing marketplace entry: ${appId}`);
    } else {
      console.log(`   ℹ No changes needed for: ${appId}`);
    }

    // 4. Summary
    console.log('\n✅ IT Help Desk successfully published to marketplace!');
    console.log('\nApplication Details:');
    console.log(`   ID: ${appId}`);
    console.log(`   Name: ${manifest.name}`);
    console.log(`   Version: ${manifest.version}`);
    console.log(`   Category: ${manifest.category}`);
    console.log(`   Tags: ${manifest.tags.join(', ')}`);
    console.log(`   Forms: ${marketplaceApp.bundle.forms.length}`);
    console.log(`   Workflows: ${marketplaceApp.bundle.workflows.length}`);
    console.log('\nNext steps:');
    console.log('   1. Test installation from marketplace UI');
    console.log('   2. Verify forms and workflows import correctly');
    console.log('   3. Configure email and Slack integrations');
    console.log('   4. Test the complete ticket submission flow');

  } catch (error) {
    console.error('\n❌ Error publishing IT helpdesk:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the script
publishITHelpdesk();
