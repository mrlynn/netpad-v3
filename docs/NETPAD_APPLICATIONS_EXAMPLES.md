# NetPad Applications: Examples and Implementation Guide

## Visual Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    NetPad Application                       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Application Manifest                     │  │
│  │  - Name, Version, Author, License                     │  │
│  │  - Category, Tags, Description                        │  │
│  │  - Dependencies, Compatibility                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────┐      ┌──────────────┐                   │
│  │    Forms      │      │  Workflows    │                   │
│  │              │      │              │                   │
│  │ Form 1       │──────│ Workflow 1   │                   │
│  │ Form 2       │      │ Workflow 2   │                   │
│  │ Form 3       │──────│              │                   │
│  └──────────────┘      └──────────────┘                   │
│         │                    │                              │
│         └────────┬───────────┘                              │
│                  │                                          │
│         ┌────────▼──────────┐                              │
│         │   Connections     │                              │
│         │  - Form → Workflow│                              │
│         │  - Trigger config │                              │
│         │  - Conditions     │                              │
│         └───────────────────┘                              │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Deployment Configuration                      │  │
│  │  - Environment variables                              │  │
│  │  - Database schema                                    │  │
│  │  - Integration requirements                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Connection Types

### 1. Form Submission Trigger

```json
{
  "id": "conn_1",
  "formRef": "support-ticket-form",
  "workflowRef": "ticket-routing-workflow",
  "type": "trigger",
  "config": {
    "triggerOn": "submit",
    "conditions": [
      {
        "field": "urgency",
        "operator": "equals",
        "value": "critical"
      }
    ]
  }
}
```

**Workflow Node:**
```json
{
  "type": "form-trigger",
  "config": {
    "formId": "support-ticket-form",  // Resolved to actual form ID on import
    "waitForValidation": false
  }
}
```

### 2. Webhook Connection

```json
{
  "id": "conn_2",
  "formRef": "order-form",
  "workflowRef": "order-processing",
  "type": "webhook",
  "config": {
    "webhookUrl": "https://api.example.com/orders",
    "webhookMethod": "POST"
  }
}
```

### 3. Manual Trigger

```json
{
  "id": "conn_3",
  "formRef": "report-generator",
  "workflowRef": "generate-report",
  "type": "manual",
  "config": {
    "buttonLabel": "Generate Report"
  }
}
```

## Example: Customer Onboarding Application

```json
{
  "manifest": {
    "id": "customer-onboarding-v1",
    "name": "Customer Onboarding System",
    "version": "1.0.0",
    "description": "Complete customer onboarding with welcome email, account setup, and documentation delivery",
    "category": "onboarding",
    "tags": ["customer", "onboarding", "automation", "email"]
  },
  "forms": [
    {
      "slug": "customer-signup",
      "name": "Customer Signup Form",
      "applicationRole": "primary",
      "fieldConfigs": [
        {
          "path": "email",
          "type": "email",
          "label": "Email Address",
          "required": true
        },
        {
          "path": "companyName",
          "type": "short_text",
          "label": "Company Name",
          "required": true
        }
      ]
    }
  ],
  "workflows": [
    {
      "slug": "onboarding-automation",
      "name": "Customer Onboarding Automation",
      "canvas": {
        "nodes": [
          {
            "type": "form-trigger",
            "config": {
              "formId": "customer-signup"  // Will be resolved on import
            }
          },
          {
            "type": "email-send",
            "config": {
              "to": "{{trigger.payload.data.email}}",
              "subject": "Welcome to {{trigger.payload.data.companyName}}!"
            }
          }
        ],
        "edges": [
          {
            "source": "trigger-node",
            "target": "email-node"
          }
        ]
      }
    }
  ],
  "connections": [
    {
      "formRef": "customer-signup",
      "workflowRef": "onboarding-automation",
      "type": "trigger",
      "config": {
        "triggerOn": "submit"
      }
    }
  ]
}
```

## Implementation: Connection Detection

```typescript
/**
 * Detect form-workflow connections from workflow nodes
 */
function detectConnections(
  forms: FormDefinition[],
  workflows: WorkflowDefinition[]
): FormWorkflowConnection[] {
  const connections: FormWorkflowConnection[] = [];
  
  for (const workflow of workflows) {
    const formTriggerNodes = workflow.canvas.nodes.filter(
      node => node.type === 'form-trigger'
    );
    
    for (const node of formTriggerNodes) {
      const formId = node.config?.formId;
      if (!formId) continue;
      
      // Find matching form by ID or slug
      const form = forms.find(
        f => f.id === formId || f.slug === formId
      );
      
      if (form) {
        connections.push({
          id: `conn_${workflow.slug}_${form.slug}`,
          formRef: form.slug || form.id!,
          workflowRef: workflow.slug || workflow.id!,
          type: 'trigger',
          config: {
            triggerOn: node.config?.triggerOn || 'submit',
            conditions: node.config?.conditions || []
          },
          enabled: node.enabled !== false
        });
      }
    }
  }
  
  return connections;
}
```

