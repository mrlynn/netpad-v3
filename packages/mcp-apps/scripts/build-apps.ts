/**
 * Build script for MCP App HTML bundles.
 *
 * Uses esbuild to bundle each app into a single JS file,
 * then inlines it into a self-contained HTML file.
 */

import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apps = ['workflow-viewer', 'template-gallery', 'form-preview'];

const htmlTemplate = (appName: string, bundledJs: string, bundledCss: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NetPad - ${appName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #root { width: 100%; height: 100%; overflow: hidden; }
    body { font-family: 'Inter', -apple-system, 'Segoe UI', 'Roboto', sans-serif; }
    ${bundledCss}
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module">${bundledJs}</script>
</body>
</html>`;

async function buildApp(appName: string) {
  const entryPoint = path.join(__dirname, '..', 'src', 'apps', appName, 'main.tsx');

  if (!fs.existsSync(entryPoint)) {
    console.log(`Skipping ${appName} - entry point not found`);
    return;
  }

  console.log(`Building ${appName}...`);

  // Bundle JS
  const jsResult = await esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    minify: true,
    format: 'esm',
    target: 'es2020',
    jsx: 'automatic',
    write: false,
    external: [], // Bundle everything
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    loader: {
      '.tsx': 'tsx',
      '.ts': 'ts',
    },
  });

  const bundledJs = jsResult.outputFiles[0].text;

  // Extract and bundle CSS if any
  let bundledCss = '';
  const cssPath = path.join(__dirname, '..', 'src', 'apps', appName, 'styles.css');
  if (fs.existsSync(cssPath)) {
    bundledCss = fs.readFileSync(cssPath, 'utf-8');
  }

  // Generate HTML
  const html = htmlTemplate(appName, bundledJs, bundledCss);

  // Write output
  const outDir = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, `${appName}.html`);
  fs.writeFileSync(outPath, html);

  const sizeKb = (Buffer.byteLength(html, 'utf-8') / 1024).toFixed(1);
  console.log(`  ✓ ${appName}.html (${sizeKb} KB)`);
}

async function main() {
  console.log('Building MCP Apps...\n');

  for (const app of apps) {
    try {
      await buildApp(app);
    } catch (error) {
      console.error(`  ✗ ${app} failed:`, error);
    }
  }

  console.log('\nDone!');
}

main();
