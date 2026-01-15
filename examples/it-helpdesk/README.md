# IT Help Desk Application

A complete internal IT support ticketing system built as a **NetPad Application**. This example demonstrates how to build a production-ready Application that groups ticket intake forms, search interfaces, automated workflows, and integrations into a single, versioned, shareable solution.

**This is a complete NetPad Application**, not just standalone forms and workflows. The Application includes:
- Ticket submission forms (traditional and conversational AI-powered)
- Ticket search form with smart dropdowns
- Automated routing workflows
- Application versioning and releases
- Marketplace-ready structure
- npm package integration

Based on the article: [Build Your Own IT Help Desk Application in 30 Minutes](../../docs/internal/it-helpdesk-article.md)

## Features

### Form Capabilities

- **Reporter Information** — Capture name, email, department, and phone extension
- **Issue Categorization** — Hardware, Software, Network, Access & Permissions, or Other
- **Priority Levels** — Visual urgency indicators from Low to Critical
- **Conditional Fields** — Dynamic fields based on issue category:
  - Hardware → Asset ID / Serial Number
  - Software → Application Name
  - Network → Network Location
  - Access → System/Resource Name
- **Contact Preferences** — Preferred contact method and availability
- **Validation** — Required fields and minimum character requirements

### Search Capabilities

- **Smart Dropdowns** — Filter by urgency, category, or department with counts from actual data
- **Text Search** — Search ticket subjects and descriptions
- **Reporter Search** — Find tickets by reporter name or email
- **Date Range Filtering** — Filter tickets by submission date
- **Results Display** — View search results in a card layout with ticket details

### Application Features

- **Complete Application Structure** - Forms, workflows, and connections grouped together
- **Versioned Releases** - Semantic versioning (2.0.0) with changelogs
- **Marketplace Ready** - Can be published to NetPad marketplace
- **npm Package** - Can be published to npm for programmatic installation
- **Application Permissions** - Fine-grained RBAC at the Application level

### Technical Highlights

- Conditional logic with `show`/`hide` actions
- Section headers for organized layout
- Half-width fields for compact forms
- Radio buttons and checkboxes for selections
- MongoDB-ready document structure
- Smart dropdowns with dynamic data population
- Conversational AI form option

## Quick Start

### Option 1: Install from NetPad Marketplace (Recommended)

1. Navigate to **Marketplace** in your NetPad organization
2. Search for "IT Help Desk"
3. Click **Install** to import the Application into your project
4. Configure email addresses and Slack integration
5. Create your first Application Release

### Option 2: Import Application Bundle

1. Download the Application bundle files from this repository:
   - `templates/manifest.json`
   - `templates/form.json`
   - `templates/search-form.json`
   - `templates/workflow.json`
2. In NetPad, navigate to **Applications** → **Import Application**
3. Select the `manifest.json` file
4. Configure integrations (email, Slack) and create your first Release

**Note:** The NetPad CLI (`@netpad/cli`) can install Applications published to npm. The IT Helpdesk Application is currently available via marketplace UI installation or bundle import. Future versions may be published to npm for CLI installation.

### Option 3: Run the Standalone Demo

```bash
# From the examples/it-helpdesk directory
npm install
npm run dev
```

