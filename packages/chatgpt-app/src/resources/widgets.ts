/**
 * UI Resource registration for ChatGPT widgets.
 *
 * These resources define the interactive widgets that render in ChatGPT
 * when tools return structured content with outputTemplate references.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WIDGET_DOMAIN = process.env.WIDGET_DOMAIN || 'https://netpad.io';

/**
 * Load widget bundle from disk.
 * Returns the HTML content or a placeholder if not found.
 */
function loadWidgetBundle(widgetName: string): string {
  const widgetPath = path.join(__dirname, '..', '..', 'widgets', widgetName, 'bundle.html');

  try {
    return fs.readFileSync(widgetPath, 'utf-8');
  } catch {
    // Return placeholder during development
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>NetPad ${widgetName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a1a;
      color: #fff;
      padding: 20px;
    }
    .placeholder {
      text-align: center;
      padding: 40px;
      border: 2px dashed #444;
      border-radius: 12px;
    }
    .placeholder h2 { margin-bottom: 10px; }
    .placeholder p { color: #888; }
    .data-preview {
      margin-top: 20px;
      padding: 15px;
      background: #2a2a2a;
      border-radius: 8px;
      text-align: left;
      font-family: monospace;
      font-size: 12px;
      overflow: auto;
      max-height: 300px;
    }
  </style>
</head>
<body>
  <div class="placeholder">
    <h2>🚧 ${widgetName} Widget</h2>
    <p>Widget bundle not found. Build widgets with: npm run build:widgets</p>
    <div class="data-preview" id="data"></div>
  </div>
  <script>
    // Display the tool output data for debugging
    if (window.openai?.toolOutput?.structuredContent) {
      document.getElementById('data').textContent =
        JSON.stringify(window.openai.toolOutput.structuredContent, null, 2);
    }
  </script>
</body>
</html>`;
  }
}

/**
 * Register all UI resources (widgets) with the MCP server.
 */
export function registerResources(server: McpServer): void {
  // Template Gallery Widget
  server.resource(
    'template-gallery',
    'ui://netpad/template-gallery.html',
    async () => ({
      contents: [{
        uri: 'ui://netpad/template-gallery.html',
        mimeType: 'text/html+skybridge',
        text: loadWidgetBundle('template-gallery'),
        _meta: {
          'openai/widgetPrefersBorder': true,
          'openai/widgetDomain': WIDGET_DOMAIN,
          'openai/widgetCSP': {
            connect_domains: [`${WIDGET_DOMAIN}/api`],
            resource_domains: ['https://*.oaistatic.com'],
          },
        },
      }],
    })
  );

  // Workflow Viewer Widget
  server.resource(
    'workflow-viewer',
    'ui://netpad/workflow-viewer.html',
    async () => ({
      contents: [{
        uri: 'ui://netpad/workflow-viewer.html',
        mimeType: 'text/html+skybridge',
        text: loadWidgetBundle('workflow-viewer'),
        _meta: {
          'openai/widgetPrefersBorder': true,
          'openai/widgetDomain': WIDGET_DOMAIN,
        },
      }],
    })
  );

  // Form Preview Widget
  server.resource(
    'form-preview',
    'ui://netpad/form-preview.html',
    async () => ({
      contents: [{
        uri: 'ui://netpad/form-preview.html',
        mimeType: 'text/html+skybridge',
        text: loadWidgetBundle('form-preview'),
        _meta: {
          'openai/widgetPrefersBorder': true,
          'openai/widgetDomain': WIDGET_DOMAIN,
          'openai/widgetCSP': {
            connect_domains: [`${WIDGET_DOMAIN}/api`],
          },
        },
      }],
    })
  );
}
