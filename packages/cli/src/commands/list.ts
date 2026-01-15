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
    const response = await fetch(`${auth.apiUrl}/api/applications?orgId=${auth.orgId}`, {
      headers: {
        'Authorization': getAuthHeader(auth),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(chalk.red(`Error: ${data.error || 'Failed to list applications'}`));
      process.exit(1);
    }

    const applications = data.applications || [];

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
