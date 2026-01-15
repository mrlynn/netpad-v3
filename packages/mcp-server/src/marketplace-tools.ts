/**
 * Marketplace & npm Integration Tools for NetPad MCP Server
 *
 * Phase 2 of MCP Server 2.0 update - Marketplace & npm integration
 * Provides tools for publishing, searching, and installing applications from
 * the NetPad marketplace and npm registry.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface MarketplaceApplication {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  tags: string[];
  author: string;
  downloads?: number;
  rating?: number;
  verified?: boolean;
  official?: boolean;
  publishedAt?: string;
  packageName?: string;
}

export interface PublishOptions {
  applicationId: string;
  version: string;
  changelog?: string;
  visibility: 'public' | 'private' | 'organization';
  category: string;
  tags?: string[];
  screenshots?: string[];
  readme?: string;
  license?: string;
}

export interface NpmSyncOptions {
  applicationId: string;
  packageName?: string;
  scope?: string;
  author?: string | { name: string; email?: string; url?: string };
  license?: string;
  repository?: { type: string; url: string };
  homepage?: string;
  keywords?: string[];
}

// ============================================================================
// MARKETPLACE CATEGORIES
// ============================================================================

export const MARKETPLACE_CATEGORIES = [
  { id: 'lead-generation', name: 'Lead Generation', description: 'Capture and manage leads' },
  { id: 'surveys', name: 'Surveys & Feedback', description: 'Collect feedback and run surveys' },
  { id: 'events', name: 'Events & Registration', description: 'Event management and registration' },
  { id: 'hr', name: 'HR & Recruiting', description: 'Human resources and recruitment' },
  { id: 'ecommerce', name: 'E-Commerce', description: 'Orders, products, and payments' },
  { id: 'crm', name: 'CRM & Contacts', description: 'Customer relationship management' },
  { id: 'support', name: 'Support & Helpdesk', description: 'Customer support and ticketing' },
  { id: 'marketing', name: 'Marketing', description: 'Marketing automation and campaigns' },
  { id: 'internal', name: 'Internal Tools', description: 'Internal business processes' },
  { id: 'integrations', name: 'Integrations', description: 'Third-party integrations' },
  { id: 'other', name: 'Other', description: 'Other applications' },
];

// ============================================================================
// SAMPLE MARKETPLACE DATA (for demonstration)
// ============================================================================

export const SAMPLE_MARKETPLACE_APPS: MarketplaceApplication[] = [
  {
    id: 'app_contact_pro',
    name: 'Contact Form Pro',
    description: 'Professional contact form with spam protection, file uploads, and multi-recipient routing',
    version: '2.1.0',
    category: 'lead-generation',
    tags: ['contact', 'leads', 'spam-protection', 'file-upload'],
    author: 'NetPad Team',
    downloads: 12500,
    rating: 4.8,
    verified: true,
    official: true,
    publishedAt: '2025-12-15T10:00:00Z',
    packageName: '@netpad/app-contact-pro',
  },
  {
    id: 'app_nps_survey',
    name: 'NPS Survey Suite',
    description: 'Complete NPS survey solution with analytics, benchmarking, and automated follow-ups',
    version: '1.5.0',
    category: 'surveys',
    tags: ['nps', 'survey', 'analytics', 'feedback'],
    author: 'NetPad Team',
    downloads: 8700,
    rating: 4.7,
    verified: true,
    official: true,
    publishedAt: '2025-11-20T08:30:00Z',
    packageName: '@netpad/app-nps-survey',
  },
  {
    id: 'app_event_manager',
    name: 'Event Registration Manager',
    description: 'Full event registration with ticketing, check-in, and attendee management',
    version: '3.0.2',
    category: 'events',
    tags: ['events', 'registration', 'tickets', 'check-in'],
    author: 'NetPad Team',
    downloads: 6200,
    rating: 4.9,
    verified: true,
    official: true,
    publishedAt: '2026-01-05T14:00:00Z',
    packageName: '@netpad/app-event-manager',
  },
  {
    id: 'app_job_portal',
    name: 'Job Application Portal',
    description: 'Complete job application system with applicant tracking and interview scheduling',
    version: '1.2.0',
    category: 'hr',
    tags: ['hr', 'recruiting', 'ats', 'job-applications'],
    author: 'NetPad Team',
    downloads: 4500,
    rating: 4.6,
    verified: true,
    official: true,
    publishedAt: '2025-10-10T09:00:00Z',
    packageName: '@netpad/app-job-portal',
  },
  {
    id: 'app_order_system',
    name: 'Simple Order System',
    description: 'Lightweight order management with inventory tracking and order notifications',
    version: '2.0.0',
    category: 'ecommerce',
    tags: ['orders', 'ecommerce', 'inventory', 'notifications'],
    author: 'Community',
    downloads: 3200,
    rating: 4.4,
    verified: true,
    official: false,
    publishedAt: '2025-09-25T11:30:00Z',
    packageName: 'netpad-app-simple-orders',
  },
  {
    id: 'app_helpdesk',
    name: 'Helpdesk Ticket System',
    description: 'Customer support ticketing with SLA tracking, escalation rules, and knowledge base',
    version: '1.8.0',
    category: 'support',
    tags: ['support', 'tickets', 'helpdesk', 'sla'],
    author: 'NetPad Team',
    downloads: 5800,
    rating: 4.7,
    verified: true,
    official: true,
    publishedAt: '2025-12-01T16:00:00Z',
    packageName: '@netpad/app-helpdesk',
  },
];

// ============================================================================
// PUBLISH TO MARKETPLACE
// ============================================================================

/**
 * Generate code for publishing an application to the marketplace
 */
