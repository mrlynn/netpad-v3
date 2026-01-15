/**
 * Whoami Command
 * 
 * Show current authentication status
 */

import chalk from 'chalk';
import { getEffectiveConfig, getConfigFile } from '../lib/config.js';

export async function whoamiCommand() {
  const config = getEffectiveConfig();

  console.log(chalk.blue('NetPad CLI Status\n'));

  if (!config.apiKey) {
    console.log(chalk.red('Not authenticated'));
    console.log(chalk.gray('Run "netpad login" to authenticate'));
    return;
  }

  // Mask API key
  const maskedKey = config.apiKey
    ? `${config.apiKey.substring(0, 8)}...${config.apiKey.substring(config.apiKey.length - 4)}`
    : 'Not set';

  console.log(chalk.green('✓ Authenticated'));
  console.log(chalk.gray(`API Key: ${maskedKey}`));
  
  if (config.apiUrl) {
    console.log(chalk.gray(`API URL: ${config.apiUrl}`));
  }
  
  if (config.orgId) {
    console.log(chalk.gray(`Organization ID: ${config.orgId}`));
  }
  
  if (config.projectId) {
    console.log(chalk.gray(`Project ID: ${config.projectId}`));
  }

  console.log(chalk.gray(`\nConfig file: ${getConfigFile()}`));
}
