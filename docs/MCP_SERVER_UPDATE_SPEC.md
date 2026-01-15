# @netpad/mcp-server Update Specification

**Version:** 1.0.0 → 2.0.0
**Status:** Draft
**Date:** January 15, 2026
**Reference:** `docs/internal/NETPAD_PLATFORM_CAPABILITIES_2026.md`

---

## Executive Summary

The `@netpad/mcp-server` package needs a comprehensive update to align with NetPad's expanded platform capabilities. The current version (0.2.0) focuses primarily on form building, but the platform has evolved to include:

- **Applications-First Model** with releases, contracts, and permissions
- **Marketplace & npm Integration** for package management
- **Workflow Automation** with 25+ node types
- **Conversational Forms & RAG** for AI-powered data collection
- **Template Gallery** with 25+ templates

This spec outlines the tools, resources, and prompts to add for comprehensive developer support.

---

## Current State Analysis

### Existing Tools (22 total)

**Form Building (6):**
- `generate_form` - Generate form configurations
- `generate_field` - Generate single field configs
- `generate_conditional_logic` - Create show/hide logic
- `generate_computed_field` - Create formula-based fields
- `generate_multipage_config` - Generate wizard configs
- `validate_form_config` - Validate form JSON

**Application Building (4):**
- `scaffold_nextjs_app` - Generate Next.js app
- `generate_workflow_integration` - Workflow integration code
- `generate_mongodb_query` - MongoDB query generation
- `generate_api_route` - Next.js API routes

**Reference (5):**
- `list_field_types` - 30+ field types
- `list_operators` - Conditional logic operators
- `list_formula_functions` - Computed field formulas
- `list_validation_options` - Validation rules
- `list_theme_options` - Theme customization

**Helper (6):**
- `get_use_case_template` - Pre-built templates (3 only)
- `suggest_form_fields` - Field recommendations
- `get_best_practices` - Best practices (4 topics)
- `debug_form_config` - Analyze form issues
- `explain_error` - Error explanations
- `get_documentation` - Access docs

**Code Generation (1):**
- `generate_react_code` - React component code

### Gaps Identified

1. **No Application Tools** - Create, manage, configure applications
2. **No Marketplace Tools** - Browse, import, publish applications
3. **No npm Package Tools** - Install, create, validate packages
4. **Limited Workflow Tools** - Only basic integration, no node configuration
5. **No Conversational Form Tools** - Missing RAG, topics, personas
6. **Limited Templates** - Only 3 templates (platform has 25+)
7. **No Search Form Tools** - Missing search configuration
8. **No Data Browser Tools** - Missing MongoDB data exploration
9. **No Release/Contract Tools** - Missing versioning and API contracts

---

## Proposed New Tools

### Phase 1: Application Management (Priority: High)

#### 1.1 `create_application`
Generate a new application structure with forms and workflows.

```typescript
// Tool Definition
server.tool(
  'create_application',
  'Create a new NetPad application structure with forms, workflows, and configuration',
  {
    name: z.string().describe('Application name'),
    description: z.string().optional().describe('Application description'),
    slug: z.string().optional().describe('URL-friendly slug'),
    forms: z.array(z.string()).optional().describe('Forms to include (names or configurations)'),
    workflows: z.array(z.string()).optional().describe('Workflows to include'),
    color: z.string().optional().describe('Application brand color'),
    icon: z.string().optional().describe('Application icon URL'),
  },
  async (params) => { /* ... */ }
);
```

**Output:**
- Application configuration JSON
- Form configurations for each form
- Workflow configurations for each workflow
- Setup instructions

#### 1.2 `list_application_templates`
List available application templates from the marketplace.

```typescript
server.tool(
  'list_application_templates',
  'List available application templates from the NetPad marketplace',
  {
    category: z.enum(['business', 'events', 'feedback', 'support', 'ecommerce', 'healthcare', 'finance', 'education', 'all']).optional(),
    search: z.string().optional().describe('Search term'),
  },
  async ({ category, search }) => { /* ... */ }
);
```

