/**
 * Scaffold Command
 * 
 * Generate React/Next.js components from NetPad forms
 * 
 * Examples:
 *   netpad scaffold react contact-form
 *   netpad scaffold nextjs feedback --output ./src/pages
 */

import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { getAuthConfig, getAuthHeader } from '../lib/auth.js';

interface ScaffoldOptions {
  output?: string;
  apiUrl?: string;
  apiKey?: string;
}

export async function scaffoldCommand(
  framework: string | undefined,
  formId: string | undefined,
  options: ScaffoldOptions
) {
  if (!framework || !['react', 'nextjs', 'next'].includes(framework.toLowerCase())) {
    console.error(chalk.red('Error: Please specify a framework: react or nextjs'));
    console.error(chalk.gray('Usage: netpad scaffold <react|nextjs> <form-id>'));
    process.exit(1);
  }

  if (!formId) {
    console.error(chalk.red('Error: Please specify a form ID'));
    console.error(chalk.gray('Usage: netpad scaffold react <form-id>'));
    console.error(chalk.gray('Run "netpad list forms" to see available forms'));
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
  const normalizedFramework = framework.toLowerCase() === 'next' ? 'nextjs' : framework.toLowerCase();

  try {
    const response = await fetch(`${apiUrl}/api/terminal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader(auth),
      },
      body: JSON.stringify({
        input: `scaffold ${normalizedFramework} ${formId}`,
        parsed: {
          type: 'structured',
          command: 'scaffold',
          args: [normalizedFramework, formId],
          options: {},
          raw: `scaffold ${normalizedFramework} ${formId}`,
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
        console.error(chalk.red(`Error: ${data.error || 'Scaffold failed'}`));
      }
      process.exit(1);
    }

    if (!data.success) {
      console.error(chalk.red(`Error: ${data.error || 'Scaffold failed'}`));
      if (data.suggestions) {
        console.log(chalk.gray('\nSuggestions:'));
        data.suggestions.forEach((s: string) => console.log(chalk.gray(`  ${s}`)));
      }
      process.exit(1);
    }

    // If output path specified, write to file
    if (options.output && data.data?.code && data.data?.filename) {
      const outputDir = path.resolve(options.output);
      const outputPath = path.join(outputDir, data.data.filename);

      // Ensure directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(outputPath, data.data.code, 'utf-8');
      
      console.log(chalk.green(`✓ Component written to ${outputPath}`));
      console.log('');
      console.log(chalk.yellow('Next steps:'));
      console.log(chalk.gray('  1. npm install @netpad/forms'));
      console.log(chalk.gray(`  2. Import the component from ${data.data.filename}`));
      console.log('');
    } else {
      // Output to console
      console.log(data.output);
    }

  } catch (error: any) {
    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      console.error(chalk.red(`Error: Cannot connect to NetPad API at ${apiUrl}`));
    } else {
      console.error(chalk.red(`Error: ${error.message || 'Scaffold failed'}`));
    }
    process.exit(1);
  }
}
