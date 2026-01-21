# NetPad Application Bundle Format

This document describes the canonical format for NetPad application bundles. AI assistants, developers, and automation tools should follow this format when creating applications programmatically.

## Overview

A NetPad bundle is a collection of JSON files that define an application:

```
my-application/
├── templates/
│   ├── manifest.json    # Application metadata
│   ├── form.json        # Form definition(s)
│   └── workflow.json    # Workflow definition(s)
└── import-bundle.js     # Import script (optional)
```

## Import API

**Endpoint:** `POST /api/templates/import`

**Authentication:**
- API Key (Bearer token) with `forms:write`, `templates:write`, or `admin` permission
- Session-based authentication (browser)

**Request Body:**

```json
{
  "bundle": {
    "manifest": { ... },
    "forms": [ ... ],
    "workflows": [ ... ]
  },
  "organizationId": "org_xxxxx",
  "projectId": "proj_xxxxx",
  "options": {
    "generateNewIds": true,
    "preserveSlugs": true,
    "overwriteExisting": false,
    "createApplication": true
  }
}
```

## manifest.json

The manifest defines application metadata and is used to create the Application in NetPad.

```json
{
  "name": "My Application",
  "version": "1.0.0",
  "description": "A detailed description of what this application does",
  "summary": "Short one-line summary",
  "icon": "📋",
  "color": "#10B981",
  "tags": ["category1", "category2"],
  "category": "productivity",

  "author": {
    "name": "Author Name",
    "email": "author@example.com",
    "url": "https://example.com"
  },

  "assets": {
    "forms": ["form.json"],
    "workflows": ["workflow.json"]
  },

  "dependencies": {
    "integrations": ["email", "mongodb"],
    "connections": []
  },

  "instructions": {
    "setup": [
      "Configure MongoDB connection",
      "Set up email integration",
      "Publish the form"
    ]
  }
}
```

### Required Fields
- `name` - Application name
- `version` - Semantic version (e.g., "1.0.0")

### Optional Fields
- `description` - Full description
- `summary` - Short summary
- `icon` - Emoji or icon name
- `color` - Hex color for UI
- `tags` - Array of tags for categorization
- `author` - Author information
- `dependencies` - Required integrations

## form.json

Form definitions describe the structure and behavior of forms.

```json
{
  "id": "my-form-id",
  "slug": "my-form-slug",
  "name": "Form Name",
  "description": "Form description",

  "fieldConfigs": [
    {
      "id": "field_1",
      "path": "fieldName",
      "type": "text",
      "label": "Field Label",
      "placeholder": "Enter value...",
      "validation": {
        "required": true,
        "minLength": 2,
        "maxLength": 100
      }
    },
    {
      "id": "field_2",
      "path": "email",
      "type": "email",
      "label": "Email Address",
      "validation": {
        "required": true,
        "pattern": "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"
      }
    },
    {
      "id": "field_3",
      "path": "category",
      "type": "select",
      "label": "Category",
      "validation": {
        "required": true,
        "options": [
          { "label": "Option A", "value": "option_a" },
          { "label": "Option B", "value": "option_b" }
        ]
      }
    },
    {
      "id": "field_4",
      "path": "description",
      "type": "textarea",
      "label": "Description",
      "rows": 4,
      "validation": {
        "required": true,
        "minLength": 50
      }
    }
  ],

  "theme": {
    "primaryColor": "#10B981",
    "backgroundColor": "#ffffff"
  },

  "branding": {
    "logo": "https://example.com/logo.png",
    "title": "Custom Title",
    "description": "Custom description shown to users"
  },

  "applicationRole": "primary",
  "displayOrder": 1
}
```

### Field Types

| Type | Description | Validation Options |
|------|-------------|-------------------|
| `text` | Single line text | required, minLength, maxLength, pattern |
| `email` | Email input | required, pattern |
| `number` | Numeric input | required, min, max |
| `textarea` | Multi-line text | required, minLength, maxLength |
| `select` | Dropdown select | required, options |
| `checkbox` | Boolean checkbox | required |
| `radio` | Radio buttons | required, options |
| `date` | Date picker | required, minDate, maxDate |
| `file` | File upload | required, maxSize, accept |
| `tags` | Multi-select tags | required, options |

### Conversational Form Config (Optional)

For AI-powered conversational forms, add a `conversationalConfig`:

