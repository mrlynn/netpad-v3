#!/usr/bin/env tsx
/**
 * List Organizations
 *
 * Helper script to list all organizations in your platform database
 * to find the organization ID you need for RAG setup
 *
 * Usage:
 *   npm run list-orgs
 *   tsx scripts/rag/list-organizations.ts
 */

import { MongoClient } from 'mongodb';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.TARGET_URI;
const PLATFORM_DB_NAME = process.env.PLATFORM_DB_NAME || 'form_builder_platform';

async function listOrganizations() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI or TARGET_URI environment variable not set');
  }

  console.log('\n📋 Organizations in Platform Database\n');

  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  try {
    const db = client.db(PLATFORM_DB_NAME);
    const organizations = await db
      .collection('organizations')
      .find({})
      .project({ orgId: 1, name: 1, slug: 1, plan: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .toArray();

    if (organizations.length === 0) {
      console.log('❌ No organizations found\n');
      return;
    }

    console.log(`Found ${organizations.length} organization(s):\n`);

    organizations.forEach((org, index) => {
      console.log(`${index + 1}. ${org.name || 'Unnamed Organization'}`);
      console.log(`   Organization ID: ${org.orgId}`);
      console.log(`   Slug: ${org.slug || 'N/A'}`);
      console.log(`   Plan: ${org.plan || 'N/A'}`);
      console.log(`   Created: ${org.createdAt ? new Date(org.createdAt).toLocaleDateString() : 'N/A'}`);
      console.log('');
    });

    console.log('To set up RAG for an organization, run:');
    console.log(`npm run setup-rag-index -- --org ${organizations[0].orgId}\n`);

  } finally {
    await client.close();
  }
}

listOrganizations().catch(console.error);
