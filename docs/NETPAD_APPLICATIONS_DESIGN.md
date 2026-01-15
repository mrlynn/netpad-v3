# NetPad Applications: Design for Form-Workflow Packages

## Overview

NetPad Applications are portable, self-contained packages that combine **forms**, **workflows**, and their **connections** into complete, deployable solutions. These applications can be shared via a marketplace, imported into any NetPad instance, and deployed as standalone or connected applications.

## Core Concepts

### 1. Form-Workflow Intersection

Forms and workflows connect through **form-trigger nodes** in workflows:

```typescript
// Workflow node that triggers on form submission
{
  type: "form-trigger",
  config: {
    formId: "form_abc123",  // References a form
    waitForValidation: false,
    includeMetadata: true
  }
}
```

**Connection Types:**
- **Direct**: Workflow has a `form-trigger` node that references a form by ID/slug
- **Implicit**: Form submission automatically triggers workflows with matching `formId`
- **Bidirectional**: Forms can reference workflows, workflows reference forms

### 2. Application Structure

An application is a complete package containing:
- **Forms**: One or more form definitions
- **Workflows**: One or more workflow definitions
- **Connections**: Explicit mappings between forms and workflows
- **Metadata**: Application name, description, version, author
- **Configuration**: Deployment settings, environment variables, database schema
- **Dependencies**: Required integrations, connections, or other applications

## JSON Schema

### Application Bundle Structure

```typescript
interface NetPadApplication {
  // Application metadata
  manifest: ApplicationManifest;
  
  // Core assets
  forms: FormDefinition[];
  workflows: WorkflowDefinition[];
  
  // Explicit connections between forms and workflows
  connections: FormWorkflowConnection[];
  
  // Optional assets
  theme?: FormTheme;
  branding?: ApplicationBranding;
  
  // Deployment configuration
  deployment?: DeploymentConfig;
  
  // Project metadata (for multi-form applications)
  project?: ProjectMetadata;
}
```

### Application Manifest

```typescript
interface ApplicationManifest {
  // Identity
  id: string;                    // Unique application ID (e.g., "it-helpdesk-v1")
  name: string;                  // Display name
  version: string;                // Semantic version (e.g., "1.2.0")
  description: string;           // Full description
  summary?: string;               // Short summary (1-2 sentences)
  
  // Authoring
  author: {
    name: string;
    email?: string;
    url?: string;
  };
  license?: string;               // e.g., "MIT", "Apache-2.0"
  
  // Compatibility
  netpadVersion?: string;         // NetPad version this was created with
  minimumNetpadVersion?: string; // Minimum required NetPad version
  
  // Categorization
  category: string;              // e.g., "helpdesk", "onboarding", "survey"
  tags: string[];                // Searchable tags
  icon?: string;                 // Icon URL or emoji
  
  // Marketplace metadata
  marketplace?: {
    featured?: boolean;
    downloads?: number;
    rating?: number;
    reviews?: number;
    price?: {
      type: 'free' | 'paid';
      amount?: number;
      currency?: string;
    };
  };
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  
  // Change log
  changelog?: ChangelogEntry[];
}
```

### Form-Workflow Connections

```typescript
interface FormWorkflowConnection {
  // Connection ID (for reference)
  id: string;
  
  // What connects
  formRef: string;               // Reference to form (by slug or ID)
  workflowRef: string;           // Reference to workflow (by slug or ID)
  
  // Connection type
  type: 'trigger' | 'webhook' | 'manual' | 'scheduled';
  
  // Configuration
  config?: {
    // For trigger connections
    triggerOn?: 'submit' | 'update' | 'delete';
    conditions?: {
      field: string;
      operator: string;
      value: any;
    }[];
    
    // For webhook connections
    webhookUrl?: string;
    webhookMethod?: string;
    
    // For scheduled connections
    schedule?: string;            // Cron expression
  };
  
  // Metadata
  description?: string;
  enabled?: boolean;
}
```

### Enhanced Form Definition

```typescript
interface FormDefinition {
  // Identity (will be regenerated on import)
  id?: string;                   // Original ID (for reference)
  slug?: string;                 // Original slug (for reference)
  
  // Core definition
  name: string;
  description?: string;
  fieldConfigs: FieldConfig[];
  
  // Configuration
  variables?: FormVariable[];
  events?: FormEvent[];
  theme?: FormTheme;
  branding?: FormBranding;
  multiPage?: MultiPageConfig;
  botProtection?: BotProtectionConfig;
  draftSettings?: DraftSettings;
  
  // Application-specific metadata
  applicationRole?: 'primary' | 'secondary' | 'supporting';
  displayOrder?: number;         // For multi-form applications
  
  // Timestamps (preserved for reference)
  createdAt?: string;
  updatedAt?: string;
}
```

