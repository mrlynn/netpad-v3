# NetPad Application Marketplace - npm Integration Architecture

## Overview

This document outlines the architecture for integrating npmjs.org with the NetPad Application Marketplace, enabling community-driven distribution of NetPad Applications and Plugins similar to n8n's community nodes and plugin system.

## Key Insight: Applications vs Plugins

**Applications** (like n8n's workflows):
- Complete, self-contained solutions
- Include forms, workflows, and configuration
- Can be installed and used immediately
- Example: "Customer Feedback App", "IT Helpdesk App"

**Plugins** (like n8n's community nodes):
- Extend NetPad's core capabilities
- Provide reusable components (custom nodes, field types, integrations)
- Used BY applications, not standalone
- Example: "Slack Integration Plugin", "Custom Date Picker Field Plugin"

## Goals

1. **Dual Distribution Channels**: Support both web-based marketplace and npm packages
2. **Community-Driven**: Enable developers to publish applications via npm
3. **Seamless Installation**: Install applications via npm CLI or web UI
4. **Version Management**: Leverage npm's semantic versioning and dependency management
5. **Security & Verification**: Verify packages and maintain trust
6. **Lifecycle Management**: Full application lifecycle (install, update, uninstall)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    NetPad Application                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Forms     │  │  Workflows   │  │   Config     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Export
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Application Bundle (JSON)                      │
│  - Application metadata                                      │
│  - Forms definitions                                         │
│  - Workflows definitions                                     │
│  - Configuration schemas                                     │
│  - Dependencies                                             │
└─────────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
        ▼                                   ▼
┌──────────────────┐              ┌──────────────────┐
│  Web Marketplace │              │   npm Package    │
│  (netpad.app)    │              │  (npmjs.org)     │
└──────────────────┘              └──────────────────┘
        │                                   │
        └─────────────────┬─────────────────┘
                          │
                          ▼
              ┌──────────────────────┐
              │  NetPad Instance     │
              │  (User's Org)        │
              └──────────────────────┘
```

## npm Package Structure

### Package Naming Convention

### Official vs Community Packages

**Official Packages** (Published by NetPad team):
- **Scope**: `@netpad/` (requires npm scope ownership)
- **Verification**: Pre-verified, trusted, maintained by NetPad
- **Examples**:
  - `@netpad/app-customer-feedback`
  - `@netpad/plugin-node-slack`

**Community Packages** (Published by developers):
- **Option 1**: Developer's own scope: `@your-org/netpad-app-*` or `@your-org/netpad-plugin-*`
- **Option 2**: Unscoped with naming convention: `netpad-app-*` or `netpad-plugin-*`
- **Verification**: Community-rated, developer-maintained
- **Examples**:
  - `@acme-corp/netpad-app-event-registration`
  - `@john-doe/netpad-plugin-node-custom-api`
  - `netpad-app-community-survey` (unscoped)
  - `netpad-plugin-field-signature` (unscoped)

### Applications
- **Official**: `@netpad/app-<slug>`
- **Community**: `@your-org/netpad-app-<slug>` or `netpad-app-<slug>`
- **Keywords**: Must include `netpad-app` in package.json keywords for discovery
- **Examples**:
  - `@netpad/app-customer-feedback` (official)
  - `@acme-corp/netpad-app-event-registration` (community)
  - `netpad-app-community-survey` (community, unscoped)

### Plugins
- **Official**: `@netpad/plugin-<type>-<name>`
- **Community**: `@your-org/netpad-plugin-<type>-<name>` or `netpad-plugin-<type>-<name>`
- **Types**: `node`, `field`, `integration`, `theme`, `hook`
- **Keywords**: Must include `netpad-plugin` and `netpad-community-plugin` in package.json keywords for discovery
- **Examples**:
  - `@netpad/plugin-node-slack` (official)
  - `@acme-corp/netpad-plugin-node-custom-api` (community)
  - `netpad-plugin-field-signature` (community, unscoped)

### Official Application Package.json Structure

```json
{
  "name": "@netpad/app-customer-feedback",
  "version": "1.2.0",
  "description": "Customer feedback collection application with rating and comments",
  "keywords": ["netpad", "netpad-app", "forms", "feedback", "customer"],
  "author": "NetPad Community",
  "license": "MIT",
  "main": "dist/bundle.json",
  "files": [
    "dist/bundle.json",
    "README.md",
    "CHANGELOG.md",
    "LICENSE"
  ],
  "netpad": {
    "type": "application",
    "applicationId": "app_customer_feedback",
    "name": "Customer Feedback",
    "description": "Collect and manage customer feedback",
    "version": "1.2.0",
    "minNetPadVersion": "3.0.0",
    "category": "customer-engagement",
    "tags": ["feedback", "ratings", "customer"],
    "icon": "https://cdn.netpad.app/icons/customer-feedback.svg",
    "screenshots": [
      "https://cdn.netpad.app/screenshots/customer-feedback-1.png"
    ],
    "dependencies": {
      "applications": [
        "@netpad/app-notifications@^1.0.0"
      ],
      "plugins": [
        "@netpad/plugin-node-slack@^1.0.0",
        "@netpad/plugin-field-rating@^2.0.0"
      ],
      "workflowTemplates": [
        "@netpad/template-email-notification@^1.0.0"
      ]
    },
    "contract": {
      "inputs": [
        {
          "key": "customerEmail",
          "type": "string",
          "required": true,
          "source": "form"
        }
      ],
      "outputs": [
        {
          "key": "feedbackId",
          "type": "string",
          "guaranteed": true
        }
      ],
      "events": [
        {
          "name": "feedback.submitted",
          "payloadSchemaRef": "#/schemas/feedbackPayload"
        }
      ]
    },
    "configSchema": {
      "fields": [
        {
          "key": "notificationEmail",
          "type": "string",
          "required": false,
          "description": "Email to receive feedback notifications"
        }
      ]
    }
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/netpad-community/app-customer-feedback"
  },
  "bugs": {
    "url": "https://github.com/netpad-community/app-customer-feedback/issues"
  }
}
```

### Community Application Package.json Structure

```json
{
  "name": "@acme-corp/netpad-app-event-registration",
  "version": "1.0.0",
  "description": "Event registration application for conferences and workshops",
  "keywords": ["netpad", "netpad-app", "netpad-community-app", "events", "registration"],
  "author": "ACME Corp",
  "license": "MIT",
  "main": "dist/bundle.json",
  "files": [
    "dist/bundle.json",
    "README.md",
    "CHANGELOG.md",
    "LICENSE"
  ],
  "netpad": {
    "type": "application",
    "applicationId": "app_event_registration",
    "name": "Event Registration",
    "description": "Complete event registration solution",
    "version": "1.0.0",
    "minNetPadVersion": "3.0.0",
    "category": "events",
    "tags": ["events", "registration", "tickets"],
    "verified": false,
    "publisher": {
      "name": "ACME Corp",
      "email": "dev@acme-corp.com"
    },
    "dependencies": {
      "plugins": [
        "@netpad/plugin-field-date-picker@^1.0.0"
      ]
    }
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/acme-corp/netpad-app-event-registration"
  }
}
```

### Official Plugin Package.json Structure

```json
{
  "name": "@netpad/plugin-node-slack",
  "version": "1.0.0",
  "description": "Slack integration node for NetPad workflows",
  "keywords": ["netpad", "netpad-plugin", "slack", "workflow"],
  "author": "NetPad Community",
  "license": "MIT",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist/",
    "README.md",
    "CHANGELOG.md",
    "LICENSE"
  ],
  "netpad": {
    "type": "plugin",
    "pluginType": "node",
    "name": "Slack Node",
    "description": "Send messages, create channels, and interact with Slack",
    "version": "1.0.0",
    "minNetPadVersion": "3.0.0",
    "category": "integrations",
    "tags": ["slack", "messaging", "notifications"],
    "icon": "https://cdn.netpad.app/plugins/slack/icon.svg",
    "nodes": [
      {
        "name": "Slack Send Message",
        "type": "netpad-slack-send",
        "description": "Send a message to a Slack channel",
        "version": "1.0.0",
        "category": "communication",
        "icon": "slack",
        "code": "dist/nodes/slack-send.node.js",
        "codex": "dist/nodes/slack-send.node.json"
      },
      {
        "name": "Slack Create Channel",
        "type": "netpad-slack-channel",
        "description": "Create a new Slack channel",
        "version": "1.0.0",
        "category": "communication",
        "icon": "slack",
        "code": "dist/nodes/slack-channel.node.js",
        "codex": "dist/nodes/slack-channel.node.json"
      }
    ],
    "credentials": [
      {
        "name": "Slack API",
        "type": "netpad-slack-api",
        "description": "Slack API credentials",
        "code": "dist/credentials/slack-api.credentials.js"
      }
    ],
    "dependencies": {
      "plugins": [
        "@netpad/plugin-credential-oauth@^1.0.0"
      ]
    }
  },
  "scripts": {
    "build": "netpad-plugin build",
    "dev": "netpad-plugin dev",
    "test": "netpad-plugin test",
    "lint": "netpad-plugin lint"
  },
  "devDependencies": {
    "@netpad/plugin-sdk": "^1.0.0",
    "typescript": "^5.0.0"
  },
  "dependencies": {
    "@slack/web-api": "^6.0.0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/netpad-community/plugin-slack"
  }
}
```

### Community Plugin Package.json Structure

```json
{
  "name": "@acme-corp/netpad-plugin-node-custom-api",
  "version": "1.0.0",
  "description": "Custom API integration node for ACME's internal services",
  "keywords": ["netpad", "netpad-plugin", "netpad-community-plugin", "api", "custom"],
  "author": "ACME Corp",
  "license": "MIT",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist/",
    "README.md",
    "CHANGELOG.md",
    "LICENSE"
  ],
  "netpad": {
    "type": "plugin",
    "pluginType": "node",
    "name": "ACME Custom API Node",
    "description": "Integration with ACME's internal API services",
    "version": "1.0.0",
    "minNetPadVersion": "3.0.0",
    "category": "integrations",
    "tags": ["acme", "api", "internal"],
    "verified": false,
    "publisher": {
      "name": "ACME Corp",
      "email": "dev@acme-corp.com"
    },
    "nodes": [
      {
        "name": "ACME API Call",
        "type": "acme-api-call",
        "description": "Make API call to ACME services",
        "version": "1.0.0",
        "category": "custom",
        "icon": "api",
        "code": "dist/nodes/acme-api.node.js",
        "codex": "dist/nodes/acme-api.node.json"
      }
    ]
  },
  "scripts": {
    "build": "netpad-plugin build",
    "dev": "netpad-plugin dev",
    "test": "netpad-plugin test",
    "lint": "netpad-plugin lint"
  },
  "devDependencies": {
    "@netpad/plugin-sdk": "^1.0.0",
    "typescript": "^5.0.0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/acme-corp/netpad-plugin-custom-api"
  }
}
```

### Bundle Structure (dist/bundle.json)

```json
{
  "manifest": {
    "version": "1.2.0",
    "applicationId": "app_customer_feedback",
    "name": "Customer Feedback",
    "description": "Collect and manage customer feedback",
    "createdAt": "2025-01-15T00:00:00Z",
    "minNetPadVersion": "3.0.0"
  },
  "forms": [
    {
      "formId": "form_feedback_001",
      "name": "Customer Feedback Form",
      "description": "Main feedback collection form",
      "role": "primary",
      "definition": { /* FormConfiguration */ }
    }
  ],
  "workflows": [
    {
      "workflowId": "workflow_notify_001",
      "name": "Send Feedback Notification",
      "role": "core",
      "definition": { /* WorkflowDocument */ }
    }
  ],
  "configSchema": {
    "fields": [ /* ConfigSchema fields */ ]
  },
  "contract": {
    "inputs": [ /* ApplicationContract inputs */ ],
    "outputs": [ /* ApplicationContract outputs */ ],
    "events": [ /* ApplicationContract events */ ]
  },
  "dependencies": {
    "applications": [
      {
        "packageName": "@netpad/app-notifications",
        "version": "^1.0.0",
        "applicationId": "app_notifications"
      }
    ]
  }
}
```

## Installation Methods

### 1. Web UI Installation (Primary)

**Flow:**
1. User browses marketplace (web or npm search)
2. Clicks "Install" on an application
3. NetPad backend:
   - Fetches package from npm registry
   - Validates package structure
   - Resolves dependencies
   - Imports application into user's org
   - Creates application with `marketplaceApplicationId` and `marketplaceVersion`

**API Endpoint:**
```
POST /api/marketplace/applications/install
{
  "packageName": "@netpad/app-customer-feedback",
  "version": "1.2.0", // optional, defaults to latest
  "projectId": "proj_xxx",
  "applicationId": "app_xxx" // optional, for updates
}
```

### 2. CLI Installation (Advanced)

**Flow:**
1. User runs: `npx @netpad/cli install @netpad/app-customer-feedback`
2. CLI authenticates with NetPad API
3. CLI downloads package from npm
4. CLI calls NetPad API to import application
5. Application appears in user's NetPad instance

**CLI Command:**
```bash
# Install application
npx @netpad/cli install @netpad/app-customer-feedback --org org_xxx --project proj_xxx

# Update application
npx @netpad/cli update @netpad/app-customer-feedback --org org_xxx --project proj_xxx

# List installed applications
npx @netpad/cli list --org org_xxx

# Uninstall application
npx @netpad/cli uninstall @netpad/app-customer-feedback --org org_xxx --project proj_xxx
```

### 3. Direct npm Install (Self-Hosted)

**Flow:**
1. User installs package: `npm install @netpad/app-customer-feedback` (official) or `npm install @acme-corp/netpad-app-event-registration` (community)
2. Package is in `node_modules/@netpad/app-customer-feedback` or `node_modules/@acme-corp/netpad-app-event-registration`
3. NetPad instance scans `node_modules` for packages with:
   - `netpad.type === "application"` or `netpad.type === "plugin"` in package.json
   - Keywords include `netpad-app` or `netpad-plugin`
4. Applications/plugins are auto-discovered and available for import
5. Works for both official (`@netpad/`) and community packages

**Configuration:**
```json
// netpad.config.json
{
  "applications": {
    "scanNodeModules": true,
    "nodeModulesPath": "./node_modules"
  }
}
```

## Package Development Workflow

### 1. Create Package

```bash
# Use NetPad CLI to scaffold
npx @netpad/cli create-app my-customer-feedback

# Structure:
# my-customer-feedback/
#   ├── package.json
#   ├── src/
#   │   ├── forms/
#   │   │   └── feedback-form.json
#   │   ├── workflows/
#   │   │   └── notify-workflow.json
#   │   └── config-schema.json
#   ├── dist/
#   │   └── bundle.json (generated)
#   ├── README.md
#   └── CHANGELOG.md
```

### 2. Build Package

```bash
# Build bundle from source
npm run build

# Validates:
# - All forms are valid
# - All workflows are valid
# - Config schema is valid
# - Contract is valid
# - Dependencies are resolvable
```

### 3. Publish Package

```bash
# Publish to npm
npm publish

# NetPad marketplace sync:
# - Monitors npm registry for @netpad/* packages
# - Indexes new packages automatically
# - Updates marketplace listings
```

### 4. Verification Process

**For Official Packages (`@netpad/` scope):**
- Published by NetPad team (requires npm scope ownership)
- Manual review by NetPad team
- Security audit
- Functionality testing
- Documentation review
- Badge: "Verified by NetPad" (always verified)
- Auto-updates from NetPad team

**For Community Packages:**
- Published by any developer (their own scope or unscoped)
- Automated validation (structure, syntax, security scan)
- Community ratings/reviews
- Usage statistics
- Badge: "Community Package" (default)
- Optional: "Verified by NetPad" badge (if NetPad team reviews and approves)
- Developer maintains and updates

**Publishing Workflow:**
1. Developer creates package with their own scope or unscoped name
2. Developer publishes to npm: `npm publish`
3. NetPad marketplace sync discovers package (via keywords)
4. Package appears in marketplace as "Community Package"
5. Optional: Developer can submit for official verification (NetPad team review)
6. If verified, package gets "Verified by NetPad" badge but remains in developer's scope

## Integration Points

### 1. Marketplace API Enhancement

**Current:** Web-only marketplace
**Enhanced:** npm-aware marketplace

```typescript
// GET /api/marketplace/applications
{
  "sources": ["web", "npm"], // Filter by source
  "packageName": "@netpad/app-*", // Search npm packages
  "verified": true // Only verified packages
}
```

### 2. Application Import Service

**New Service:** `src/lib/marketplace/npmImporter.ts`

```typescript
export async function importFromNpm(
  packageName: string,
  version?: string,
  orgId: string,
  projectId: string
): Promise<Application> {
  // 1. Fetch package from npm registry
  // 2. Validate package structure
  // 3. Resolve dependencies
  // 4. Import application
  // 5. Set marketplaceApplicationId and marketplaceVersion
}
```

### 3. Package Registry Sync

**Background Job:** Sync npm registry with marketplace

```typescript
// Periodic job (every hour)
export async function syncNpmRegistry() {
  // 1. Query npm registry for:
  //    - @netpad/* packages (official)
  //    - Packages with keywords: "netpad-app", "netpad-plugin", "netpad-community-app", "netpad-community-plugin"
  // 2. Filter packages with netpad.type in package.json
  // 3. Compare with marketplace database
  // 4. Index new packages
  // 5. Update existing packages
  // 6. Mark deprecated packages
  // 7. Flag official packages (@netpad/ scope) as verified
}
```

**npm Registry Search:**
```typescript
// Search for NetPad packages
const searchQuery = {
  text: 'keywords:netpad-app OR keywords:netpad-plugin OR keywords:netpad-community-app OR keywords:netpad-community-plugin',
  size: 250
};

// Or search by scope
const officialPackages = await npmRegistry.search('scope:@netpad');
```

## Plugin System Architecture

### Plugin Types

1. **Workflow Node Plugins** (`plugin-node-*`)
   - Custom workflow nodes (like n8n's community nodes)
   - Extend workflow capabilities
   - Example: `@netpad/plugin-node-slack`, `@netpad/plugin-node-openai`

2. **Form Field Plugins** (`plugin-field-*`)
   - Custom form field types
   - Extend form builder capabilities
   - Example: `@netpad/plugin-field-date-picker`, `@netpad/plugin-field-signature`

3. **Integration Plugins** (`plugin-integration-*`)
   - Third-party service integrations
   - Provide connections and APIs
   - Example: `@netpad/plugin-integration-stripe`, `@netpad/plugin-integration-sendgrid`

4. **Theme Plugins** (`plugin-theme-*`)
   - UI themes and styling
   - Customize form/workflow appearance
   - Example: `@netpad/plugin-theme-dark-mode`, `@netpad/plugin-theme-corporate`

5. **Hook Plugins** (`plugin-hook-*`)
   - Custom lifecycle hooks
   - Extend form/workflow execution
   - Example: `@netpad/plugin-hook-webhook`, `@netpad/plugin-hook-validation`

### Plugin Discovery & Loading

**Auto-Discovery (like n8n):**
- NetPad scans `node_modules` for packages with:
  - `netpad.type === "plugin"` OR `netpad.type === "application"` in package.json
  - Keywords include `netpad-plugin` or `netpad-app`
- Loads plugins automatically on startup
- Registers nodes, fields, integrations, etc.
- Works for both official (`@netpad/`) and community packages

**Discovery Keywords:**
- Applications: Must include `netpad-app` in keywords
- Plugins: Must include `netpad-plugin` in keywords
- Community packages: Should also include `netpad-community-plugin` or `netpad-community-app`

**Manual Installation:**
- Via CLI: `npx @netpad/cli install @netpad/plugin-node-slack` (official)
- Via CLI: `npx @netpad/cli install @acme-corp/netpad-plugin-node-custom-api` (community)
- Via Web UI: Browse marketplace → Install plugin (searches both official and community)
- Via npm: `npm install @netpad/plugin-node-slack` or `npm install @acme-corp/netpad-plugin-node-custom-api`

### Plugin Structure

```
@netpad/plugin-node-slack/
├── package.json
├── src/
│   ├── nodes/
│   │   ├── slack-send.node.ts
│   │   ├── slack-channel.node.ts
│   │   └── slack-send.node.json (codex metadata)
│   ├── credentials/
│   │   └── slack-api.credentials.ts
│   └── index.ts
├── dist/
│   ├── nodes/
│   │   ├── slack-send.node.js
│   │   └── slack-send.node.json
│   └── credentials/
│       └── slack-api.credentials.js
├── README.md
└── CHANGELOG.md
```

### Plugin SDK

**`@netpad/plugin-sdk`** provides:
- Type definitions for nodes, fields, integrations, themes, hooks
- Runtime utilities for plugin execution
- Testing utilities
- Build tools (`netpad-plugin` CLI)
- UI component helpers

#### Example: Custom Workflow Node Plugin

```typescript
// src/nodes/slack-send.node.ts
import { NodeDefinition, PluginExecutionContext } from '@netpad/plugin-sdk';
import { WebClient } from '@slack/web-api';

export const SlackSendNode: NodeDefinition = {
  name: 'Slack Send Message',
  type: 'netpad-slack-send',
  description: 'Send a message to a Slack channel',
  version: '1.0.0',
  category: 'communication',
  icon: 'slack',
  group: ['communication'],
  
  // Node configuration schema
  properties: [
    {
      name: 'channel',
      type: 'string',
      required: true,
      displayName: 'Channel',
      description: 'Slack channel ID or name',
      placeholder: '#general'
    },
    {
      name: 'message',
      type: 'string',
      required: true,
      displayName: 'Message',
      description: 'Message text',
      typeOptions: {
        multiline: true
      }
    },
    {
      name: 'username',
      type: 'string',
      required: false,
      displayName: 'Username',
      description: 'Override bot username'
    }
  ],
  
  // Input/output definitions
  inputs: {
    main: {
      type: 'main',
      description: 'Input data'
    }
  },
  
  outputs: {
    main: {
      type: 'main',
      description: 'Output data with messageId'
    }
  },
  
  // Credentials required
  credentials: [
    {
      name: 'slackApi',
      required: true
    }
  ],
  
  // Execution function
  execute: async function(
    this: IExecuteFunctions,
    context: PluginExecutionContext
  ) {
    const items = this.getInputData();
    const returnData: IDataObject[] = [];
    
    // Get credentials
    const credentials = await this.getCredentials('slackApi');
    const client = new WebClient(credentials.token as string);
    
    // Process each item
    for (let i = 0; i < items.length; i++) {
      const channel = this.getNodeParameter('channel', i) as string;
      const message = this.getNodeParameter('message', i) as string;
      const username = this.getNodeParameter('username', i) as string | undefined;
      
      try {
        const result = await client.chat.postMessage({
          channel,
          text: message,
          username
        });
        
        returnData.push({
          messageId: result.ts,
          channel: result.channel,
          success: true
        });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            error: error.message,
            success: false
          });
          continue;
        }
        throw error;
      }
    }
    
    return [this.helpers.returnJsonArray(returnData)];
  }
};
```

#### Example: Custom Form Field Plugin

```typescript
// src/fields/date-picker.field.ts
import { FieldDefinition, FieldRenderer } from '@netpad/plugin-sdk';

