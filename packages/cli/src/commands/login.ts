/**
 * Login Command
 * 
 * Authenticate with NetPad via multiple methods:
 * - API Key
 * - OAuth (Google/GitHub) - Device Flow
 * - Magic Link (Email)
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { setApiKey, setSessionToken, setOrgId, setProjectId, getEffectiveConfig, loadConfig } from '../lib/config.js';
import open from 'open';

interface LoginOptions {
  apiKey?: string;
  method?: 'api-key' | 'oauth' | 'magic-link';
  provider?: 'google' | 'github';
  orgId?: string;
  projectId?: string;
  profile?: string;
  apiUrl?: string;
}

export async function loginCommand(options: LoginOptions) {
  // Check saved config first, then env vars, then defaults
  const savedConfig = loadConfig();
  const defaultApiUrl = options.apiUrl || 
                       savedConfig.apiUrl ||
                       process.env.NETPAD_API_URL || 
                       'http://localhost:3000';
  const apiUrl = defaultApiUrl;

  console.log(chalk.blue('NetPad CLI Login\n'));
  console.log(chalk.gray(`API URL: ${apiUrl}\n`));

  // If API key provided directly, use it
  if (options.apiKey) {
    await loginWithApiKey(apiUrl, options.apiKey, options);
    return;
  }

  // Determine authentication method
  let method = options.method;
  if (!method) {
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'method',
        message: 'Choose authentication method:',
        choices: [
          { name: 'API Key', value: 'api-key' },
          { name: 'OAuth (Google/GitHub)', value: 'oauth' },
          { name: 'Magic Link (Email)', value: 'magic-link' },
        ],
      },
    ]);
    method = answer.method;
  }

  switch (method) {
    case 'api-key':
      await loginWithApiKey(apiUrl, undefined, options);
      break;
    case 'oauth':
      await loginWithOAuth(apiUrl, options.provider, options);
      break;
    case 'magic-link':
      await loginWithMagicLink(apiUrl, options);
      break;
    default:
      console.error(chalk.red('Invalid authentication method'));
      process.exit(1);
  }
}

/**
 * Login with API Key
 */
async function loginWithApiKey(apiUrl: string, providedKey?: string, options: LoginOptions = {}) {
  let apiKey = providedKey;

  // If API key not provided, prompt for it
  if (!apiKey) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'apiKey',
        message: 'Enter your NetPad API key:',
        validate: (input: string) => {
          if (!input || input.trim().length === 0) {
            return 'API key is required';
          }
          return true;
        },
      },
    ]);
    apiKey = answers.apiKey;
  }

  // Verify API key by making a test request
  console.log(chalk.gray('Verifying API key...'));

  try {
    // Try v1 API endpoint first (supports API keys)
    let response = await fetch(`${apiUrl}/api/v1/organizations`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    let data: any;
    let organizations: any[] = [];

    if (response.ok) {
      // v1 API endpoint worked
      const v1Data = await response.json();
      if (v1Data.success && v1Data.data) {
        organizations = v1Data.data.map((org: any) => ({
          organizationId: org.organizationId,
          name: org.name,
        }));
      }
    } else if (response.status === 404) {
      // v1 endpoint doesn't exist, try regular endpoint (for development)
      console.log(chalk.yellow('Note: Using session-based endpoint (development mode)'));
      response = await fetch(`${apiUrl}/api/organizations`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        data = await response.json();
        organizations = data.organizations || [];
      }
    }

    if (!response.ok) {
      if (response.status === 401) {
        console.error(chalk.red('Error: Invalid API key'));
        const errorText = await response.text();
        console.error(chalk.gray(`Details: ${errorText.substring(0, 200)}`));
        process.exit(1);
      }
      const errorText = await response.text();
      throw new Error(`API returned ${response.status}: ${errorText.substring(0, 200)}`);
    }

    if (organizations.length === 0 && data) {
      organizations = data.organizations || [];
    }

    if (organizations.length === 0) {
      console.error(chalk.red('Error: No organizations found for this API key'));
      process.exit(1);
    }

    console.log(chalk.green('✓ API key verified\n'));

    // Store API key
    setApiKey(apiKey!, options.profile);

    // Select organization and project
    await selectOrgAndProject(apiUrl, apiKey!, organizations, options);
  } catch (error: any) {
    handleError(error, apiUrl);
  }
}

/**
 * Login with OAuth (Device Flow)
 */