Open [http://localhost:3003](http://localhost:3003) to see the demo.

### Pages

- **Home** (`/`) - Landing page with feature overview
- **Submit Ticket** (`/submit-ticket`) - IT support request form
- **Search Tickets** (`/search-tickets`) - Search and filter tickets with smart dropdowns
- **Success** (`/success`) - Confirmation page after ticket submission

## Project Structure

```
it-helpdesk/
├── src/app/
│   ├── layout.tsx          # Theme configuration
│   ├── page.tsx            # Landing page
│   ├── submit-ticket/
│   │   └── page.tsx        # Main ticket form (imports from templates/form.ts)
│   ├── search-tickets/
│   │   └── page.tsx        # Ticket search form (imports from templates/search-form.ts)
│   └── success/
│       └── page.tsx        # Confirmation page
├── templates/
│   ├── form.ts             # TypeScript form config with @netpad/forms types
│   ├── form.json           # Portable JSON form definition (for importing)
│   ├── search-form.ts      # TypeScript search form config
│   ├── search-form.json    # Portable JSON search form definition
│   ├── workflow.ts         # TypeScript workflow config
│   ├── workflow.json       # Portable JSON workflow definition (for importing)
│   └── manifest.json       # Template bundle metadata
├── package.json
├── tsconfig.json
├── next.config.js
└── README.md
```

## Form Configuration

This example demonstrates the **recommended pattern** for using `@netpad/forms`: define your form configuration in a separate TypeScript file with full type safety, then import it into your page components.

### Template File (templates/form.ts)

The form configuration is defined with proper TypeScript types:

```typescript
import type { FormConfiguration, FieldConfig, ConditionalLogic } from '@netpad/forms';

export const itHelpdeskFormConfig: FormConfiguration = {
  name: 'IT Support Request',
  description: 'Submit a request for IT support',
  fieldConfigs: [...],
  submitButtonText: 'Submit Ticket',
  theme: {
    primaryColor: '#1976d2',
    spacing: 'comfortable',
    inputStyle: 'outlined',
    borderRadius: 8,
    mode: 'light',
  },
};
```

### Page Component (src/app/submit-ticket/page.tsx)

The page imports and uses the configuration:

```typescript
import { FormRenderer } from '@netpad/forms';
import { itHelpdeskFormConfig } from '../../../templates/form';

// Optionally customize the imported config
const itSupportFormConfig = itHelpdeskFormConfig;

// Or extend it:
// const customConfig = {
//   ...itHelpdeskFormConfig,
//   submitButtonText: 'Submit IT Request',
//   theme: { ...itHelpdeskFormConfig.theme, primaryColor: '#00897b' },
// };

export default function SubmitTicketPage() {
  return (
    <FormRenderer
      config={itSupportFormConfig}
      onSubmit={handleSubmit}
      mode="create"
    />
  );
}
```

### Benefits of This Pattern

- **Type Safety**: Full IntelliSense and compile-time checking
- **Reusability**: Same config can be used in multiple pages
- **Testability**: Form configs can be unit tested independently
- **Portability**: Export to JSON for sharing or importing into NetPad
- **Customization**: Easy to extend the base config for variants

### Form Structure Overview

Here's a simplified view of the form configuration structure:

```typescript
const itSupportFormConfig: FormConfiguration = {
  name: 'IT Support Request',
  description: 'Submit a request for IT support',
  fieldConfigs: [
    // Section Headers for organization
    {
      path: '_section_reporter',
      type: 'layout',
      layout: { type: 'section-header', title: 'Reporter Information' },
    },

    // Basic fields
    {
      path: 'fullName',
      label: 'Full Name',
      type: 'short_text',
      required: true,
      fieldWidth: 'half',
    },

    // Dropdown with options
    {
      path: 'department',
      label: 'Department',
      type: 'dropdown',
      options: [
        { label: 'Engineering', value: 'engineering' },
        { label: 'Sales', value: 'sales' },
        // ...
      ],
    },

    // Conditional field (only shows when issueCategory === 'hardware')
    {
      path: 'assetId',
      label: 'Asset ID / Serial Number',
      type: 'short_text',
      conditionalLogic: {
        action: 'show',
        logicType: 'all',
        conditions: [
          { field: 'issueCategory', operator: 'equals', value: 'hardware' },
        ],
      },
    },
  ],
  submitButtonText: 'Submit Ticket',
};
```

## Conditional Logic

The form uses conditional logic to show category-specific fields:

| Issue Category | Conditional Field Shown |
|----------------|------------------------|
| Hardware | Asset ID / Serial Number |
| Software | Application Name |
| Network | Network Location (dropdown) |
| Access | System / Resource Name |
| Other | No additional fields |

### How Conditional Logic Works

```typescript
conditionalLogic: {
  action: 'show',        // 'show' or 'hide'
  logicType: 'all',      // 'all' (AND) or 'any' (OR)
  conditions: [
    {
      field: 'issueCategory',      // Field to check
      operator: 'equals',          // Comparison operator
      value: 'hardware'            // Value to match
    }
  ]
}
```

**Available operators:**
- `equals`, `notEquals`
- `contains`, `notContains`
- `greaterThan`, `lessThan`
- `isEmpty`, `isNotEmpty`
- `isTrue`, `isFalse`

## Submitted Data Structure

When a ticket is submitted, the form generates a structured document ready for MongoDB:

```json
{
  "fullName": "Jane Developer",
  "email": "jane@company.com",
  "department": "engineering",
  "phoneExtension": "1234",
  "issueCategory": "software",
  "urgencyLevel": "high",
  "subject": "VS Code crashes on startup",
  "description": "VS Code crashes every time I try to open a large TypeScript project...",
  "applicationName": "Visual Studio Code",
  "preferredContactMethod": "chat",
  "bestTimeToReach": ["morning", "afternoon"],
  "additionalNotes": "This started after the latest update"
}
```

## Extending This Example

### Add Email Notifications

In a production environment, you would integrate with NetPad Workflows to:
- Send confirmation emails to requesters
- Notify IT team with ticket details
- Escalate critical tickets to Slack/Teams

### Add Status Tracking

Add a hidden status field to track ticket lifecycle:
- `new` → `in-progress` → `waiting` → `resolved`

### Connect to MongoDB

Replace the demo `handleSubmit` with actual MongoDB integration:

```typescript
const handleSubmit = async (data: Record<string, unknown>) => {
  const response = await fetch('/api/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  // Handle response...
};
```

## Customization

### Change the Theme

Edit `src/app/layout.tsx` to customize colors:

```typescript
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // Change to your brand color
    },
  },
});
```

### Add More Departments

Update the department dropdown options in the form config:

```typescript
{
  path: 'department',
  options: [
    { label: 'Engineering', value: 'engineering' },
    { label: 'Legal', value: 'legal' },        // Add new
    { label: 'Research', value: 'research' },  // Add new
    // ...
  ],
}
```

### Add More Issue Categories

Add new categories with their conditional fields:

```typescript
// Add to issueCategory options
{ label: 'Printing', value: 'printing' },

// Add conditional field
{
  path: 'printerName',
  label: 'Printer Name',
  type: 'dropdown',
  options: [
    { label: 'Floor 1 - HP LaserJet', value: 'floor1-hp' },
    { label: 'Floor 2 - Canon', value: 'floor2-canon' },
  ],
  conditionalLogic: {
    action: 'show',
    conditions: [
      { field: 'issueCategory', operator: 'equals', value: 'printing' },
    ],
  },
}
```

## Application Bundle

This example includes a **portable Application bundle** that can be imported into NetPad:

```
templates/
├── form.ts               # TypeScript form config (for code with type safety)
├── form.json             # JSON form definition (for portability/importing)
├── workflow.ts           # TypeScript workflow config
├── workflow.json         # JSON workflow definition (for importing)
├── manifest.json         # Template bundle metadata and instructions
```

### Template Files

| File | Format | Use Case |
|------|--------|----------|
| **form.ts** | TypeScript | Development with full type safety and IntelliSense |
| **form.json** | JSON | Sharing, importing into NetPad, or non-TypeScript projects |
| **workflow.ts** | TypeScript | Workflow development with type safety |
| **workflow.json** | JSON | Sharing and importing workflows into NetPad |

### What's Included

**Form (`form.json`):**
- IT Support Request form with conditional fields
- Reporter information, issue categorization, priority levels
- Category-specific fields (Asset ID, Application Name, Network Location, etc.)
- Contact preferences and validation rules

**Workflow (`workflow.json`):**
- Automated ticket routing workflow
- Requester confirmation email
- IT team notification email
- Critical ticket escalation to Slack
- Parallel execution for simultaneous notifications

### Importing the Application

**Option 1: Import via NetPad UI**

1. In NetPad, navigate to **Applications** → **Import Application**
2. Select the `manifest.json` bundle file
3. Review the Application structure (forms, workflows, connections)
4. Configure integrations (email, Slack) and create your first Release

**Option 2: Install from Marketplace**

1. Navigate to **Marketplace** in NetPad
2. Search for "IT Help Desk"
3. Click **Install** to add the Application to your project

**Option 3: Import via Bundle Files**

Download the bundle files from `templates/` and import via NetPad UI.

**Option 4: Import via API**

```typescript
// Import the complete Application bundle
const bundle = {
  application: applicationJson,
  manifest: manifestJson,
  forms: [formJson, searchFormJson],
  workflows: [workflowJson],
  connections: [connectionJson],
};

const response = await fetch('/api/applications/import?orgId=your-org-id', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(bundle),
});

const result = await response.json();
console.log('Imported Application:', result.application);
```

### Workflow Configuration

After importing the workflow, you'll need to configure:

1. **Email addresses**: Update `it-support@yourcompany.com` to your IT team's email
2. **Slack integration**: Connect your Slack workspace and update `#it-critical-alerts` channel
3. **Form linkage**: Link the workflow to your imported form via the Workflows panel

### Benefits of Application Bundles

- **Complete Solutions**: Share entire Applications, not just individual forms/workflows
- **Version Control**: Store Application definitions in Git alongside your code
- **Semantic Versioning**: Track changes with major.minor.patch releases
- **Marketplace Distribution**: Publish Applications for others to discover and install
- **npm Integration**: Install Applications from npm registry or publish your own
- **Environment Promotion**: Move Applications from dev → staging → production
- **Breaking Change Detection**: Application Contracts detect and enforce version bumps
- **Disaster Recovery**: Backup and restore complete Application configurations

## Related Resources

- [IT Help Desk Article](../../docs/internal/it-helpdesk-article.md) - Full tutorial
- [Employee Onboarding Demo](../employee-onboarding-demo/) - Multi-page form example
- [Workflow Integration Demo](../workflow-integration-demo/) - Workflow automation example
- [@netpad/forms Documentation](../../packages/forms/README.md) - Forms package reference
- [Template Export/Import Strategy](../../docs/TEMPLATE_EXPORT_STRATEGY.md) - Template system architecture

## License

MIT
