#!/usr/bin/env node

/**
 * Build script for ChatGPT App widgets.
 *
 * Bundles each widget into a single HTML file with all CSS and JS inlined,
 * suitable for delivery via MCP resources.
 */

import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

const WIDGETS = ['template-gallery', 'workflow-viewer', 'form-preview'];

/**
 * Build a single widget into an HTML bundle.
 */
async function buildWidget(widgetName) {
  const srcDir = path.join(ROOT, 'widgets', widgetName, 'src');
  const outDir = path.join(ROOT, 'widgets', widgetName);
  const entryPoint = path.join(srcDir, 'index.tsx');

  // Check if source exists
  if (!fs.existsSync(entryPoint)) {
    console.log(`⏭️  Skipping ${widgetName} (no source found)`);
    return;
  }

  console.log(`📦 Building ${widgetName}...`);

  try {
    // Bundle the widget
    const result = await esbuild.build({
      entryPoints: [entryPoint],
      bundle: true,
      minify: true,
      format: 'esm',
      target: ['es2020'],
      write: false,
      loader: {
        '.tsx': 'tsx',
        '.ts': 'ts',
        '.css': 'css',
      },
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      external: [],
      jsx: 'automatic',
    });

    const jsCode = result.outputFiles[0].text;

    // Create the HTML bundle
    const htmlBundle = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>NetPad ${widgetName}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body, #root {
      height: 100%;
      width: 100%;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module">
${jsCode}
  </script>
</body>
</html>`;

    // Write the bundle
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'bundle.html'), htmlBundle);

    const size = Buffer.byteLength(htmlBundle, 'utf8');
    console.log(`✅ ${widgetName}: ${(size / 1024).toFixed(1)} KB`);
  } catch (error) {
    console.error(`❌ Failed to build ${widgetName}:`, error.message);
  }
}

/**
 * Build all widgets.
 */
async function buildAll() {
  console.log('\n🚀 Building ChatGPT App Widgets\n');

  for (const widget of WIDGETS) {
    await buildWidget(widget);
  }

  console.log('\n✨ Widget build complete!\n');
}

buildAll().catch(console.error);