#### 1.3 `generate_application_release`
Generate release configuration for an application.

```typescript
server.tool(
  'generate_application_release',
  'Generate a release manifest for an application with semantic versioning',
  {
    applicationName: z.string(),
    version: z.string().describe('Semantic version (e.g., 1.0.0)'),
    changelog: z.string().optional(),
    forms: z.array(z.object({
      formId: z.string(),
      role: z.enum(['primary', 'secondary']),
    })),
    workflows: z.array(z.object({
      workflowId: z.string(),
      role: z.enum(['core', 'extension']),
    })),
  },
  async (params) => { /* ... */ }
);
```

#### 1.4 `generate_application_contract`
Generate an API contract for an application.

```typescript
server.tool(
  'generate_application_contract',
  'Generate an explicit API contract for an application defining inputs, outputs, and behaviors',
  {
    applicationName: z.string(),
    version: z.string(),
    inputs: z.array(z.object({
      key: z.string(),
      type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
      required: z.boolean(),
      source: z.enum(['form', 'api', 'webhook', 'config']).optional(),
      description: z.string().optional(),
    })),
    outputs: z.array(z.object({
      key: z.string(),
      type: z.string(),
      guaranteed: z.boolean(),
      description: z.string().optional(),
    })),
    sideEffects: z.array(z.object({
      type: z.enum(['write', 'api_call', 'notification', 'workflow_trigger']),
      target: z.string(),
      description: z.string().optional(),
    })).optional(),
  },
  async (params) => { /* ... */ }
);
```

### Phase 2: Marketplace & npm Integration (Priority: High)

#### 2.1 `generate_npm_package`
Generate npm package structure for a NetPad application.

```typescript
server.tool(
  'generate_npm_package',
  'Generate npm package.json and bundle.json for publishing a NetPad application',
  {
    applicationConfig: z.string().describe('Application configuration JSON'),
    packageName: z.string().describe('npm package name (e.g., @myorg/my-app)'),
    version: z.string(),
    author: z.string(),
    category: z.enum(['business', 'events', 'feedback', 'support', 'ecommerce', 'healthcare', 'finance', 'education', 'other']),
    tags: z.array(z.string()).optional(),
    dependencies: z.array(z.string()).optional().describe('Other NetPad packages this depends on'),
  },
  async (params) => { /* ... */ }
);
```

**Output:**
- `package.json` with `netpad` field and proper keywords
- `bundle.json` with forms, workflows, connections
- `README.md` template
- Publishing instructions

#### 2.2 `search_marketplace`
Search the NetPad marketplace for applications.

```typescript
server.tool(
  'search_marketplace',
  'Search the NetPad marketplace for applications and packages',
  {
    query: z.string().optional(),
    category: z.string().optional(),
    source: z.enum(['all', 'marketplace', 'npm']).optional(),
    official: z.boolean().optional().describe('Filter to official packages only'),
  },
  async (params) => { /* ... */ }
);
```

#### 2.3 `get_package_info`
Get detailed information about a marketplace package.

```typescript
server.tool(
  'get_package_info',
  'Get detailed information about a NetPad marketplace application or npm package',
  {
    packageName: z.string().describe('Package name (e.g., @netpad/contact-form)'),
  },
  async ({ packageName }) => { /* ... */ }
);
```

### Phase 3: Workflow Automation (Priority: High)

#### 3.1 `generate_workflow`
Generate a complete workflow configuration.

```typescript
server.tool(
  'generate_workflow',
  'Generate a complete workflow configuration from a description',
  {
    description: z.string().describe('Natural language description of the workflow'),
    name: z.string(),
    trigger: z.enum(['form_submission', 'webhook', 'schedule', 'manual', 'api']),
    formSlug: z.string().optional().describe('Form slug for form_submission trigger'),
    schedule: z.string().optional().describe('CRON expression for schedule trigger'),
  },
  async (params) => { /* ... */ }
);
```

