/**
 * Search Command
 * 
 * Search for NetPad packages on npm
 */

import chalk from 'chalk';
import { Command } from 'commander';
import { getAuthConfig, getAuthHeader } from '../lib/auth.js';

interface SearchOptions {
  type?: string;
  verified?: boolean;
  limit?: string;
  apiUrl?: string;
  apiKey?: string;
}

export async function searchCommand(query: string | undefined, options: SearchOptions) {
  const auth = getAuthConfig({
    apiUrl: options.apiUrl,
    apiKey: options.apiKey,
  });

  const apiUrl = auth?.apiUrl || process.env.NETPAD_API_URL || 'https://app.netpad.app';

  try {
    const params = new URLSearchParams();
    if (query) {
      params.set('q', query);
    }
    if (options.type && options.type !== 'all') {
      params.set('type', options.type);
    }
    if (options.verified !== undefined) {
      params.set('verified', options.verified ? 'true' : 'false');
    }
    params.set('limit', options.limit || '20');

    const url = `${apiUrl}/api/marketplace/npm/search?${params.toString()}`;
    
    const response = await fetch(url, {
      headers: auth ? {
        'Authorization': getAuthHeader(auth),
      } : {},
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(chalk.red(`Error: ${data.error || 'Failed to search packages'}`));
      process.exit(1);
    }

    if (!data.success) {
      console.error(chalk.red(`Error: ${data.error || 'Search failed'}`));
      process.exit(1);
    }

    const packages = data.packages || [];

    if (packages.length === 0) {
      console.log(chalk.gray('No packages found.'));
      return;
    }

    console.log(chalk.blue(`\nFound ${data.total || packages.length} packages:\n`));

    packages.forEach((pkg: any) => {
      const verifiedBadge = pkg.isVerified ? chalk.green('✓ Verified') : chalk.gray('Community');
      const officialBadge = pkg.isOfficial ? chalk.blue('✓ Official') : '';
      const typeBadge = pkg.netpad?.type === 'application' 
        ? chalk.blue('[App]')
        : pkg.netpad?.type === 'plugin'
        ? chalk.magenta('[Plugin]')
        : chalk.gray('[Package]');

      console.log(chalk.white(`${typeBadge} ${pkg.name}@${pkg.version}`));
      if (pkg.description) {
        console.log(chalk.gray(`  ${pkg.description}`));
      }
      const badges = [verifiedBadge, officialBadge].filter(Boolean).join(' ');
      if (badges) {
        console.log(chalk.gray(`  ${badges}`));
      }
      if (pkg.netpad?.category) {
        console.log(chalk.gray(`  Category: ${pkg.netpad.category}`));
      }
      if (pkg.netpad?.tags && pkg.netpad.tags.length > 0) {
        console.log(chalk.gray(`  Tags: ${pkg.netpad.tags.join(', ')}`));
      }
      console.log('');
    });
  } catch (error: any) {
    console.error(chalk.red(`Error: ${error.message || 'Failed to search packages'}`));
    process.exit(1);
  }
}