## Implementation: Reference Resolution on Import

```typescript
/**
 * Resolve form/workflow references during import
 */
async function resolveReferences(
  application: NetPadApplication,
  importedForms: Map<string, string>,  // oldId -> newId
  importedWorkflows: Map<string, string>  // oldId -> newId
): Promise<void> {
  // Update workflow nodes that reference forms
  for (const workflow of application.workflows) {
    const formTriggerNodes = workflow.canvas.nodes.filter(
      node => node.type === 'form-trigger'
    );
    
    for (const node of formTriggerNodes) {
      const oldFormRef = node.config?.formId;
      
      // Try to find by slug first, then by ID
      const form = application.forms.find(
        f => f.slug === oldFormRef || f.id === oldFormRef
      );
      
      if (form) {
        // Get the new form ID from the import map
        const newFormId = importedForms.get(form.id || form.slug || '');
        if (newFormId) {
          node.config.formId = newFormId;
        }
      }
    }
  }
  
  // Update connection references
  for (const connection of application.connections) {
    // Resolve form reference
    const form = application.forms.find(
      f => f.slug === connection.formRef || f.id === connection.formRef
    );
    if (form) {
      const newFormId = importedForms.get(form.id || form.slug || '');
      if (newFormId) {
        connection.formRef = newFormId;
      }
    }
    
    // Resolve workflow reference
    const workflow = application.workflows.find(
      w => w.slug === connection.workflowRef || w.id === connection.workflowRef
    );
    if (workflow) {
      const newWorkflowId = importedWorkflows.get(workflow.id || workflow.slug || '');
      if (newWorkflowId) {
        connection.workflowRef = newWorkflowId;
      }
    }
  }
}
```

## Import Flow Diagram

```
┌─────────────────┐
│  Application    │
│  Bundle JSON    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Validate       │
│  - Schema       │
│  - Compatibility│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Import Forms   │
│  - Generate IDs │
│  - Store mapping│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Import         │
│  Workflows      │
│  - Generate IDs │
│  - Update form  │
│    references   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Create         │
│  Connections    │
│  - Link forms   │
│    to workflows │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Configure      │
│  - Environment  │
│  - Database     │
│  - Integrations │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Activate       │
│  - Enable       │
│    workflows    │
│  - Publish forms│
└─────────────────┘
```

## Marketplace Integration

### Application Listing

```typescript
interface MarketplaceApplication {
  id: string;
  name: string;
  summary: string;
  category: string;
  tags: string[];
  icon?: string;
  author: {
    name: string;
    verified?: boolean;
  };
  stats: {
    downloads: number;
    rating: number;
    reviews: number;
  };
  price: {
    type: 'free' | 'paid';
    amount?: number;
  };
  version: string;
  updatedAt: string;
}
```

### Import from Marketplace

```typescript
// 1. Browse marketplace
GET /api/marketplace/applications?category=helpdesk

// 2. Get application details
GET /api/marketplace/applications/it-helpdesk-v1

// 3. Preview application
GET /api/marketplace/applications/it-helpdesk-v1/preview

// 4. Import application
POST /api/marketplace/applications/it-helpdesk-v1/import
{
  "orgId": "org_123",
  "options": {
    "overwriteExisting": false,
    "generateNewIds": true,
    "preserveSlugs": false
  }
}
```

## Use Cases

### 1. IT Help Desk
- **Forms**: Ticket submission, ticket search
- **Workflows**: Auto-routing, notifications, escalation
- **Connections**: Submit → Route → Notify

### 2. Customer Onboarding
- **Forms**: Signup, profile setup, preferences
- **Workflows**: Welcome email, account creation, documentation
- **Connections**: Signup → Welcome → Setup

### 3. Survey & Feedback
- **Forms**: Survey form, feedback form
- **Workflows**: Data analysis, reporting, notifications
- **Connections**: Submit → Analyze → Report

### 4. E-commerce Order Processing
- **Forms**: Order form, return request
- **Workflows**: Order confirmation, inventory update, shipping
- **Connections**: Order → Confirm → Process → Ship

## Best Practices

1. **Use Slugs**: Prefer slugs over IDs for references (more stable)
2. **Document Connections**: Include descriptions in connection configs
3. **Version Applications**: Use semantic versioning
4. **Test Imports**: Verify applications work after import
5. **Handle Dependencies**: Clearly declare required integrations
6. **Provide Examples**: Include sample data for testing
7. **Document Setup**: Include clear setup instructions in manifest
