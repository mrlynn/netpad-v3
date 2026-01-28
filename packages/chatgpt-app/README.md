# @netpad/chatgpt-app

ChatGPT App for NetPad - Build forms, workflows, and applications from ChatGPT conversations using OpenAI's Apps SDK.

## Features

- **Browse Templates**: Explore 100+ form and workflow templates with an interactive gallery
- **Create Forms**: Generate forms from natural language descriptions
- **View Workflows**: Visualize workflow automations with interactive diagrams
- **Export to NetPad**: Save your creations directly to your NetPad workspace

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Build the server and widgets
npm run build

# Start the development server
npm run dev

# In another terminal, expose via ngrok
ngrok http 2091
```

### Connect to ChatGPT

1. Copy the ngrok HTTPS URL (e.g., `https://abc123.ngrok.app`)
2. Open ChatGPT Settings → Connectors
3. Add a new connector with URL: `https://abc123.ngrok.app/mcp`
4. Start a new chat and try: "Browse the form templates available in NetPad"

## Architecture

```
packages/chatgpt-app/
├── src/
│   ├── server.ts           # Express + MCP server
│   ├── types.ts            # TypeScript definitions
│   ├── tools/
│   │   ├── index.ts        # Tool registration
│   │   └── browse.ts       # browse_templates, search_templates
│   └── resources/
│       └── widgets.ts      # UI resource registration
├── widgets/
│   ├── template-gallery/   # Interactive template browser
│   ├── workflow-viewer/    # Workflow visualization
│   └── form-preview/       # Form preview and editing
├── scripts/
│   └── build-widgets.js    # Widget bundling script
└── package.json
```

## Available Tools

### `browse_templates`

Browse form and workflow templates with optional filtering.

```
User: "Show me the form templates"
User: "What healthcare templates are available?"
User: "Find templates for event registration"
```

### `search_templates`

Full-text search across all templates.

```
User: "Search for contact form templates"
User: "Find templates related to HR onboarding"
```

### `create_form` (Phase 2)

Create a new form from natural language.

```
User: "Create a customer feedback form with rating and comments"
User: "Build a job application form"
```

### `export_to_netpad` (Phase 3)

Save forms/workflows to your NetPad workspace.

```
User: "Save this form to my NetPad account"
```

## Widget Development

Widgets use React and communicate with ChatGPT via the `window.openai` API:

```typescript
// Access tool output data
const data = window.openai.toolOutput.structuredContent;

// Call another tool
window.openai.callTool('create_form', { templateId: 'contact-form' });

// Send a follow-up message
window.openai.sendFollowUpMessage('Tell me more about this template');

// Report widget height
window.openai.notifyIntrinsicHeight(document.body.scrollHeight);
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `2091` | Server port |
| `HOST` | `0.0.0.0` | Server host |
| `WIDGET_DOMAIN` | `https://netpad.io` | Domain for widget CSP |
| `NODE_ENV` | `development` | Environment mode |

## Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Build server and widgets |
| `npm run build:server` | Build MCP server only |
| `npm run build:widgets` | Build widget bundles only |
| `npm run dev` | Watch mode for development |
| `npm start` | Start production server |
| `npm run tunnel` | Start ngrok tunnel |
| `npm run typecheck` | Run TypeScript checks |

## License

Apache-2.0 - see [LICENSE](../../LICENSE)
