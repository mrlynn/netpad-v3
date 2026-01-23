# @netpad/demo-node

A simple demonstration of a NetPad workflow node extension.

## Overview

This extension provides a single workflow node called **"Log Message"** that:
- Logs a configurable message to the console
- Supports different log levels (info, warn, error)
- Can pass through input data to downstream nodes
- Demonstrates all key concepts of NetPad extensions

## Installation

The extension is automatically loaded by NetPad's extension system.

To enable it, add to your extension configuration:

```typescript
// In src/lib/extensions/loader.ts
import demoNodeExtension from '@netpad/demo-node';

const extensions = [
  demoNodeExtension,
  // ... other extensions
];
```

## Usage

Once installed, the **"Log Message"** node appears in the workflow editor palette under the **Custom** category.

### Configuration Options

| Field | Type | Description |
|-------|------|-------------|
| Message | textarea | The message to log. Supports `{{variable}}` syntax |
| Log Level | select | info, warn, or error |
| Label | text | Custom label for the log entry |
| Pass Through | boolean | Include input data in output |

### Example

1. Drag the "Log Message" node onto the canvas
2. Connect it after a form trigger
3. Configure the message: `New submission from {{formData.email}}`
4. The node will log the message and pass data to the next node

## Creating Your Own Extension

Use this package as a template:

1. **Copy the package** to a new directory
2. **Update `package.json`** with your extension name
3. **Modify `src/index.ts`**:
   - Change the extension metadata
   - Update the node definition (type, label, icon, color)
   - Update the config fields for your needs
   - Implement your business logic in the handler

### Key Files

```
packages/demo-node/
├── package.json          # Package metadata
├── README.md             # This file
└── src/
    └── index.ts          # Extension + node definition + handler
```

### Extension Structure

```typescript
const myExtension: NetPadExtension = {
  metadata: {
    id: 'my-extension',        // Unique ID
    name: 'My Extension',       // Display name
    version: '1.0.0',
  },

  workflowNodes: [
    {
      definition: { /* node appearance */ },
      handler: async (context) => { /* execution logic */ },
    },
  ],

  initialize: async () => { /* setup */ },
  cleanup: async () => { /* teardown */ },
};
```

### Node Definition

```typescript
const nodeDefinition = {
  type: 'myext:my-node',       // Unique type (convention: extid:nodename)
  label: 'My Node',            // Palette display name
  description: 'What it does', // Tooltip
  category: 'custom',          // Palette section
  color: '#FF6B35',            // Node color
  icon: 'Extension',           // MUI icon name
  version: '1.0.0',
  configFields: [ /* UI fields */ ],
  outputs: [ /* output handles */ ],
};
```

### Handler Function

```typescript
const handler = async (context) => {
  const config = context.resolvedConfig;  // Config with variables resolved
  const inputs = context.inputs;           // Data from previous nodes

  // Your logic here...

  return {
    success: true,
    data: { /* output data */ },
    metadata: { durationMs: 123 },
  };
};
```

## License

MIT
