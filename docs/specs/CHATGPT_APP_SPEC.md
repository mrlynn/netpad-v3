# NetPad ChatGPT App Specification

**Version:** 1.0.0
**Date:** January 27, 2025
**Status:** Draft

---

## Executive Summary

Build a ChatGPT App for NetPad using OpenAI's Apps SDK, enabling ChatGPT users to:
- **Know**: Access NetPad templates, browse application blueprints, query form/workflow metadata
- **Do**: Create forms, workflows, and applications directly from ChatGPT conversations
- **Show**: Display interactive template galleries, workflow visualizations, and form previews

This specification leverages our existing `@netpad/mcp-server` infrastructure and `@netpad/mcp-apps` UI bundles, adapting them for OpenAI's Apps SDK requirements.

---

## 1. Architecture Overview

### 1.1 System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         ChatGPT                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Conversation                                             │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │  NetPad Widget (iframe)                             │ │   │
│  │  │  - Template Gallery                                 │ │   │
│  │  │  - Workflow Viewer                                  │ │   │
│  │  │  - Form Preview                                     │ │   │
│  │  │  - Form Builder                                     │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ MCP Protocol (HTTPS + SSE)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  NetPad MCP Server                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Tool Handlers  │  │  UI Resources   │  │  Auth Handler   │  │
│  │  - browse_*     │  │  - Templates    │  │  - OAuth Flow   │  │
│  │  - create_*     │  │  - Widgets      │  │  - Session Mgmt │  │
│  │  - search_*     │  │  - HTML Bundles │  │                 │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  NetPad Cloud (netpad.io)                        │
│  - MongoDB Atlas                                                 │
│  - Application Data                                              │
│  - User Workspaces                                               │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

| Component | Technology | Notes |
|-----------|------------|-------|
| MCP Server | Node.js + `@modelcontextprotocol/sdk` | Extend existing `@netpad/mcp-server` |
| UI Widgets | React 18 + TypeScript | Reuse `@netpad/mcp-apps` components |
| Bundler | esbuild | Single-file ESM bundles |
| Hosting | Vercel (netpad.io) | `/chatgpt/*` routes |
| Auth | OAuth 2.0 | NetPad Cloud authentication |

---

## 2. Value Proposition

Following OpenAI's Know/Do/Show framework:

### 2.1 Know (Access to Data)

| Capability | Description | Tool |
|------------|-------------|------|
| Browse Templates | Access 100+ form templates across 14 categories | `browse_templates` |
| Search Forms | Find forms by name, category, or tags | `search_forms` |
| View Workflows | Inspect workflow definitions and steps | `get_workflow` |
| List Applications | Browse pre-built application blueprints | `browse_applications` |

### 2.2 Do (Real Actions)

| Capability | Description | Tool |
|------------|-------------|------|
| Create Form | Generate a new form from description | `create_form` |
| Create Workflow | Build workflow automation | `create_workflow` |
| Deploy Application | Create full application from template | `create_application` |
| Export to NetPad | Push created items to user's NetPad workspace | `export_to_netpad` |

### 2.3 Show (Better Presentation)

| Widget | Description | Use Case |
|--------|-------------|----------|
| Template Gallery | Interactive card grid with filtering | Browsing templates |
| Workflow Viewer | Visual workflow diagram (ReactFlow) | Understanding workflows |
| Form Preview | Live form rendering with validation | Previewing created forms |
| Form Builder | Interactive field editor | Building forms |

---

## 3. Tool Definitions

### 3.1 Core Tools (Priority 1)

#### `browse_templates`

Browse available form and workflow templates.

```typescript
{
  name: "browse_templates",
  title: "Browse NetPad Templates",
  description: "Browse form and workflow templates. Use this when users want to see available templates, find templates for specific use cases, or explore what NetPad offers.",
  inputSchema: {
    type: z.enum(["form", "workflow", "application"]).optional(),
    category: z.string().optional(),
    search: z.string().optional()
  },
  annotations: {
    readOnlyHint: true,
    openWorldHint: false
  },
  _meta: {
    "openai/outputTemplate": "ui://netpad/template-gallery.html",
    "openai/toolInvocation/invoking": "Loading templates...",
    "openai/toolInvocation/invoked": "Templates ready."
  }
}
```