#### 3.2 `list_workflow_nodes`
List available workflow node types.

```typescript
server.tool(
  'list_workflow_nodes',
  'List all available workflow node types with descriptions and configuration options',
  {
    category: z.enum(['trigger', 'logic', 'data', 'mongodb', 'integration', 'flow', 'all']).optional(),
  },
  async ({ category }) => { /* ... */ }
);
```

**Categories:**
- **Trigger**: Form Submission, Webhook, Schedule, Manual, API
- **Logic**: Conditional (If/Else), Switch, Filter, Loop
- **Data**: Transform, Code, Set Variable
- **MongoDB**: Query, Write, Atlas Data API, Atlas Cluster
- **Integration**: HTTP Request, Email Send, Google Sheets, Slack
- **Flow**: Delay, Parallel, Merge

#### 3.3 `generate_workflow_node`
Generate configuration for a specific workflow node.

```typescript
server.tool(
  'generate_workflow_node',
  'Generate configuration for a specific workflow node type',
  {
    nodeType: z.string().describe('Node type (e.g., mongodb_query, send_email, conditional)'),
    description: z.string().describe('What this node should do'),
    previousNodeOutput: z.string().optional().describe('Expected output from previous node'),
  },
  async (params) => { /* ... */ }
);
```

#### 3.4 `get_workflow_template`
Get pre-built workflow templates.

```typescript
server.tool(
  'get_workflow_template',
  'Get a pre-built workflow template for common automation patterns',
  {
    template: z.enum([
      'form_to_mongodb',
      'form_to_email',
      'form_notification',
      'scheduled_sync',
      'data_pipeline',
      'webhook_processor',
      'api_monitoring',
      'text_classification',
      'data_extraction',
      'conditional_routing',
      'batch_processing',
    ]),
  },
  async ({ template }) => { /* ... */ }
);
```

### Phase 4: Conversational Forms & RAG (Priority: Medium)

#### 4.1 `generate_conversational_form`
Generate a conversational form configuration.

```typescript
server.tool(
  'generate_conversational_form',
  'Generate a conversational form configuration with AI-powered data collection',
  {
    objective: z.string().describe('What the form should accomplish'),
    context: z.string().describe('Business context for the conversation'),
    topics: z.array(z.object({
      name: z.string(),
      description: z.string(),
      priority: z.enum(['required', 'important', 'optional']),
      depth: z.enum(['surface', 'moderate', 'deep']),
    })),
    personaStyle: z.enum(['professional', 'friendly', 'casual', 'empathetic']).optional(),
    extractionFields: z.array(z.object({
      key: z.string(),
      type: z.string(),
      required: z.boolean(),
    })).optional(),
  },
  async (params) => { /* ... */ }
);
```

#### 4.2 `get_conversational_template`
Get pre-built conversational form templates.

```typescript
server.tool(
  'get_conversational_template',
  'Get a pre-built conversational form template',
  {
    template: z.enum(['it-helpdesk', 'customer-feedback', 'patient-intake', 'general-intake']),
  },
  async ({ template }) => { /* ... */ }
);
```

#### 4.3 `generate_rag_config`
Generate RAG (Knowledge-Guided) configuration for a form.

```typescript
server.tool(
  'generate_rag_config',
  'Generate RAG configuration for knowledge-guided conversational forms',
  {
    formConfig: z.string().describe('Existing form or conversational form config'),
    documentTypes: z.array(z.enum(['policy', 'procedure', 'faq', 'contract', 'guideline'])),
    retrievalConfig: z.object({
      maxChunks: z.number().optional().default(5),
      minScore: z.number().optional().default(0.7),
    }).optional(),
  },
  async (params) => { /* ... */ }
);
```

**Output:**
- RAG configuration JSON
- Document upload instructions
- Vector search setup requirements (M10+ cluster)
- Embedding configuration

