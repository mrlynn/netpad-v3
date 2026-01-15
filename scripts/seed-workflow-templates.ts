/**
 * Seed Workflow Templates
 *
 * Creates built-in workflow templates for each organization.
 * These templates provide starting points for common workflow patterns.
 *
 * Usage: npm run seed:workflow-templates
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { MongoClient } from 'mongodb';
import { getOrgDb } from '../src/lib/platform/db';
import { WorkflowTemplate } from '../src/types/application';
import { generateSecureId } from '../src/lib/encryption';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is not set');
  process.exit(1);
}

/**
 * Basic Approval Workflow Template
 * Simple request → approve/reject flow
 */
const basicApprovalTemplate: Omit<WorkflowTemplate, '_id' | 'createdAt'> = {
  templateId: generateSecureId('tpl'),
  name: 'Basic Approval Workflow',
  version: '1.0.0',
  tags: ['approval', 'review', 'basic'],
  definition: {
    canvas: {
      nodes: [
        {
          id: 'start',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: {
            label: 'Request Submitted',
            triggerType: 'form_submission',
          },
        },
        {
          id: 'review',
          type: 'action',
          position: { x: 300, y: 100 },
          data: {
            label: 'Review Request',
            actionType: 'review',
          },
        },
        {
          id: 'approve',
          type: 'action',
          position: { x: 500, y: 50 },
          data: {
            label: 'Approve',
            actionType: 'approve',
          },
        },
        {
          id: 'reject',
          type: 'action',
          position: { x: 500, y: 150 },
          data: {
            label: 'Reject',
            actionType: 'reject',
          },
        },
        {
          id: 'notify',
          type: 'action',
          position: { x: 700, y: 100 },
          data: {
            label: 'Notify User',
            actionType: 'notification',
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'review' },
        { id: 'e2', source: 'review', target: 'approve', condition: 'approved' },
        { id: 'e3', source: 'review', target: 'reject', condition: 'rejected' },
        { id: 'e4', source: 'approve', target: 'notify' },
        { id: 'e5', source: 'reject', target: 'notify' },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
    settings: {
      executionMode: 'sequential',
    },
    variables: [],
  },
  createdBy: 'system',
};

/**
 * Data Pipeline Template
 * fetch → transform → store pattern
 */
const dataPipelineTemplate: Omit<WorkflowTemplate, '_id' | 'createdAt'> = {
  templateId: generateSecureId('tpl'),
  name: 'Data Pipeline',
  version: '1.0.0',
  tags: ['data', 'pipeline', 'etl'],
  definition: {
    canvas: {
      nodes: [
        {
          id: 'trigger',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: {
            label: 'Data Source',
            triggerType: 'scheduled',
          },
        },
        {
          id: 'fetch',
          type: 'action',
          position: { x: 300, y: 100 },
          data: {
            label: 'Fetch Data',
            actionType: 'data_fetch',
          },
        },
        {
          id: 'transform',
          type: 'action',
          position: { x: 500, y: 100 },
          data: {
            label: 'Transform',
            actionType: 'data_transform',
          },
        },
        {
          id: 'store',
          type: 'action',
          position: { x: 700, y: 100 },
          data: {
            label: 'Store Results',
            actionType: 'data_store',
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'fetch' },
        { id: 'e2', source: 'fetch', target: 'transform' },
        { id: 'e3', source: 'transform', target: 'store' },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
    settings: {
      executionMode: 'sequential',
    },
    variables: [],
  },
  createdBy: 'system',
};

/**
 * Notification Flow Template
 * trigger → send notification
 */
const notificationFlowTemplate: Omit<WorkflowTemplate, '_id' | 'createdAt'> = {
  templateId: generateSecureId('tpl'),
  name: 'Notification Flow',
  version: '1.0.0',
  tags: ['notification', 'alert', 'communication'],
  definition: {
    canvas: {
      nodes: [
        {
          id: 'trigger',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: {
            label: 'Event Trigger',
            triggerType: 'webhook',
          },
        },
        {
          id: 'notify',
          type: 'action',
          position: { x: 300, y: 100 },
          data: {
            label: 'Send Notification',
            actionType: 'notification',
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'notify' },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
    settings: {
      executionMode: 'immediate',
    },
    variables: [],
  },
  createdBy: 'system',
};

async function seedWorkflowTemplates() {
  const client = new MongoClient(MONGODB_URI!);

  try {
    await client.connect();
    console.log('[Seed] Connected to MongoDB');

    // Get all organizations from platform DB
    const platformDb = client.db(process.env.PLATFORM_DB_NAME || 'form_builder_platform');
    const orgsCollection = platformDb.collection('organizations');
    const organizations = await orgsCollection.find({}).toArray();

    console.log(`[Seed] Found ${organizations.length} organizations`);

    let totalSeeded = 0;

    for (const org of organizations) {
      const orgId = org.orgId;
      if (!orgId) continue;

      try {
        const orgDb = client.db(orgId);
        const templatesCollection = orgDb.collection<WorkflowTemplate>('workflowTemplates');

        // Check if templates already exist (by createdBy: 'system')
        const existingCount = await templatesCollection.countDocuments({ createdBy: 'system' });
        if (existingCount >= 3) {
          console.log(`[Seed] ${orgId}: Templates already exist, skipping`);
          continue;
        }

        // Insert templates
        const templates = [
          { ...basicApprovalTemplate, createdAt: new Date() },
          { ...dataPipelineTemplate, createdAt: new Date() },
          { ...notificationFlowTemplate, createdAt: new Date() },
        ];

        // Check each template individually to avoid duplicates
        for (const template of templates) {
          const existing = await templatesCollection.findOne({ name: template.name, createdBy: 'system' });
          if (!existing) {
            await templatesCollection.insertOne(template as WorkflowTemplate);
            console.log(`[Seed] ${orgId}: Created template "${template.name}"`);
            totalSeeded++;
          }
        }
      } catch (error) {
        console.error(`[Seed] Error seeding templates for ${orgId}:`, error);
      }
    }

    console.log(`[Seed] Complete! Seeded ${totalSeeded} templates across ${organizations.length} organizations`);
  } catch (error) {
    console.error('[Seed] Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run if called directly
if (require.main === module) {
  seedWorkflowTemplates()
    .then(() => {
      console.log('[Seed] Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Seed] Script failed:', error);
      process.exit(1);
    });
}

export { seedWorkflowTemplates };