### Enhanced Workflow Definition

```typescript
interface WorkflowDefinition {
  // Identity (will be regenerated on import)
  id?: string;                   // Original ID (for reference)
  slug?: string;                 // Original slug (for reference)
  
  // Core definition
  name: string;
  description?: string;
  canvas: WorkflowCanvas;
  settings: WorkflowSettings;
  
  // Configuration
  variables?: WorkflowVariable[];
  inputSchema?: JSONSchemaDefinition;
  outputSchema?: JSONSchemaDefinition;
  tags?: string[];
  
  // Application-specific metadata
  applicationRole?: 'primary' | 'secondary' | 'supporting';
  displayOrder?: number;         // For multi-workflow applications
  
  // Timestamps (preserved for reference)
  createdAt?: string;
  updatedAt?: string;
}
```

### Deployment Configuration

```typescript
interface DeploymentConfig {
  mode: 'standalone' | 'connected' | 'hybrid';
  
  environment: {
    required: EnvVarSpec[];
    optional: EnvVarSpec[];
  };
  
  database: {
    provisioning: 'auto' | 'manual' | 'existing';
    collections: CollectionSpec[];
    indexes: IndexSpec[];
  };
  
  seed: {
    forms: boolean;
    workflows: boolean;
    sampleData?: boolean;
    sampleDataCount?: number;
  };
  
  branding?: {
    appName: string;
    logo?: string;
    favicon?: string;
    primaryColor?: string;
  };
  
  // Integration requirements
  integrations?: {
    email?: boolean;
    slack?: boolean;
    webhook?: boolean;
    mongodb?: boolean;
  };
}
```

## Example: IT Help Desk Application

```json
{
  "manifest": {
    "id": "it-helpdesk-v1",
    "name": "IT Help Desk System",
    "version": "1.2.0",
    "description": "Complete IT support ticketing system with ticket submission, search & management, conditional fields, priority-based routing, automated notifications, and Slack escalation for critical tickets",
    "summary": "Full-featured IT help desk with automated ticket routing",
    "author": {
      "name": "NetPad Examples",
      "email": "examples@netpad.io"
    },
    "license": "MIT",
    "netpadVersion": "3.1.0",
    "minimumNetpadVersion": "3.0.0",
    "category": "helpdesk",
    "tags": ["helpdesk", "it-support", "ticketing", "automation"],
    "icon": "🎫",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-04T00:00:00.000Z"
  },
  "forms": [
    {
      "id": "form_ticket_submission",
      "slug": "it-support-request",
      "name": "IT Support Request",
      "description": "Submit a request for IT support",
      "applicationRole": "primary",
      "displayOrder": 1,
      "fieldConfigs": [...]
    },
    {
      "id": "form_ticket_search",
      "slug": "ticket-search",
      "name": "Ticket Search & Management",
      "description": "Search and manage IT support tickets",
      "applicationRole": "secondary",
      "displayOrder": 2,
      "fieldConfigs": [...]
    }
  ],
  "workflows": [
    {
      "id": "workflow_ticket_routing",
      "slug": "ticket-routing",
      "name": "IT Ticket Routing",
      "description": "Automated routing workflow for IT support tickets",
      "applicationRole": "primary",
      "displayOrder": 1,
      "canvas": {
        "nodes": [
          {
            "id": "trigger-1",
            "type": "form-trigger",
            "config": {
              "formId": "form_ticket_submission",  // References form by ID
              "waitForValidation": false
            }
          },
          ...
        ],
        "edges": [...]
      }
    }
  ],
  "connections": [
    {
      "id": "conn_ticket_submission_to_routing",
      "formRef": "form_ticket_submission",
      "workflowRef": "workflow_ticket_routing",
      "type": "trigger",
      "config": {
        "triggerOn": "submit",
        "conditions": []
      },
      "description": "Automatically routes tickets when submitted",
      "enabled": true
    }
  ],
  "deployment": {
    "mode": "connected",
    "environment": {
      "required": [
        {
          "name": "MONGODB_URI",
          "description": "MongoDB connection string",
          "required": true
        }
      ],
      "optional": [
        {
          "name": "SLACK_WEBHOOK_URL",
          "description": "Slack webhook for critical ticket alerts",
          "required": false
        }
      ]
    },
    "database": {
      "provisioning": "auto",
      "collections": [
        {
          "name": "tickets",
          "description": "IT support tickets"
        }
      ],
      "indexes": [
        {
          "key": { "ticketId": 1 },
          "name": "ticketId_idx",
          "unique": true
        }
      ]
    },
    "seed": {
      "forms": true,
      "workflows": true,
      "sampleData": false
    },
    "integrations": {
      "email": true,
      "slack": true,
      "mongodb": true
    }
  }
}
```

