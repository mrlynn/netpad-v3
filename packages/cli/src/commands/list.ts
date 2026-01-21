/**
 * List Command
 * 
 * List installed applications and plugins
 */

import chalk from 'chalk';
import { Command } from 'commander';
import { requireAuth, getAuthHeader } from '../lib/auth.js';

interface ListOptions {
  org?: string;
  apiUrl?: string;
  apiKey?: string;
}

export async function listCommand(options: ListOptions) {
  const auth = requireAuth({
    apiUrl: options.apiUrl,
    apiKey: options.apiKey,
    org: options.org,
  });

  try {
    const response = await fetch(`${auth.apiUrl}/api/v1/applications`, {
      headers: {
        'Authorization': getAuthHeader(auth),
      },
    });

    const data = await response.json();

    // Handle v1 API error format
    if (!response.ok) {
      const errorMessage = data.error?.message || data.error || 'Failed to list applications';
      console.error(chalk.red(`Error: ${errorMessage}`));
      process.exit(1);
    }

    // v1 API returns data in a 'data' field
    const applications = data.data || [];

    if (applications.length === 0) {
      console.log(chalk.gray('No applications found.'));
      return;
    }

    console.log(chalk.blue(`\nInstalled Applications (${applications.length}):\n`));

    applications.forEach((app: any) => {
      const marketplaceInfo = app.marketplaceApplicationId
        ? chalk.gray(` [from npm: ${app.marketplaceApplicationId}@${app.marketplaceVersion || 'latest'}]`)
        : '';
      
      console.log(chalk.white(`  ${app.name}`));
      console.log(chalk.gray(`    ID: ${app.applicationId}`));
      if (app.description) {
        console.log(chalk.gray(`    ${app.description}`));
      }
      console.log(chalk.gray(`    Forms: ${app.stats?.formsCount || 0}, Workflows: ${app.stats?.workflowsCount || 0}`));
      console.log(marketplaceInfo);
      console.log('');
    });
  } catch (error: any) {
    console.error(chalk.red(`Error: ${error.message || 'Failed to list applications'}`));
    process.exit(1);
  }
}