async function loginWithOAuth(apiUrl: string, provider?: 'google' | 'github', options: LoginOptions = {}) {
  // Select provider if not provided
  if (!provider) {
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'provider',
        message: 'Choose OAuth provider:',
        choices: [
          { name: 'Google', value: 'google' },
          { name: 'GitHub', value: 'github' },
        ],
      },
    ]);
    provider = answer.provider;
  }

  try {
    // Initiate device flow
    console.log(chalk.gray('Initiating OAuth device flow...'));
    const deviceFlowResponse = await fetch(`${apiUrl}/api/auth/cli/device-flow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider }),
    });

    if (!deviceFlowResponse.ok) {
      const error = await deviceFlowResponse.json();
      throw new Error(error.error || 'Failed to initiate device flow');
    }

    const deviceFlow = await deviceFlowResponse.json();

    console.log(chalk.blue('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.bold('  OAuth Device Flow'));
    console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
    console.log(chalk.white('1. Open this URL in your browser:'));
    console.log(chalk.cyan(`   ${deviceFlow.verification_uri_complete}\n`));
    console.log(chalk.white('2. Or visit:'));
    console.log(chalk.cyan(`   ${deviceFlow.verification_uri}\n`));
    console.log(chalk.white('3. Enter this code:'));
    console.log(chalk.bold.yellow(`   ${deviceFlow.user_code}\n`));
    console.log(chalk.gray('Waiting for authorization...\n'));

    // Try to open browser automatically
    try {
      await open(deviceFlow.verification_uri_complete);
    } catch (err) {
      // Ignore if can't open browser
    }

    // Poll for authorization
    const sessionToken = await pollDeviceFlow(apiUrl, deviceFlow.device_code, deviceFlow.interval);

    if (!sessionToken) {
      console.error(chalk.red('Error: Authorization timed out or was cancelled'));
      process.exit(1);
    }

    console.log(chalk.green('✓ OAuth authorization successful\n'));

    // Store session token
    setSessionToken(sessionToken, options.profile);

    // Get user info and organizations
    const userInfo = await getUserInfo(apiUrl, sessionToken);
    await selectOrgAndProject(apiUrl, sessionToken, userInfo.organizations, options, true);
  } catch (error: any) {
    handleError(error, apiUrl);
  }
}

/**
 * Login with Magic Link
 */
async function loginWithMagicLink(apiUrl: string, options: LoginOptions = {}) {
  try {
    // Prompt for email
    const emailAnswer = await inquirer.prompt([
      {
        type: 'input',
        name: 'email',
        message: 'Enter your email address:',
        validate: (input: string) => {
          if (!input || !input.includes('@')) {
            return 'Valid email address is required';
          }
          return true;
        },
      },
    ]);

    console.log(chalk.gray('Sending magic link...'));

    // Request magic link
    const magicLinkResponse = await fetch(`${apiUrl}/api/auth/cli/magic-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailAnswer.email }),
    });

    if (!magicLinkResponse.ok) {
      const error = await magicLinkResponse.json();
      throw new Error(error.error || 'Failed to send magic link');
    }

    const magicLink = await magicLinkResponse.json();

    console.log(chalk.blue('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.bold('  Magic Link Sent'));
    console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
    console.log(chalk.white('A magic link has been sent to:'));
    console.log(chalk.cyan(`   ${emailAnswer.email}\n`));
    console.log(chalk.white('Click the link in the email to complete authentication.'));
    console.log(chalk.gray('Waiting for verification...\n'));

    // Poll for verification
    const sessionToken = await pollMagicLink(apiUrl, magicLink.cliToken);

    if (!sessionToken) {
      console.error(chalk.red('Error: Magic link verification timed out or was cancelled'));
      process.exit(1);
    }

    console.log(chalk.green('✓ Magic link verified\n'));

    // Store session token
    setSessionToken(sessionToken, options.profile);

    // Get user info and organizations
    const userInfo = await getUserInfo(apiUrl, sessionToken);
    await selectOrgAndProject(apiUrl, sessionToken, userInfo.organizations, options, true);
  } catch (error: any) {
    handleError(error, apiUrl);
  }
}

/**
 * Poll device flow for authorization
 */
async function pollDeviceFlow(apiUrl: string, deviceCode: string, interval: number): Promise<string | null> {
  const maxAttempts = 120; // 10 minutes max (120 * 5 seconds)
  let attempts = 0;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, interval * 1000));

    try {
      const response = await fetch(`${apiUrl}/api/auth/cli/device-flow/${deviceCode}`);
      const data = await response.json();

      if (data.access_token) {
        return data.access_token;
      }

      if (data.error === 'expired_token') {
        return null;
      }

      // Continue polling if authorization_pending
      if (data.error !== 'authorization_pending') {
        throw new Error(data.error_description || data.error);
      }
    } catch (error: any) {
      if (error.message && !error.message.includes('authorization_pending')) {
        throw error;
      }
    }

    attempts++;
    process.stdout.write('.');
  }

  return null;
}

/**
 * Poll magic link for verification
 */
async function pollMagicLink(apiUrl: string, cliToken: string): Promise<string | null> {
  const maxAttempts = 60; // 5 minutes max (60 * 5 seconds)
  let attempts = 0;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds

    try {
      const response = await fetch(`${apiUrl}/api/auth/cli/magic-link/poll/${cliToken}`);
      const data = await response.json();

      if (data.access_token) {
        return data.access_token;
      }

      if (data.error === 'expired_token') {
        return null;
      }

      // Continue polling if authorization_pending
      if (data.error !== 'authorization_pending') {
        throw new Error(data.error_description || data.error);
      }
    } catch (error: any) {
      if (error.message && !error.message.includes('authorization_pending')) {
        throw error;
      }
    }

    attempts++;
    process.stdout.write('.');
  }

  return null;
}

