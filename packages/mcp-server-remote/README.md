# @netpad/mcp-server-remote

Remote MCP server for NetPad, deployable to Vercel for use with Claude Custom Connectors.

## Overview

This package provides a remote HTTP-based MCP server that can be used as a **Claude Custom Connector**. Unlike the stdio-based `@netpad/mcp-server` (for Claude Desktop), this server runs as a web service that Claude can connect to over the internet.

**Features:**
- **All 80+ tools** from `@netpad/mcp-server` - forms, workflows, extensions, templates, data browser, and more
- **API key authentication** using your existing NetPad API keys (`np_live_xxx` or `np_test_xxx`)
- **Ready to deploy** to Vercel

## Quick Start

### 1. Get Your NetPad API Key

1. Go to [netpad.io/settings](https://netpad.io/settings)
2. Click the **API Keys** tab
3. Click **Create API Key**
4. Give it a name like "Claude MCP Connector"
5. Select permissions (recommended: `forms:read`, `submissions:read`)
6. Copy the generated key (starts with `np_live_` or `np_test_`)

> **Important:** The full key is only shown once. Save it securely!

### 2. Deploy to Vercel

```bash
cd packages/mcp-server-remote
npm install
vercel --prod
```

Or deploy via the Vercel dashboard by importing this directory.

### 3. Configure Environment Variables (Optional)

By default, the server validates API keys against the NetPad API at `https://netpad.io`.

For self-hosted NetPad or development:

| Variable | Required | Description |
|----------|----------|-------------|
| `NETPAD_API_URL` | No | NetPad API base URL (default: `https://netpad.io`) |

### 4. Configure in Claude

1. Go to **Claude Settings > Connectors**
2. Click **"Add custom connector"**
3. Enter your connector name: `NetPad`
4. Enter your Vercel deployment URL:
   ```
   https://your-app.vercel.app/mcp
   ```
5. Click **"Advanced settings"**
6. In the **OAuth Client Secret** field, enter your NetPad API key: `np_live_xxxxx`

   > **Note:** Claude's custom connector UI uses OAuth fields, but we use them for Bearer token auth.

7. Click **Add**

### 5. Use in Conversations

In any Claude conversation, enable the NetPad connector via the "+" menu > Connectors.

## Authentication

All requests to the MCP server require a valid NetPad API key in the `Authorization` header:

```
Authorization: Bearer np_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### How It Works

1. You send a request with your NetPad API key
2. The MCP server validates the key against the NetPad API (`/api/v1/auth/validate`)
3. Valid keys are cached for 5 minutes to reduce API calls
4. The request proceeds if the key is valid

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `MISSING_API_KEY` | No Authorization header provided |
| 401 | `INVALID_AUTH_FORMAT` | Header doesn't use Bearer format |
| 401 | `INVALID_API_KEY_FORMAT` | Key doesn't start with `np_live_` or `np_test_` |
| 401 | `INVALID_API_KEY` | Key is invalid, expired, or revoked |
| 403 | `INSUFFICIENT_PERMISSIONS` | Key lacks required permissions |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |

### Key Management

Manage your API keys at [netpad.io/settings](https://netpad.io/settings):

- **Create** new keys with specific permissions
- **Revoke** compromised keys (takes effect immediately)
- **Monitor** usage statistics
- **Set expiration** dates for temporary access

## Available Tools (80+)

The remote server includes **all tools from `@netpad/mcp-server`**:

### 1. Form Building (6 tools)
- `generate_form` - Generate complete form configurations
- `generate_field` - Create individual field configurations
- `generate_conditional_logic` - Create show/hide logic
- `generate_computed_field` - Create formula-based fields
- `generate_multipage_config` - Multi-page wizard configurations
- `validate_form_config` - Validate form configurations

### 2. Application Management (7 tools)
- `create_application` - Generate code to create applications
- `generate_application_contract` - Define API contracts
- `generate_application_release` - Create versioned releases
- And more...

### 3. Marketplace & npm (8 tools)
- `publish_to_marketplace` - Publish applications
- `search_marketplace` - Search for applications
- `install_from_npm` - Install from npm registry
- And more...

### 4. Workflow Automation (10 tools)
- `create_workflow` - Generate workflow configurations
- `add_workflow_node` - Add nodes to workflows
- `connect_workflow_nodes` - Connect nodes with edges
- `list_workflow_node_types` - Browse 25+ node types
- And more...

### 5. Conversational & Search Forms (11 tools)
- `create_conversational_form` - AI-powered conversational forms
- `configure_rag_settings` - Enable RAG with document retrieval
- `create_search_form` - Build MongoDB search interfaces
- And more...

### 6. Enhanced Templates (5 tools)
- `list_form_templates` - Browse 25+ form templates
- `get_form_template` - Get template details
- `create_form_from_template` - Create with customizations
- And more...

### 7. Data Browser (12 tools)
- `generate_connection_config` - Configure MongoDB connections
- `generate_data_browser_query` - Generate find/aggregate queries
- `generate_aggregation_pipeline` - Build aggregation pipelines
- `generate_index_recommendations` - Get index suggestions
- And more...

### 8. Extension Development (5 tools) - NEW
- `generate_extension` - Generate complete extension packages
- `list_node_categories` - List workflow node categories
- `list_config_field_types` - List configuration field types
- `list_workflow_icons` - List commonly used icons
- `list_workflow_colors` - List suggested colors

### 9. Consolidated Reference Tools
- `get_reference` - Unified access to all reference documentation
- `browse_templates` - Browse all 40+ templates with filtering

### 10. Legacy Reference & Helper (16 tools)
- Documentation, best practices, debugging tools

## Local Development

```bash
# Install dependencies
npm install

# Create .env.local
cp .env.example .env.local

# Set your local NetPad URL (if running NetPad locally)
# NETPAD_API_URL=http://localhost:3000

# Run locally with Vercel CLI
npm run dev

# The server will be available at http://localhost:3000/mcp
```

### Testing Authentication Locally

```bash
# Test with your NetPad API key
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer np_live_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Test without API key (should return 401)
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## API Endpoints

| Endpoint | Auth Required | Description |
|----------|---------------|-------------|
| `GET /` | No | Server info and documentation |
| `GET /health` | No | Health check endpoint |
| `GET /mcp` | **Yes** | SSE stream for MCP communication |
| `POST /mcp` | **Yes** | JSON-RPC message endpoint |

## Architecture

This server uses the MCP SDK's `StreamableHTTPServerTransport` which implements the MCP Streamable HTTP transport specification. It supports:

- Server-Sent Events (SSE) for server-to-client messages
- HTTP POST for client-to-server messages
- Session management via `Mcp-Session-Id` header
- Bearer token authentication via NetPad API

### Code Sharing

The remote server imports `createNetPadMcpServer()` from `@netpad/mcp-server`, ensuring both servers have identical tool capabilities. Any updates to the main MCP server automatically apply to the remote server.

### Authentication Flow

```
┌─────────┐     ┌───────────────────┐     ┌────────────┐
│  Claude │────▶│ MCP Server Remote │────▶│  NetPad    │
│         │     │    (Vercel)       │     │    API     │
└─────────┘     └───────────────────┘     └────────────┘
     │                   │                      │
     │ 1. Request with   │                      │
     │    API key        │                      │
     │──────────────────▶│                      │
     │                   │ 2. Validate key      │
     │                   │─────────────────────▶│
     │                   │                      │
     │                   │ 3. Key info          │
     │                   │◀─────────────────────│
     │                   │                      │
     │ 4. MCP Response   │ (cached 5 min)       │
     │◀──────────────────│                      │
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NETPAD_API_URL` | No | NetPad API base URL (default: `https://netpad.io`) |

## Security Considerations

- **Centralized Key Management:** Keys are managed in NetPad, not in environment variables
- **Instant Revocation:** Revoked keys stop working within 5 minutes (cache TTL)
- **Usage Tracking:** All key usage is logged in NetPad
- **Rate Limiting:** Respects NetPad's per-key rate limits
- **HTTPS:** Always use HTTPS in production (Vercel provides this automatically)
- **Permissions:** Keys can be scoped to specific permissions

## Related Packages

- [@netpad/mcp-server](../mcp-server) - Local stdio MCP server for Claude Desktop (no auth required)
- [NetPad Platform](https://netpad.io) - Full form builder platform
- [Documentation](https://docs.netpad.io/docs/developer/mcp-server) - MCP server documentation

## Version History

| Version | Changes |
|---------|---------|
| **1.1.0** | Full parity with @netpad/mcp-server (80+ tools), imports shared server factory |
| **1.0.1** | Initial release with subset of tools |

## License

Apache-2.0