```json
{
  "conversationalConfig": {
    "formType": "conversational",
    "templateId": "my-template",

    "objective": "Description of what the AI should accomplish",
    "context": "Background information for the AI",

    "persona": {
      "style": "friendly",
      "tone": "Professional but approachable",
      "behaviors": [
        "Ask clarifying questions",
        "Confirm understanding"
      ],
      "restrictions": [
        "Don't ask multiple questions at once"
      ]
    },

    "topics": [
      {
        "id": "topic_1",
        "name": "Topic Name",
        "description": "What to learn about",
        "priority": "required",
        "depth": "moderate",
        "extractionField": "fieldName"
      }
    ],

    "extractionSchema": [
      {
        "field": "fieldName",
        "type": "string",
        "required": true,
        "description": "What this field captures",
        "topicId": "topic_1"
      }
    ],

    "conversationLimits": {
      "maxTurns": 15,
      "maxDuration": 15,
      "minConfidence": 0.7
    },

    "captureOptions": {
      "captureTranscript": true,
      "includeTimestamps": true,
      "includeTopicCoverage": true
    }
  }
}
```

## workflow.json

Workflow definitions describe automation logic.

```json
{
  "id": "my-workflow-id",
  "slug": "my-workflow-slug",
  "name": "Workflow Name",
  "description": "What this workflow does",

  "settings": {
    "trigger": {
      "type": "form_submission",
      "formId": "my-form-slug",
      "formSlug": "my-form-slug"
    }
  },

  "variables": [
    {
      "name": "recipientEmail",
      "type": "string",
      "description": "Email to send notifications to",
      "defaultValue": "admin@example.com"
    }
  ],

  "canvas": {
    "nodes": [
      {
        "id": "trigger",
        "type": "trigger",
        "name": "Form Submission",
        "position": { "x": 100, "y": 100 },
        "config": {
          "triggerType": "form_submission",
          "formId": "my-form-slug"
        }
      },
      {
        "id": "save_data",
        "type": "mongodb-write",
        "name": "Save to Database",
        "position": { "x": 300, "y": 100 },
        "config": {
          "connectionId": "{{CONNECTION_ID}}",
          "collection": "submissions",
          "operation": "insertOne",
          "document": {
            "name": "{{trigger.data.name}}",
            "email": "{{trigger.data.email}}",
            "submittedAt": "{{trigger.timestamp}}"
          }
        }
      },
      {
        "id": "send_email",
        "type": "email-send",
        "name": "Send Notification",
        "position": { "x": 500, "y": 100 },
        "config": {
          "credentialId": "{{EMAIL_CREDENTIAL_ID}}",
          "to": "{{variables.recipientEmail}}",
          "subject": "New Submission: {{trigger.data.name}}",
          "body": "A new submission was received.\n\nName: {{trigger.data.name}}\nEmail: {{trigger.data.email}}"
        }
      }
    ],
    "edges": [
      {
        "id": "e1",
        "source": "trigger",
        "target": "save_data"
      },
      {
        "id": "e2",
        "source": "save_data",
        "target": "send_email"
      }
    ]
  },

  "applicationRole": "automation",
  "displayOrder": 1
}
```

### Node Types

| Type | Description | Config |
|------|-------------|--------|
| `trigger` | Form submission trigger | triggerType, formId |
| `mongodb-write` | Write to MongoDB | connectionId, collection, operation, document |
| `mongodb-read` | Read from MongoDB | connectionId, collection, query |
| `email-send` | Send email | credentialId, to, subject, body |
| `http-request` | HTTP request | url, method, headers, body |
| `transform` | Data transformation | transformations[] |
| `condition` | Conditional branch | conditions[] |
| `delay` | Wait/delay | duration |

### Template Variables

Use `{{expression}}` syntax for dynamic values:

- `{{trigger.data.fieldName}}` - Form field value
- `{{trigger.timestamp}}` - Submission timestamp
- `{{variables.varName}}` - Workflow variable
- `{{previousNode.outputField}}` - Output from previous node
- `{{CONNECTION_ID}}` - Placeholder for connection vault ID
- `{{EMAIL_CREDENTIAL_ID}}` - Placeholder for email credential

## Import Script Template

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const orgId = process.env.NETPAD_ORG_ID;
const projectId = process.env.NETPAD_PROJECT_ID;
const baseUrl = process.env.NETPAD_BASE_URL || 'http://localhost:3000';
const apiKey = process.env.NETPAD_API_KEY;

if (!orgId || !projectId) {
  console.error('Set NETPAD_ORG_ID and NETPAD_PROJECT_ID environment variables');
  process.exit(1);
}

const templatesDir = path.join(__dirname, 'templates');

function loadJson(file) {
  return JSON.parse(fs.readFileSync(path.join(templatesDir, file), 'utf8'));
}

async function importBundle() {
  const manifest = loadJson('manifest.json');
  const form = loadJson('form.json');
  const workflow = loadJson('workflow.json');

  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(`${baseUrl}/api/templates/import`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      bundle: { manifest, forms: [form], workflows: [workflow] },
      organizationId: orgId,
      projectId: projectId,
      options: {
        generateNewIds: true,
        preserveSlugs: true,
        overwriteExisting: false,
      },
    }),
  });

  const result = await response.json();

  if (result.success) {
    console.log('✅ Import successful!');
    console.log('Application:', result.imported.application?.name);
  } else {
    console.error('❌ Import failed:', result.errors);
  }
}