/**
 * Get user info from session token
 */
async function getUserInfo(apiUrl: string, sessionToken: string): Promise<{ organizations: any[] }> {
  console.log('[CLI] Getting user info with sessionToken:', sessionToken.substring(0, 8) + '...');
  const response = await fetch(`${apiUrl}/api/auth/cli/session`, {
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[CLI] Failed to get user info:', response.status, errorText);
    throw new Error(`Failed to get user info: ${response.status} ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  console.log('[CLI] Got user info:', { 
    hasOrganizations: !!data.organizations, 
    orgCount: data.organizations?.length || 0 
  });
  return {
    organizations: data.organizations || [],
  };
}

/**
 * Select organization and project
 */
async function selectOrgAndProject(
  apiUrl: string,
  authToken: string,
  organizations: any[],
  options: LoginOptions,
  isSessionToken: boolean = false
) {
  // If org ID not provided, prompt for it
  let orgId = options.orgId;
  if (!orgId && organizations.length > 0) {
    if (organizations.length === 1) {
      orgId = organizations[0].organizationId || organizations[0].orgId;
      console.log(chalk.gray(`Using organization: ${organizations[0].name}`));
    } else {
      const orgChoices = organizations.map((org: any) => ({
        name: `${org.name} (${org.organizationId || org.orgId})`,
        value: org.organizationId || org.orgId,
      }));

      const orgAnswer = await inquirer.prompt([
        {
          type: 'list',
          name: 'orgId',
          message: 'Select organization:',
          choices: orgChoices,
        },
      ]);
      orgId = orgAnswer.orgId;
    }
  }

  if (orgId) {
    setOrgId(orgId, options.profile);

    // Optionally prompt for project
    if (!options.projectId) {
      try {
        // Try v1 API endpoint first
        let projectsResponse = await fetch(`${apiUrl}/api/v1/projects?orgId=${orgId}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        });

        // If v1 doesn't exist, fall back to regular endpoint
        if (projectsResponse.status === 404) {
          projectsResponse = await fetch(`${apiUrl}/api/projects?orgId=${orgId}`, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
            },
          });
        }

        if (projectsResponse.ok) {
          const projectsData = await projectsResponse.json();
          // Handle both v1 API format (data array) and regular format (projects array)
          const projects = projectsData.data || projectsData.projects || [];

          if (projects.length > 0) {
            const projectChoices = projects.map((proj: any) => ({
              name: `${proj.name} (${proj.projectId || proj.id})`,
              value: proj.projectId || proj.id,
            }));

            projectChoices.unshift({
              name: 'Skip (set later)',
              value: null,
            });

            const projectAnswer = await inquirer.prompt([
              {
                type: 'list',
                name: 'projectId',
                message: 'Select default project (optional):',
                choices: projectChoices,
              },
            ]);

            if (projectAnswer.projectId) {
              setProjectId(projectAnswer.projectId, options.profile);
            }
          }
        }
      } catch (error) {
        // Ignore project fetch errors
      }
    } else {
      setProjectId(options.projectId, options.profile);
    }
  } else if (options.orgId) {
    setOrgId(options.orgId, options.profile);
  }

  console.log(chalk.green('\n✓ Login successful!'));
  console.log(chalk.gray(`\nConfiguration saved to: ~/.netpad/config.json`));
  
  if (options.profile) {
    console.log(chalk.gray(`Profile: ${options.profile}`));
  }
}

/**
 * Handle errors
 */
function handleError(error: any, apiUrl: string) {
  if (error.cause || error.message?.includes('fetch failed') || error.message?.includes('ECONNREFUSED')) {
    // Network error (fetch failed)
    console.error(chalk.red(`Error: Failed to connect to ${apiUrl}`));
    console.error(chalk.gray(`Details: ${error.cause?.message || error.message}`));
    console.error(chalk.gray(`\nTroubleshooting:`));
    console.error(chalk.gray(`  1. Is the server running? Try: curl ${apiUrl}/api/v1/health`));
    console.error(chalk.gray(`  2. For local development, use: --api-url http://localhost:3000`));
    console.error(chalk.gray(`  3. Check your network connection and firewall settings`));
    console.error(chalk.gray(`\nYou can also set NETPAD_API_URL environment variable:`));
    console.error(chalk.gray(`  export NETPAD_API_URL=http://localhost:3000`));
  } else {
    console.error(chalk.red(`Error: ${error.message || 'Authentication failed'}`));
    if (error.stack && process.env.DEBUG) {
      console.error(chalk.gray(error.stack));
    }
  }
  process.exit(1);
}