### Phase 5: Search Forms (Priority: Medium)

#### 5.1 `generate_search_form`
Generate a search form configuration.

```typescript
server.tool(
  'generate_search_form',
  'Generate a search form configuration for querying MongoDB data',
  {
    name: z.string(),
    collection: z.string().describe('MongoDB collection to search'),
    searchFields: z.array(z.object({
      path: z.string(),
      label: z.string(),
      type: z.string(),
      operators: z.array(z.enum(['equals', 'contains', 'between', 'in', 'regex', 'gt', 'lt', 'gte', 'lte'])),
    })),
    resultDisplay: z.enum(['table', 'cards', 'list']).optional(),
    resultFields: z.array(z.string()).optional().describe('Fields to show in results'),
    pagination: z.boolean().optional().default(true),
  },
  async (params) => { /* ... */ }
);
```

#### 5.2 `list_search_operators`
List available search operators for search forms.

```typescript
server.tool(
  'list_search_operators',
  'List all available search operators for search form fields',
  {},
  async () => {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(SEARCH_OPERATORS, null, 2),
      }],
    };
  }
);
```

**Operators:**
- `equals` - Exact match
- `contains` - String contains (case-insensitive)
- `between` - Range (for numbers/dates)
- `in` - Value in list
- `regex` - Regular expression match
- `gt` / `gte` - Greater than (or equal)
- `lt` / `lte` - Less than (or equal)
- `exists` - Field exists
- `isEmpty` - Field is null or empty

#### 5.3 `get_search_template`
Get pre-built search form templates.

```typescript
server.tool(
  'get_search_template',
  'Get a pre-built search form template',
  {
    template: z.enum(['customer-search', 'order-search', 'support-ticket-search']),
  },
  async ({ template }) => { /* ... */ }
);
```

### Phase 6: Enhanced Templates (Priority: Medium)

#### 6.1 `list_form_templates`
List all available form templates (25+ in platform).

```typescript
server.tool(
  'list_form_templates',
  'List all available form templates with categories and descriptions',
  {
    category: z.enum([
      'business', 'events', 'feedback', 'support', 'ecommerce',
      'healthcare', 'finance', 'education', 'real-estate', 'search', 'all'
    ]).optional(),
  },
  async ({ category }) => { /* ... */ }
);
```

**Categories & Templates:**

| Category | Templates |
|----------|-----------|
| Business | Contact Form, Job Application, Lead Capture, Quote Request, Newsletter Signup |
| Events | Event Registration, RSVP, Volunteer Signup, Webinar Registration |
| Feedback | Customer Satisfaction, NPS Survey, Product Feedback, General Feedback |
| Support | Support Ticket, Appointment Booking |
| E-commerce | Order Form, Return Request |
| Healthcare | Patient Intake (encrypted), Health Screening |
| Finance | Expense Report, Financial Application (encrypted) |
| Education | Course Enrollment, Scholarship Application |
| Real Estate | Property Inquiry, Rental Application |
| Search | Customer Search, Order Search, Support Ticket Search |

#### 6.2 `get_form_template`
Get a specific form template with full configuration.

```typescript
server.tool(
  'get_form_template',
  'Get a specific form template with full configuration, fields, and validation',
  {
    template: z.string().describe('Template name (e.g., "contact-form", "lead-capture", "patient-intake")'),
    customizations: z.object({
      name: z.string().optional(),
      includeOptionalFields: z.boolean().optional(),
      theme: z.string().optional(),
    }).optional(),
  },
  async ({ template, customizations }) => { /* ... */ }
);
```

### Phase 7: Data Browser & Connection (Priority: Low)

#### 7.1 `generate_connection_config`
Generate MongoDB connection configuration.

```typescript
server.tool(
  'generate_connection_config',
  'Generate MongoDB connection configuration for the connection vault',
  {
    name: z.string().describe('Descriptive name for the connection'),
    type: z.enum(['atlas', 'self-hosted', 'atlas-data-api']),
    description: z.string().optional(),
  },
  async (params) => { /* ... */ }
);
```