export const DatePickerField: FieldDefinition = {
  name: 'Date Picker',
  type: 'netpad-date-picker',
  description: 'Advanced date picker with calendar UI',
  version: '1.0.0',
  category: 'input',
  icon: 'calendar',
  
  // Field configuration schema
  configSchema: {
    properties: [
      {
        name: 'minDate',
        type: 'string',
        displayName: 'Minimum Date',
        description: 'Earliest selectable date (ISO format)'
      },
      {
        name: 'maxDate',
        type: 'string',
        displayName: 'Maximum Date',
        description: 'Latest selectable date (ISO format)'
      },
      {
        name: 'format',
        type: 'select',
        displayName: 'Date Format',
        options: [
          { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
          { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
          { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }
        ],
        default: 'MM/DD/YYYY'
      }
    ]
  },
  
  // Validation rules
  validation: {
    required: {
      type: 'boolean',
      default: false
    },
    custom: {
      type: 'string',
      description: 'Custom validation function'
    }
  },
  
  // Renderer component (React)
  renderer: DatePickerRenderer
};

// React component for rendering
const DatePickerRenderer: FieldRenderer = ({ 
  value, 
  onChange, 
  config,
  disabled 
}) => {
  return (
    <DatePicker
      value={value}
      onChange={onChange}
      minDate={config.minDate}
      maxDate={config.maxDate}
      format={config.format}
      disabled={disabled}
    />
  );
};
```

#### Example: Integration Plugin

```typescript
// src/integration/stripe.integration.ts
import { IntegrationDefinition } from '@netpad/plugin-sdk';

export const StripeIntegration: IntegrationDefinition = {
  name: 'Stripe',
  type: 'netpad-integration-stripe',
  description: 'Stripe payment processing integration',
  version: '1.0.0',
  icon: 'stripe',
  
  // Connection configuration
  connection: {
    type: 'apiKey',
    properties: [
      {
        name: 'apiKey',
        type: 'secret',
        required: true,
        displayName: 'API Key',
        description: 'Stripe secret API key'
      },
      {
        name: 'testMode',
        type: 'boolean',
        displayName: 'Test Mode',
        default: true
      }
    ]
  },
  
  // Available operations
  operations: [
    {
      name: 'createPayment',
      displayName: 'Create Payment',
      description: 'Process a payment',
      method: 'POST',
      path: '/v1/payment_intents',
      parameters: [
        { name: 'amount', type: 'number', required: true },
        { name: 'currency', type: 'string', default: 'usd' },
        { name: 'customer', type: 'string' }
      ]
    },
    {
      name: 'getCustomer',
      displayName: 'Get Customer',
      description: 'Retrieve customer information',
      method: 'GET',
      path: '/v1/customers/{customerId}',
      parameters: [
        { name: 'customerId', type: 'string', required: true, in: 'path' }
      ]
    }
  ],
  
  // Webhook handlers
  webhooks: [
    {
      name: 'payment.succeeded',
      description: 'Fired when payment succeeds',
      handler: async (event, context) => {
        // Handle webhook event
        await context.triggerWorkflow('payment-success', event.data);
      }
    }
  ]
};
```

## Dependency Management

### Application Dependencies

Applications can depend on other applications and plugins:

```json
{
  "dependencies": {
    "applications": [
      "@netpad/app-notifications@^1.0.0",
      "@netpad/app-analytics@^2.0.0"
    ],
    "plugins": [
      "@netpad/plugin-node-slack@^1.0.0",
      "@netpad/plugin-field-rating@^2.0.0"
    ]
  }
}
```

**Resolution:**
1. Check if dependencies are installed
2. If not, prompt user to install dependencies
3. Install dependencies recursively
4. Link applications together
5. Register plugins for use in application

### Plugin Dependencies

Plugins can depend on other plugins:

```json
{
  "dependencies": {
    "plugins": [
      "@netpad/plugin-credential-oauth@^1.0.0"
    ]
  }
}
```

### Workflow Template Dependencies

Applications can depend on workflow templates:

```json
{
  "dependencies": {
    "workflowTemplates": [
      "@netpad/template-email-notification@^1.0.0"
    ]
  }
}
```

## Update Mechanism

### 1. Check for Updates

```typescript
// GET /api/applications/[applicationId]/updates
{
  "currentVersion": "1.0.0",
  "latestVersion": "1.2.0",
  "updateAvailable": true,
  "changelog": "...",
  "breakingChanges": false
}
```

### 2. Update Application

```typescript
// POST /api/applications/[applicationId]/update
{
  "targetVersion": "1.2.0", // or "latest"
  "strategy": "merge" | "replace" // How to handle user modifications
}
```

**Update Strategies:**
- **Merge**: Attempt to merge updates with user modifications
- **Replace**: Replace with new version (user modifications lost)
- **Dry Run**: Show what would change before applying

## Security & Verification

### Package Verification

1. **Structure Validation**: Ensure package follows NetPad format
2. **Content Validation**: Validate forms, workflows, config schemas
3. **Security Scan**: Check for malicious code/patterns
4. **Dependency Audit**: Audit npm dependencies for vulnerabilities
5. **Signature Verification**: (Future) Verify package signatures

### Trust Levels

1. **Official** (`@netpad/` scope): Verified by NetPad team
2. **Verified Community**: Passed automated checks + community review
3. **Community**: Published by community, not verified
4. **Unverified**: New packages, pending review

## Implementation Phases

### Phase 1: Foundation (Current)
- ✅ Web marketplace infrastructure
- ✅ Application bundle export/import
- ✅ Marketplace metadata fields

### Phase 2: Application npm Packages
- [ ] Define application package.json structure
- [ ] Create bundle generation tool
- [ ] Build CLI for application package creation
- [ ] Document application package format
- [ ] npm registry sync for applications

### Phase 3: Plugin System Foundation
- [ ] Define plugin package.json structure
- [ ] Create `@netpad/plugin-sdk` package
- [ ] Build plugin loader/discovery system
- [ ] Plugin registry in database
- [ ] Plugin auto-discovery from node_modules

### Phase 4: Workflow Node Plugins
- [ ] Node plugin runtime
- [ ] Node registration system
- [ ] Node execution engine
- [ ] Node UI components
- [ ] Example: Slack node plugin

### Phase 5: Form Field Plugins
- [ ] Field plugin runtime
- [ ] Field registration system
- [ ] Field renderer system
- [ ] Field validation system
- [ ] Example: Date picker field plugin

### Phase 6: Integration Plugins
- [ ] Integration plugin runtime
- [ ] Connection management
- [ ] API client generation
- [ ] Credential management
- [ ] Example: Stripe integration plugin

### Phase 7: CLI Tool
- [ ] `@netpad/cli` package
- [ ] Install/update/uninstall commands (apps + plugins)
- [ ] Authentication with NetPad API
- [ ] Local development tools
- [ ] Plugin scaffolding (`netpad-plugin create`)

### Phase 8: Verification & Security
- [ ] Automated validation
- [ ] Security scanning
- [ ] Verification badges
- [ ] Trust system
- [ ] Code signing (future)

## Open Questions

1. **Package Scope**: Should we use `@netpad/` scope exclusively, or allow unscoped?
   - **Recommendation**: Allow both, but `@netpad/` requires verification

2. **Dependency Resolution**: How do we handle conflicting dependencies?
   - **Recommendation**: Use npm's dependency resolution, fail if conflicts

3. **User Modifications**: How do we handle user-modified applications when updating?
   - **Recommendation**: Three strategies (merge/replace/dry-run), let user choose

4. **Versioning Strategy**: Should we follow npm semver strictly?
   - **Recommendation**: Yes, but also support NetPad-specific versioning in releases

5. **Marketplace Sync**: Real-time or periodic?
   - **Recommendation**: Periodic (hourly) with manual refresh option

6. **Self-Hosted Support**: Should self-hosted instances support npm packages?
   - **Recommendation**: Yes, via node_modules scanning or explicit install

7. **Package Size Limits**: What's the maximum package size?
   - **Recommendation**: 10MB for npm, larger bundles via CDN

## Benefits

1. **Developer Experience**: Familiar npm workflow for developers
2. **Distribution**: Leverage npm's CDN and infrastructure
3. **Versioning**: Built-in semantic versioning
4. **Dependencies**: Native dependency management
5. **Discovery**: npm search and tags for discovery
6. **CI/CD**: Easy integration with CI/CD pipelines
7. **Community**: Lower barrier to entry for contributors

## Comparison with n8n

| Feature | n8n | NetPad (Proposed) |
|---------|-----|-------------------|
| **Package Types** | Community Nodes | Applications + Plugins |
| **Official Packages** | `n8n-nodes-*` (unscoped) | `@netpad/app-*`, `@netpad/plugin-*` (scoped) |
| **Community Packages** | `@scope/n8n-nodes-*` or `n8n-nodes-*` | `@your-org/netpad-app-*` or `netpad-app-*` |
| **Node Plugins** | ✅ `n8n-nodes-*` | ✅ `@netpad/plugin-node-*` (official) or `@your-org/netpad-plugin-node-*` (community) |
| **Application Packages** | ❌ (workflows only) | ✅ `@netpad/app-*` (official) or `@your-org/netpad-app-*` (community) |
| **Field Plugins** | ❌ | ✅ `@netpad/plugin-field-*` (official) or `@your-org/netpad-plugin-field-*` (community) |
| **Integration Plugins** | ❌ (via nodes) | ✅ `@netpad/plugin-integration-*` (official) or `@your-org/netpad-plugin-integration-*` (community) |
| **Installation** | GUI or CLI | GUI, CLI, or npm |
| **Distribution** | npm only | npm + Web Marketplace |
| **Auto-Discovery** | ✅ (scans node_modules) | ✅ (scans node_modules, keyword-based) |
| **Package.json Field** | `n8n` field | `netpad` field |
| **Keywords Required** | `n8n-community-node-package` | `netpad-app` or `netpad-plugin` (required) |
| **Scope Ownership** | Unscoped or developer's scope | Official: `@netpad/` (NetPad team), Community: Developer's scope |
| **Dependencies** | npm dependencies | Application + Plugin + Template dependencies |
| **Updates** | Manual | Automatic check + update |
| **Verification** | Manual review | Official: Auto-verified, Community: Optional verification |
| **CLI Tool** | `n8n-node` | `@netpad/cli` + `netpad-plugin` |
| **SDK** | Built-in | `@netpad/plugin-sdk` |

## Plugin Runtime Architecture

### Plugin Loading System

```typescript
// src/lib/plugins/loader.ts
export class PluginLoader {
  async discoverPlugins(): Promise<Plugin[]> {
    // 1. Scan node_modules for @netpad/plugin-* packages
    // 2. Read package.json.netpad field
    // 3. Load plugin definitions
    // 4. Validate plugin structure
    // 5. Register plugins
  }
  
  async loadPlugin(packageName: string): Promise<Plugin> {
    // Load plugin from npm or local node_modules
    // Validate structure
    // Register nodes/fields/integrations
  }
  
  async registerNode(nodeDefinition: NodeDefinition): Promise<void> {
    // Register custom workflow node
    // Add to workflow editor palette
  }
  
  async registerField(fieldDefinition: FieldDefinition): Promise<void> {
    // Register custom form field type
    // Add to form builder field picker
  }
}
```

### Plugin Execution Context

```typescript
// Plugin execution environment
interface PluginExecutionContext {
  // Access to NetPad APIs
  getCredentials(type: string): Promise<Credentials>;
  getFormData(formId: string): Promise<any>;
  getWorkflowData(workflowId: string): Promise<any>;
  
  // Logging
  log(level: 'info' | 'warn' | 'error', message: string): void;
  
  // HTTP requests (for integrations)
  http: {
    get(url: string, options?: RequestOptions): Promise<Response>;
    post(url: string, data: any, options?: RequestOptions): Promise<Response>;
  };
  
  // Storage (for plugin data)
  storage: {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
  };
}
```

## Benefits of Plugin System

1. **Extensibility**: Users can add custom capabilities without modifying core
2. **Modularity**: Plugins are isolated and can be updated independently
3. **Community**: Lower barrier for contributors (just publish npm package)
4. **Ecosystem**: Rich ecosystem of integrations and extensions
5. **Versioning**: Independent versioning for plugins vs core
6. **Security**: Plugins run in sandboxed context
7. **Reusability**: Plugins can be used across multiple applications
8. **Composability**: Applications can depend on plugins, creating rich ecosystems

## How Applications Use Plugins

### Application Declares Plugin Dependencies

```json
{
  "netpad": {
    "type": "application",
    "dependencies": {
      "plugins": [
        "@netpad/plugin-node-slack@^1.0.0",
        "@netpad/plugin-field-rating@^2.0.0"
      ]
    }
  }
}
```

### Workflow Uses Plugin Node

```json
{
  "workflow": {
    "nodes": [
      {
        "type": "netpad-slack-send",
        "name": "Notify Team",
        "config": {
          "channel": "#general",
          "message": "New feedback received!"
        }
      }
    ]
  }
}
```

### Form Uses Plugin Field

```json
{
  "form": {
    "fields": [
      {
        "type": "netpad-date-picker",
        "label": "Event Date",
        "config": {
          "minDate": "2025-01-01",
          "format": "MM/DD/YYYY"
        }
      }
    ]
  }
}
```

## Plugin vs Application: When to Use What?

### Use Applications When:
- ✅ Complete, self-contained solution
- ✅ Multiple forms and workflows working together
- ✅ Specific business process or use case
- ✅ Ready-to-use out of the box
- ✅ Example: "IT Helpdesk App", "Customer Feedback App"

### Use Plugins When:
- ✅ Reusable component across multiple applications
- ✅ Extending core NetPad capabilities
- ✅ Integration with third-party service
- ✅ Custom field type or workflow node
- ✅ Example: "Slack Node Plugin", "Date Picker Field Plugin"

### Combined Approach:
- Applications depend on plugins
- Plugins provide building blocks
- Applications compose plugins into solutions
- Example: "Customer Feedback App" uses "Slack Node Plugin" + "Rating Field Plugin"

## Publishing Guidelines for Community Developers

### Getting Started

1. **Choose Your Package Name:**
   - Option A: Use your npm scope: `@your-org/netpad-app-*` or `@your-org/netpad-plugin-*`
   - Option B: Use unscoped: `netpad-app-*` or `netpad-plugin-*`
   - **Important**: You cannot use `@netpad/` scope (owned by NetPad team)

2. **Create Package Structure:**
   ```bash
   npx @netpad/cli create-app my-app-name
   # or
   npx @netpad/cli create-plugin my-plugin-name --type node
   ```

3. **Add Required Keywords:**
   ```json
   {
     "keywords": [
       "netpad",
       "netpad-app",  // Required for applications
       "netpad-community-app",  // Recommended for community apps
       "your-category"
     ]
   }
   ```

4. **Publish to npm:**
   ```bash
   npm publish
   ```

5. **Package Auto-Discovery:**
   - NetPad marketplace sync will discover your package (within 1 hour)
   - Package appears in marketplace automatically
   - Users can install via Web UI, CLI, or npm

### Verification Process (Optional)

If you want your community package to be "Verified by NetPad":

1. Submit package for review via NetPad marketplace
2. NetPad team reviews:
   - Code quality
   - Security audit
   - Functionality testing
   - Documentation completeness
3. If approved:
   - Package gets "Verified by NetPad" badge
   - Listed in "Verified" section of marketplace
   - Still maintained by you (not transferred to NetPad scope)

### Best Practices

- **Naming**: Use descriptive, unique names
- **Documentation**: Include comprehensive README
- **Versioning**: Follow semantic versioning
- **Keywords**: Always include `netpad-app` or `netpad-plugin`
- **Testing**: Test your package before publishing
- **Maintenance**: Keep packages updated and respond to issues

## Next Steps

1. **Review & Refine**: Get feedback on this architecture (especially scope ownership)
2. **Prototype Plugin SDK**: Build `@netpad/plugin-sdk` with types and utilities
3. **Prototype Application Package**: Build minimal npm package format for applications
4. **Plugin Loader**: Build plugin discovery and loading system (keyword-based)
5. **Example Plugin**: Create example Slack node plugin (community package)
6. **CLI Tool**: Create `@netpad/cli` with install command for apps and plugins
7. **Marketplace Sync**: Build npm registry sync service (keyword-based discovery)
8. **Documentation**: Create developer guides for both application and plugin creation
9. **Verification System**: Build review process for community packages
