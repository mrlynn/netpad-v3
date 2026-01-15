/**
 * Install Command
 * 
 * Install a NetPad package from npm
 */

import chalk from 'chalk';
import { Command } from 'commander';
import { requireAuth, getAuthHeader } from '../lib/auth.js';

interface InstallOptions {
  version?: string;
  org?: string;
  project?: string;
  overwrite?: boolean;
  deps?: boolean;
  apiUrl?: string;
  apiKey?: string;
}

export async function installCommand(
  packageName: string,
  options: InstallOptions
) {
  const auth = requireAuth({
    apiUrl: options.apiUrl,
    apiKey: options.apiKey,
    org: options.org,
    project: options.project,
  });

  console.log(chalk.blue(`Installing ${packageName}...`));

  try {
    const response = await fetch(`${auth.apiUrl}/api/marketplace/npm/install`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader(auth),
      },
      body: JSON.stringify({
        packageName,
        version: options.version,
        orgId: auth.orgId,
        projectId: auth.projectId,
        overwriteExisting: options.overwrite || false,
        installDependencies: options.deps !== false,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(chalk.red(`Error: ${data.error || 'Failed to install package'}`));
      if (data.errors && Array.isArray(data.errors)) {
        data.errors.forEach((err: string) => console.error(chalk.red(`  - ${err}`)));
      }
      process.exit(1);
    }

    if (!data.success) {
      console.error(chalk.red(`Error: ${data.error || 'Installation failed'}`));
      if (data.errors && Array.isArray(data.errors)) {
        data.errors.forEach((err: string) => console.error(chalk.red(`  - ${err}`)));
      }
      process.exit(1);
    }

    console.log(chalk.green(`✓ Successfully installed ${packageName}@${data.version}`));
    
    if (data.applicationId) {
      console.log(chalk.gray(`  Application ID: ${data.applicationId}`));
    }

    if (data.dependencies) {
      if (data.dependencies.installed && data.dependencies.installed.length > 0) {
        console.log(chalk.blue(`\nInstalled dependencies:`));
        data.dependencies.installed.forEach((dep: string) => {
          console.log(chalk.gray(`  - ${dep}`));
        });
      }
      
      if (data.dependencies.failed && data.dependencies.failed.length > 0) {
        console.log(chalk.yellow(`\nFailed dependencies:`));
        data.dependencies.failed.forEach((dep: { name: string; error: string }) => {
          console.log(chalk.red(`  - ${dep.name}: ${dep.error}`));
        });
      }
    }

    if (data.message) {
      console.log(chalk.gray(`\n${data.message}`));
    }
  } catch (error: any) {
    console.error(chalk.red(`Error: ${error.message || 'Failed to install package'}`));
    process.exit(1);
  }
}
