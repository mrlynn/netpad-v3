/**
 * Direct MongoDB Import for GitHub Analyzer workflow
 *
 * This script bypasses the API and inserts directly into MongoDB.
 * Use this for local development when authentication is not set up.
 *
 * Prerequisites:
 * 1. MongoDB URI available (from .env.local or environment)
 * 2. Organization and project already created via the UI
 *
 * Usage:
 *   MONGODB_URI="your_uri" npx tsx examples/github-analyzer/import-direct.ts \
 *     --orgId=org_xxx --projectId=proj_yyy
 */

import { MongoClient } from 'mongodb';
import { mainAuditWorkflow } from './netpad-workflow-config';

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace('--', '').split('=');
  acc[key] = value;
  return acc;
}, {} as Record<string, string>);

const orgId = args.orgId || process.env.NETPAD_ORG_ID;
const projectId = args.projectId || process.env.NETPAD_PROJECT_ID;
const applicationId = args.applicationId || process.env.NETPAD_APPLICATION_ID;

// Generate unique IDs
function generateId(prefix: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}_${result}`;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function importWorkflow() {
  console.log('🚀 Direct MongoDB Import for GitHub Analyzer\n');

  // Validate required parameters
  if (!orgId || !projectId) {
    console.log('❌ Missing required parameters\n');
    console.log('Usage:');
    console.log('  MONGODB_URI="your_uri" npx tsx examples/github-analyzer/import-direct.ts \\');
    console.log('    --orgId=org_xxx --projectId=proj_yyy\n');
    console.log('To get your IDs:');
    console.log('  1. Go to http://localhost:3000');
    console.log('  2. Navigate to Settings → Organizations');
    console.log('  3. Click the ID chips to copy org/project IDs');
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.log('❌ MONGODB_URI environment variable is not set\n');
    console.log('Set it from your .env.local file or provide it inline:');
    console.log('  MONGODB_URI="mongodb+srv://..." npx tsx examples/github-analyzer/import-direct.ts ...');
    process.exit(1);
  }

  console.log('📋 Configuration:');
  console.log(`   Org ID: ${orgId}`);
  console.log(`   Project ID: ${projectId}`);
  if (applicationId) {
    console.log(`   Application ID: ${applicationId}`);
  }
  console.log('');

  // Connect to MongoDB
  console.log('📡 Connecting to MongoDB...');
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('   Connected!\n');

    // The org database is named after the orgId
    const db = client.db(orgId);
    const workflowsCollection = db.collection('workflows');

    // Check if workflow already exists
    const existingSlug = await workflowsCollection.findOne({
      slug: mainAuditWorkflow.slug
    });

    if (existingSlug) {
      console.log(`⚠️  Workflow with slug "${mainAuditWorkflow.slug}" already exists`);
      console.log(`   Existing ID: ${existingSlug.id}`);
      console.log('');
      console.log('Options:');
      console.log('  1. Delete the existing workflow and try again');
      console.log('  2. View the existing workflow in NetPad');
      console.log(`   URL: http://localhost:3000/orgs/${orgId}/projects/${projectId}/workflows/${existingSlug.id}`);
      await client.close();
      return;
    }

    // Convert workflow config to NetPad canvas format
    const canvas = {
      nodes: mainAuditWorkflow.nodes.map(node => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: {
          label: node.id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          config: node.config,
        },
      })),
      edges: mainAuditWorkflow.edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourcePort,
        targetHandle: edge.targetPort,
      })),
      viewport: { x: 0, y: 0, zoom: 1 },
    };

    const now = new Date();
    const workflowId = generateId('wf');

    // Create workflow document matching WorkflowDocument type
    const workflowDoc = {
      id: workflowId,
      orgId,
      projectId,
      applicationId: applicationId || null,
      name: mainAuditWorkflow.name,
      description: mainAuditWorkflow.description,
      slug: mainAuditWorkflow.slug,
      canvas,
      settings: mainAuditWorkflow.settings || {
        executionMode: 'auto',
        maxExecutionTime: 300000,
        retryPolicy: { maxRetries: 3, backoffMs: 1000 },
        loggingLevel: 'info',
        enableParallelExecution: true,
        nodeTimeout: 60000,
        maxDataSize: 10485760,
      },
      variables: mainAuditWorkflow.variables || [],
      status: 'draft',
      version: 1,
      tags: ['github', 'ai-detection', 'audit', 'example'],
      createdAt: now,
      updatedAt: now,
      createdBy: 'system_import',
      lastModifiedBy: 'system_import',
      stats: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        lastExecutedAt: null,
      },
    };

    console.log(`📤 Creating workflow: ${mainAuditWorkflow.name}`);
    console.log(`   ID: ${workflowId}`);
    console.log(`   Slug: ${mainAuditWorkflow.slug}`);
    console.log(`   Nodes: ${canvas.nodes.length}`);
    console.log(`   Edges: ${canvas.edges.length}`);
    console.log('');

    // Insert the workflow
    await workflowsCollection.insertOne(workflowDoc);

    console.log('✅ Workflow imported successfully!\n');
    console.log('📌 Next steps:');
    console.log(`   1. Open NetPad: http://localhost:3000`);
    console.log(`   2. View workflow: http://localhost:3000/orgs/${orgId}/projects/${projectId}/workflows/${workflowId}`);
    console.log('');
    console.log('🔧 To configure the workflow:');
    console.log('   1. Set up MongoDB connection in NetPad Connection Vault');
    console.log('   2. Configure email credentials (optional)');
    console.log('   3. Add your GitHub token in workflow variables');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

importWorkflow();
