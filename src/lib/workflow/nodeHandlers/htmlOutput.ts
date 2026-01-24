/**
 * HTML Output Node Handler
 *
 * Renders data as HTML using templates for display or download.
 * Supports template rendering with variable substitution.
 *
 * Config:
 * - template: HTML template string with {{variable}} placeholders
 * - format: 'html' | 'markdown' (markdown converted to HTML)
 * - title: Optional document title for HTML wrapper
 * - includeWrapper: Whether to include full HTML document structure (default: true)
 * - inlineStyles: Whether to inline CSS for email compatibility
 *
 * Inputs:
 * - input: Data to render in the template
 *
 * Outputs:
 * - html: The rendered HTML string
 * - size: Size of the output in bytes
 * - format: The output format used
 */

import { registerHandler } from './registry';
import {
  ExtendedNodeContext,
  NodeHandler,
  HandlerMetadata,
  successResult,
  failureResult,
  NodeErrorCodes,
} from './types';

const metadata: HandlerMetadata = {
  type: 'html-output',
  name: 'HTML Output',
  description: 'Render data as HTML using templates',
  version: '1.0.0',
};

interface HtmlOutputConfig {
  template: string;
  format?: 'html' | 'markdown';
  title?: string;
  includeWrapper?: boolean;
  inlineStyles?: boolean;
  defaultStyles?: boolean;
}

// Default CSS styles for rendered output
const DEFAULT_STYLES = `
<style>
  :root {
    --primary: #6366f1;
    --primary-light: #a5b4fc;
    --success: #22c55e;
    --warning: #f59e0b;
    --error: #ef4444;
    --bg: #0f0f23;
    --bg-surface: #1e1e3c;
    --text: #e2e8f0;
    --text-muted: #94a3b8;
    --border: rgba(99, 102, 241, 0.2);
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
    padding: 40px 20px;
  }
  .container { max-width: 1000px; margin: 0 auto; }
  .header {
    text-align: center;
    margin-bottom: 40px;
    padding-bottom: 24px;
    border-bottom: 2px solid var(--border);
  }
  .title {
    font-size: 28px;
    font-weight: 700;
    background: linear-gradient(90deg, var(--primary), #a855f7, #ec4899);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .subtitle { color: var(--text-muted); margin-top: 8px; }
  .card {
    background: var(--bg-surface);
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 20px;
    border: 1px solid var(--border);
  }
  .card-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--primary-light);
    margin-bottom: 16px;
  }
  .grid { display: grid; gap: 16px; }
  .grid-2 { grid-template-columns: repeat(2, 1fr); }
  .grid-3 { grid-template-columns: repeat(3, 1fr); }
  .grid-4 { grid-template-columns: repeat(4, 1fr); }
  @media (max-width: 768px) {
    .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
  }
  .stat-box {
    background: rgba(99, 102, 241, 0.1);
    border-radius: 12px;
    padding: 20px;
    text-align: center;
  }
  .stat-value {
    font-size: 32px;
    font-weight: 800;
    color: var(--primary-light);
  }
  .stat-label {
    font-size: 12px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 4px;
  }
  .badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
  }
  .badge-success { background: rgba(34, 197, 94, 0.2); color: var(--success); }
  .badge-warning { background: rgba(245, 158, 11, 0.2); color: var(--warning); }
  .badge-error { background: rgba(239, 68, 68, 0.2); color: var(--error); }
  .table {
    width: 100%;
    border-collapse: collapse;
  }
  .table th {
    text-align: left;
    padding: 12px 16px;
    border-bottom: 2px solid var(--border);
    color: var(--primary-light);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .table td {
    padding: 16px;
    border-bottom: 1px solid var(--border);
  }
  .score-circle {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    border: 4px solid var(--primary);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .score-value { font-size: 36px; font-weight: 800; }
  .score-label { font-size: 11px; text-transform: uppercase; color: var(--text-muted); }
  .footer {
    text-align: center;
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid var(--border);
    font-size: 12px;
    color: var(--text-muted);
  }
  pre, code {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 6px;
  }
  pre { padding: 16px; overflow-x: auto; }
  code { padding: 2px 6px; }
</style>
`;