**Response:**
```typescript
{
  structuredContent: {
    templateType: "form",
    templates: [
      { id: "contact-form", name: "Contact Form", category: "Business", icon: "📧" },
      // ...
    ],
    categories: ["Business", "Events", "Feedback", ...],
    total: 24
  },
  content: [{
    type: "text",
    text: "Found 24 form templates across 10 categories."
  }],
  _meta: {
    fullTemplates: { /* detailed template data */ }
  }
}
```

#### `create_form`

Create a new form from a description or template.

```typescript
{
  name: "create_form",
  title: "Create NetPad Form",
  description: "Create a new form. Can generate from natural language description or use an existing template as a starting point.",
  inputSchema: {
    description: z.string().describe("Natural language description of the form to create"),
    templateId: z.string().optional().describe("Optional template ID to use as base"),
    name: z.string().optional().describe("Form name"),
    fields: z.array(fieldSchema).optional().describe("Explicit field definitions")
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false
  },
  _meta: {
    "openai/outputTemplate": "ui://netpad/form-preview.html",
    "openai/toolInvocation/invoking": "Creating your form...",
    "openai/toolInvocation/invoked": "Form created!"
  }
}
```

#### `get_workflow`

View a workflow definition.

```typescript
{
  name: "get_workflow",
  title: "View Workflow",
  description: "Display a workflow with its nodes, connections, and logic.",
  inputSchema: {
    workflowId: z.string().optional(),
    templateId: z.string().optional()
  },
  annotations: {
    readOnlyHint: true
  },
  _meta: {
    "openai/outputTemplate": "ui://netpad/workflow-viewer.html",
    "openai/toolInvocation/invoking": "Loading workflow...",
    "openai/toolInvocation/invoked": "Workflow ready."
  }
}
```

### 3.2 Secondary Tools (Priority 2)

#### `search_templates`

Full-text search across templates.

```typescript
{
  name: "search_templates",
  title: "Search Templates",
  description: "Search templates by keyword, use case, or industry.",
  inputSchema: {
    query: z.string(),
    type: z.enum(["form", "workflow", "application"]).optional(),
    limit: z.number().default(10)
  },
  annotations: {
    readOnlyHint: true
  }
}
```

#### `export_to_netpad`

Export created items to user's NetPad workspace.

```typescript
{
  name: "export_to_netpad",
  title: "Export to NetPad",
  description: "Save the form, workflow, or application to your NetPad workspace.",
  inputSchema: {
    itemType: z.enum(["form", "workflow", "application"]),
    itemData: z.object({}).passthrough(),
    workspaceId: z.string().optional()
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false
  },
  _meta: {
    "openai/widgetAccessible": true
  }
}
```

### 3.3 Widget-Accessible Tools (Priority 3)

These tools are callable from within widgets for interactive experiences:

#### `update_form_field`

```typescript
{
  name: "update_form_field",
  title: "Update Form Field",
  description: "Update a field in the currently previewed form.",
  inputSchema: {
    fieldId: z.string(),
    updates: z.object({
      label: z.string().optional(),
      type: z.string().optional(),
      required: z.boolean().optional(),
      validation: z.object({}).optional()
    })
  },
  _meta: {
    "openai/visibility": "private",
    "openai/widgetAccessible": true
  }
}
```

#### `add_form_field`

```typescript
{
  name: "add_form_field",
  title: "Add Form Field",
  description: "Add a new field to the form being edited.",
  inputSchema: {
    afterFieldId: z.string().optional(),
    field: fieldSchema
  },
  _meta: {
    "openai/visibility": "private",
    "openai/widgetAccessible": true
  }
}
```

---

## 4. UI Widgets

### 4.1 Widget Architecture

All widgets follow a consistent pattern:

```typescript
// Widget entry point
import { createRoot } from 'react-dom/client';
import { useOpenAiGlobal, useOpenAiTheme } from './hooks/openai';
import { WidgetComponent } from './components/Widget';

function App() {
  const toolOutput = useOpenAiGlobal('toolOutput');
  const theme = useOpenAiTheme();

  if (!toolOutput?.structuredContent) {
    return <LoadingState />;
  }

  return (
    <WidgetComponent
      data={toolOutput.structuredContent}
      metadata={toolOutput._meta}
      theme={theme}
    />
  );
}

createRoot(document.getElementById('root')!).render(<App />);
```

