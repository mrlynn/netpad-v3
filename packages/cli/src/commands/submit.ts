/**
 * Submit Command
 *
 * Submit a NetPad package (application, form, workflow, or extension) to the marketplace
 */

import chalk from 'chalk';
import { readFileSync, existsSync } from 'fs';
import { resolve, basename } from 'path';
import { requireAuth, getAuthHeader } from '../lib/auth.js';

interface SubmitOptions {
  type?: 'application' | 'form' | 'workflow' | 'extension';
  name?: string;
  description?: string;
  summary?: string;
  version?: string;
  category?: string;
  tags?: string;
  author?: string;
  icon?: string;
  npmPackage?: string;
  minNetpadVersion?: string;
  apiUrl?: string;
  apiKey?: string;
}

/**
 * Read and parse a JSON file
 */
function readJsonFile(filePath: string): any {
  const fullPath = resolve(process.cwd(), filePath);
  if (!existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }
  const content = readFileSync(fullPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Detect package type from package.json netpad config
 */
function detectPackageType(netpadConfig: any): 'application' | 'form' | 'workflow' | 'extension' | null {
  if (netpadConfig.type === 'extension') return 'extension';
  if (netpadConfig.type === 'application') return 'application';
  if (netpadConfig.type === 'plugin') {
    // Plugins with workflow nodes are extensions
    if (netpadConfig.workflowNodes && netpadConfig.workflowNodes.length > 0) {
      return 'extension';
    }
  }
  return null;
}

/**
 * Build extension definition from package.json
 */
function buildExtensionFromPackage(packageJson: any): any {
  const netpad = packageJson.netpad || {};

  return {
    metadata: {
      id: netpad.extensionMetadata?.id || packageJson.name.replace('@', '').replace('/', '-'),
      name: netpad.extensionMetadata?.name || netpad.name || packageJson.name,
      version: netpad.extensionMetadata?.version || netpad.version || packageJson.version,
      description: netpad.extensionMetadata?.description || netpad.description || packageJson.description,
      author: netpad.extensionMetadata?.author ||
              (typeof packageJson.author === 'string' ? packageJson.author : packageJson.author?.name),
    },
    features: netpad.features || [],
    workflowNodes: (netpad.workflowNodes || []).map((node: any) => ({
      definition: {
        type: node.type,
        label: node.label,
        description: node.description,
        category: node.category || 'custom',
        color: node.color || '#666666',
        icon: node.icon || 'Extension',
        version: node.version || '1.0.0',
        configFields: node.configFields,
        outputs: node.outputs,
      },
    })),
    routes: netpad.routes || [],
  };
}

/**
 * Build manifest from package.json and options
 */
function buildManifest(packageJson: any, options: SubmitOptions): any {
  const netpad = packageJson.netpad || {};

  return {
    id: netpad.applicationId || packageJson.name.replace('@', '').replace('/', '-'),
    name: options.name || netpad.name || packageJson.name,
    version: options.version || netpad.version || packageJson.version,
    summary: options.summary || netpad.summary,
    description: options.description || netpad.description || packageJson.description,
    category: options.category || netpad.category || 'other',
    tags: options.tags ? options.tags.split(',').map(t => t.trim()) : netpad.tags || packageJson.keywords || [],
    icon: options.icon || netpad.icon,
    author: options.author ? { name: options.author } :
            (typeof packageJson.author === 'string' ? { name: packageJson.author } : packageJson.author),
    license: packageJson.license,
    repository: packageJson.repository,
  };
}

export async function submitCommand(
  source: string,
  options: SubmitOptions
) {
  const auth = requireAuth({
    apiUrl: options.apiUrl,
    apiKey: options.apiKey,
  });

  console.log(chalk.blue(`Submitting to marketplace...`));

  try {
    let itemType = options.type;
    let body: Record<string, any> = {};
    let manifest: any;

    // Determine source type
    if (source.endsWith('package.json') || source.endsWith('.json')) {
      // JSON file - could be package.json or bundle.json
      const jsonContent = readJsonFile(source);

      if (jsonContent.netpad) {
        // This is a package.json with netpad config
        const packageJson = jsonContent;
        const detectedType = detectPackageType(packageJson.netpad);

        if (!itemType && detectedType) {
          itemType = detectedType;
        }

        if (!itemType) {
          console.error(chalk.red('Error: Could not detect package type. Use --type to specify.'));
          process.exit(1);
        }

        manifest = buildManifest(packageJson, options);

        if (itemType === 'extension') {
          const extension = buildExtensionFromPackage(packageJson);
          body = {
            itemType: 'extension',
            manifest,
            extension,
            npmPackage: options.npmPackage || packageJson.name,
            minNetPadVersion: options.minNetpadVersion || packageJson.netpad?.minNetPadVersion,
            extensionMetadata: {
              extensionType: packageJson.netpad?.extensionType || 'node',
              nodeCount: extension.workflowNodes?.length || 0,
              nodeCategories: [...new Set(extension.workflowNodes?.map((n: any) => n.definition?.category).filter(Boolean) || [])],
              routeCount: extension.routes?.length || 0,
              npmPackage: options.npmPackage || packageJson.name,
              minNetPadVersion: options.minNetpadVersion || packageJson.netpad?.minNetPadVersion,
              verified: false,
            },
          };
        } else if (itemType === 'application') {
          // Application bundle from package.json
          body = {
            itemType: 'application',
            manifest,
            bundle: { manifest },
          };
        }
      } else if (jsonContent.manifest) {
        // This is a bundle.json export
        manifest = jsonContent.manifest;
        itemType = options.type || 'application';

        body = {
          itemType,
          manifest,
          bundle: jsonContent,
        };
      } else if (jsonContent.form || jsonContent.fieldConfigs) {
        // This is a form definition
        itemType = 'form';
        const form = jsonContent.form || jsonContent;
        manifest = buildManifest({
          name: form.name || basename(source, '.json'),
          description: form.description,
          version: options.version || '1.0.0',
          netpad: {},
        }, options);

        body = {
          itemType: 'form',
          manifest,
          form,
          formMetadata: {
            fieldCount: form.fieldConfigs?.length || 0,
            formType: 'traditional',
            isMultiPage: !!form.multiPage?.enabled,
            hasConditionalLogic: form.fieldConfigs?.some((f: any) => f.conditionalLogic?.enabled) || false,
          },
        };
      } else if (jsonContent.workflow || jsonContent.canvas) {
        // This is a workflow definition
        itemType = 'workflow';
        const workflow = jsonContent.workflow || jsonContent;
        manifest = buildManifest({
          name: workflow.name || basename(source, '.json'),
          description: workflow.description,
          version: options.version || '1.0.0',
          netpad: {},
        }, options);

        body = {
          itemType: 'workflow',
          manifest,
          workflow,
          workflowMetadata: {
            nodeCount: workflow.canvas?.nodes?.length || 0,
            triggerType: 'manual',
            nodeTypes: [...new Set(workflow.canvas?.nodes?.map((n: any) => n.type) || [])],
          },
        };
      } else {
        console.error(chalk.red('Error: Could not detect content type from JSON file.'));
        console.error(chalk.gray('Expected: package.json with "netpad" field, bundle.json, form definition, or workflow definition'));
        process.exit(1);
      }
    } else if (source.startsWith('@') || source.includes('/')) {
      // npm package name
      console.log(chalk.gray(`Fetching package info for ${source}...`));

      // Fetch package info from npm
      const npmResponse = await fetch(`https://registry.npmjs.org/${source}`);
      if (!npmResponse.ok) {
        console.error(chalk.red(`Error: Package ${source} not found on npm`));
        process.exit(1);
      }

      const npmData = await npmResponse.json();
      const latestVersion = npmData['dist-tags']?.latest;
      const packageVersion = npmData.versions?.[latestVersion];

      if (!packageVersion) {
        console.error(chalk.red(`Error: Could not find latest version of ${source}`));
        process.exit(1);
      }

      if (!packageVersion.netpad) {
        console.error(chalk.red(`Error: Package ${source} does not have a "netpad" configuration`));
        console.error(chalk.gray('The package.json must have a "netpad" field with type, name, etc.'));
        process.exit(1);
      }

      const detectedType = detectPackageType(packageVersion.netpad);
      if (!itemType && detectedType) {
        itemType = detectedType;
      }

      if (!itemType) {
        console.error(chalk.red('Error: Could not detect package type. Use --type to specify.'));
        process.exit(1);
      }

      manifest = buildManifest(packageVersion, options);

      if (itemType === 'extension') {
        const extension = buildExtensionFromPackage(packageVersion);
        body = {
          itemType: 'extension',
          manifest,
          extension,
          npmPackage: source,
          minNetPadVersion: options.minNetpadVersion || packageVersion.netpad?.minNetPadVersion,
          extensionMetadata: {
            extensionType: packageVersion.netpad?.extensionType || 'node',
            nodeCount: extension.workflowNodes?.length || 0,
            nodeCategories: [...new Set(extension.workflowNodes?.map((n: any) => n.definition?.category).filter(Boolean) || [])],
            routeCount: extension.routes?.length || 0,
            npmPackage: source,
            minNetPadVersion: options.minNetpadVersion || packageVersion.netpad?.minNetPadVersion,
            verified: false,
          },
        };
      } else {
        body = {
          itemType,
          manifest,
          bundle: { manifest },
          source: 'npm',
          sourcePackageName: source,
        };
      }
    } else {
      console.error(chalk.red('Error: Source must be a path to a JSON file or an npm package name'));
      process.exit(1);
    }

    // Submit to marketplace
    const response = await fetch(`${auth.apiUrl}/api/marketplace/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader(auth),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(chalk.red(`Error: ${data.error || 'Failed to submit to marketplace'}`));
      if (data.errors && Array.isArray(data.errors)) {
        data.errors.forEach((err: string) => console.error(chalk.red(`  - ${err}`)));
      }
      process.exit(1);
    }

    if (!data.success) {
      console.error(chalk.red(`Error: ${data.error || 'Submission failed'}`));
      process.exit(1);
    }

    const item = data.item || data.application;
    console.log(chalk.green(`\n✓ Successfully submitted ${item.name} to the marketplace!`));
    console.log(chalk.gray(`  ID: ${item.id}`));
    console.log(chalk.gray(`  Type: ${item.itemType || itemType}`));
    console.log(chalk.gray(`  Status: ${item.status}`));

    if (item.status === 'pending') {
      console.log(chalk.yellow(`\n⏳ Your submission is pending review.`));
      console.log(chalk.gray(`   You will be notified once it has been reviewed by an administrator.`));
    } else if (item.status === 'approved') {
      console.log(chalk.green(`\n✓ Your submission has been approved and is now live!`));
    }

    if (item.message) {
      console.log(chalk.gray(`\n${item.message}`));
    }

  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.error(chalk.red(`Error: File not found: ${source}`));
    } else if (error instanceof SyntaxError) {
      console.error(chalk.red(`Error: Invalid JSON in ${source}`));
    } else {
      console.error(chalk.red(`Error: ${error.message || 'Failed to submit to marketplace'}`));
    }
    process.exit(1);
  }
}