#### 7.2 `generate_data_browser_query`
Generate queries for the data browser.

```typescript
server.tool(
  'generate_data_browser_query',
  'Generate MongoDB queries for browsing and analyzing data',
  {
    collection: z.string(),
    operation: z.enum(['find', 'aggregate', 'distinct', 'count']),
    description: z.string().describe('What you want to query'),
  },
  async (params) => { /* ... */ }
);
```

---

## Updated Resources

### New Resources to Add

```typescript
// Application Templates
server.resource(
  'netpad-application-templates',
  'netpad://templates/applications',
  async () => ({
    contents: [{
      uri: 'netpad://templates/applications',
      mimeType: 'application/json',
      text: JSON.stringify(APPLICATION_TEMPLATES, null, 2),
    }],
  })
);

// Workflow Nodes Reference
server.resource(
  'netpad-workflow-nodes',
  'netpad://reference/workflow-nodes',
  async () => ({
    contents: [{
      uri: 'netpad://reference/workflow-nodes',
      mimeType: 'application/json',
      text: JSON.stringify(WORKFLOW_NODES, null, 2),
    }],
  })
);

// Search Operators Reference
server.resource(
  'netpad-search-operators',
  'netpad://reference/search-operators',
  async () => ({
    contents: [{
      uri: 'netpad://reference/search-operators',
      mimeType: 'application/json',
      text: JSON.stringify(SEARCH_OPERATORS, null, 2),
    }],
  })
);

// Conversational Form Topics
server.resource(
  'netpad-conversational-topics',
  'netpad://reference/conversational-topics',
  async () => ({
    contents: [{
      uri: 'netpad://reference/conversational-topics',
      mimeType: 'application/json',
      text: JSON.stringify(CONVERSATIONAL_TOPICS, null, 2),
    }],
  })
);

// API Reference
server.resource(
  'netpad-api-reference',
  'netpad://docs/api-reference',
  async () => ({
    contents: [{
      uri: 'netpad://docs/api-reference',
      mimeType: 'text/markdown',
      text: API_REFERENCE_DOCS,
    }],
  })
);
```

---

## Updated Prompts

### New Prompts to Add

```typescript
// Application prompts
server.prompt(
  'create-application',
  'Create a new NetPad application with forms and workflows',
  async () => ({ /* ... */ })
);

server.prompt(
  'publish-to-marketplace',
  'Prepare an application for marketplace publishing',
  async () => ({ /* ... */ })
);

// Workflow prompts
server.prompt(
  'create-form-workflow',
  'Create a workflow that processes form submissions',
  async () => ({ /* ... */ })
);

server.prompt(
  'create-scheduled-workflow',
  'Create a scheduled workflow with CRON trigger',
  async () => ({ /* ... */ })
);

// Conversational form prompts
server.prompt(
  'create-support-chatbot',
  'Create a conversational support form with RAG',
  async () => ({ /* ... */ })
);

// Search form prompts
server.prompt(
  'create-search-interface',
  'Create a search form for querying existing data',
  async () => ({ /* ... */ })
);
```

---

## Updated Best Practices

### New Topics to Add

```typescript
export const BEST_PRACTICES = {
  // Existing topics...
  formDesign: '...',
  workflowPatterns: '...',
  securityGuidelines: '...',
  troubleshooting: '...',

  // New topics
  applicationArchitecture: `
## Application Architecture Best Practices

### 1. Application Structure
- Group related forms and workflows into a single application
- Use descriptive names and slugs
- Add application-level documentation in description
- Use consistent color/icon branding

### 2. Release Management
- Use semantic versioning (MAJOR.MINOR.PATCH)
- Create releases for production deployments
- Write meaningful changelogs
- Test thoroughly before releasing

