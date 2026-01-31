# @netpad/mcp-server

An MCP (Model Context Protocol) server for AI-assisted NetPad application development. This comprehensive toolkit provides **115+ tools** for building forms, workflows, applications, and data-driven experiences with the NetPad platform.

> **Build forms in minutes, not hours.** Describe what you need to Claude, get a working form with one click.
>
> Learn more at [netpad.io/mcp](https://netpad.io/mcp)

## Build from Claude

The most powerful way to use NetPad is through conversational building with Claude:

```
You: "I need a customer feedback form with rating, comments, and contact info"

Claude: I've generated your feedback form with:
- Star rating field (1-5)
- Comments textarea with 500 character limit
- Email and phone fields with validation

Click to import: https://netpad.io/import/imp_abc123
```

**That's it.** One conversation, one click, working form.

### How It Works

1. **Describe** - Tell Claude what form you need in plain English
2. **Generate** - Claude uses `generate_form` to create the configuration
3. **Import** - Click the link or use `create_import_link` for a shareable URL
4. **Customize** - Fine-tune in NetPad's visual builder if needed

## What's New in v2.4.0

- **One-Click Import Links**: `create_import_link` tool generates shareable URLs for instant form import
- **Import URLs in Output**: `generate_form` now includes a direct import link in the response
- **Deep Link Integration**: Forms created in Claude can be imported to NetPad Cloud with one click

## What's New in v2.0.0

- **Application Management**: Create, release, and manage NetPad applications with contracts
- **Marketplace & npm Integration**: Publish to marketplace and sync with npm registry
- **Workflow Automation**: 25+ node types for building automation workflows
- **Conversational Forms**: AI-powered data collection with RAG support
- **Search Forms**: MongoDB-powered search interfaces with configurable operators
- **25+ Form Templates**: Pre-built templates across 10 categories
- **Data Browser**: MongoDB connection management and query tools

## Features

### Form Building
- **Form Generation**: Generate complete form configurations from natural language descriptions
- **Field Configuration**: Create individual field configs with validation, conditional logic, and computed fields
- **Multi-Page Wizards**: Generate step-by-step form configurations
- **25+ Templates**: Pre-built templates for business, events, feedback, support, healthcare, and more
- **Validation**: Configure and validate form schemas

### Application Development
- **Application Management**: Create and manage NetPad applications with releases and contracts
- **Marketplace Publishing**: Publish applications to the NetPad marketplace
- **npm Integration**: Sync applications to npm for distribution
- **Next.js Scaffolding**: Generate complete Next.js applications with forms
- **API Routes**: Generate Next.js API routes for form operations

### Workflow Automation
- **Visual Workflows**: Build automation with 25+ node types
- **Triggers**: Form submission, webhook, schedule, manual, API
- **Logic Nodes**: Conditional routing, switch, filter, loop
- **Data Nodes**: Transform, code execution, variable management
- **Integrations**: MongoDB, HTTP, Email, Slack, Google Sheets
- **AI-Assisted Configuration**: Many node fields support AI generation (transforms, code, prompts, HTTP requests)

### Conversational Forms & RAG
- **AI-Powered Forms**: Natural language data collection
- **Topic Management**: Define conversation topics with priority and depth
- **RAG Integration**: Knowledge-guided conversations with document retrieval
- **Persona Configuration**: Professional, friendly, casual, or empathetic styles

### Search Forms
- **MongoDB Search**: Build search interfaces for your data
- **Configurable Operators**: equals, contains, between, regex, and more
- **Result Views**: Table, cards, or list layouts
- **Smart Dropdowns**: Distinct values with counts

### Data Browser
- **Connection Management**: Atlas, self-hosted, and Atlas Data API support
- **Query Templates**: Pre-built queries for common operations
- **Aggregation Pipelines**: Complex data analysis
- **Schema Analysis**: Infer collection schemas
- **Index Recommendations**: Optimize query performance

## Installation

```bash
npm install @netpad/mcp-server
```

Or install globally:

```bash
npm install -g @netpad/mcp-server
```

## Usage with Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "netpad": {
      "command": "npx",
      "args": ["@netpad/mcp-server"]
    }
  }
}
```

## Usage with Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "netpad": {
      "command": "npx",
      "args": ["@netpad/mcp-server"]
    }
  }
}
```

## Environment Variables

### For Direct API Tools

