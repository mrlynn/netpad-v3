/**
 * Import GitHub Analyzer workflow into NetPad
 *
 * Prerequisites:
 * 1. NetPad must be running (npm run dev)
 * 2. You must be logged in
 * 3. You need an orgId and projectId
 *
 * Usage:
 *   npx tsx examples/github-analyzer/import-to-netpad.ts --orgId=xxx --projectId=yyy
 *
 * Or set environment variables:
 *   NETPAD_ORG_ID=xxx NETPAD_PROJECT_ID=yyy npx tsx examples/github-analyzer/import-to-netpad.ts
 */

import { mainAuditWorkflow } from './netpad-workflow-config';

const NETPAD_URL = process.env.NETPAD_URL || 'http://localhost:3000';

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace('--', '').split('=');
  acc[key] = value;
  return acc;
}, {} as Record<string, string>);

const orgId = args.orgId || process.env.NETPAD_ORG_ID;
const projectId = args.projectId || process.env.NETPAD_PROJECT_ID;
const applicationId = args.applicationId || process.env.NETPAD_APPLICATION_ID;

async function importWorkflow() {
  console.log('🚀 Importing GitHub Analyzer workflow into NetPad\n');

  if (!orgId || !projectId) {
    console.log('❌ Missing required parameters\n');
    console.log('Usage:');
    console.log('  npx tsx examples/github-analyzer/import-to-netpad.ts --orgId=xxx --projectId=yyy\n');
    console.log('Or set environment variables:');
    console.log('  NETPAD_ORG_ID=xxx NETPAD_PROJECT_ID=yyy npx tsx examples/github-analyzer/import-to-netpad.ts\n');
    console.log('To find your orgId and projectId:');
    console.log('  1. Go to http://localhost:3000');
    console.log('  2. Navigate to your project');
    console.log('  3. Check the URL: /orgs/{orgId}/projects/{projectId}');
    process.exit(1);
  }

  console.log(`📋 Configuration:`);
  console.log(`   NetPad URL: ${NETPAD_URL}`);
  console.log(`   Org ID: ${orgId}`);
  console.log(`   Project ID: ${projectId}`);
  if (applicationId) {
    console.log(`   Application ID: ${applicationId}`);
  }
  console.log('');

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

  const workflowData = {
    orgId,
    projectId,
    applicationId,
    name: mainAuditWorkflow.name,
    description: mainAuditWorkflow.description,
    slug: mainAuditWorkflow.slug,
    canvas,
    variables: mainAuditWorkflow.variables,
    inputSchema: mainAuditWorkflow.inputSchema,
    settings: mainAuditWorkflow.settings,
    tags: ['github', 'ai-detection', 'audit'],
  };

  console.log(`📤 Creating workflow: ${mainAuditWorkflow.name}`);
  console.log(`   Nodes: ${canvas.nodes.length}`);
  console.log(`   Edges: ${canvas.edges.length}`);
  console.log('');

  try {
    const response = await fetch(`${NETPAD_URL}/api/workflows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In a real scenario, you'd need to include auth cookies/headers
        // For local dev, the session cookie should be sent automatically if using browser
      },
      body: JSON.stringify(workflowData),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log('✅ Workflow created successfully!');
      console.log(`   Workflow ID: ${result.workflow?.id || result.workflowId}`);
      console.log(`   View at: ${NETPAD_URL}/orgs/${orgId}/projects/${projectId}/workflows/${result.workflow?.id || result.workflowId}`);
    } else {
      console.log('❌ Failed to create workflow');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${result.error || JSON.stringify(result)}`);

      if (response.status === 401) {
        console.log('\n💡 Tip: Make sure you are logged into NetPad in your browser.');
        console.log('   The API uses cookie-based authentication.');
      }
    }
  } catch (error) {
    console.log('❌ Network error');
    console.log(`   ${error instanceof Error ? error.message : error}`);
    console.log('\n💡 Make sure NetPad is running: npm run dev');
  }
}

importWorkflow();