export function generatePublishToMarketplaceCode(options: PublishOptions): string {
  const { applicationId, version, changelog, visibility, category, tags, screenshots, readme, license } = options;

  return `// Publish application to NetPad Marketplace
// Using: NetPad Platform API

const publishData = {
  applicationId: '${applicationId}',
  version: '${version}',
  changelog: \`${changelog || `Release ${version}`}\`,
  visibility: '${visibility}',
  category: '${category}',
  tags: ${JSON.stringify(tags || [])},
  screenshots: ${JSON.stringify(screenshots || [])},
  readme: ${readme ? `\`${readme}\`` : 'undefined'},
  license: '${license || 'MIT'}',
};

// Step 1: Create a release first (if not already created)
const releaseResponse = await fetch(\`/api/applications/\${publishData.applicationId}/releases\`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
  body: JSON.stringify({
    version: publishData.version,
    changelog: publishData.changelog,
    validateContract: true,
  }),
});
const { release } = await releaseResponse.json();

// Step 2: Publish to marketplace
const publishResponse = await fetch('/api/marketplace/publish', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
  body: JSON.stringify({
    applicationId: publishData.applicationId,
    releaseId: release.releaseId,
    visibility: publishData.visibility,
    category: publishData.category,
    tags: publishData.tags,
    screenshots: publishData.screenshots,
    readme: publishData.readme,
    license: publishData.license,
  }),
});

const result = await publishResponse.json();
console.log('Published to marketplace:', result.marketplaceId);
console.log('Marketplace URL:', result.url);
`;
}

/**
 * Generate marketplace publish configuration
 */
export function generatePublishConfig(options: PublishOptions): object {
  return {
    publish: {
      applicationId: options.applicationId,
      version: options.version,
      changelog: options.changelog || `Release ${options.version}`,
      visibility: options.visibility,
      listing: {
        category: options.category,
        tags: options.tags || [],
        screenshots: options.screenshots || [],
        readme: options.readme,
        license: options.license || 'MIT',
      },
    },
    validation: {
      requireContract: true,
      requireChangelog: true,
      requireScreenshots: options.visibility === 'public',
    },
  };
}

// ============================================================================
// SEARCH MARKETPLACE
// ============================================================================

export interface MarketplaceSearchOptions {
  query?: string;
  category?: string;
  tags?: string[];
  official?: boolean;
  verified?: boolean;
  sortBy?: 'relevance' | 'downloads' | 'rating' | 'newest';
  page?: number;
  pageSize?: number;
}

/**
 * Search the marketplace (simulated with sample data)
 */