## Import/Export Process

### Export Process

1. **Collect Assets**
   - Gather all forms in the application
   - Gather all workflows in the application
   - Identify form-workflow connections (by analyzing workflow nodes)

2. **Resolve References**
   - Convert internal IDs to references (slugs or stable IDs)
   - Create connection mappings
   - Clean sensitive data (org IDs, user IDs, connection strings)

3. **Generate Manifest**
   - Create application manifest with metadata
   - Include version, author, dependencies

4. **Package Bundle**
   - Combine forms, workflows, connections, manifest
   - Include deployment configuration
   - Generate JSON bundle

### Import Process

1. **Validate Bundle**
   - Check manifest compatibility
   - Validate JSON schema
   - Verify required dependencies

2. **Resolve References**
   - Map form references to new form IDs
   - Map workflow references to new workflow IDs
   - Update form-trigger nodes with new form IDs

3. **Create Assets**
   - Import forms (generate new IDs)
   - Import workflows (generate new IDs, update form references)
   - Create explicit connections

4. **Configure**
   - Set up environment variables
   - Provision database collections
   - Configure integrations

5. **Activate**
   - Enable workflows
   - Publish forms
   - Seed sample data (if configured)

## Marketplace Structure

### Marketplace API

```typescript
// Get all applications
GET /api/marketplace/applications
Query params: category, tags, search, sort, limit, offset

// Get application details
GET /api/marketplace/applications/:applicationId

// Download application bundle
GET /api/marketplace/applications/:applicationId/download

// Import application
POST /api/marketplace/applications/:applicationId/import
Body: { orgId, options: { overwriteExisting, generateNewIds } }
```

### Marketplace UI

- **Browse**: Category-based browsing, search, filters
- **Preview**: View forms, workflows, connections before importing
- **Import**: One-click import with configuration wizard
- **Manage**: View imported applications, update, remove

## Implementation Plan

### Phase 1: Core Application Structure
- [ ] Extend `BundleExport` type to include `connections`
- [ ] Create `FormWorkflowConnection` type
- [ ] Update export utilities to detect and include connections
- [ ] Update import utilities to resolve references

### Phase 2: Application Export
- [ ] Create application export endpoint
- [ ] Build connection detection logic
- [ ] Generate application manifests
- [ ] Add export UI to projects/forms/workflows

### Phase 3: Application Import
- [ ] Create application import endpoint
- [ ] Build reference resolution logic
- [ ] Update form-trigger nodes with new IDs
- [ ] Add import UI with preview

### Phase 4: Marketplace
- [ ] Create marketplace API endpoints
- [ ] Build marketplace UI
- [ ] Add application discovery
- [ ] Implement import from marketplace

### Phase 5: Enhanced Features
- [ ] Application versioning
- [ ] Update existing applications
- [ ] Application dependencies
- [ ] Application templates

## Key Design Decisions

### 1. Reference Resolution

**Problem**: Forms and workflows use IDs that change on import.

**Solution**: 
- Use slugs as stable references where possible
- Store original IDs in definitions for reference
- Resolve references during import by matching slugs/names
- Update form-trigger nodes with new form IDs

### 2. Connection Discovery

**Problem**: How to automatically detect form-workflow connections?

**Solution**:
- Analyze workflow nodes for `form-trigger` types
- Extract `formId` from node config
- Match against forms in the application
- Create explicit connection records

### 3. Multi-Form Applications

**Problem**: Applications may have multiple forms with different roles.

**Solution**:
- Add `applicationRole` to form/workflow definitions
- Use `displayOrder` for UI ordering
- Support primary/secondary/supporting roles

### 4. Dependency Management

**Problem**: Applications may require integrations or other applications.

**Solution**:
- Declare dependencies in manifest
- Check dependencies during import
- Provide setup wizard for missing dependencies

## Benefits

1. **Portability**: Complete applications can be moved between instances
2. **Reusability**: Share applications with community
3. **Consistency**: Standardized way to package forms + workflows
4. **Discoverability**: Marketplace makes applications easy to find
5. **Rapid Deployment**: Import and deploy complete solutions quickly
6. **Version Control**: Track application versions and updates

## Next Steps

1. Review and refine this design
2. Implement Phase 1 (core structure)
3. Create example applications
4. Build import/export UI
5. Launch marketplace
