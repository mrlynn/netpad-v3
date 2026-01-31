/**
 * Watch Command
 * 
 * Monitor submissions or form changes in real-time
 * 
 * Examples:
 *   netpad watch submissions --form contact
 *   netpad watch form contact-form
 */

import chalk from 'chalk';
import { getAuthConfig, getAuthHeader } from '../lib/auth.js';

interface WatchOptions {
  form?: string;
  interval?: string;
  apiUrl?: string;
  apiKey?: string;
}

export async function watchCommand(
  type: string | undefined,
  target: string | undefined,
  options: WatchOptions
) {
  if (!type || !['submissions', 'form'].includes(type.toLowerCase())) {
    console.error(chalk.red('Error: Please specify what to watch: submissions or form'));
    console.error(chalk.gray('Usage: netpad watch submissions --form <form-id>'));
    console.error(chalk.gray('       netpad watch form <form-id>'));
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
  const interval = parseInt(options.interval || '5') * 1000; // Default 5 seconds

  try {
    // Initial call to terminal API
    const response = await fetch(`${apiUrl}/api/terminal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader(auth),
      },
      body: JSON.stringify({
        input: `watch ${type} ${target || ''}`.trim(),
        parsed: {
          type: 'structured',
          command: 'watch',
          args: [type, ...(target ? [target] : [])],
          options: { form: options.form },
          raw: `watch ${type}`,
        },
        context: {},
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error(chalk.red(`Error: ${data.error || 'Watch failed'}`));
      process.exit(1);
    }

    console.log(data.output);
    console.log('');
    
    // If watching submissions, offer to poll
    if (type === 'submissions') {
      console.log(chalk.yellow('\n📡 Starting polling mode...'));
      console.log(chalk.gray(`Checking every ${interval / 1000} seconds. Press Ctrl+C to stop.\n`));
      
      let lastCount = data.data?.count || 0;
      
      const poll = async () => {
        try {
          const pollResponse = await fetch(`${apiUrl}/api/terminal`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': getAuthHeader(auth),
            },
            body: JSON.stringify({
              input: `query submissions ${options.form ? `--form ${options.form}` : ''} --limit 1`,
              parsed: {
                type: 'structured',
                command: 'query',
                args: ['submissions'],
                options: { form: options.form, limit: '1' },
                raw: 'query submissions',
              },
              context: {},
            }),
          });
          
          const pollData = await pollResponse.json();
          const currentCount = pollData.data?.length || 0;
          
          if (currentCount > 0 && pollData.data?.[0]) {
            const latest = pollData.data[0];
            const timestamp = new Date().toLocaleTimeString();
            
            // Check if there's a new submission (simple check)
            if (lastCount !== currentCount) {
              console.log(chalk.green(`[${timestamp}] New submission detected!`));
              console.log(chalk.gray(`  Form: ${latest.formId || 'unknown'}`));
              console.log(chalk.gray(`  ID: ${latest.id || latest._id}`));
              lastCount = currentCount;
            } else {
              process.stdout.write(chalk.gray(`[${timestamp}] No new submissions\r`));
            }
          }
        } catch (err) {
          // Silently continue on poll errors
        }
      };
      
      // Start polling
      setInterval(poll, interval);
      
      // Keep process alive
      process.on('SIGINT', () => {
        console.log(chalk.yellow('\n\nStopped watching.'));
        process.exit(0);
      });
    }

  } catch (error: any) {
    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      console.error(chalk.red(`Error: Cannot connect to NetPad API at ${apiUrl}`));
    } else {
      console.error(chalk.red(`Error: ${error.message || 'Watch failed'}`));
    }
    process.exit(1);
  }
}
