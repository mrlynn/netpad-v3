/**
 * Marketplace Seed Script
 *
 * Populates the marketplace with example applications.
 * Run with: npx tsx scripts/seed-marketplace.ts
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || process.env.PLATFORM_MONGODB_URI;
const DATABASE_NAME = process.env.PLATFORM_DB_NAME || 'form_builder_platform';

// Type definitions (matching src/types/template.ts)
interface ApplicationManifest {
  id?: string;
  name: string;
  version: string;
  description?: string;
  summary?: string;
  category: string;
  tags?: string[];
  icon?: string;
  author?: { name: string; email?: string; url?: string };
  license?: string;
  netpadVersion?: string;
  minimumNetpadVersion?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface FormDefinition {
  id?: string;
  slug?: string;
  name: string;
  description?: string;
  fieldConfigs: any[];
  applicationRole?: 'primary' | 'secondary' | 'supporting';
  displayOrder?: number;
}

interface WorkflowDefinition {
  id?: string;
  slug?: string;
  name: string;
  description?: string;
  canvas: any;
  settings: any;
  applicationRole?: 'primary' | 'secondary' | 'supporting';
  displayOrder?: number;
}

interface FormWorkflowConnection {
  id: string;
  formRef: string;
  workflowRef: string;
  type: 'trigger' | 'webhook' | 'manual' | 'scheduled';
  config?: {
    triggerOn?: 'submit' | 'update' | 'delete';
    conditions?: Array<{ field: string; operator: string; value: any }>;
  };
  description?: string;
  enabled?: boolean;
}

interface BundleExport {
  manifest: ApplicationManifest;
  forms?: FormDefinition[];
  workflows?: WorkflowDefinition[];
  connections?: FormWorkflowConnection[];
  theme?: any;
  project?: any;
  deployment?: any;
}

interface MarketplaceApplication {
  id: string;
  manifest: ApplicationManifest;
  bundle: BundleExport;
  published: boolean;
  status: 'pending' | 'approved' | 'rejected';
  isOfficial: boolean;
  publishedAt?: string;
  publishedBy?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  stats: {
    downloads: number;
    rating?: number;
    reviews: number;
  };
  createdAt: string;
  updatedAt: string;
}

async function loadITHelpDeskBundle(): Promise<BundleExport> {
  const templatesDir = path.join(process.cwd(), 'examples/it-helpdesk/templates');
  
  // Load manifest
  const manifestData = JSON.parse(
    fs.readFileSync(path.join(templatesDir, 'manifest.json'), 'utf-8')
  );

  // Load forms
  const formData = JSON.parse(
    fs.readFileSync(path.join(templatesDir, 'form.json'), 'utf-8')
  );
  const searchFormData = JSON.parse(
    fs.readFileSync(path.join(templatesDir, 'search-form.json'), 'utf-8')
  );

  // Load workflow
  const workflowData = JSON.parse(
    fs.readFileSync(path.join(templatesDir, 'workflow.json'), 'utf-8')
  );

  // Create form definitions
  const forms: FormDefinition[] = [
    {
      id: 'form_ticket_submission',
      slug: 'it-support-request',
      name: formData.name,
      description: formData.description,
      fieldConfigs: formData.fieldConfigs,
      applicationRole: 'primary',
      displayOrder: 1,
    },
    {
      id: 'form_ticket_search',
      slug: 'ticket-search',
      name: searchFormData.name,
      description: searchFormData.description,
      fieldConfigs: searchFormData.fieldConfigs,
      applicationRole: 'secondary',
      displayOrder: 2,
    },
  ];

  // Create workflow definition
  const workflow: WorkflowDefinition = {
    id: 'workflow_ticket_routing',
    slug: 'ticket-routing',
    name: workflowData.name,
    description: workflowData.description,
    canvas: workflowData.canvas,
    settings: workflowData.settings || { executionMode: 'sequential', errorHandling: 'stop' },
    applicationRole: 'primary',
    displayOrder: 1,
  };

  // Update workflow form-trigger node to reference the form
  // Detect connections (workflow has form-trigger node)
  const connections: FormWorkflowConnection[] = [];
  if (workflow.canvas?.nodes) {
    const formTriggerNode = workflow.canvas.nodes.find(
      (node: any) => node.type === 'form-trigger'
    );
    
    if (formTriggerNode) {
      // The workflow JSON has "YOUR_FORM_ID_HERE" placeholder
      // Update it to reference the actual form
      const primaryForm = forms.find(f => f.applicationRole === 'primary') || forms[0];
      
      if (primaryForm) {
        // Update the workflow node to use the form ID/slug
        if (formTriggerNode.config) {
          // Use form ID if available, otherwise use slug
          formTriggerNode.config.formId = primaryForm.id || primaryForm.slug || 'form_ticket_submission';
        }
        
        connections.push({
          id: 'conn_ticket_submission_to_routing',
          formRef: primaryForm.id || primaryForm.slug || '',
          workflowRef: workflow.id || workflow.slug || '',
          type: 'trigger',
          config: {
            triggerOn: formTriggerNode.config?.triggerOn || 'submit',
            conditions: formTriggerNode.config?.conditions || [],
          },
          description: 'Automatically routes tickets when submitted',
          enabled: true,
        });
      }
    }
  }

  // Create enhanced manifest
  const manifest: ApplicationManifest = {
    id: 'it-helpdesk-v1',
    name: manifestData.name,
    version: manifestData.version,
    description: manifestData.description,
    summary: 'Complete IT support ticketing system with automated routing and notifications',
    category: manifestData.category,
    tags: manifestData.tags || [],
    icon: '🎫',
    author: {
      name: manifestData.author || 'NetPad Examples',
    },
    license: manifestData.license || 'MIT',
    netpadVersion: manifestData.netpadVersion,
    createdAt: manifestData.createdAt,
    updatedAt: manifestData.updatedAt,
  };

  // Create bundle
  const bundle: BundleExport = {
    manifest,
    forms,
    workflows: [workflow],
    connections,
    deployment: {
      mode: 'connected',
      environment: {
        required: [
          {
            name: 'MONGODB_URI',
            description: 'MongoDB connection string',
            required: true,
            generator: 'none',
          },
        ],
        optional: [
          {
            name: 'SLACK_WEBHOOK_URL',
            description: 'Slack webhook for critical ticket alerts',
            required: false,
            generator: 'none',
          },
        ],
      },
      database: {
        provisioning: 'auto',
        collections: [
          {
            name: 'tickets',
            description: 'IT support tickets',
            indexes: [
              {
                key: { ticketId: 1 },
                name: 'ticketId_idx',
                unique: true,
              },
            ],
          },
        ],
        indexes: [],
      },
      seed: {
        forms: true,
        workflows: true,
        sampleData: false,
      },
      integrations: {
        email: true,
        slack: true,
        mongodb: true,
      },
    },
  };

  return bundle;
}

async function seedMarketplace() {
  console.log('🌱 Seeding marketplace with example applications...\n');

  if (!MONGODB_URI) {
    console.error('❌ Error: MONGODB_URI environment variable is not set');
    console.error('   Set it in .env.local or export it before running this script');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    // Connect to database
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DATABASE_NAME);
    const collection = db.collection<MarketplaceApplication>('marketplace_applications');

    // Load IT Help Desk bundle
    console.log('📦 Loading IT Help Desk application...');
    const itHelpDeskBundle = await loadITHelpDeskBundle();

    const now = new Date().toISOString();

    // Create marketplace application
    const application: MarketplaceApplication = {
      id: itHelpDeskBundle.manifest.id!,
      manifest: itHelpDeskBundle.manifest,
      bundle: itHelpDeskBundle,
      published: true,
      status: 'approved', // Seed apps are pre-approved
      isOfficial: true, // Seed apps are official NetPad examples
      publishedAt: now,
      publishedBy: 'system',
      reviewedAt: now,
      reviewedBy: 'system',
      stats: {
        downloads: 0,
        rating: 4.8,
        reviews: 0,
      },
      createdAt: now,
      updatedAt: now,
    };

    // Check if application already exists
    const existing = await collection.findOne({ id: application.id });

    if (existing) {
      console.log(`⚠️  Application "${application.manifest.name}" already exists. Updating...`);
      await collection.updateOne(
        { id: application.id },
        { $set: application }
      );
      console.log(`✅ Updated application: ${application.manifest.name} v${application.manifest.version}`);
    } else {
      await collection.insertOne(application);
      console.log(`✅ Published application: ${application.manifest.name} v${application.manifest.version}`);
    }

    console.log(`\n📊 Application Stats:`);
    console.log(`   - Forms: ${application.bundle.forms?.length || 0}`);
    console.log(`   - Workflows: ${application.bundle.workflows?.length || 0}`);
    console.log(`   - Connections: ${application.bundle.connections?.length || 0}`);
    console.log(`   - Category: ${application.manifest.category}`);
    console.log(`   - Tags: ${application.manifest.tags?.join(', ') || 'none'}`);

    // Get total count
    const total = await collection.countDocuments({ published: true });
    console.log(`\n🎉 Marketplace seeded successfully!`);
    console.log(`   Total published applications: ${total}`);

  } catch (error) {
    console.error('❌ Error seeding marketplace:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run the seed script
if (require.main === module) {
  seedMarketplace()
    .then(() => {
      console.log('\n✅ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Seed failed:', error);
      process.exit(1);
    });
}

export { seedMarketplace };
