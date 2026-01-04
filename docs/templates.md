# NetPad Template Export/Import System

## Overview

NetPad now supports exporting and importing forms, workflows, and complete template bundles. This enables:

- **Portability**: Move forms between NetPad instances
- **Version Control**: Store form definitions in Git
- **Environment Promotion**: Deploy forms from dev → staging → production
- **Community Sharing**: Share templates with other NetPad users
- **Disaster Recovery**: Backup and restore form configurations

## API Endpoints

### Form Definition Export

**GET** `/api/forms/[formId]/definition`

Export a form's configuration as a portable JSON definition.

**Query Parameters:**
- `orgId` (optional): Organization ID for platform-based forms
  - If not provided, uses session-based storage (legacy)

**Response:**
```json
{
  "success": true,
  "definition": {
    "name": "IT Support Request",
    "description": "Submit a request for IT support",
    "fieldConfigs": [...],
    "theme": {...},
    ...
  }
}
```

**Example:**
```bash
# Platform-based form
curl "http://localhost:3000/api/forms/my-form-id/definition?orgId=org_123" \
  -H "Cookie: your-session-cookie"

# Legacy session-based form
curl "http://localhost:3000/api/forms/my-form-id/definition" \
  -H "Cookie: your-session-cookie"
```

### Workflow Definition Export

**GET** `/api/workflows/[workflowId]/definition`

Export a workflow's configuration as a portable JSON definition.

**Query Parameters:**
- `orgId` (required): Organization ID

**Response:**
```json
{
  "success": true,
  "definition": {
    "name": "Ticket Routing Workflow",
    "description": "Routes tickets based on priority",
    "canvas": {...},
    "settings": {...},
    ...
  }
}
```

**Example:**
```bash
curl "http://localhost:3000/api/workflows/wf_abc123/definition?orgId=org_123" \
  -H "Cookie: your-session-cookie"
```

### Bundle Export

**GET** `/api/forms/[formId]/bundle`

Export a complete bundle containing form + linked workflows + theme.

**Query Parameters:**
- `orgId` (optional): Organization ID for platform-based forms
- `format` (optional): `json` (default) or `zip` (future)

**Response:**
```json
{
  "success": true,
  "bundle": {
    "manifest": {
      "name": "IT Help Desk Template",
      "version": "1.0.0",
      "assets": {
        "forms": ["form.json"],
        "workflows": ["workflows/workflow.json"]
      }
    },
    "forms": [...],
    "workflows": [...],
    "theme": {...}
  }
}
```

**Example:**
```bash
curl "http://localhost:3000/api/forms/my-form-id/bundle?orgId=org_123" \
  -H "Cookie: your-session-cookie"
```

### Bundle Import

**POST** `/api/templates/import`

Import a template bundle (form + workflows + theme).

**Query Parameters:**
- `orgId` (optional): Organization ID for platform-based import
  - If not provided, uses session-based storage (legacy)

**Request Body:**
```json
{
  "manifest": {
    "name": "IT Help Desk Template",
    "version": "1.0.0",
    "assets": {...}
  },
  "forms": [...],
  "workflows": [...],
  "theme": {...},
  "options": {
    "overwriteExisting": false,
    "generateNewIds": true,
    "preserveSlugs": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "imported": {
    "forms": [
      {
        "newId": "form_abc123",
        "name": "IT Support Request",
        "slug": "it-support-request"
      }
    ],
    "workflows": [
      {
        "newId": "wf_xyz789",
        "name": "Ticket Routing",
        "slug": "ticket-routing"
      }
    ]
  },
  "errors": []
}
```

**Example:**
```typescript
const bundle = {
  manifest: manifestJson,
  forms: [formJson],
  workflows: [workflowJson],
};

const response = await fetch('/api/templates/import?orgId=org_123', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(bundle),
});

const result = await response.json();
console.log('Imported:', result.imported);
```

## Template Manifest Format

The `manifest.json` file describes the template bundle:

