/**
 * Logout Command
 * 
 * Clear stored credentials
 */

import chalk from 'chalk';
import { clearCredentials, getEffectiveConfig } from '../lib/config.js';

export async function logoutCommand() {
  const config = getEffectiveConfig();
  
  if (!config.apiKey) {
    console.log(chalk.gray('No credentials found. Already logged out.'));
    return;
  }

  clearCredentials();
  console.log(chalk.green('✓ Logged out successfully'));
  console.log(chalk.gray('Credentials cleared from ~/.netpad/config.json'));
}