To use the direct API tools (`form_list`, `form_create`, `submission_export`, etc.), you need to configure your NetPad API key:

```bash
export NETPAD_API_KEY=np_live_your_key_here
```

**Get your API key:** [netpad.io/settings/api-keys](https://netpad.io/settings/api-keys)

#### With Claude Desktop

```json
{
  "mcpServers": {
    "netpad": {
      "command": "npx",
      "args": ["@netpad/mcp-server"],
      "env": {
        "NETPAD_API_KEY": "np_live_your_key_here"
      }
    }
  }
}
```

#### With Cursor

```json
{
  "mcpServers": {
    "netpad": {
      "command": "npx",
      "args": ["@netpad/mcp-server"],
      "env": {
        "NETPAD_API_KEY": "np_live_your_key_here"
      }
    }
  }
}
```

#### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NETPAD_API_KEY` | - | Your NetPad API key (required for direct API tools) |
| `NETPAD_API_URL` | `https://netpad.io` | Custom API URL (for self-hosted instances) |

## Available Tools (113+ total)

### Import & Sharing Tools (1)

| Tool | Description |
|------|-------------|
| `create_import_link` | Generate a shareable one-click import URL for any form configuration |

### Direct API Tools (14) - NEW! 🚀

These tools execute **real API calls** against the NetPad API when `NETPAD_API_KEY` is configured. Unlike generation tools that output code, these perform actual operations.

#### Form CRUD Tools (8)

| Tool | Description |
|------|-------------|
| `api_status` | Check if API key is configured and show connection status |
| `form_list` | List forms with filtering by project, status, or search |
| `form_get` | Get full details of a specific form |
| `form_create` | Create a new form with fields |
| `form_update` | Update form name, description, or fields |
| `form_delete` | Delete a form and its submissions |
| `form_publish` | Publish a form to make it publicly accessible |
| `form_unpublish` | Unpublish a form (set to draft) |

#### Submission CRUD Tools (6)

| Tool | Description |
|------|-------------|
| `submission_list` | List submissions with date filters and pagination |
| `submission_get` | Get a single submission by ID |
| `submission_create` | Submit new data to a form |
| `submission_update` | Update submission data (when supported) |
| `submission_delete` | Delete a submission |
| `submission_export` | Export submissions as JSON or CSV |

### RBAC Tools (18) - NEW! 🔐

Manage users, groups, roles, and permissions via the NetPad API. Requires `NETPAD_API_KEY` with appropriate admin permissions.

#### User Management Tools (4)

| Tool | Description |
|------|-------------|
| `user_list` | List all members of an organization with their roles |
| `user_get` | Get details of a specific user including roles and permissions |
| `user_invite` | Invite a new member to the organization by email |
| `user_remove` | Remove a member from the organization |

#### Group Management Tools (7)

| Tool | Description |
|------|-------------|
| `group_list` | List all groups/teams in an organization |
| `group_get` | Get details of a specific group including members |
| `group_create` | Create a new group/team |
| `group_update` | Update group name or description |
| `group_delete` | Delete a group |
| `group_add_member` | Add a user to a group |
| `group_remove_member` | Remove a user from a group |

#### Role Management Tools (5)

| Tool | Description |
|------|-------------|
| `role_list` | List available roles (built-in + custom) with capabilities |
| `role_get` | Get details of a specific role including permissions |
| `role_create` | Create a custom role with specific permissions |
| `role_update` | Update custom role permissions |
| `role_delete` | Delete a custom role |

#### Assignment & Permission Tools (4)

| Tool | Description |
|------|-------------|
| `role_assign` | Assign a role to a user or group |
| `role_unassign` | Remove a role assignment |
| `permission_check` | Check if a user has a specific permission |
| `permission_list` | List all available permissions |

### Form Building Tools (6)

| Tool | Description |
|------|-------------|
| `generate_form` | Generate a complete form from a natural language description |
| `generate_field` | Generate a single field configuration |
| `generate_conditional_logic` | Create show/hide logic for fields |
| `generate_computed_field` | Create formula-based calculated fields |
| `generate_multipage_config` | Generate multi-page wizard configuration |
| `validate_form_config` | Validate a form configuration |

### Application Management Tools (7)

| Tool | Description |
|------|-------------|
| `list_application_templates` | List available application templates |
| `get_application_template` | Get detailed template information |
| `create_application` | Generate code to create a new application |
| `generate_application_contract` | Generate API contract for an application |
| `generate_application_release` | Generate release configuration |
| `generate_export_bundle` | Generate export bundle structure |
| `preview_application_config` | Preview application configuration |

### Marketplace & npm Tools (8)

| Tool | Description |
|------|-------------|
| `list_marketplace_categories` | List marketplace categories |
| `search_marketplace` | Search marketplace for applications |
| `publish_to_marketplace` | Generate code to publish an application |
| `install_from_marketplace` | Generate code to install from marketplace |
| `generate_npm_package` | Generate npm package.json for application |
| `sync_to_npm` | Generate code to sync application to npm |
| `import_from_npm` | Generate code to import from npm |
| `validate_npm_package_name` | Validate npm package name |

### Workflow Tools (10)

| Tool | Description |
|------|-------------|
| `list_workflow_node_types` | List available workflow node types |
| `list_workflow_templates` | List workflow templates |
| `get_workflow_template` | Get detailed workflow template |
| `create_workflow` | Generate code to create a workflow |
| `add_workflow_node` | Generate code to add a node |
| `connect_workflow_nodes` | Generate code to connect nodes |
| `configure_workflow_trigger` | Generate trigger configuration |
| `test_workflow` | Generate workflow test code |
| `get_workflow_execution_history` | Generate execution history code |
| `preview_workflow_config` | Preview workflow configuration |

### Conversational & Search Form Tools (11)

| Tool | Description |
|------|-------------|
| `list_conversational_templates` | List conversational form templates |
| `get_conversational_template` | Get template details |
| `create_conversational_form` | Create AI-powered conversational form |
| `configure_rag_settings` | Configure RAG for a form |
| `add_rag_document` | Upload document for RAG |
| `list_search_operators` | List available search operators |
| `create_search_form` | Create MongoDB search form |
| `configure_search_operators` | Configure field operators |
| `test_conversational_form` | Generate test code |
| `test_search_form` | Generate search test code |

### Template Tools (5)

| Tool | Description |
|------|-------------|
| `list_template_categories` | List all template categories |
| `list_form_templates` | List 25+ form templates |
| `get_form_template` | Get detailed template |
| `create_form_from_template` | Create form from template |
| `preview_template_config` | Preview template configuration |

### Data Browser Tools (12)

| Tool | Description |
|------|-------------|
| `list_connection_types` | List supported connection types |
| `generate_connection_config` | Generate connection configuration |
| `list_query_templates` | List query templates |
| `get_query_template` | Get specific query template |
| `generate_data_browser_query` | Generate MongoDB queries |
| `generate_aggregation_pipeline` | Generate aggregation pipelines |
| `generate_index_recommendations` | Get index suggestions |
| `generate_schema_analysis` | Generate schema analysis code |
| `generate_data_export` | Generate data export code |
| `generate_connection_test` | Generate connection test code |
| `generate_list_databases` | Generate list databases code |
| `generate_list_collections` | Generate list collections code |

### Reference Tools (5)

| Tool | Description |
|------|-------------|
| `list_field_types` | List all 28+ supported field types |
| `list_operators` | List conditional logic operators |
| `list_formula_functions` | List formula functions for computed fields |
| `list_validation_options` | List validation rule options |
| `list_theme_options` | List theme customization options |

### Helper Tools (11)

| Tool | Description |
|------|-------------|
| `scaffold_nextjs_app` | Generate a complete Next.js application |
| `generate_workflow_integration` | Generate workflow integration code |
| `generate_mongodb_query` | Generate MongoDB queries for form data |
| `generate_api_route` | Generate Next.js API routes |
| `generate_react_code` | Generate React components |
| `get_use_case_template` | Get pre-built use case templates |
| `suggest_form_fields` | Get field recommendations |
| `get_best_practices` | Get best practices guides |
| `debug_form_config` | Analyze form configuration for issues |
| `explain_error` | Explain error codes with solutions |
| `get_documentation` | Access documentation topics |

## Form Templates (24)

Pre-built templates across 10 categories:

| Category | Templates |
|----------|-----------|
| **Business** | Contact Form, Lead Capture, Quote Request, Newsletter Signup |
| **Events** | Event Registration, RSVP, Volunteer Signup, Webinar Registration |
| **Feedback** | Customer Satisfaction, NPS Survey, Product Feedback, General Feedback |
| **Support** | Support Ticket, Appointment Booking |
| **E-commerce** | Order Form, Return Request |
| **Healthcare** | Patient Intake, Health Screening |
| **HR** | Job Application |
| **Finance** | Expense Report |
| **Education** | Course Enrollment, Scholarship Application |
| **Real Estate** | Property Inquiry, Rental Application |

## Conversational Form Templates

AI-powered data collection templates:

| Template | Use Case |
|----------|----------|
| `it-helpdesk` | IT support ticket collection |
| `customer-feedback` | Customer experience feedback |
| `lead-qualification` | Sales lead qualification |
| `patient-intake` | Healthcare patient information |

## Workflow Templates

Pre-built automation patterns:

| Template | Description |
|----------|-------------|
| `form-to-email` | Send email on form submission |
| `form-to-database` | Save submissions to MongoDB |
| `lead-qualification` | Qualify and route leads |
| `webhook-to-database` | Process webhooks to database |
| `scheduled-report` | Generate scheduled reports |

## AI-Assisted Node Configuration

Many workflow node fields support AI-powered configuration generation. The `aiAssist` metadata on config fields indicates which fields can use AI generation in the NetPad UI:

| Node Type | Field | AI Assistance |
|-----------|-------|---------------|
| `mongodb-query` | filter | Generate MongoDB queries from natural language |
| `transform` | expression | Generate JavaScript transforms |
| `http-request` | url, headers, body | Generate URLs, headers, and request bodies |
| `email-send` | to, subject, body | Generate email content |
| `ai-generate` | prompt | Generate AI prompts |
| `ai-classify` | categories, instructions | Generate classification rules |
| `code` | code | Generate JavaScript code |

## Resources

The server exposes documentation as MCP resources:

### Documentation
- `netpad://docs/readme` - Main documentation
- `netpad://docs/architecture` - Architecture guide
- `netpad://docs/quick-start` - Quick start guide
- `netpad://docs/examples` - Code examples

### References
- `netpad://reference/field-types` - Field type reference
- `netpad://reference/operators` - Operator reference
- `netpad://reference/formulas` - Formula function reference
- `netpad://reference/application-templates` - Application templates
- `netpad://reference/workflow-nodes` - Workflow node types
- `netpad://reference/workflow-templates` - Workflow templates
- `netpad://reference/conversational-templates` - Conversational form templates
- `netpad://reference/search-operators` - Search operators
- `netpad://reference/form-templates` - Form templates
- `netpad://reference/template-categories` - Template categories
- `netpad://reference/connection-types` - MongoDB connection types
- `netpad://reference/query-templates` - Query templates

## Example Interactions

### Build a Form with One Click

```
User: I need a job application form with resume upload, experience level,
      and availability

Claude: [Uses generate_form tool]
I've generated your job application form with:
- Resume file upload (PDF, DOC, DOCX - max 10MB)
- Experience level dropdown (Entry, Mid, Senior, Executive)
- Availability date picker
- Cover letter textarea
- Contact information section

Click to import: https://netpad.io/import/imp_xyz789

The form is ready to use - just click the link to add it to your NetPad workspace.
```

### Generate and Share an Import Link

```
User: Can you create a patient intake form and give me a link I can share
      with my team?

Claude: [Uses generate_form, then create_import_link]
Here's your patient intake form with:
- Personal information section
- Medical history fields
- Insurance details
- Emergency contact

Shareable import link: https://netpad.io/import/imp_abc123

This link expires in 7 days. Anyone with a NetPad account can click it
to import this form into their workspace.
```

### Create an Application

```
User: Create a customer feedback application with a survey form and email workflow

Claude: [Uses create_application, create_form_from_template, create_workflow tools]
Here's your complete application:
- Customer Feedback Application with NPS survey
- Workflow to send thank-you emails
- MongoDB storage for responses
```

### Build a Search Interface

```
User: I need a search form for my products collection

Claude: [Uses create_search_form tool]
Here's your search form with:
- Text search on name and description
- Category dropdown with distinct values
- Price range filter
- Results in table layout with pagination
```

### Create a Conversational Form

```
User: I want an AI-powered IT helpdesk intake form

Claude: [Uses create_conversational_form with it-helpdesk template]
Here's your conversational form:
- Professional AI persona
- Topics: Issue type, urgency, description, environment
- Automatic data extraction to structured format
```

### Direct API: List and Manage Forms

```
User: Show me all my published forms

Claude: [Uses form_list tool with status=published]
✅ Found 5 form(s):

1. Customer Feedback (customer-feedback) - 142 responses
2. Contact Form (contact) - 89 responses
3. Newsletter Signup (newsletter) - 1,203 responses
4. Support Ticket (support-ticket) - 56 responses
5. Job Application (careers-apply) - 23 responses
```

### Direct API: Create and Publish a Form

```
User: Create a bug report form with title, description, severity, and steps
      to reproduce. Put it in project proj_abc123 and publish it.

Claude: [Uses form_create, then form_publish]
✅ Created and published your bug report form!

Form ID: frm_xyz789
Public URL: https://netpad.io/f/bug-report

Fields:
- Title (required, short text)
- Description (required, long text)
- Severity (dropdown: Low, Medium, High, Critical)
- Steps to Reproduce (long text)
```

### Direct API: Export Submissions

```
User: Export all submissions from my contact form as CSV

Claude: [Uses submission_export with format=csv]
✅ Exported 89 submission(s) as CSV

```csv
id,submittedAt,name,email,message
sub_001,2024-01-15T10:30:00Z,John Doe,john@example.com,"Hello..."
sub_002,2024-01-15T11:45:00Z,Jane Smith,jane@example.com,"I have..."
...
```

You can save this to a file or paste into a spreadsheet.
```

### Generate MongoDB Queries

```
User: I need to analyze form submissions by month

Claude: [Uses generate_aggregation_pipeline tool]
Here's the aggregation pipeline:
- Groups submissions by year/month
- Counts per period
- Sorted chronologically
```

### RBAC: List Organization Members

```
User: Show me all members of my organization

Claude: [Uses user_list tool]
✅ Found 5 member(s) in organization

1. John Smith (john@company.com) - Owner
   Capabilities: manage_org, delete_org, manage_billing, manage_members, ...

2. Jane Doe (jane@company.com) - Admin
   Capabilities: manage_members, manage_all_forms, manage_all_connections, ...

3. Bob Wilson (bob@company.com) - Member
   Capabilities: create_forms, use_connections, view_forms, view_responses

4. Alice Chen (alice@company.com) - Viewer
   Capabilities: view_forms, view_responses
```

### RBAC: Invite a New Team Member

```
User: Invite sarah@company.com as an admin

Claude: [Uses user_invite tool]
✅ Invitation sent to sarah@company.com

Invitation Details:
- Role: admin
- Status: pending
- Expires: 2024-01-22T10:30:00Z

The user will receive an email with instructions to join.
```

### RBAC: Check User Permissions

```
User: Can Bob create new forms?

Claude: [Uses permission_check tool]
✅ Permission check result

User: Bob Wilson (bob@company.com)
Permission: create_forms
Has Permission: ✓ Yes

Bob has the "member" role which includes the create_forms permission.
```

### RBAC: List Available Permissions

```
User: What permissions are available for forms?

Claude: [Uses permission_list tool with resourceType=form]
✅ Available permissions for form

- form:read - View form configuration (owner, editor, analyst, viewer)
- form:write - Edit form configuration (owner, editor)
- form:delete - Delete the form (owner)
- form:publish - Publish/unpublish the form (owner, editor)
- form:manage_permissions - Manage form access (owner)
- form:view_responses - View submissions (owner, editor, analyst)
- form:export_responses - Export submissions (owner, editor, analyst)
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Type check
npm run typecheck

# Start the server
npm start
```

## Testing

Use the MCP Inspector to test the server:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

Or test via command line:

```bash
# List all tools
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js

# Call a tool
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_form_templates","arguments":{}}}' | node dist/index.js
```

## Related Packages

- [@netpad/mcp-server-remote](https://www.npmjs.com/package/@netpad/mcp-server-remote) - Remote HTTP MCP server for Claude custom connectors
- [@netpad/forms](https://www.npmjs.com/package/@netpad/forms) - React form renderer library
- [@netpad/workflows](https://www.npmjs.com/package/@netpad/workflows) - Workflow automation client
- [NetPad Platform](https://netpad.io) - Full form builder platform with database integration
- [NetPad MCP Guide](https://netpad.io/mcp) - Learn more about building with Claude

## License

Apache-2.0