### 3. Contracts
- Define explicit API contracts for integrations
- Document inputs, outputs, and side effects
- Use contracts for breaking change detection
- Lock critical components

### 4. Permissions
- Set appropriate default access levels
- Use application roles (owner, editor, analyst, viewer)
- Grant minimum necessary permissions
- Audit permission changes
`,

  marketplacePublishing: `
## Marketplace Publishing Best Practices

### 1. Package Preparation
- Write comprehensive README documentation
- Include setup instructions
- List all dependencies
- Add relevant tags for discoverability

### 2. Versioning
- Follow semantic versioning strictly
- Document breaking changes
- Provide migration guides
- Test upgrade paths

### 3. Quality
- Ensure all forms are valid
- Test workflows thoroughly
- Include sample data
- Validate on fresh install

### 4. Maintenance
- Monitor for issues
- Respond to user feedback
- Publish updates regularly
- Deprecate old versions gracefully
`,

  conversationalForms: `
## Conversational Form Best Practices

### 1. Topic Design
- Define clear, non-overlapping topics
- Prioritize required topics first
- Use appropriate depth levels
- Include validation for extracted data

### 2. Persona Configuration
- Match persona to use case
- Be consistent in tone
- Avoid overly casual for professional contexts
- Set appropriate restrictions

### 3. RAG Integration
- Use high-quality source documents
- Organize documents by topic
- Update documents regularly
- Monitor citation accuracy

### 4. User Experience
- Set reasonable conversation limits
- Provide clear completion indicators
- Allow users to review extracted data
- Handle errors gracefully
`,

  searchForms: `
## Search Form Best Practices

### 1. Field Selection
- Include frequently searched fields
- Provide appropriate operators per field type
- Use smart dropdowns for categorical data
- Support range queries for dates/numbers

### 2. Result Display
- Choose appropriate layout (table/cards/list)
- Show relevant fields in results
- Enable sorting and pagination
- Provide action buttons (view, edit, delete)

### 3. Performance
- Index searchable fields
- Limit result page size
- Use projections to reduce data transfer
- Consider caching for common queries

### 4. UX
- Provide clear field labels
- Show active filters
- Enable filter clearing
- Support saved searches
`,
};
```

---

## Updated Constants

### New Constants Files

#### `workflow-nodes.ts`
```typescript
export const WORKFLOW_NODES = {
  triggers: [
    {
      type: 'form_submission',
      category: 'trigger',
      description: 'Triggered when a form is submitted',
      config: { formId: 'string', filters: 'object?' },
    },
    {
      type: 'webhook',
      category: 'trigger',
      description: 'Triggered by external HTTP POST',
      config: { path: 'string', auth: 'object?' },
    },
    // ... more triggers
  ],
  logic: [
    {
      type: 'conditional',
      category: 'logic',
      description: 'Route based on condition (if/else)',
      config: { condition: 'expression', trueNode: 'string', falseNode: 'string' },
    },
    // ... more logic nodes
  ],
  // ... other categories
};
```

#### `search-operators.ts`
```typescript
export const SEARCH_OPERATORS = [
  {
    operator: 'equals',
    label: 'equals',
    description: 'Exact match',
    fieldTypes: ['text', 'number', 'dropdown', 'boolean'],
    mongoOperator: '$eq',
  },
  {
    operator: 'contains',
    label: 'contains',
    description: 'String contains (case-insensitive)',
    fieldTypes: ['text', 'long_text'],
    mongoOperator: '$regex',
  },
  // ... more operators
];
```