### 4.2 Template Gallery Widget

**Purpose:** Browse and select templates with filtering and search.

**Features:**
- Category filter chips
- Search input
- Card grid layout (responsive)
- Template preview on hover
- "Use Template" action → calls `create_form` tool

**Data Contract:**
```typescript
interface TemplateGalleryData {
  templates: TemplateItem[];
  templateType: 'form' | 'workflow' | 'application';
  categories: string[];
  selectedCategory?: string;
  theme: 'light' | 'dark';
}

interface TemplateItem {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  tags?: string[];
  fieldCount?: number;
}
```

**Interactions:**
```typescript
// When user clicks "Use Template"
window.openai.callTool('create_form', { templateId: template.id });

// When user wants more info
window.openai.sendFollowUpMessage(`Tell me more about the ${template.name} template`);
```

### 4.3 Workflow Viewer Widget

**Purpose:** Visualize workflow structure with nodes and connections.

**Features:**
- ReactFlow-based diagram
- Node type icons (trigger, action, condition, etc.)
- Connection lines with labels
- Zoom/pan controls
- Node details on click
- Fullscreen mode

**Data Contract:**
```typescript
interface WorkflowViewerData {
  workflow: {
    id: string;
    name: string;
    description?: string;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  };
  theme: 'light' | 'dark';
  fitView: boolean;
  interactive: boolean;
}
```

**Display Modes:**
```typescript
// Request fullscreen for complex workflows
window.openai.requestDisplayMode('fullscreen');

// Return to inline
window.openai.requestDisplayMode('inline');
```

### 4.4 Form Preview Widget

**Purpose:** Live preview of form with real-time editing.

**Features:**
- Rendered form fields
- Validation indicators
- Field reordering (drag & drop)
- Edit field modal
- Add field button
- Export/save action

**Data Contract:**
```typescript
interface FormPreviewData {
  form: {
    id?: string;
    name: string;
    description?: string;
    fields: FormField[];
    settings?: FormSettings;
  };
  mode: 'preview' | 'edit';
  theme: 'light' | 'dark';
}
```

**State Persistence:**
```typescript
// Save form state for session continuity
window.openai.setWidgetState({
  formId: form.id,
  fields: form.fields,
  lastModified: Date.now()
});

// Restore on widget reload
const savedState = window.openai.widgetState;
if (savedState?.formId === currentFormId) {
  setFields(savedState.fields);
}
```

---

## 5. MCP Server Implementation

### 5.1 Server Structure

```
packages/chatgpt-app/
├── src/
│   ├── server.ts           # Main MCP server entry
│   ├── tools/
│   │   ├── browse.ts       # browse_templates, browse_applications
│   │   ├── create.ts       # create_form, create_workflow
│   │   ├── search.ts       # search_templates
│   │   └── export.ts       # export_to_netpad
│   ├── resources/
│   │   └── widgets.ts      # UI resource registration
│   ├── auth/
│   │   └── oauth.ts        # OAuth flow handlers
│   └── types.ts
├── widgets/
│   ├── template-gallery/
│   │   ├── src/
│   │   └── bundle.html     # Built widget
│   ├── workflow-viewer/
│   └── form-preview/
├── package.json
└── tsup.config.ts
```

### 5.2 Server Entry Point

```typescript
// src/server.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { registerTools } from './tools';
import { registerResources } from './resources/widgets';

const app = express();

// Create MCP server
const mcpServer = new McpServer({
  name: 'netpad-chatgpt',
  version: '1.0.0',
});

// Register tools and resources
registerTools(mcpServer);
registerResources(mcpServer);

// MCP endpoint
app.all('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionId: req.headers['mcp-session-id'] as string,
  });
  await mcpServer.connect(transport);
  await transport.handleRequest(req, res);
});

// Serve widget bundles
app.use('/widgets', express.static('widgets'));

const PORT = process.env.PORT || 2091;
app.listen(PORT, () => {
  console.log(`NetPad ChatGPT App server running on port ${PORT}`);
});
```

### 5.3 Resource Registration

