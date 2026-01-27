#!/usr/bin/env node

/**
 * This script adds `export const dynamic = 'force-dynamic';` to all API route files
 * that call getSession() but don't already have the dynamic export.
 *
 * This is needed because getSession() uses cookies(), which requires dynamic rendering.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_DIR = path.join(__dirname, '..', 'src', 'app', 'api');

function getAllRouteFiles(dir) {
  const files = [];

  function walkDir(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.name === 'route.ts') {
        files.push(fullPath);
      }
    }
  }

  walkDir(dir);
  return files;
}

function needsDynamicExport(content) {
  // Check if file uses getSession() or cookies()
  const usesSession = content.includes('getSession(') || content.includes('getSession (');
  const usesCookies = content.includes('cookies()') || content.includes('cookies (');

  // Check if it already has the dynamic export
  const hasDynamicExport = /export\s+const\s+dynamic\s*=/.test(content);

  return (usesSession || usesCookies) && !hasDynamicExport;
}

function findEndOfImports(content) {
  const lines = content.split('\n');
  let inImportBlock = false;
  let braceCount = 0;
  let lastImportEndLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines and comments at the start
    if (trimmedLine === '' || trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('*')) {
      continue;
    }

    // Check if this line starts an import
    if (trimmedLine.startsWith('import ') || trimmedLine.startsWith('import{')) {
      inImportBlock = true;

      // Count braces to handle multi-line imports
      for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }

      // Check if import is complete on this line
      if (braceCount === 0 && (trimmedLine.includes(' from ') || !trimmedLine.includes('{'))) {
        lastImportEndLine = i;
        inImportBlock = false;
      }
      continue;
    }

    // If we're inside a multi-line import
    if (inImportBlock) {
      for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }

      // Check if import completes on this line
      if (braceCount === 0) {
        lastImportEndLine = i;
        inImportBlock = false;
      }
      continue;
    }

    // If we hit a non-import statement and we're not in an import block, we're done
    if (!inImportBlock && lastImportEndLine !== -1) {
      break;
    }

    // Handle 'use client' or 'use server' directives
    if (trimmedLine === "'use client';" || trimmedLine === '"use client";' ||
        trimmedLine === "'use server';" || trimmedLine === '"use server";') {
      continue;
    }

    // If we hit something that's not an import and we haven't seen imports yet, check further
    if (lastImportEndLine === -1 && !trimmedLine.startsWith('import')) {
      // Could be a comment block, continue checking
      if (trimmedLine.startsWith('/**') || trimmedLine.startsWith('*')) {
        continue;
      }
    }
  }

  return lastImportEndLine;
}

function addDynamicExport(content) {
  const lines = content.split('\n');
  const lastImportEndLine = findEndOfImports(content);

  if (lastImportEndLine === -1) {
    // No imports found, add at the very beginning (after any file-level comments)
    let insertIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith('/**') || trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed === '') {
        insertIndex = i + 1;
      } else {
        break;
      }
    }
    lines.splice(insertIndex, 0, "\nexport const dynamic = 'force-dynamic';");
    return lines.join('\n');
  }

  // Insert after the last import line
  const insertIndex = lastImportEndLine + 1;

  // Check if there's already an empty line after imports
  const nextLine = lines[insertIndex]?.trim() || '';
  const lineAfterThat = lines[insertIndex + 1]?.trim() || '';

  if (nextLine === '') {
    // There's already an empty line, insert after it
    lines.splice(insertIndex + 1, 0, "export const dynamic = 'force-dynamic';\n");
  } else {
    // No empty line, add one with our export
    lines.splice(insertIndex, 0, "\nexport const dynamic = 'force-dynamic';\n");
  }

  return lines.join('\n');
}

function main() {
  console.log('Scanning API route files...\n');

  const routeFiles = getAllRouteFiles(API_DIR);
  console.log(`Found ${routeFiles.length} route files total.\n`);

  let fixedCount = 0;
  let alreadyFixedCount = 0;
  let noSessionCount = 0;
  const fixedFiles = [];

  for (const filePath of routeFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(path.join(__dirname, '..'), filePath);

    const usesSession = content.includes('getSession(') || content.includes('getSession (');
    const usesCookies = content.includes('cookies()') || content.includes('cookies (');
    const hasDynamicExport = /export\s+const\s+dynamic\s*=/.test(content);

    if (!usesSession && !usesCookies) {
      noSessionCount++;
      continue;
    }

    if (hasDynamicExport) {
      alreadyFixedCount++;
      continue;
    }

    // Fix the file
    const newContent = addDynamicExport(content);
    fs.writeFileSync(filePath, newContent, 'utf-8');
    fixedCount++;
    fixedFiles.push(relativePath);
    console.log(`✅ Fixed: ${relativePath}`);
  }

  console.log('\n--- Summary ---');
  console.log(`Total route files: ${routeFiles.length}`);
  console.log(`Files without getSession/cookies: ${noSessionCount}`);
  console.log(`Files already have dynamic export: ${alreadyFixedCount}`);
  console.log(`Files fixed: ${fixedCount}`);

  if (fixedFiles.length > 0) {
    console.log('\nFixed files:');
    fixedFiles.forEach(f => console.log(`  - ${f}`));
  }
}

main();
