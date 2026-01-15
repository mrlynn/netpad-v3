/**
 * Create App Command
 * 
 * Scaffold a new NetPad application package
 */

import chalk from 'chalk';
import { Command } from 'commander';
import { promises as fs } from 'fs';
import * as path from 'path';

interface CreateAppOptions {
  dir?: string;
  scope?: string;
}

export async function createAppCommand(name: string, options: CreateAppOptions) {
  const outputDir = path.resolve(options.dir || '.');
  const scope = options.scope || '@netpad';
  const packageName = `${scope}/app-${name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
  const appDir = path.join(outputDir, `netpad-app-${name}`);

  console.log(chalk.blue(`Creating NetPad application: ${packageName}...`));

  try {
    // Create directory
    await fs.mkdir(appDir, { recursive: true });

    // Create package.json
    const packageJson = {
      name: packageName,
      version: '1.0.0',
      description: `NetPad application: ${name}`,
      keywords: ['netpad', 'netpad-app'],
      author: '',
      license: 'MIT',
      main: 'dist/bundle.json',
      files: [
        'dist/bundle.json',
        'README.md',
        'CHANGELOG.md',
        'LICENSE'
      ],
      netpad: {
        type: 'application',
        applicationId: `app_${name.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`,
        name: name,
        description: '',
        version: '1.0.0',
        minNetPadVersion: '3.0.0',
        category: '',
        tags: [],
        dependencies: {
          applications: [],
          plugins: [],
          workflowTemplates: []
        }
      },
      scripts: {
        build: 'netpad build',
        test: 'netpad test'
      }
    };

    await fs.writeFile(
      path.join(appDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Create README.md
    const readme = `# ${name}

NetPad Application

## Description

[Describe your application here]

## Installation

\`\`\`bash
npm install ${packageName}
\`\`\`

## Usage

[Usage instructions]

## Development

\`\`\`bash
npm run build
\`\`\`
`;

    await fs.writeFile(path.join(appDir, 'README.md'), readme);

    // Create .gitignore
    const gitignore = `node_modules/
dist/
*.log
.DS_Store
`;

    await fs.writeFile(path.join(appDir, '.gitignore'), gitignore);

    // Create dist directory
    await fs.mkdir(path.join(appDir, 'dist'), { recursive: true });

    // Create placeholder bundle.json
    const bundleJson = {
      manifest: {
        version: '1.0.0',
        applicationId: packageJson.netpad.applicationId,
        name: name,
        description: '',
        createdAt: new Date().toISOString(),
        minNetPadVersion: '3.0.0',
        category: '',
        tags: []
      },
      forms: [],
      workflows: [],
      connections: []
    };

    await fs.writeFile(
      path.join(appDir, 'dist/bundle.json'),
      JSON.stringify(bundleJson, null, 2)
    );

    console.log(chalk.green(`✓ Created application in ${appDir}`));
    console.log(chalk.gray(`\nNext steps:`));
    console.log(chalk.gray(`  1. cd ${appDir}`));
    console.log(chalk.gray(`  2. Edit dist/bundle.json to add your forms and workflows`));
    console.log(chalk.gray(`  3. npm publish`));
  } catch (error: any) {
    console.error(chalk.red(`Error: ${error.message || 'Failed to create application'}`));
    process.exit(1);
  }
}