```typescript
// src/resources/widgets.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import fs from 'fs';
import path from 'path';

const WIDGET_DOMAIN = process.env.WIDGET_DOMAIN || 'https://netpad.io';

export function registerResources(server: McpServer) {
  // Template Gallery Widget
  server.registerResource(
    'template-gallery',
    'ui://netpad/template-gallery.html',
    { description: 'Interactive template browser' },
    async () => ({
      contents: [{
        uri: 'ui://netpad/template-gallery.html',
        mimeType: 'text/html+skybridge',
        text: fs.readFileSync(
          path.join(__dirname, '../../widgets/template-gallery/bundle.html'),
          'utf-8'
        ),
        _meta: {
          'openai/widgetPrefersBorder': true,
          'openai/widgetDomain': WIDGET_DOMAIN,
          'openai/widgetCSP': {
            connect_domains: [`${WIDGET_DOMAIN}/api`],
            resource_domains: ['https://*.oaistatic.com']
          }
        }
      }]
    })
  );

  // Workflow Viewer Widget
  server.registerResource(
    'workflow-viewer',
    'ui://netpad/workflow-viewer.html',
    { description: 'Visual workflow diagram' },
    async () => ({
      contents: [{
        uri: 'ui://netpad/workflow-viewer.html',
        mimeType: 'text/html+skybridge',
        text: fs.readFileSync(
          path.join(__dirname, '../../widgets/workflow-viewer/bundle.html'),
          'utf-8'
        ),
        _meta: {
          'openai/widgetPrefersBorder': true,
          'openai/widgetDomain': WIDGET_DOMAIN
        }
      }]
    })
  );

  // Form Preview Widget
  server.registerResource(
    'form-preview',
    'ui://netpad/form-preview.html',
    { description: 'Interactive form preview and editor' },
    async () => ({
      contents: [{
        uri: 'ui://netpad/form-preview.html',
        mimeType: 'text/html+skybridge',
        text: fs.readFileSync(
          path.join(__dirname, '../../widgets/form-preview/bundle.html'),
          'utf-8'
        ),
        _meta: {
          'openai/widgetPrefersBorder': true,
          'openai/widgetDomain': WIDGET_DOMAIN,
          'openai/widgetCSP': {
            connect_domains: [`${WIDGET_DOMAIN}/api`]
          }
        }
      }]
    })
  );
}
```

---

## 6. Authentication

### 6.1 OAuth 2.0 Flow

For users who want to save items to their NetPad workspace:

```typescript
// OAuth configuration
const OAUTH_CONFIG = {
  authorizationUrl: 'https://netpad.io/oauth/authorize',
  tokenUrl: 'https://netpad.io/oauth/token',
  clientId: process.env.CHATGPT_OAUTH_CLIENT_ID,
  clientSecret: process.env.CHATGPT_OAUTH_CLIENT_SECRET,
  scopes: ['workspace:read', 'workspace:write', 'forms:create']
};
```

### 6.2 Tool with Auth Requirement

```typescript
{
  name: "export_to_netpad",
  // ...
  _meta: {
    "openai/requiresAuth": true,
    "openai/authScopes": ["workspace:write", "forms:create"]
  }
}
```

### 6.3 Unauthenticated Experience

Most tools work without authentication:
- `browse_templates` - Public templates
- `create_form` - Creates in session memory
- `get_workflow` - Views template workflows

Only `export_to_netpad` requires authentication.

---

## 7. State Management

### 7.1 Session State

Forms created during a conversation persist in session:

```typescript
// Server-side session store
const sessionForms = new Map<string, FormData>();

// In create_form tool handler
async function handleCreateForm(input, context) {
  const sessionId = context.sessionId;
  const form = generateForm(input);

  sessionForms.set(`${sessionId}:${form.id}`, form);

  return {
    structuredContent: { form },
    _meta: { formId: form.id }
  };
}
```

### 7.2 Widget State

Widgets persist their own state:

```typescript
// In widget
function saveFormState(form) {
  window.openai.setWidgetState({
    formId: form.id,
    fields: form.fields,
    settings: form.settings,
    lastModified: Date.now()
  });
}

// On widget load
const hydratedState = window.openai.widgetState;
if (hydratedState) {
  restoreForm(hydratedState);
}
```

---

## 8. Deployment

### 8.1 Infrastructure

| Component | Platform | URL |
|-----------|----------|-----|
| MCP Server | Vercel Edge Functions | `https://netpad.io/chatgpt/mcp` |
| Widget Bundles | Vercel Static | `https://netpad.io/chatgpt/widgets/*` |
| OAuth Endpoints | Vercel Serverless | `https://netpad.io/oauth/*` |