const handler: NodeHandler = async (context: ExtendedNodeContext) => {
  const startTime = Date.now();

  await context.log('info', 'Starting HTML output rendering', {
    nodeId: context.nodeId,
  });

  const config = context.resolvedConfig as unknown as HtmlOutputConfig;

  if (!config.template) {
    return failureResult(
      NodeErrorCodes.MISSING_CONFIG,
      'template is required for html-output node',
      false
    );
  }

  try {
    // Get input data
    const inputData = context.inputs || {};

    // Build template context
    const templateContext = {
      input: inputData,
      nodes: context.nodeOutputs,
      variables: context.variables,
      trigger: context.trigger,
      // Helper functions
      formatDate: (date: string | Date) => {
        return new Date(date).toLocaleString();
      },
      formatNumber: (num: number, decimals = 0) => {
        return num.toFixed(decimals);
      },
      getRiskColor: (risk: string) => {
        switch (risk?.toLowerCase()) {
          case 'high':
            return '#ef4444';
          case 'medium':
            return '#f59e0b';
          case 'low':
            return '#22c55e';
          default:
            return '#6b7280';
        }
      },
      getRiskBadgeClass: (risk: string) => {
        switch (risk?.toLowerCase()) {
          case 'high':
            return 'badge-error';
          case 'medium':
            return 'badge-warning';
          case 'low':
            return 'badge-success';
          default:
            return '';
        }
      },
      getScoreColor: (score: number) => {
        if (score >= 60) return '#ef4444';
        if (score >= 40) return '#f59e0b';
        return '#22c55e';
      },
      json: (obj: unknown) => JSON.stringify(obj, null, 2),
    };

    // Render the template
    let html = renderTemplate(config.template, templateContext);

    // Convert markdown to HTML if needed
    if (config.format === 'markdown') {
      html = markdownToHtml(html);
    }

    // Wrap in full HTML document if requested
    if (config.includeWrapper !== false) {
      const title = config.title || 'NetPad Report';
      const styles = config.defaultStyles !== false ? DEFAULT_STYLES : '';

      html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  ${styles}
</head>
<body>
  <div class="container">
    ${html}
  </div>
</body>
</html>`;
    }

    // Inline styles if requested (for email compatibility)
    if (config.inlineStyles) {
      html = inlineStylesInHtml(html);
    }

    const size = new TextEncoder().encode(html).length;

    await context.log('info', 'HTML output rendered successfully', {
      size,
      format: config.format || 'html',
      hasWrapper: config.includeWrapper !== false,
    });

    return successResult(
      {
        html,
        size,
        format: config.format || 'html',
        title: config.title,
      },
      {
        durationMs: Date.now() - startTime,
        bytesProcessed: size,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await context.log('error', 'HTML output rendering failed', {
      error: errorMessage,
    });

    return failureResult(
      NodeErrorCodes.OPERATION_FAILED,
      `HTML rendering failed: ${errorMessage}`,
      false
    );
  }
};

/**
 * Render a template with variable substitution
 * Supports {{variable}}, {{object.property}}, and {{expression}}
 */
function renderTemplate(
  template: string,
  context: Record<string, unknown>
): string {
  // Match {{...}} patterns
  return template.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
    try {
      // Create a function to evaluate the expression
      const fn = new Function(
        ...Object.keys(context),
        `"use strict"; try { return ${expression.trim()}; } catch(e) { return ''; }`
      );
      const result = fn(...Object.values(context));

      // Handle different result types
      if (result === null || result === undefined) {
        return '';
      }
      if (typeof result === 'object') {
        return escapeHtml(JSON.stringify(result));
      }
      return escapeHtml(String(result));
    } catch (e) {
      // Return empty string for failed expressions
      console.warn(`[html-output] Failed to evaluate expression: ${expression}`);
      return '';
    }
  });
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (char) => htmlEntities[char]);
}

/**
 * Basic markdown to HTML conversion
 */
function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Lists
  html = html.replace(/^\s*[-*]\s+(.*)$/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Line breaks
  html = html.replace(/\n\n/g, '</p><p>');
  html = `<p>${html}</p>`;
  html = html.replace(/<p><\/p>/g, '');

  return html;
}

/**
 * Inline CSS styles (basic implementation)
 * For full inlining, consider using a library like juice
 */
function inlineStylesInHtml(html: string): string {
  // Extract style content
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  if (!styleMatch) return html;

  // For a basic implementation, we'll just remove the style tag
  // and add common styles inline to common elements
  // A production implementation would use a CSS inliner library

  const commonInlineStyles: Record<string, string> = {
    '.container': 'max-width: 1000px; margin: 0 auto;',
    '.card': 'background: #1e1e3c; border-radius: 16px; padding: 24px; margin-bottom: 20px; border: 1px solid rgba(99, 102, 241, 0.2);',
    '.badge': 'display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;',
  };

  // Apply some basic inline styles
  let result = html;
  for (const [selector, styles] of Object.entries(commonInlineStyles)) {
    const className = selector.replace('.', '');
    const regex = new RegExp(`class="([^"]*${className}[^"]*)"`, 'g');
    result = result.replace(regex, `class="$1" style="${styles}"`);
  }

  return result;
}

// Register the handler
registerHandler(metadata, handler);

export { handler, metadata };