```json
{
  "name": "Template Name",
  "version": "1.0.0",
  "description": "Template description",
  "author": "Author Name",
  "license": "MIT",
  "netpadVersion": "3.1.0",
  "assets": {
    "forms": ["form.json"],
    "workflows": ["workflows/workflow.json"],
    "theme": "theme.json"
  },
  "dependencies": {
    "integrations": ["email", "slack"]
  },
  "instructions": {
    "import": "How to import this template",
    "setup": ["Step 1", "Step 2"],
    "customization": ["Tip 1", "Tip 2"]
  },
  "tags": ["tag1", "tag2"],
  "category": "helpdesk"
}
```

## Data Cleaning

Export functions automatically remove sensitive/organization-specific data:

**Form Exports Remove:**
- `connectionString` (legacy, insecure)
- `dataSource` (contains org-specific vault IDs)
- `organizationId`
- `createdBy`
- `accessControl` (org-specific permissions)
- `id` (will be regenerated on import)

**Workflow Exports Remove:**
- `_id` (MongoDB ObjectId)
- `id` (will be regenerated)
- `orgId`
- `createdBy`
- `lastModifiedBy`
- `stats` (execution statistics)

**Preserved:**
- Form structure (fieldConfigs, validation, conditional logic)
- Workflow structure (canvas, settings, variables)
- Theme and branding
- Metadata (name, description, tags)

## Import Options

When importing a template bundle, you can specify options:

```typescript
{
  overwriteExisting: false,  // Overwrite if form/workflow with same name exists
  generateNewIds: true,      // Generate new IDs (default: true)
  preserveSlugs: false       // Keep original slugs if available (default: false)
}
```

## Example: IT Helpdesk Template

The IT Helpdesk example includes a complete template bundle:

```
examples/it-helpdesk/templates/
├── form.json              # Form definition
├── manifest.json          # Template metadata
```

**Import the template:**

```typescript
import formJson from './templates/form.json';
import manifestJson from './templates/manifest.json';

const bundle = {
  manifest: manifestJson,
  forms: [formJson],
};

await fetch('/api/templates/import?orgId=your-org-id', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(bundle),
});
```

## TypeScript Types

All types are available in `@/types/template`:

```typescript
import type {
  TemplateManifest,
  FormDefinition,
  WorkflowDefinition,
  BundleExport,
  BundleImportRequest,
  BundleImportResult,
} from '@/types/template';
```

## Utility Functions

Export/import utilities are available in `@/lib/templates`:

```typescript
import {
  cleanFormForExport,
  cleanWorkflowForExport,
  createManifest,
  createBundleExport,
  convertFormDefinitionToConfig,
  convertWorkflowDefinitionToDocument,
  validateFormDefinition,
  validateWorkflowDefinition,
} from '@/lib/templates/export';
```

## Future Enhancements

Planned features:

- [ ] ZIP bundle format (currently JSON only)
- [ ] CLI tool for export/import
- [ ] Template marketplace/gallery
- [ ] Version-controlled templates
- [ ] Template diff/comparison
- [ ] Automated template validation
- [ ] Template dependencies resolution

## Security Considerations

- **Sensitive Data**: Connection strings and vault IDs are automatically excluded from exports
- **Permissions**: Export/import endpoints require authentication
- **Validation**: Imported templates are validated before creation
- **ID Generation**: New IDs are generated on import to prevent conflicts
- **Organization Isolation**: Platform-based imports are scoped to organizations

## Best Practices

1. **Version Your Templates**: Include version numbers in manifests
2. **Document Dependencies**: List required integrations in the manifest
3. **Test Imports**: Test template imports in a development environment first
4. **Backup Before Import**: Export existing forms before importing replacements
5. **Customize After Import**: Import as a starting point, then customize for your needs
6. **Store in Git**: Keep template bundles in version control for change tracking

## Related Documentation

- [Form Configuration Types](../../src/types/form.ts)
- [Workflow Types](../../src/types/workflow.ts)
- [Template Types](../../src/types/template.ts)
- [IT Helpdesk Example](../../examples/it-helpdesk/README.md)
