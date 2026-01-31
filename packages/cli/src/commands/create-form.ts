/**
 * Create Form Command
 * 
 * Create forms using AI generation from natural language
 * 
 * Examples:
 *   netpad create-form "customer feedback with star rating and comments" --ai
 *   netpad create-form "job application with resume upload"
 */

import chalk from 'chalk';
import { getAuthConfig, getAuthHeader } from '../lib/auth.js';

interface CreateFormOptions {
  ai?: boolean;
  apiUrl?: string;
  apiKey?: string;
}

export async function createFormCommand(
  description: string | undefined,
  options: CreateFormOptions
) {
  if (!description) {
    console.error(chalk.red('Error: Please provide a form description'));
    console.error(chalk.gray('Usage: netpad create-form "customer feedback with NPS rating"'));
    console.error(chalk.gray('\nExamples:'));
    console.error(chalk.gray('  netpad create-form "contact form with name, email, and message"'));
    console.error(chalk.gray('  netpad create-form "job application with resume upload and work history"'));
    console.error(chalk.gray('  netpad create-form "event registration with dietary preferences"'));
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

  console.log(chalk.cyan('🤖 Generating form with AI...\n'));

  try {
    const response = await fetch(`${apiUrl}/api/terminal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader(auth),
      },
      body: JSON.stringify({
        input: `create form "${description}" --ai`,
        parsed: {
          type: 'structured',
          command: 'create',
          args: ['form', description],
          options: { ai: true },
          raw: `create form "${description}" --ai`,
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
        console.error(chalk.red(`Error: ${data.error || 'Form creation failed'}`));
      }
      process.exit(1);
    }

    if (!data.success) {
      console.error(chalk.red(`Error: ${data.error || 'Form creation failed'}`));
      if (data.suggestions) {
        console.log(chalk.gray('\nSuggestions:'));
        data.suggestions.forEach((s: string) => console.log(chalk.gray(`  ${s}`)));
      }
      process.exit(1);
    }

    // Display the result
    console.log(data.output);
    
    // If we have form data, show additional CLI commands
    if (data.data?.formId) {
      console.log('');
      console.log(chalk.cyan('Quick commands:'));
      console.log(chalk.gray(`  netpad scaffold react ${data.data.formId}`));
      console.log(chalk.gray(`  netpad export form ${data.data.formId}`));
    }

  } catch (error: any) {
    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      console.error(chalk.red(`Error: Cannot connect to NetPad API at ${apiUrl}`));
    } else {
      console.error(chalk.red(`Error: ${error.message || 'Form creation failed'}`));
    }
    process.exit(1);
  }
}
