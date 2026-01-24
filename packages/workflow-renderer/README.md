# @netpad/workflow-renderer

React component library for rendering NetPad workflow definitions as interactive, read-only visualizations. Built on [ReactFlow](https://reactflow.dev/) (xyflow).

## Features

- **Visual parity** - Identical rendering across all NetPad surfaces
- **Read-only focus** - Optimized for display, not editing
- **25+ node types** - Full coverage of NetPad workflow nodes
- **Auto-layout** - Render workflows without position data using Dagre
- **Themeable** - Built-in dark/light themes + custom theme support
- **Lightweight** - Minimal bundle size for what it does

## Installation

```bash
npm install @netpad/workflow-renderer
# or
yarn add @netpad/workflow-renderer
# or
pnpm add @netpad/workflow-renderer
```

## Basic Usage

```tsx
import { WorkflowRenderer } from '@netpad/workflow-renderer';
import '@netpad/workflow-renderer/styles.css';

const workflow = {
  nodes: [
    { id: '1', type: 'form_trigger', position: { x: 0, y: 0 }, data: { label: 'Form Submit' } },
    { id: '2', type: 'email_send', position: { x: 200, y: 0 }, data: { label: 'Send Email' } },
  ],
  edges: [
    { id: 'e1', source: '1', target: '2' },
  ],
};

function App() {
  return (
    <WorkflowRenderer
      workflow={workflow}
      height={400}
    />
  );
}
```

## With Auto-Layout

If your workflow nodes don't have position data, enable auto-layout:

```tsx
import { WorkflowRenderer } from '@netpad/workflow-renderer';

const workflow = {
  nodes: [
    { id: '1', type: 'form_trigger', data: { label: 'Form Submit' } },
    { id: '2', type: 'filter', data: { label: 'Priority Check' } },
    { id: '3', type: 'email_send', data: { label: 'Send to IT' } },
    { id: '4', type: 'slack_send', data: { label: 'Post to #general' } },
  ],
  edges: [
    { id: 'e1', source: '1', target: '2' },
    { id: 'e2', source: '2', target: '3', data: { label: 'High' } },
    { id: 'e3', source: '2', target: '4', data: { label: 'Normal' } },
  ],
};

function App() {
  return (
    <WorkflowRenderer
      workflow={workflow}
      autoLayout={true}
      layoutDirection="TB"
      height={400}
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `workflow` | `WorkflowDefinition` | Required | Workflow definition to render |
| `height` | `number \| string` | Required | Height of the renderer |
| `width` | `number \| string` | `'100%'` | Width of the renderer |
| `autoLayout` | `boolean` | `false` | Enable auto-layout for workflows without position data |
| `layoutDirection` | `'TB' \| 'BT' \| 'LR' \| 'RL'` | `'TB'` | Direction for auto-layout |
| `theme` | `'light' \| 'dark' \| RendererTheme` | `'dark'` | Theme preset or custom theme |
| `showMinimap` | `boolean` | `false` | Show minimap |
| `showControls` | `boolean` | `true` | Show zoom controls |
| `showBackground` | `boolean` | `true` | Show background pattern |
| `pannable` | `boolean` | `true` | Allow panning |
| `zoomable` | `boolean` | `true` | Allow zooming |
| `fitView` | `boolean` | `true` | Fit view to show all nodes on load |
| `onNodeClick` | `(node) => void` | - | Called when a node is clicked |
| `onEdgeClick` | `(edge) => void` | - | Called when an edge is clicked |

## Themes

### Built-in Themes

```tsx
<WorkflowRenderer workflow={workflow} theme="dark" height={400} />
<WorkflowRenderer workflow={workflow} theme="light" height={400} />
```

### Custom Theme

```tsx
import { WorkflowRenderer, createTheme, darkTheme } from '@netpad/workflow-renderer';

const customTheme = createTheme({
  nodeCategories: {
    trigger: '#00FF00', // Custom trigger color
  },
});

<WorkflowRenderer workflow={workflow} theme={customTheme} height={400} />
```

## Node Types

| Category | Types |
|----------|-------|
| **Triggers** | `form_trigger`, `webhook_trigger`, `schedule_trigger`, `manual_trigger` |
| **Logic** | `filter`, `switch`, `delay`, `loop`, `parallel`, `merge` |
| **Data** | `mongodb_query`, `mongodb_insert`, `mongodb_update`, `mongodb_delete`, `transform` |
| **Actions** | `email_send`, `slack_send`, `webhook_call`, `http_request`, `sms_send`, `push_notification`, `function` |
| **AI** | `llm_generate`, `llm_classify`, `llm_extract`, `llm_summarize` |
| **Utility** | `note`, `variable_set`, `variable_get` |

## Layout Utilities

For manual layout control:

```tsx
import { autoLayout } from '@netpad/workflow-renderer/layout';

const layoutedWorkflow = autoLayout(workflow, {
  direction: 'LR',
  nodeSpacing: 80,
  rankSpacing: 120,
});
```

## Individual Components

Import individual node or edge components for advanced usage:

```tsx
import { FormTriggerNode, EmailSendNode } from '@netpad/workflow-renderer/nodes';
import { ConditionalEdge } from '@netpad/workflow-renderer/edges';
```

## Peer Dependencies

- React >= 18.0.0
- React DOM >= 18.0.0

## License

Apache-2.0