#### `conversational-templates.ts`
```typescript
export const CONVERSATIONAL_TEMPLATES = {
  'it-helpdesk': {
    name: 'IT Helpdesk',
    category: 'support',
    objective: 'Collect IT support ticket information through conversation',
    context: 'IT support ticketing system',
    topics: [
      { id: 'issue_type', name: 'Issue Type', priority: 'required', depth: 'moderate' },
      { id: 'urgency', name: 'Urgency Level', priority: 'required', depth: 'surface' },
      { id: 'description', name: 'Issue Description', priority: 'required', depth: 'deep' },
      { id: 'environment', name: 'Environment', priority: 'important', depth: 'moderate' },
      { id: 'contact', name: 'Contact Information', priority: 'optional', depth: 'surface' },
    ],
    persona: {
      style: 'professional',
      tone: 'helpful and patient',
      behaviors: ['Ask clarifying questions', 'Acknowledge frustration'],
      restrictions: ['Do not make promises about resolution time'],
    },
    extractionSchema: [
      { key: 'issueCategory', type: 'string', required: true },
      { key: 'urgencyLevel', type: 'string', required: true },
      { key: 'description', type: 'string', required: true },
      { key: 'deviceType', type: 'string', required: false },
      { key: 'contactEmail', type: 'email', required: false },
    ],
  },
  // ... more templates
};
```

---

## Implementation Plan

### Phase 1: Application & Marketplace Tools (Week 1-2)
1. Add `create_application` tool
2. Add `list_application_templates` tool
3. Add `generate_application_release` tool
4. Add `generate_application_contract` tool
5. Add `generate_npm_package` tool
6. Add `search_marketplace` tool
7. Add `get_package_info` tool

### Phase 2: Workflow Tools (Week 2-3)
1. Add `generate_workflow` tool
2. Add `list_workflow_nodes` tool
3. Add `generate_workflow_node` tool
4. Add `get_workflow_template` tool
5. Add workflow-nodes.ts constants
6. Update best practices

### Phase 3: Conversational & Search Forms (Week 3-4)
1. Add `generate_conversational_form` tool
2. Add `get_conversational_template` tool
3. Add `generate_rag_config` tool
4. Add `generate_search_form` tool
5. Add `list_search_operators` tool
6. Add `get_search_template` tool
7. Add conversational-templates.ts constants
8. Add search-operators.ts constants

### Phase 4: Enhanced Templates & Resources (Week 4)
1. Update `list_form_templates` with all 25+ templates
2. Add `get_form_template` with customization support
3. Add new resources
4. Add new prompts
5. Update documentation

### Phase 5: Testing & Documentation (Week 4-5)
1. Test all new tools with MCP Inspector
2. Update README.md
3. Update CHANGELOG.md
4. Publish new version

---

## Version & Release Plan

### Version: 2.0.0

**Breaking Changes:**
- None (additive only)

**New Features:**
- 20+ new tools for applications, workflows, conversational forms, search forms
- 10+ new resources
- 10+ new prompts
- Expanded best practices
- Comprehensive template library

**Package Updates:**
```json
{
  "name": "@netpad/mcp-server",
  "version": "2.0.0",
  "description": "MCP server for building NetPad applications - 40+ tools for forms, workflows, applications, marketplace, and AI-powered conversational experiences"
}
```

---

## Tool Count Summary

### Current: 22 tools
### Proposed: 42+ tools

| Category | Current | Proposed |
|----------|---------|----------|
| Form Building | 6 | 6 |
| Application Building | 4 | 4 |
| Reference | 5 | 8 |
| Helper | 6 | 8 |
| Code Generation | 1 | 1 |
| **Application Management** | 0 | 4 |
| **Marketplace/npm** | 0 | 3 |
| **Workflow Automation** | 0 | 4 |
| **Conversational Forms** | 0 | 3 |
| **Search Forms** | 0 | 3 |
| **Templates** | 0 | 2 |
| **Total** | **22** | **46** |

---

## Success Criteria

1. **Tool Coverage**: All major platform features accessible via MCP tools
2. **Documentation**: Comprehensive resources for all tools
3. **Templates**: Access to all 25+ form templates and 11 workflow templates
4. **Best Practices**: Updated guidance for all new features
5. **Testing**: All tools tested with MCP Inspector
6. **Backward Compatibility**: Existing tools unchanged

---

*Last Updated: January 15, 2026*
