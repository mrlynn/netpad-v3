/**
 * Export Command
 * 
 * Export submissions or form definitions
 * 
 * Examples:
 *   netpad export submissions --form contact --format csv
 *   netpad export form contact-form --format json
 *   netpad export submissions --form feedback > data.csv
 */

import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { getAuthConfig, getAuthHeader } from '../lib/auth.js';

interface ExportOptions {
  form?: string;
  format?: string;
  output?: string;
  limit?: string;
  apiUrl?: string;
  apiKey?: string;
}

export async function exportCommand(
  type: string | undefined,
  target: string | undefined,
  options: ExportOptions
) {
  if (!type || !['submissions', 'form', 'data'].includes(type.toLowerCase())) {
    console.error(chalk.red('Error: Please specify what to export: submissions or form'));
    console.error(chalk.gray('Usage: netpad export submissions --form <form-id> --format csv'));
    console.error(chalk.gray('       netpad export form <form-id> --format json'));
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
  const format = options.format?.toLowerCase() || 'json';

  try {
    const terminalOptions: Record<string, string | boolean> = {
      format,
    };
    if (options.form) terminalOptions.form = options.form;
    if (options.limit) terminalOptions.limit = options.limit;

    const response = await fetch(`${apiUrl}/api/terminal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader(auth),
      },
      body: JSON.stringify({
        input: `export ${type} ${target || ''}`.trim(),
        parsed: {
          type: 'structured',
          command: 'export',
          args: [type, ...(target ? [target] : [])],
          options: terminalOptions,
          raw: `export ${type}`,
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
        console.error(chalk.red(`Error: ${data.error || 'Export failed'}`));
      }
      process.exit(1);
    }

    if (!data.success) {
      console.error(chalk.red(`Error: ${data.error || 'Export failed'}`));
      if (data.suggestions) {
        console.log(chalk.gray('\nSuggestions:'));
        data.suggestions.forEach((s: string) => console.log(chalk.gray(`  ${s}`)));
      }
      process.exit(1);
    }

    // Output to file or stdout
    if (options.output) {
      const outputPath = path.resolve(options.output);
      const outputDir = path.dirname(outputPath);
      
      // Ensure directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      fs.writeFileSync(outputPath, data.output, 'utf-8');
      
      console.error(chalk.green(`✓ Exported to ${outputPath}`));
      if (data.data?.count !== undefined) {
        console.error(chalk.gray(`  ${data.data.count} records, format: ${format}`));
      }
    } else {
      // Output to stdout (allows piping)
      console.log(data.output);
    }

  } catch (error: any) {
    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      console.error(chalk.red(`Error: Cannot connect to NetPad API at ${apiUrl}`));
    } else {
      console.error(chalk.red(`Error: ${error.message || 'Export failed'}`));
    }
    process.exit(1);
  }
}