### 8.2 Environment Variables

```bash
# Required
CHATGPT_OAUTH_CLIENT_ID=xxx
CHATGPT_OAUTH_CLIENT_SECRET=xxx
WIDGET_DOMAIN=https://netpad.io

# Optional
MCP_SERVER_PORT=2091
LOG_LEVEL=info
```

### 8.3 Vercel Configuration

```json
// vercel.json
{
  "routes": [
    {
      "src": "/chatgpt/mcp",
      "dest": "/api/chatgpt/mcp"
    },
    {
      "src": "/chatgpt/widgets/(.*)",
      "dest": "/chatgpt/widgets/$1"
    }
  ]
}
```

### 8.4 Development Setup

```bash
# Start local server
cd packages/chatgpt-app
npm run dev

# Expose via ngrok
ngrok http 2091

# Configure ChatGPT connector
# URL: https://xxx.ngrok.app/mcp
```

---

## 9. Implementation Phases

### Phase 1: Foundation (Week 1)

- [ ] Create `packages/chatgpt-app` package structure
- [ ] Set up MCP server with StreamableHTTPServerTransport
- [ ] Implement `browse_templates` tool (reuse from `@netpad/mcp-server`)
- [ ] Adapt Template Gallery widget for OpenAI runtime
- [ ] Local testing with ngrok + ChatGPT developer mode

### Phase 2: Core Tools (Week 2)

- [ ] Implement `create_form` tool with AI generation
- [ ] Build Form Preview widget with editing capabilities
- [ ] Implement `get_workflow` tool
- [ ] Adapt Workflow Viewer widget
- [ ] Add widget state persistence

### Phase 3: Integration (Week 3)

- [ ] Implement OAuth flow for NetPad Cloud
- [ ] Build `export_to_netpad` tool
- [ ] Add widget-to-tool communication
- [ ] Implement session state management
- [ ] Error handling and edge cases

### Phase 4: Polish & Deploy (Week 4)

- [ ] Deploy to Vercel production
- [ ] Performance optimization (bundle size, lazy loading)
- [ ] Accessibility review
- [ ] Documentation and examples
- [ ] Submit to ChatGPT Apps Directory

---

## 10. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to first value | < 30 seconds | User sees templates on first tool call |
| Tool success rate | > 95% | Successful tool completions |
| Widget load time | < 2 seconds | Time to interactive widget |
| Export conversion | > 10% | Users who export to NetPad |
| Daily active users | 100+ (Month 1) | Unique ChatGPT users |

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| OpenAI Apps SDK changes | High | Abstract SDK interactions, version pin |
| Widget rendering issues | Medium | Graceful fallback to text content |
| Auth complexity | Medium | Start with unauthenticated experience |
| Rate limiting | Low | Implement caching, session coalescing |

---

## 12. Open Questions

1. **Monetization**: Should we gate any features for ChatGPT Plus users?
2. **Offline forms**: Can users download created forms as JSON/HTML?
3. **Collaboration**: Should multiple ChatGPT sessions share form state?
4. **Analytics**: What events should we track for product insights?

---

## Appendix A: Reusable Components from @netpad/mcp-apps

The existing `@netpad/mcp-apps` package provides a foundation:

| Component | Reusability | Adaptation Needed |
|-----------|-------------|-------------------|
| Template Gallery HTML | High | Replace `window.mcpApp` with `window.openai` |
| Workflow Viewer HTML | High | Same as above |
| Form Preview HTML | Medium | Add editing capabilities |
| Types & Interfaces | High | Direct reuse |
| UI Resources registry | Medium | Adapt URIs for OpenAI format |

---

## Appendix B: Tool Comparison (Claude MCP vs ChatGPT Apps)

| Feature | Claude MCP | ChatGPT Apps |
|---------|------------|--------------|
| Protocol | MCP over stdio/SSE | MCP over HTTP/SSE |
| UI Metadata | `_meta.ui.resourceUri` | `openai/outputTemplate` |
| Widget Hosting | External HTTP URL | Embedded in response |
| State | Ephemeral | `setWidgetState()` |
| Widget→Tool | Not supported | `window.openai.callTool()` |
| Auth | N/A | OAuth 2.0 built-in |

---

*End of Specification*
