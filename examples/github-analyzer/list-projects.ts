/**
 * List all projects in your NetPad database
 *
 * Run with: npx tsx examples/github-analyzer/list-projects.ts
 *
 * Requires MONGODB_URI environment variable to be set
 */

import { MongoClient } from 'mongodb';

async function listProjects() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.log('❌ MONGODB_URI environment variable is not set\n');
    console.log('Set it in your .env.local file or export it:');
    console.log('  export MONGODB_URI="mongodb+srv://..."\n');
    console.log('Or check your .env.local file for the connection string.');
    process.exit(1);
  }

  console.log('🔍 Connecting to MongoDB...\n');

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();

    // List organizations
    console.log('📁 Organizations:');
    console.log('-'.repeat(60));
    const orgs = await db.collection('organizations').find({}).toArray();
    for (const org of orgs) {
      console.log(`  ID: ${org.id || org._id}`);
      console.log(`  Name: ${org.name}`);
      console.log(`  Slug: ${org.slug || 'N/A'}`);
      console.log('');
    }

    // List projects
    console.log('📂 Projects:');
    console.log('-'.repeat(60));
    const projects = await db.collection('projects').find({}).toArray();

    if (projects.length === 0) {
      console.log('  No projects found. Create one in the NetPad UI first.');
    } else {
      for (const project of projects) {
        console.log(`  ID: ${project.id || project._id}`);
        console.log(`  Name: ${project.name}`);
        console.log(`  Org ID: ${project.orgId}`);
        console.log(`  Slug: ${project.slug || 'N/A'}`);
        console.log('');
      }
    }

    // Show usage example
    if (orgs.length > 0 && projects.length > 0) {
      const org = orgs[0];
      const project = projects[0];
      console.log('='.repeat(60));
      console.log('📌 Example import command:\n');
      console.log(`npx tsx examples/github-analyzer/import-to-netpad.ts \\`);
      console.log(`  --orgId=${org.id || org._id} \\`);
      console.log(`  --projectId=${project.id || project._id}`);
      console.log('');
      console.log('📌 Or view in browser:\n');
      console.log(`http://localhost:3000/orgs/${org.id || org._id}/projects/${project.id || project._id}/workflows`);
    }

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  } finally {
    await client.close();
  }
}

listProjects();