importBundle();
```

## Response Format

```json
{
  "success": true,
  "imported": {
    "application": {
      "applicationId": "app_xxxxx",
      "name": "My Application",
      "slug": "my-application"
    },
    "forms": [
      {
        "newId": "form_xxxxx",
        "name": "Form Name",
        "slug": "form-slug"
      }
    ],
    "workflows": [
      {
        "newId": "wf_xxxxx",
        "name": "Workflow Name",
        "slug": "workflow-slug"
      }
    ]
  },
  "errors": []
}
```

## Best Practices

1. **Use semantic slugs** - Make slugs descriptive and URL-friendly
2. **Include all required fields** - Validate your JSON before importing
3. **Use placeholders for secrets** - Use `{{CONNECTION_ID}}` and `{{CREDENTIAL_ID}}` patterns
4. **Test with generateNewIds: true** - Avoid conflicts during development
5. **Document dependencies** - List required integrations in the manifest
6. **Provide setup instructions** - Help users configure the application

## AI-Assisted Application Creation

The import API is designed for AI assistants (Claude, Cursor, etc.) to create applications programmatically:

### Workflow

1. **User describes the application** - "I need a customer feedback form with email notifications"
2. **AI generates the bundle** - Creates manifest.json, form.json, workflow.json
3. **AI calls the import API** - POSTs the bundle to `/api/templates/import`
4. **User customizes in NetPad** - Opens the application, tweaks fields, publishes

### Example: AI Creating an App

```javascript
// AI generates this bundle based on user description
const bundle = {
  manifest: {
    name: "Customer Feedback",
    version: "1.0.0",
    description: "Collect customer feedback with ratings",
    icon: "⭐",
    tags: ["feedback", "survey"]
  },
  forms: [{
    name: "Feedback Form",
    slug: "feedback",
    fieldConfigs: [
      { path: "name", label: "Name", type: "text", validation: { required: true } },
      { path: "email", label: "Email", type: "email", validation: { required: true } },
      { path: "rating", label: "Rating", type: "select", validation: {
        required: true,
        options: [
          { label: "⭐⭐⭐⭐⭐ Excellent", value: "5" },
          { label: "⭐⭐⭐⭐ Good", value: "4" },
          { label: "⭐⭐⭐ Average", value: "3" },
          { label: "⭐⭐ Poor", value: "2" },
          { label: "⭐ Very Poor", value: "1" }
        ]
      }},
      { path: "comments", label: "Comments", type: "textarea" }
    ]
  }],
  workflows: [{
    name: "Notify Team",
    slug: "notify-team",
    settings: { trigger: { type: "form_submission", formSlug: "feedback" } },
    canvas: {
      nodes: [
        { id: "trigger", type: "trigger", name: "Form Submit", position: { x: 100, y: 100 }, config: {} },
        { id: "email", type: "email-send", name: "Send Email", position: { x: 300, y: 100 }, config: {
          to: "{{variables.teamEmail}}",
          subject: "New Feedback: {{trigger.data.rating}} stars from {{trigger.data.name}}",
          body: "Rating: {{trigger.data.rating}}\n\nComments:\n{{trigger.data.comments}}"
        }}
      ],
      edges: [{ id: "e1", source: "trigger", target: "email" }]
    },
    variables: [{ name: "teamEmail", type: "string", defaultValue: "team@example.com" }]
  }]
};

// Import to NetPad
const result = await fetch(`${NETPAD_BASE_URL}/api/templates/import`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${NETPAD_API_KEY}`
  },
  body: JSON.stringify({
    bundle,
    organizationId: NETPAD_ORG_ID,
    projectId: NETPAD_PROJECT_ID,
    options: { generateNewIds: true, preserveSlugs: true }
  })
}).then(r => r.json());

// result.imported.application.applicationId → "app_xxxx"
```

### Required Environment Variables

```bash
export NETPAD_API_KEY=np_live_xxxxx      # API key with forms:write permission
export NETPAD_ORG_ID=org_xxxxx            # Organization ID
export NETPAD_PROJECT_ID=proj_xxxxx       # Project ID
export NETPAD_BASE_URL=http://localhost:3000  # NetPad instance URL
```

### API Key Permissions

The API key needs one of these permissions:
- `forms:write` - Basic form/application creation
- `templates:write` - Full template/bundle import
- `admin` - Full access

## Example Applications

See the `examples/` directory for complete working examples:

- `examples/collaborator-recruitment/` - Collaborator intake with conversational AI
- `examples/it-helpdesk/` - IT helpdesk ticket system