export function searchMarketplace(options: MarketplaceSearchOptions): {
  results: MarketplaceApplication[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
} {
  let results = [...SAMPLE_MARKETPLACE_APPS];
  const { query, category, tags, official, verified, sortBy = 'relevance', page = 1, pageSize = 10 } = options;

  // Filter by query
  if (query) {
    const q = query.toLowerCase();
    results = results.filter(app =>
      app.name.toLowerCase().includes(q) ||
      app.description.toLowerCase().includes(q) ||
      app.tags.some(tag => tag.toLowerCase().includes(q))
    );
  }

  // Filter by category
  if (category) {
    results = results.filter(app => app.category === category);
  }

  // Filter by tags
  if (tags && tags.length > 0) {
    results = results.filter(app =>
      tags.some(tag => app.tags.includes(tag))
    );
  }

  // Filter by official
  if (official !== undefined) {
    results = results.filter(app => app.official === official);
  }

  // Filter by verified
  if (verified !== undefined) {
    results = results.filter(app => app.verified === verified);
  }

  // Sort results
  switch (sortBy) {
    case 'downloads':
      results.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
      break;
    case 'rating':
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    case 'newest':
      results.sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
      break;
    // relevance is default order
  }

  // Paginate
  const total = results.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const paginatedResults = results.slice(start, start + pageSize);

  return {
    results: paginatedResults,
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Generate search marketplace code
 */
export function generateSearchMarketplaceCode(options: MarketplaceSearchOptions): string {
  return `// Search NetPad Marketplace
// Using: NetPad Platform API

const searchParams = new URLSearchParams({
  ${options.query ? `query: '${options.query}',` : ''}
  ${options.category ? `category: '${options.category}',` : ''}
  ${options.tags ? `tags: '${options.tags.join(',')}',` : ''}
  ${options.official !== undefined ? `official: '${options.official}',` : ''}
  ${options.verified !== undefined ? `verified: '${options.verified}',` : ''}
  sortBy: '${options.sortBy || 'relevance'}',
  page: '${options.page || 1}',
  pageSize: '${options.pageSize || 10}',
});

const response = await fetch(\`/api/marketplace/search?\${searchParams}\`, {
  headers: {
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
});

const { results, total, page, totalPages } = await response.json();
console.log(\`Found \${total} applications (page \${page} of \${totalPages})\`);
results.forEach(app => {
  console.log(\`- \${app.name} v\${app.version} (\${app.downloads} downloads)\`);
});
`;
}

// ============================================================================
// INSTALL FROM MARKETPLACE
// ============================================================================

export interface InstallOptions {
  applicationId?: string;
  packageName?: string;
  version?: string;
  projectId: string;
  organizationId: string;
  configuration?: Record<string, any>;
}

/**
 * Generate code for installing an application from marketplace
 */
export function generateInstallFromMarketplaceCode(options: InstallOptions): string {
  const { applicationId, packageName, version, projectId, organizationId, configuration } = options;

  return `// Install application from NetPad Marketplace
// Using: NetPad Platform API

const installData = {
  ${applicationId ? `applicationId: '${applicationId}',` : ''}
  ${packageName ? `packageName: '${packageName}',` : ''}
  ${version ? `version: '${version}',` : '// version: undefined, // Latest version'}
  projectId: '${projectId}',
  organizationId: '${organizationId}',
  ${configuration ? `configuration: ${JSON.stringify(configuration, null, 2)},` : ''}
};

// Step 1: Install the application
const installResponse = await fetch('/api/marketplace/install', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
  body: JSON.stringify(installData),
});

const {
  success,
  applicationId: installedAppId,
  version: installedVersion,
  dependencies
} = await installResponse.json();

if (success) {
  console.log(\`Installed: \${installedAppId} v\${installedVersion}\`);

  // Check dependencies
  if (dependencies?.installed?.length > 0) {
    console.log('Dependencies installed:', dependencies.installed);
  }
  if (dependencies?.failed?.length > 0) {
    console.warn('Failed dependencies:', dependencies.failed);
  }
} else {
  console.error('Installation failed');
}

// Step 2: Configure the installed application (optional)
${configuration ? `
const configResponse = await fetch(\`/api/applications/\${installedAppId}/config\`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
  body: JSON.stringify(${JSON.stringify(configuration, null, 2)}),
});
` : '// No configuration specified'}
`;
}

// ============================================================================
// SYNC TO NPM
// ============================================================================

/**
 * Generate package.json for npm publishing
 */
export function generateNpmPackageJson(options: NpmSyncOptions): object {
  const {
    applicationId,
    packageName,
    scope,
    author,
    license = 'MIT',
    repository,
    homepage,
    keywords = [],
  } = options;

  // Generate package name if not provided
  const finalPackageName = packageName || (scope
    ? `${scope}/netpad-app-${applicationId.replace('app_', '')}`
    : `netpad-app-${applicationId.replace('app_', '')}`);

  return {
    name: finalPackageName,
    version: '1.0.0', // Will be replaced during sync
    description: `NetPad application: ${applicationId}`,
    keywords: [
      'netpad',
      'netpad-app',
      ...keywords,
    ],
    author,
    license,
    main: 'dist/bundle.json',
    files: [
      'dist/bundle.json',
      'README.md',
      'CHANGELOG.md',
      'LICENSE',
    ],
    repository,
    homepage,
    netpad: {
      type: 'application',
      applicationId,
      name: applicationId.replace('app_', '').replace(/_/g, ' '),
      description: '',
      version: '1.0.0',
      minNetPadVersion: '3.0.0',
    },
  };
}

/**
 * Generate code for syncing application to npm
 */
export function generateSyncToNpmCode(options: NpmSyncOptions): string {
  const packageJson = generateNpmPackageJson(options);

  return `// Sync NetPad application to npm registry
// Using: NetPad Platform API + npm CLI

// Step 1: Generate npm package from application
const exportResponse = await fetch(\`/api/applications/${options.applicationId}/export-npm\`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
  body: JSON.stringify({
    packageName: '${(packageJson as any).name}',
    author: ${JSON.stringify(options.author || 'NetPad User')},
    license: '${options.license || 'MIT'}',
    ${options.repository ? `repository: ${JSON.stringify(options.repository)},` : ''}
    ${options.homepage ? `homepage: '${options.homepage}',` : ''}
    keywords: ${JSON.stringify(options.keywords || [])},
  }),
});

const { packagePath, packageJson } = await exportResponse.json();
console.log('Package generated:', packagePath);
console.log('package.json:', JSON.stringify(packageJson, null, 2));

// Step 2: Publish to npm (requires npm CLI authentication)
// Run in terminal:
// cd <packagePath>
// npm publish --access public

// Or use the NetPad npm sync API:
const syncResponse = await fetch('/api/npm/sync', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
  body: JSON.stringify({
    applicationId: '${options.applicationId}',
    npmToken: process.env.NPM_TOKEN, // Required for publishing
  }),
});

const { published, npmUrl } = await syncResponse.json();
if (published) {
  console.log('Published to npm:', npmUrl);
}

// Generated package.json:
/*
${JSON.stringify(packageJson, null, 2)}
*/
`;
}

// ============================================================================
// IMPORT FROM NPM
// ============================================================================

export interface NpmImportOptions {
  packageName: string;
  version?: string;
  projectId: string;
  organizationId: string;
  applicationName?: string;
}

/**
 * Generate code for importing an application from npm
 */
export function generateImportFromNpmCode(options: NpmImportOptions): string {
  const { packageName, version, projectId, organizationId, applicationName } = options;

  return `// Import NetPad application from npm registry
// Using: NetPad Platform API

const importData = {
  packageName: '${packageName}',
  ${version ? `version: '${version}',` : '// version: undefined, // Latest version'}
  projectId: '${projectId}',
  organizationId: '${organizationId}',
  ${applicationName ? `applicationName: '${applicationName}',` : ''}
};

// Step 1: Fetch package metadata from npm
const metadataResponse = await fetch(\`https://registry.npmjs.org/${packageName}\`);
const metadata = await metadataResponse.json();
const latestVersion = metadata['dist-tags'].latest;
const versionToInstall = importData.version || latestVersion;

console.log(\`Importing: \${metadata.name}@\${versionToInstall}\`);

// Check if it's a valid NetPad package
const versionData = metadata.versions[versionToInstall];
if (!versionData.netpad) {
  throw new Error('Not a valid NetPad package - missing netpad field in package.json');
}

// Step 2: Import via NetPad API
const importResponse = await fetch('/api/npm/import', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
  body: JSON.stringify({
    packageName: '${packageName}',
    version: versionToInstall,
    projectId: '${projectId}',
    organizationId: '${organizationId}',
    ${applicationName ? `applicationName: '${applicationName}',` : ''}
  }),
});

const {
  success,
  applicationId,
  version: importedVersion,
  forms,
  workflows,
} = await importResponse.json();

if (success) {
  console.log(\`Successfully imported \${metadata.name}\`);
  console.log(\`Application ID: \${applicationId}\`);
  console.log(\`Version: \${importedVersion}\`);
  console.log(\`Forms imported: \${forms?.length || 0}\`);
  console.log(\`Workflows imported: \${workflows?.length || 0}\`);
} else {
  console.error('Import failed');
}
`;
}

/**
 * Validate npm package name for NetPad applications
 */
export function validateNpmPackageName(packageName: string): {
  valid: boolean;
  isNetPadPackage: boolean;
  isOfficial: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check npm package name rules
  if (packageName.length === 0) {
    errors.push('Package name cannot be empty');
  }

  if (packageName.length > 214) {
    errors.push('Package name cannot exceed 214 characters');
  }

  // Check for invalid characters
  if (!/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(packageName)) {
    errors.push('Package name contains invalid characters');
  }

  // Check NetPad conventions
  const isOfficial = packageName.startsWith('@netpad/');
  const isApplication = packageName.includes('/app-') || packageName.startsWith('netpad-app-');
  const isPlugin = packageName.includes('/plugin-') || packageName.startsWith('netpad-plugin-');
  const isNetPadPackage = isApplication || isPlugin;

  if (!isNetPadPackage) {
    warnings.push('Package name does not follow NetPad naming convention (netpad-app-* or @scope/netpad-app-*)');
  }

  return {
    valid: errors.length === 0,
    isNetPadPackage,
    isOfficial,
    errors,
    warnings,
  };
}
