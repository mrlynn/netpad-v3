#!/usr/bin/env node

/**
 * NetPad CLI
 * 
 * Command-line tool for managing NetPad applications and plugins from npm
 */

import { Command } from 'commander';
import { installCommand } from './commands/install.js';
import { listCommand } from './commands/list.js';
import { createAppCommand } from './commands/create-app.js';
import { searchCommand } from './commands/search.js';
import { submitCommand } from './commands/submit.js';
import { versionCommand } from './commands/version.js';
import { loginCommand } from './commands/login.js';
import { logoutCommand } from './commands/logout.js';
import { whoamiCommand } from './commands/whoami.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read version from package.json
let cliVersion = '0.2.0';
try {
  const packagePath = resolve(__dirname, '../package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
  cliVersion = packageJson.version || cliVersion;
} catch (error) {
  // Fallback if package.json not found
}

const program = new Command();

program
  .name('netpad')
  .description('NetPad CLI - Manage applications and plugins from npm')
  .version(cliVersion);

// Install command
program
  .command('install')
  .alias('i')
  .description('Install a NetPad application or plugin from npm')
  .argument('<package>', 'Package name (e.g., @netpad/app-customer-feedback)')
  .option('-v, --version <version>', 'Package version (default: latest)')
  .option('-o, --org <orgId>', 'Organization ID')
  .option('-p, --project <projectId>', 'Project ID')
  .option('--overwrite', 'Overwrite existing application/plugin')
  .option('--no-deps', 'Skip installing dependencies')
  .option('--api-url <url>', 'NetPad API URL (default: https://app.netpad.app)')
  .option('--api-key <key>', 'NetPad API key')
  .action(installCommand);

// List command
program
  .command('list')
  .alias('ls')
  .description('List installed applications and plugins')
  .option('-o, --org <orgId>', 'Organization ID')
  .option('--api-url <url>', 'NetPad API URL')
  .option('--api-key <key>', 'NetPad API key')
  .action(listCommand);

// Search command
program
  .command('search')
  .alias('s')
  .description('Search for NetPad packages on npm')
  .argument('[query]', 'Search query')
  .option('-t, --type <type>', 'Package type: application, plugin, or all', 'all')
  .option('--verified', 'Only show verified packages')
  .option('--limit <number>', 'Limit results', '20')
  .action(searchCommand);

// Create app command
program
  .command('create-app')
  .alias('create')
  .description('Scaffold a new NetPad application package')
  .argument('<name>', 'Application name (e.g., customer-feedback)')
  .option('-d, --dir <directory>', 'Output directory', '.')
  .option('--scope <scope>', 'npm scope (e.g., @myorg)', '@netpad')
  .action(createAppCommand);

// Submit command
program
  .command('submit')
  .alias('publish')
  .description('Submit a package to the NetPad marketplace for approval')
  .argument('<source>', 'Source: path to package.json, bundle.json, or npm package name')
  .option('-t, --type <type>', 'Package type: application, form, workflow, or extension')
  .option('-n, --name <name>', 'Display name')
  .option('-d, --description <desc>', 'Description')
  .option('-s, --summary <summary>', 'Short summary')
  .option('-v, --version <version>', 'Version')
  .option('-c, --category <category>', 'Category')
  .option('--tags <tags>', 'Comma-separated tags')
  .option('-a, --author <author>', 'Author name')
  .option('-i, --icon <icon>', 'Icon (emoji)')
  .option('--npm-package <name>', 'npm package name (for extensions)')
  .option('--min-netpad-version <version>', 'Minimum NetPad version required')
  .option('--api-url <url>', 'NetPad API URL')
  .option('--api-key <key>', 'NetPad API key')
  .action(submitCommand);

// Version command
program
  .command('version')
  .alias('v')
  .description('Show version information')
  .action(versionCommand);

// Login command
program
  .command('login')
  .description('Authenticate with NetPad')
  .option('--api-key <key>', 'API key')
  .option('-o, --org <orgId>', 'Organization ID')
  .option('-p, --project <projectId>', 'Project ID')
  .option('--profile <name>', 'Profile name')
  .option('--api-url <url>', 'NetPad API URL')
  .action(loginCommand);

// Logout command
program
  .command('logout')
  .description('Clear stored credentials')
  .action(logoutCommand);

// Whoami command
program
  .command('whoami')
  .description('Show current authentication status')
  .action(whoamiCommand);

// Parse arguments
program.parse();
