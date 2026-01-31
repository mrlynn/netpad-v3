/**
 * Query Command
 * 
 * Query form submissions with MongoDB-like filters
 * 
 * Examples:
 *   netpad query submissions --form contact
 *   netpad query submissions --form feedback --where "rating < 3"
 *   netpad query submissions --filter '{"status": "pending"}' --limit 50
 */

import chalk from 'chalk';
import { getAuthConfig, getAuthHeader } from '../lib/auth.js';

interface QueryOptions {
  form?: string;
  where?: string;
  filter?: string;
  limit?: string;
  json?: boolean;
  apiUrl?: string;
  apiKey?: string;
}

export async function queryCommand(type: string | undefined, options: QueryOptions) {
  if (type !== 'submissions') {
    console.error(chalk.red('Error: Currently only "submissions" can be queried'));
    console.error(chalk.gray('Usage: netpad query submissions --form <form-id>'));
    process.exit(1);
  }

  const auth = getAuthConfig({
    apiUrl: options.apiUrl,
    apiKey: options.apiKey,
  });

  if (!auth) {
    console.error(chalk.red('Error: Not authenticated'));
    console.error(chalk.gray(`Run ${chalk.cyan('netpad login')} first`));
    process.exit(1);
  }

  const apiUrl = auth.apiUrl || process.env.NETPAD_API_URL || 'https://netpad.io';

  try {
    // Build the terminal API request
    let input = 'query submissions';
    
    if (options.where) {
      input += ` where ${options.where}`;
    }
    
    const terminalOptions: Record<string, string | boolean> = {};
    if (options.form) terminalOptions.form = options.form;
    if (options.filter) terminalOptions.filter = options.filter;
    if (options.limit) terminalOptions.limit = options.limit;
    if (options.json) terminalOptions.json = true;

    const response = await fetch(`${apiUrl}/api/terminal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader(auth),
      },
      body: JSON.stringify({
        input,
        parsed: {
          type: 'structured',
          command: 'query',
          args: ['submissions', ...(options.where ? ['where', ...options.where.split(' ')] : [])],
          options: terminalOptions,
          raw: input,
        },
        context: {},
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        console.error(chalk.red('Error: Authentication failed'));
        console.error(chalk.gray(`Run ${chalk.cyan('netpad login')} to re-authenticate`));
      } else {
        console.error(chalk.red(`Error: ${data.error || 'Query failed'}`));
      }
      process.exit(1);
    }

    if (!data.success) {
      console.error(chalk.red(`Error: ${data.error || 'Query failed'}`));
      if (data.suggestions) {
        console.log(chalk.gray('\nSuggestions:'));
        data.suggestions.forEach((s: string) => console.log(chalk.gray(`  ${s}`)));
      }
      process.exit(1);
    }

    // Output results
    if (options.json && data.data) {
      console.log(JSON.stringify(data.data, null, 2));
    } else {
      // Convert ANSI codes to chalk for terminal
      const output = data.output
        .replace(/\x1b\[1m\x1b\[36m/g, '') // Bold cyan
        .replace(/\x1b\[33m/g, '')          // Yellow
        .replace(/\x1b\[32m/g, '')          // Green
        .replace(/\x1b\[90m/g, '')          // Gray
        .replace(/\x1b\[0m/g, '');          // Reset
      
      console.log(data.output);
    }

  } catch (error: any) {
    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      console.error(chalk.red(`Error: Cannot connect to NetPad API at ${apiUrl}`));
    } else {
      console.error(chalk.red(`Error: ${error.message || 'Query failed'}`));
    }
    process.exit(1);
  }
}
