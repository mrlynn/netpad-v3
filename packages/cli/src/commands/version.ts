/**
 * Version Command
 * 
 * Show version information
 */

import chalk from 'chalk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function versionCommand() {
  // Read version from package.json
  // dist/commands/version.js -> packages/cli/package.json
  const packagePath = resolve(__dirname, '../../package.json');
  let version = '0.2.0';
  
  try {
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    version = packageJson.version || version;
  } catch (error) {
    // Fallback if package.json not found
  }

  console.log(chalk.blue('NetPad CLI'));
  console.log(chalk.gray(`Version: ${version}`));
  console.log(chalk.gray('https://netpad.app'));
}
