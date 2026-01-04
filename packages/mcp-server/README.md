# @netpad/mcp-server

An MCP (Model Context Protocol) server that helps developers build form applications with [@netpad/forms](https://www.npmjs.com/package/@netpad/forms) and the NetPad platform.

## Features

### Form Building
- **Form Generation**: Generate complete form configurations from natural language descriptions
- **Field Configuration**: Create individual field configs with validation, conditional logic, and computed fields
- **Multi-Page Wizards**: Generate step-by-step form configurations
- **Validation**: Configure and validate form schemas

### Application Development
- **Next.js Scaffolding**: Generate complete Next.js applications with forms
- **Workflow Integration**: Connect forms to NetPad workflows for processing
- **MongoDB Queries**: Generate queries for form submission data
- **API Routes**: Generate Next.js API routes for form operations

### Developer Experience
- **Use Case Templates**: Pre-built templates for common form types
- **Field Suggestions**: Get recommended fields for your use case
- **Best Practices**: Access guidelines for form design, security, and workflows
- **Error Debugging**: Explain errors and get solutions
- **Documentation**: Embedded docs and examples

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
    "netpad-forms": {
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
    "netpad-forms": {
      "command": "npx",
      "args": ["@netpad/mcp-server"]
    }
  }
}
```

## Available Tools (22 total)

### Form Building Tools

| Tool | Description |
|------|-------------|
| `generate_form` | Generate a complete form from a natural language description |
| `generate_field` | Generate a single field configuration |
| `generate_conditional_logic` | Create show/hide logic for fields |
| `generate_computed_field` | Create formula-based calculated fields |
| `generate_multipage_config` | Generate multi-page wizard configuration |
| `validate_form_config` | Validate a form configuration |

### Application Building Tools

| Tool | Description |
|------|-------------|
| `scaffold_nextjs_app` | Generate a complete Next.js application with forms |
| `generate_workflow_integration` | Generate workflow integration code |
| `generate_mongodb_query` | Generate MongoDB queries for form data |
| `generate_api_route` | Generate Next.js API routes |
| `generate_react_code` | Generate React components for forms |

### Reference Tools

| Tool | Description |
|------|-------------|
| `list_field_types` | List all 28+ supported field types |
| `list_operators` | List conditional logic operators |
| `list_formula_functions` | List formula functions for computed fields |
| `list_validation_options` | List validation rule options |
| `list_theme_options` | List theme customization options |

### Helper Tools

| Tool | Description |
|------|-------------|
| `get_use_case_template` | Get pre-built templates (leadCapture, eventRegistration, feedbackSurvey) |
| `suggest_form_fields` | Get field recommendations for your use case |
| `get_best_practices` | Get best practices (formDesign, workflowPatterns, securityGuidelines, troubleshooting) |
| `debug_form_config` | Analyze form configuration for issues |
| `explain_error` | Explain error codes and provide solutions |
| `get_documentation` | Access documentation topics |

## Example Interactions

### Create a Form from Description

```
User: Create a lead capture form for a SaaS product

Claude: [Uses generate_form and suggest_form_fields tools]
Here's your lead capture form with recommended fields for SaaS:
- First Name, Last Name, Work Email, Company, Job Title
- Company Size dropdown
- Interest checkboxes (Demo, Pricing, Docs, Partnership)
- Message field
```

### Generate a Complete Application

```
User: Scaffold a Next.js app for this contact form

Claude: [Uses scaffold_nextjs_app tool]
Here's your complete Next.js application:
- package.json with all dependencies
- Form page component with submission handling
- Layout with Material-UI theming
- Environment variable template
- Setup instructions
```

### Connect Form to Workflow

```
User: I want to save form submissions to MongoDB and send a notification email

Claude: [Uses generate_workflow_integration with 'full_pipeline' type]
Here's the integration code:
- NetPad client setup
- Form submission handler
- Workflow trigger with payload
- Status polling and error handling
- Example workflow configuration
```

### Debug a Form Issue

```
User: I'm getting a 401 error when submitting the form

Claude: [Uses explain_error tool]
## Error: 401

**Explanation:** Authentication failed. The API key is missing, invalid, or expired.

**Solutions:**
1. Verify your API key is correct in environment variables
2. Check that the key starts with np_live_ or np_test_
3. Ensure the key has not been revoked in the NetPad dashboard
4. For test environments, use np_test_ prefixed keys
```

### Get Field Suggestions

```
User: What fields should I include for a healthcare appointment form?

Claude: [Uses suggest_form_fields with industry: 'healthcare']
Recommended fields:
- Patient name, email, phone
- Date of birth, insurance info
- Preferred appointment date/time
- Reason for visit

Tips:
- Ensure HIPAA compliance for health data
- Add clear consent checkboxes for data usage
```

## Available Prompts

Pre-built prompts for common form types:

| Prompt | Description |
|--------|-------------|
| `create-contact-form` | Generate a basic contact form |
| `create-registration-form` | Generate a user registration form |
| `create-survey-form` | Generate a multi-page survey |
| `create-order-form` | Generate an order form with computed totals |
| `explain-conditional-logic` | Explain how conditional logic works |

## Resources

The server exposes documentation as MCP resources:

- `netpad://docs/readme` - Main documentation
- `netpad://docs/architecture` - Architecture guide
- `netpad://docs/quick-start` - Quick start guide
- `netpad://docs/examples` - Code examples
- `netpad://reference/field-types` - Field type reference
- `netpad://reference/operators` - Operator reference
- `netpad://reference/formulas` - Formula function reference

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
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_field_types","arguments":{"category":"text"}}}' | node dist/index.js
```

## Related Packages

- [@netpad/forms](https://www.npmjs.com/package/@netpad/forms) - React form renderer library
- [@netpad/workflows](https://www.npmjs.com/package/@netpad/workflows) - Workflow automation client
- [NetPad Platform](https://netpad.io) - Full form builder platform with database integration

## License

Apache-2.0
