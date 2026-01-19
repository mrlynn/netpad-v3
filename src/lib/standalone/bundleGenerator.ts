/**
 * Standalone App Bundle Generator
 *
 * Generates a complete, deployable Next.js application from a NetPad project.
 * The generated app uses @netpad/forms for form rendering and includes
 * all necessary configuration for standalone deployment.
 */

import archiver from 'archiver';
import { Readable } from 'stream';
import { FormConfiguration } from '@/types/form';
import { WorkflowDocument } from '@/types/workflow';
import {
  cleanFormForExport,
  cleanWorkflowForExport,
  generateEnvVarTemplate,
  detectFormWorkflowConnections,
} from '@/lib/templates/export';
import { FormDefinition, WorkflowDefinition } from '@/types/template';

/**
 * Options for bundle generation
 */
export interface BundleOptions {
  /** Project name (used for package.json name) */
  projectName: string;
  /** Project description */
  description?: string;
  /** Include admin panel for viewing submissions */
  includeAdmin: boolean;
  /** Include workflow engine */
  includeWorkflows: boolean;
  /** Deployment target optimization */
  deployTarget: 'vercel' | 'docker' | 'generic';
  /** Forms to include */
  forms: FormConfiguration[];
  /** Workflows to include (if includeWorkflows is true) */
  workflows?: WorkflowDocument[];
  /** Theme configuration */
  theme?: {
    primaryColor?: string;
    logo?: string;
  };
  /** Include sample data seeding */
  includeSampleData?: boolean;
  /** Remove "Made with NetPad" branding (paid feature) */
  removeBranding?: boolean;
}

/**
 * Generate a standalone app bundle as a ZIP file
 */
export async function generateStandaloneBundle(
  options: BundleOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    const archive = archiver('zip', {
      zlib: { level: 9 }, // Maximum compression
    });

    archive.on('data', (chunk) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);

    // Clean forms and workflows for export
    const cleanedForms = options.forms.map(cleanFormForExport);
    const cleanedWorkflows = options.includeWorkflows && options.workflows
      ? options.workflows.map(cleanWorkflowForExport)
      : [];

    // Detect form-workflow connections
    const connections = detectFormWorkflowConnections(cleanedForms, cleanedWorkflows);

    // Template file contents - defined inline to avoid hoisting issues
    const templateFiles: Record<string, string | ((opts: BundleOptions) => string)> = {
      'package.json': generatePackageJson,
      'tsconfig.json': TSCONFIG_CONTENT,
      'next.config.js': NEXT_CONFIG_CONTENT,
      '.gitignore': GITIGNORE_CONTENT,
      '.env.example': generateEnvExample,
      'README.md': generateReadme,
      'vercel.json': VERCEL_JSON_CONTENT,
    };

    // Add root configuration files
    for (const [filename, content] of Object.entries(templateFiles)) {
      const fileContent = typeof content === 'function' ? content(options) : content;
      archive.append(fileContent, { name: filename });
    }

    // Add bundle.json with forms, workflows, and connections
    const bundleJson = generateBundleJson(options, cleanedForms, cleanedWorkflows, connections);
    archive.append(JSON.stringify(bundleJson, null, 2), { name: 'bundle.json' });

    // Add source files
    addSourceFiles(archive, options, cleanedForms, cleanedWorkflows);

    // Add public directory with logo (unless branding removed)
    archive.append('', { name: 'public/.gitkeep' });
    if (!options.removeBranding) {
      archive.append(NETPAD_LOGO_SVG, { name: 'public/netpad-logo.svg' });
    }

    // Finalize the archive
    archive.finalize();
  });
}

/**
 * Add all source files to the archive
 */
function addSourceFiles(
  archive: archiver.Archiver,
  options: BundleOptions,
  forms: FormDefinition[],
  workflows: WorkflowDefinition[]
): void {
  // App layout
  archive.append(generateAppLayout(options), { name: 'src/app/layout.tsx' });

  // Main page (form or form selector)
  archive.append(generateMainPage(options, forms), { name: 'src/app/page.tsx' });

  // Form pages (dynamic route)
  archive.append(generateFormPage(options), { name: 'src/app/forms/[slug]/page.tsx' });

  // Thank you page
  archive.append(generateThankYouPage(options), { name: 'src/app/thank-you/page.tsx' });

  // API routes
  archive.append(generateSubmitRoute(options), { name: 'src/app/api/submit/route.ts' });
  archive.append(generateFormsListApiRoute(), { name: 'src/app/api/forms/route.ts' });
  archive.append(generateFormsApiRoute(), { name: 'src/app/api/forms/[slug]/route.ts' });
  archive.append(generateInitRoute(), { name: 'src/app/api/init/route.ts' });
  archive.append(generateHealthRoute(), { name: 'src/app/api/health/route.ts' });
  archive.append(generateSetupStatusRoute(), { name: 'src/app/api/setup/status/route.ts' });

  // Lib files
  archive.append(generateDbLib(), { name: 'src/lib/db.ts' });

  // Components
  archive.append(generateThemeProvider(options), { name: 'src/components/ThemeProvider.tsx' });
  archive.append(generateFormRenderer(), { name: 'src/components/FormRenderer.tsx' });
  archive.append(generateSetupWizard(options), { name: 'src/components/SetupWizard.tsx' });

  // Branding badge (unless removed for paid users)
  if (!options.removeBranding) {
    archive.append(generateNetPadBadge(), { name: 'src/components/NetPadBadge.tsx' });
  }

  // Types
  archive.append(generateTypes(), { name: 'src/types/index.ts' });

  // Admin routes (if included)
  if (options.includeAdmin) {
    archive.append(generateAdminLayout(), { name: 'src/app/admin/layout.tsx' });
    archive.append(generateAdminPage(), { name: 'src/app/admin/page.tsx' });
    archive.append(generateAdminSubmissionsPage(), { name: 'src/app/admin/submissions/page.tsx' });
    archive.append(generateAdminLoginPage(), { name: 'src/app/admin/login/page.tsx' });
    archive.append(generateAdminAuthRoute(), { name: 'src/app/api/admin/auth/route.ts' });
    archive.append(generateSubmissionsApiRoute(), { name: 'src/app/api/submissions/route.ts' });
  }

  // Workflow routes (if included)
  if (options.includeWorkflows && workflows.length > 0) {
    archive.append(generateWorkflowLib(), { name: 'src/lib/workflows.ts' });
    archive.append(generateWorkflowApiRoute(), { name: 'src/app/api/workflows/execute/route.ts' });
  }

  // Middleware
  archive.append(generateMiddleware(options), { name: 'src/middleware.ts' });

  // Global styles
  archive.append(generateGlobalStyles(), { name: 'src/app/globals.css' });
}

// ============================================================================
// File Content Generators
// ============================================================================

function generatePackageJson(options: BundleOptions): string {
  const safeName = options.projectName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const pkg = {
    name: safeName || 'netpad-app',
    version: '1.0.0',
    private: true,
    description: options.description || 'A standalone form application built with NetPad',
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      lint: 'next lint',
      typecheck: 'tsc --noEmit',
      'db:init': 'curl -X POST http://localhost:3000/api/init',
    },
    dependencies: {
      next: '^14.2.0',
      react: '^18.2.0',
      'react-dom': '^18.2.0',
      mongodb: '^6.3.0',
      '@netpad/forms': '^0.3.0',
      '@mui/material': '^5.15.0',
      '@mui/material-nextjs': '^5.15.0',
      '@mui/icons-material': '^5.15.0',
      '@emotion/react': '^11.11.0',
      '@emotion/styled': '^11.11.0',
      '@emotion/cache': '^11.11.0',
    },
    devDependencies: {
      '@types/node': '^20.10.0',
      '@types/react': '^18.2.0',
      '@types/react-dom': '^18.2.0',
      typescript: '^5.3.0',
      eslint: '^8.55.0',
      'eslint-config-next': '^14.2.0',
    },
    engines: {
      node: '>=18.0.0',
    },
  };

  return JSON.stringify(pkg, null, 2);
}

const TSCONFIG_CONTENT = `{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}`;

const NEXT_CONFIG_CONTENT = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['mongodb'],
  },
};

module.exports = nextConfig;`;

const GITIGNORE_CONTENT = `# Dependencies
node_modules/
.pnp
.pnp.js

# Build
.next/
out/
build/
dist/

# Environment
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# TypeScript
*.tsbuildinfo
next-env.d.ts
`;

// NetPad logo SVG for branding badge
const NETPAD_LOGO_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 557.33 595">
  <g>
    <path d="M287.49,0c21.53,4.53,37.67,21.25,40.13,42.82,2.59,22.8-9.94,43.23-31.16,52.06l.08,55.22,168.25.42c46.36.12,92.55,45.32,92.55,91.94v192.84c0,28.23-16.02,53.17-36.34,70.31-10.89,9.19-22.47,14.14-35.43,18.95l-50.1,18.61-114.07,42.67c-10.96,4.1-21.05,7.17-31.9,9.16h-20.96c-11.22-1.75-21.47-5.07-32.78-9.3l-158.17-59.18c-14.18-5.31-27.02-9.76-38.91-19.28-20.57-16.47-34.7-39.59-37.64-66.19-.22-2.03-.47-4.08-1.02-5.05v-195c0-48.79,45.66-86.78,91.69-90.82l168.01-.04-.08-55.31c-17.63-7.79-29.93-23.32-31.04-42.74-2.04-26.12,15.61-46.36,39.94-52.09h18.97ZM456.6,490.64c32.66-.17,61.99-26.14,61.99-59.79l.03-182.94c0-30.65-27.17-59.48-58.52-59.52l-363.99-.51c-30.69,4.13-53.85,26.5-57.14,57.42v187.46c3.22,32.34,29,57.88,62.11,57.91l291.02.31,64.5-.34Z"/>
    <path d="M448.01,308.45c3.16,19.08-2.37,36.81-14.47,50.1-11.88,13.05-28.85,20-47.41,19.29-29.9-1.15-54.29-24.3-57.07-54.56-2.8-30.4,18.63-58.04,48.68-63.71,32.91-6.21,64.72,15.36,70.27,48.88Z"/>
    <path d="M168.21,377.86c-23.62-.73-43.1-14.59-52.26-33.96-10.28-21.74-6.72-46.29,8.52-64.13,16-18.74,40.02-25.72,63.86-18.54,21.03,6.33,38.27,25.28,41.05,48.86,4.48,37.95-23.9,68.93-61.17,67.78Z"/>
  </g>
  <circle cx="169.98" cy="318.2" r="57"/>
  <circle cx="388.85" cy="318.18" r="57"/>
  <circle cx="278.8" cy="48.07" r="48.07"/>
</svg>`;

const VERCEL_JSON_CONTENT = `{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "regions": ["iad1"],
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}`;

function generateEnvExample(options: BundleOptions): string {
  const forms = options.forms.map(cleanFormForExport);
  const workflows = options.includeWorkflows && options.workflows
    ? options.workflows.map(cleanWorkflowForExport)
    : [];

  const envVars = generateEnvVarTemplate(options.projectName, forms, workflows, []);

  let content = `# ${options.projectName} - Environment Variables
# Copy this file to .env.local and fill in your values

# ============================================================================
# REQUIRED
# ============================================================================

`;

  for (const envVar of envVars.required) {
    content += `# ${envVar.description}\n`;
    if (envVar.default) {
      content += `${envVar.name}=${envVar.default}\n\n`;
    } else {
      content += `${envVar.name}=\n\n`;
    }
  }

  if (envVars.optional.length > 0) {
    content += `# ============================================================================
# OPTIONAL
# ============================================================================

`;
    for (const envVar of envVars.optional) {
      content += `# ${envVar.description}\n`;
      content += `# ${envVar.name}=${envVar.default || ''}\n\n`;
    }
  }

  return content;
}

function generateReadme(options: BundleOptions): string {
  const safeName = options.projectName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-');

  return `# ${options.projectName}

${options.description || 'A standalone form application built with NetPad.'}

## Quick Start

### 1. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 2. Start Development Server

\`\`\`bash
npm run dev
\`\`\`

### 3. Follow the Setup Wizard

Visit http://localhost:3000 and you'll see a **Setup Wizard** that guides you through:

1. **Configure Environment** - Set up your MongoDB connection string
2. **Connect Database** - Verify the connection works
3. **Initialize Data** - Seed the database with your forms

The wizard provides detailed instructions for each step. If you prefer manual setup, see below.

### Manual Setup (Alternative)

Copy the example environment file and fill in your values:

\`\`\`bash
cp .env.example .env.local
\`\`\`

Required environment variables:
- \`MONGODB_URI\` - Your MongoDB connection string

Then restart the dev server and visit http://localhost:3000/api/init to seed the database.

### 4. Access Your Forms

- **Forms**: http://localhost:3000${options.forms.length === 1 ? '' : '/forms/[slug]'}
${options.includeAdmin ? '- **Admin Panel**: http://localhost:3000/admin' : ''}

## Deployment

### Deploy to Vercel

1. Push this repository to GitHub
2. Import the repository in Vercel
3. Add your environment variables in Vercel's dashboard
4. Deploy!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/${safeName})

### Deploy with Docker

\`\`\`bash
docker build -t ${safeName} .
docker run -p 3000:3000 --env-file .env.local ${safeName}
\`\`\`

## Project Structure

\`\`\`
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main form page
│   │   ├── forms/[slug]/         # Dynamic form routes
│   │   ├── thank-you/            # Submission confirmation
│   │   ├── api/                  # API routes
│   │   │   ├── submit/           # Form submission handler
│   │   │   ├── forms/            # Form data API
│   │   │   └── init/             # Database initialization
${options.includeAdmin ? '│   │   └── admin/               # Admin panel\n' : ''}│   ├── components/
│   │   └── FormRenderer.tsx      # Form rendering component
│   └── lib/
│       └── db.ts                 # Database connection
├── bundle.json                   # Form & workflow definitions
├── .env.example                  # Environment template
└── package.json
\`\`\`

## Built With

- [Next.js](https://nextjs.org/) - React framework
- [@netpad/forms](https://npmjs.com/package/@netpad/forms) - Form rendering
- [MongoDB](https://www.mongodb.com/) - Database
- [Material UI](https://mui.com/) - UI components

---

Generated with [NetPad](https://netpad.io)
`;
}

function generateBundleJson(
  options: BundleOptions,
  forms: FormDefinition[],
  workflows: WorkflowDefinition[],
  connections: any[]
): object {
  return {
    manifest: {
      name: options.projectName,
      version: '1.0.0',
      description: options.description || 'A standalone NetPad application',
      generatedAt: new Date().toISOString(),
      generator: 'netpad-standalone-bundler',
    },
    forms,
    workflows,
    connections,
    deployment: {
      mode: 'standalone',
      seed: {
        forms: true,
        workflows: options.includeWorkflows,
        sampleData: options.includeSampleData || false,
      },
    },
  };
}

function generateAppLayout(options: BundleOptions): string {
  const primaryColor = options.theme?.primaryColor || '#00ED64';
  return `import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/ThemeProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '${options.projectName}',
  description: '${options.description || 'Form application'}',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
`;
}

function generateThemeProvider(options: BundleOptions): string {
  const primaryColor = options.theme?.primaryColor || '#00ED64';
  return `'use client';

import * as React from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';

const theme = createTheme({
  palette: {
    primary: {
      main: '${primaryColor}',
    },
  },
  typography: {
    fontFamily: 'var(--font-inter), system-ui, sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </AppRouterCacheProvider>
  );
}
`;
}

function generateMainPage(options: BundleOptions, forms: FormDefinition[]): string {
  const formSlug = forms.length === 1 ? forms[0].slug : null;
  const showBranding = !options.removeBranding;

  return `'use client';

import { useEffect, useState, useCallback } from 'react';
${forms.length > 1 ? "import Link from 'next/link';" : ''}
import { FormRenderer } from '@/components/FormRenderer';
import { SetupWizard } from '@/components/SetupWizard';
${showBranding ? "import { NetPadBadge } from '@/components/NetPadBadge';" : ''}
import {
  Box,
  Container,
  Typography,
  Paper,
  ${forms.length > 1 ? 'List, ListItem, ListItemButton, ListItemText,' : ''}
  CircularProgress,
  Alert,
} from '@mui/material';

interface SetupStatus {
  configured: boolean;
  connected: boolean;
  initialized: boolean;
  formsCount: number;
  error?: string;
}

export default function HomePage() {
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [form, setForm] = useState<any>(null);
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check setup status first
  const checkSetup = useCallback(async () => {
    try {
      const res = await fetch('/api/setup/status');
      const status: SetupStatus = await res.json();
      setSetupStatus(status);

      // If fully set up, load the form(s)
      if (status.configured && status.connected && status.initialized) {
        ${formSlug ? `
        // Single form - load it directly
        const formRes = await fetch('/api/forms/${formSlug}');
        if (!formRes.ok) throw new Error('Form not found');
        const formData = await formRes.json();
        setForm(formData);
        ` : `
        // Multiple forms - load list
        const formsRes = await fetch('/api/forms');
        const formsData = await formsRes.json();
        setForms(formsData);
        `}
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check setup status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSetup();
  }, [checkSetup]);

  // Handle setup completion - refresh the page
  const handleSetupComplete = () => {
    setLoading(true);
    checkSetup();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // If setup is not complete, show the wizard
  if (setupStatus && (!setupStatus.configured || !setupStatus.connected || !setupStatus.initialized)) {
    return <SetupWizard status={setupStatus} onComplete={handleSetupComplete} />;
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  ${formSlug ? `
  // Single form view
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Container maxWidth="md" sx={{ py: 4, flex: 1 }}>
        {form && <FormRenderer form={form} />}
      </Container>
      ${showBranding ? '<NetPadBadge />' : ''}
    </Box>
  );
  ` : `
  // Multiple forms view
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Container maxWidth="md" sx={{ py: 4, flex: 1 }}>
        <Typography variant="h4" sx={{ mb: 4, fontWeight: 600 }}>
          ${options.projectName}
        </Typography>

        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <List>
            {forms.map((form) => (
              <ListItem key={form.slug} disablePadding>
                <ListItemButton component={Link} href={\`/forms/\${form.slug}\`}>
                  <ListItemText
                    primary={form.name}
                    secondary={form.description}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>
      </Container>
      ${showBranding ? '<NetPadBadge />' : ''}
    </Box>
  );
  `}
}
`;
}

function generateFormPage(options: BundleOptions): string {
  return `'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { FormRenderer } from '@/components/FormRenderer';
import { Box, CircularProgress, Typography, Container, Alert } from '@mui/material';

export default function FormPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(\`/api/forms/\${slug}\`)
      .then((res) => {
        if (!res.ok) throw new Error('Form not found');
        return res.json();
      })
      .then(setForm)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <FormRenderer form={form} />
    </Container>
  );
}
`;
}

function generateThankYouPage(options: BundleOptions): string {
  return `'use client';

import { useSearchParams } from 'next/navigation';
import { Container, Typography, Paper, Box, Button, Alert } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import Link from 'next/link';

export default function ThankYouPage() {
  const searchParams = useSearchParams();
  const formName = searchParams.get('form') || 'Form';

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Box sx={{ mb: 3 }}>
          <CheckCircle sx={{ fontSize: 64, color: 'success.main' }} />
        </Box>
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
          Thank You!
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Your submission has been received successfully.
        </Typography>
        <Button component={Link} href="/" variant="contained">
          Back to Home
        </Button>
      </Paper>
    </Container>
  );
}
`;
}

function generateSubmitRoute(options: BundleOptions): string {
  return `import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formId, formSlug, data } = body;

    if (!data) {
      return NextResponse.json({ error: 'No data provided' }, { status: 400 });
    }

    const db = await getDatabase();

    // Create submission record
    const submission = {
      formId,
      formSlug,
      data,
      status: 'submitted',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      },
    };

    const result = await db.collection('form_submissions').insertOne(submission);

    ${options.includeWorkflows ? `
    // Trigger workflows if configured
    try {
      await fetch(\`\${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/workflows/execute\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger: 'form-submission',
          formSlug,
          submissionId: result.insertedId.toString(),
          data,
        }),
      });
    } catch (workflowError) {
      console.error('Workflow trigger failed:', workflowError);
    }
    ` : ''}

    return NextResponse.json({
      success: true,
      submissionId: result.insertedId.toString(),
    });
  } catch (error) {
    console.error('Submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit form' },
      { status: 500 }
    );
  }
}
`;
}

function generateFormsListApiRoute(): string {
  return `import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getDatabase();
    const forms = await db.collection('forms').find({}).toArray();

    return NextResponse.json(forms.map(form => ({
      slug: form.slug,
      name: form.name,
      description: form.description,
    })));
  } catch (error) {
    console.error('Error fetching forms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch forms' },
      { status: 500 }
    );
  }
}
`;
}

function generateFormsApiRoute(): string {
  return `import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const db = await getDatabase();
    const form = await db.collection('forms').findOne({ slug });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    return NextResponse.json(form);
  } catch (error) {
    console.error('Error fetching form:', error);
    return NextResponse.json(
      { error: 'Failed to fetch form' },
      { status: 500 }
    );
  }
}
`;
}

function generateInitRoute(): string {
  return `import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import bundle from '../../../../bundle.json';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const db = await getDatabase();

    // Seed forms
    if (bundle.forms && bundle.forms.length > 0) {
      const formsCollection = db.collection('forms');

      for (const form of bundle.forms) {
        await formsCollection.updateOne(
          { slug: form.slug },
          { $set: { ...form, updatedAt: new Date() } },
          { upsert: true }
        );
      }
    }

    // Seed workflows
    if (bundle.workflows && bundle.workflows.length > 0) {
      const workflowsCollection = db.collection('workflows');

      for (const workflow of bundle.workflows) {
        await workflowsCollection.updateOne(
          { slug: workflow.slug },
          { $set: { ...workflow, updatedAt: new Date() } },
          { upsert: true }
        );
      }
    }

    // Create indexes
    await db.collection('forms').createIndex({ slug: 1 }, { unique: true });
    await db.collection('form_submissions').createIndex({ formSlug: 1, createdAt: -1 });

    return NextResponse.json({
      success: true,
      message: 'Database initialized',
      forms: bundle.forms?.length || 0,
      workflows: bundle.workflows?.length || 0,
    });
  } catch (error) {
    console.error('Init error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize database' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
`;
}

function generateHealthRoute(): string {
  return `import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getDatabase();
    await db.command({ ping: 1 });

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: 'Database connection failed' },
      { status: 503 }
    );
  }
}
`;
}

function generateDbLib(): string {
  return `import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DATABASE || 'netpad_app';

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

/**
 * Check if the MongoDB URI is configured
 */
export function isConfigured(): boolean {
  return !!uri;
}

/**
 * Get the database connection (throws if not configured)
 */
export async function getDatabase(): Promise<Db> {
  if (!uri) {
    throw new Error('MONGODB_URI not configured');
  }

  if (!clientPromise) {
    if (process.env.NODE_ENV === 'development') {
      if (!global._mongoClientPromise) {
        client = new MongoClient(uri);
        global._mongoClientPromise = client.connect();
      }
      clientPromise = global._mongoClientPromise;
    } else {
      client = new MongoClient(uri);
      clientPromise = client.connect();
    }
  }

  const connectedClient = await clientPromise;
  return connectedClient.db(dbName);
}

/**
 * Check setup status - returns details about what's configured and initialized
 */
export async function checkSetupStatus(): Promise<{
  configured: boolean;
  connected: boolean;
  initialized: boolean;
  formsCount: number;
  error?: string;
}> {
  // Check if env is configured
  if (!uri) {
    return {
      configured: false,
      connected: false,
      initialized: false,
      formsCount: 0,
      error: 'MONGODB_URI is not set in environment variables',
    };
  }

  try {
    const db = await getDatabase();

    // Test connection with ping
    await db.command({ ping: 1 });

    // Check if forms collection has any documents (init was run)
    const formsCount = await db.collection('forms').countDocuments();

    return {
      configured: true,
      connected: true,
      initialized: formsCount > 0,
      formsCount,
    };
  } catch (error: any) {
    return {
      configured: true,
      connected: false,
      initialized: false,
      formsCount: 0,
      error: error.message || 'Failed to connect to database',
    };
  }
}

export default { getDatabase, isConfigured, checkSetupStatus };
`;
}

function generateFormRenderer(): string {
  return `'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  TextField,
  Typography,
  FormControl,
  FormLabel,
  FormHelperText,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  CircularProgress,
  Alert,
  Paper,
} from '@mui/material';

interface FormRendererProps {
  form: any;
}

export function FormRenderer({ form }: FormRendererProps) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleChange = (path: string, value: any) => {
    setValues((prev) => ({ ...prev, [path]: value }));
    if (errors[path]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[path];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    for (const field of form.fieldConfigs || form.fields || []) {
      if (field.required && !values[field.path]) {
        newErrors[field.path] = \`\${field.label} is required\`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: form.id || form._id,
          formSlug: form.slug,
          data: values,
        }),
      });

      if (!response.ok) {
        throw new Error('Submission failed');
      }

      router.push(\`/thank-you?form=\${encodeURIComponent(form.name)}\`);
    } catch (error) {
      setSubmitError('Failed to submit form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: any) => {
    if (field.type === 'sectionHeader') {
      return (
        <Typography
          key={field.path}
          variant="h6"
          sx={{ mt: 3, mb: 1, fontWeight: 600 }}
        >
          {field.label}
        </Typography>
      );
    }

    const commonProps = {
      fullWidth: true,
      label: field.label,
      required: field.required,
      error: !!errors[field.path],
      helperText: errors[field.path] || field.helperText,
      placeholder: field.placeholder,
    };

    switch (field.type) {
      case 'textarea':
      case 'long_text':
        return (
          <TextField
            key={field.path}
            {...commonProps}
            multiline
            rows={4}
            value={values[field.path] || ''}
            onChange={(e) => handleChange(field.path, e.target.value)}
          />
        );

      case 'select':
      case 'dropdown':
        return (
          <FormControl key={field.path} fullWidth error={!!errors[field.path]}>
            <FormLabel>{field.label}</FormLabel>
            <Select
              value={values[field.path] || ''}
              onChange={(e) => handleChange(field.path, e.target.value)}
            >
              {(field.validation?.options || []).map((opt: any) => (
                <MenuItem
                  key={typeof opt === 'string' ? opt : opt.value}
                  value={typeof opt === 'string' ? opt : opt.value}
                >
                  {typeof opt === 'string' ? opt : opt.label}
                </MenuItem>
              ))}
            </Select>
            {errors[field.path] && <FormHelperText>{errors[field.path]}</FormHelperText>}
          </FormControl>
        );

      case 'checkbox':
        return (
          <FormControlLabel
            key={field.path}
            control={
              <Checkbox
                checked={values[field.path] || false}
                onChange={(e) => handleChange(field.path, e.target.checked)}
              />
            }
            label={field.label}
          />
        );

      case 'radio':
      case 'multiple_choice':
        return (
          <FormControl key={field.path} error={!!errors[field.path]}>
            <FormLabel>{field.label}</FormLabel>
            <RadioGroup
              value={values[field.path] || ''}
              onChange={(e) => handleChange(field.path, e.target.value)}
            >
              {(field.validation?.options || []).map((opt: any) => (
                <FormControlLabel
                  key={typeof opt === 'string' ? opt : opt.value}
                  value={typeof opt === 'string' ? opt : opt.value}
                  control={<Radio />}
                  label={typeof opt === 'string' ? opt : opt.label}
                />
              ))}
            </RadioGroup>
            {errors[field.path] && <FormHelperText>{errors[field.path]}</FormHelperText>}
          </FormControl>
        );

      case 'number':
        return (
          <TextField
            key={field.path}
            {...commonProps}
            type="number"
            value={values[field.path] || ''}
            onChange={(e) => handleChange(field.path, parseFloat(e.target.value) || '')}
          />
        );

      case 'email':
        return (
          <TextField
            key={field.path}
            {...commonProps}
            type="email"
            value={values[field.path] || ''}
            onChange={(e) => handleChange(field.path, e.target.value)}
          />
        );

      case 'date':
        return (
          <TextField
            key={field.path}
            {...commonProps}
            type="date"
            InputLabelProps={{ shrink: true }}
            value={values[field.path] || ''}
            onChange={(e) => handleChange(field.path, e.target.value)}
          />
        );

      case 'file':
      case 'file_upload':
      case 'fileUpload':
      case 'attachment':
      case 'image_upload':
      case 'imageUpload':
      case 'image':
        return (
          <FormControl key={field.path} fullWidth error={!!errors[field.path]}>
            <FormLabel sx={{ mb: 1 }}>
              {field.label}
              {field.required && ' *'}
            </FormLabel>
            <Box
              sx={{
                border: '2px dashed',
                borderColor: errors[field.path] ? 'error.main' : 'divider',
                borderRadius: 1,
                p: 3,
                textAlign: 'center',
                bgcolor: 'background.default',
                cursor: 'pointer',
                transition: 'border-color 0.2s, background-color 0.2s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                },
              }}
              onClick={() => document.getElementById(\`file-input-\${field.path}\`)?.click()}
            >
              <input
                id={\`file-input-\${field.path}\`}
                type="file"
                accept={field.validation?.accept || '*/*'}
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleChange(field.path, file);
                  }
                }}
              />
              {values[field.path] ? (
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {values[field.path].name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(values[field.path].size / 1024).toFixed(1)} KB
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Click to upload or drag and drop
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {field.validation?.accept || 'Any file type'}
                  </Typography>
                </Box>
              )}
            </Box>
            {(errors[field.path] || field.helperText) && (
              <FormHelperText>{errors[field.path] || field.helperText}</FormHelperText>
            )}
          </FormControl>
        );

      default:
        return (
          <TextField
            key={field.path}
            {...commonProps}
            value={values[field.path] || ''}
            onChange={(e) => handleChange(field.path, e.target.value)}
          />
        );
    }
  };

  const fields = form.fieldConfigs || form.fields || [];

  return (
    <Paper sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
        {form.name}
      </Typography>
      {form.description && (
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          {form.description}
        </Typography>
      )}

      {submitError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {submitError}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {fields.filter((f: any) => f.included !== false).map(renderField)}

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={submitting}
          sx={{ mt: 2 }}
        >
          {submitting ? <CircularProgress size={24} /> : 'Submit'}
        </Button>
      </Box>
    </Paper>
  );
}
`;
}

function generateTypes(): string {
  return `export interface FormSubmission {
  _id?: string;
  formId: string;
  formSlug: string;
  data: Record<string, any>;
  status: 'submitted' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    userAgent?: string;
    ip?: string;
  };
}

export interface FormConfiguration {
  _id?: string;
  slug: string;
  name: string;
  description?: string;
  fieldConfigs?: FieldConfig[];
  fields?: FieldConfig[];
  theme?: any;
}

export interface FieldConfig {
  path: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  validation?: {
    options?: Array<string | { label: string; value: string }>;
    min?: number;
    max?: number;
    pattern?: string;
  };
  included?: boolean;
}
`;
}

function generateMiddleware(options: BundleOptions): string {
  return `import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Add any middleware logic here
  // For example, authentication for admin routes

  ${options.includeAdmin ? `
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Check for admin authentication
    const adminToken = request.cookies.get('admin_token');

    if (!adminToken && !request.nextUrl.pathname.startsWith('/admin/login')) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }
  ` : ''}

  return NextResponse.next();
}

export const config = {
  matcher: [
    ${options.includeAdmin ? "'/admin/:path*'," : ''}
    '/api/:path*',
  ],
};
`;
}

function generateGlobalStyles(): string {
  return `* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

html,
body {
  max-width: 100vw;
  overflow-x: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

a {
  color: inherit;
  text-decoration: none;
}
`;
}

// Admin panel generators
function generateAdminLayout(): string {
  return `'use client';

import { Box, AppBar, Toolbar, Typography, Button, Container } from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.push('/admin/login');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Admin Panel
          </Typography>
          <Button component={Link} href="/admin" sx={{ mr: 2 }}>Dashboard</Button>
          <Button component={Link} href="/admin/submissions" sx={{ mr: 2 }}>Submissions</Button>
          <Button onClick={handleLogout} color="inherit">Logout</Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {children}
      </Container>
    </Box>
  );
}
`;
}

function generateAdminPage(): string {
  return `'use client';

import { useEffect, useState } from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ forms: 0, submissions: 0 });

  useEffect(() => {
    fetch('/api/submissions?count=true')
      .then((res) => res.json())
      .then((data) => setStats((prev) => ({ ...prev, submissions: data.count || 0 })));
  }, []);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 600 }}>
        Dashboard
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" color="text.secondary">Total Submissions</Typography>
            <Typography variant="h3" sx={{ fontWeight: 600 }}>{stats.submissions}</Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
`;
}

function generateAdminSubmissionsPage(): string {
  return `'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
} from '@mui/material';

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/submissions')
      .then((res) => res.json())
      .then((data) => setSubmissions(data.submissions || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 600 }}>
        Submissions
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Form</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Data Preview</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {submissions.map((sub) => (
              <TableRow key={sub._id}>
                <TableCell>{sub.formSlug}</TableCell>
                <TableCell>
                  <Chip label={sub.status} size="small" color={sub.status === 'submitted' ? 'success' : 'default'} />
                </TableCell>
                <TableCell>{new Date(sub.createdAt).toLocaleString()}</TableCell>
                <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {JSON.stringify(sub.data).slice(0, 100)}...
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
`;
}

function generateAdminLoginPage(): string {
  return `'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Container,
} from '@mui/material';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push('/admin');
      } else {
        setError('Invalid password');
      }
    } catch {
      setError('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
          Admin Login
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            type="password"
            label="Admin Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 3 }}
          />
          <Button type="submit" variant="contained" fullWidth disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
`;
}

function generateAdminAuthRoute(): string {
  return `import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  if (password === ADMIN_PASSWORD) {
    const response = NextResponse.json({ success: true });
    response.cookies.set('admin_token', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
    });
    return response;
  }

  return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('admin_token');
  return response;
}
`;
}

function generateSubmissionsApiRoute(): string {
  return `import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get('count') === 'true';
    const formSlug = searchParams.get('form');
    const limit = parseInt(searchParams.get('limit') || '100');

    const db = await getDatabase();
    const collection = db.collection('form_submissions');

    const filter = formSlug ? { formSlug } : {};

    if (countOnly) {
      const count = await collection.countDocuments(filter);
      return NextResponse.json({ count });
    }

    const submissions = await collection
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}
`;
}

function generateWorkflowLib(): string {
  return `import { getDatabase } from './db';

export interface WorkflowTriggerEvent {
  trigger: string;
  formSlug?: string;
  submissionId?: string;
  data?: any;
}

export async function executeWorkflows(event: WorkflowTriggerEvent) {
  const db = await getDatabase();

  // Find workflows that match this trigger
  const workflows = await db.collection('workflows').find({
    'canvas.nodes': {
      $elemMatch: {
        type: 'form-trigger',
        'config.formSlug': event.formSlug,
      },
    },
    status: 'active',
  }).toArray();

  for (const workflow of workflows) {
    try {
      // Create execution record
      const execution = {
        workflowId: workflow._id,
        workflowSlug: workflow.slug,
        trigger: event,
        status: 'running',
        startedAt: new Date(),
        steps: [],
      };

      const { insertedId } = await db.collection('workflow_executions').insertOne(execution);

      // Execute workflow nodes (simplified)
      // In a full implementation, you'd process each node in sequence
      console.log(\`Executing workflow: \${workflow.name}\`);

      // Mark as completed
      await db.collection('workflow_executions').updateOne(
        { _id: insertedId },
        { $set: { status: 'completed', completedAt: new Date() } }
      );
    } catch (error) {
      console.error(\`Workflow execution failed: \${workflow.name}\`, error);
    }
  }
}
`;
}

function generateWorkflowApiRoute(): string {
  return `import { NextRequest, NextResponse } from 'next/server';
import { executeWorkflows } from '@/lib/workflows';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const event = await request.json();

    // Execute workflows asynchronously
    executeWorkflows(event).catch(console.error);

    return NextResponse.json({ success: true, message: 'Workflows triggered' });
  } catch (error) {
    console.error('Workflow trigger error:', error);
    return NextResponse.json(
      { error: 'Failed to trigger workflows' },
      { status: 500 }
    );
  }
}
`;
}

function generateSetupStatusRoute(): string {
  return `import { NextResponse } from 'next/server';
import { checkSetupStatus } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const status = await checkSetupStatus();
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json({
      configured: false,
      connected: false,
      initialized: false,
      formsCount: 0,
      error: error.message || 'Failed to check setup status',
    });
  }
}
`;
}

function generateSetupWizard(options: BundleOptions): string {
  const primaryColor = options.theme?.primaryColor || '#00ED64';
  return `'use client';

import { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Alert,
  CircularProgress,
  TextField,
  Link as MuiLink,
} from '@mui/material';
import {
  CheckCircle,
  Error as ErrorIcon,
  Settings,
  Storage,
  PlayArrow,
} from '@mui/icons-material';

interface SetupStatus {
  configured: boolean;
  connected: boolean;
  initialized: boolean;
  formsCount: number;
  error?: string;
}

interface SetupWizardProps {
  status: SetupStatus;
  onComplete: () => void;
}

const steps = [
  { label: 'Configure Environment', icon: <Settings /> },
  { label: 'Connect Database', icon: <Storage /> },
  { label: 'Initialize Data', icon: <PlayArrow /> },
];

export function SetupWizard({ status, onComplete }: SetupWizardProps) {
  const [initializing, setInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [initSuccess, setInitSuccess] = useState(false);

  // Determine current step based on status
  const getActiveStep = () => {
    if (!status.configured) return 0;
    if (!status.connected) return 1;
    if (!status.initialized) return 2;
    return 3; // All done
  };

  const activeStep = getActiveStep();

  const handleInitialize = async () => {
    setInitializing(true);
    setInitError(null);

    try {
      const response = await fetch('/api/init', { method: 'POST' });
      const data = await response.json();

      if (response.ok && data.success) {
        setInitSuccess(true);
        // Wait a moment then trigger completion
        setTimeout(() => {
          onComplete();
        }, 1500);
      } else {
        setInitError(data.error || 'Failed to initialize database');
      }
    } catch (error: any) {
      setInitError(error.message || 'Failed to initialize database');
    } finally {
      setInitializing(false);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                MongoDB URI Not Configured
              </Typography>
              <Typography variant="body2">
                You need to set up your environment variables before the app can connect to the database.
              </Typography>
            </Alert>

            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Setup Instructions:
            </Typography>

            <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                1. Copy the example environment file:
              </Typography>
              <Box sx={{ bgcolor: 'grey.900', color: 'grey.100', p: 1.5, borderRadius: 1, mb: 2 }}>
                <code>cp .env.example .env.local</code>
              </Box>

              <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                2. Edit .env.local and add your MongoDB connection string:
              </Typography>
              <Box sx={{ bgcolor: 'grey.900', color: 'grey.100', p: 1.5, borderRadius: 1, mb: 2 }}>
                <code>MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/dbname</code>
              </Box>

              <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                3. Restart your development server
              </Typography>
            </Paper>

            <Alert severity="info">
              <Typography variant="body2">
                Need a MongoDB database?{' '}
                <MuiLink href="https://www.mongodb.com/atlas" target="_blank" rel="noopener">
                  Get a free MongoDB Atlas cluster
                </MuiLink>
              </Typography>
            </Alert>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Alert severity="error" sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Database Connection Failed
              </Typography>
              <Typography variant="body2">
                {status.error || 'Unable to connect to MongoDB. Please check your connection string.'}
              </Typography>
            </Alert>

            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Troubleshooting:
            </Typography>

            <Box component="ul" sx={{ pl: 2 }}>
              <li>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Verify your MONGODB_URI is correct in .env.local
                </Typography>
              </li>
              <li>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Check that your IP address is whitelisted in MongoDB Atlas
                </Typography>
              </li>
              <li>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Ensure the database user has read/write permissions
                </Typography>
              </li>
              <li>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Make sure there are no typos in the connection string
                </Typography>
              </li>
            </Box>

            <Button
              variant="outlined"
              onClick={() => window.location.reload()}
              sx={{ mt: 2 }}
            >
              Retry Connection
            </Button>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Database Connected!
              </Typography>
              <Typography variant="body2">
                Your MongoDB connection is working. Now let's initialize the database with your forms.
              </Typography>
            </Alert>

            {initError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {initError}
              </Alert>
            )}

            {initSuccess ? (
              <Alert severity="success" sx={{ mb: 3 }} icon={<CheckCircle />}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Database initialized successfully!
                </Typography>
                <Typography variant="body2">
                  Redirecting to your forms...
                </Typography>
              </Alert>
            ) : (
              <Box>
                <Typography variant="body2" sx={{ mb: 3 }}>
                  Click the button below to seed the database with your form configurations.
                  This will create the necessary collections and indexes.
                </Typography>

                <Button
                  variant="contained"
                  size="large"
                  onClick={handleInitialize}
                  disabled={initializing}
                  startIcon={initializing ? <CircularProgress size={20} /> : <PlayArrow />}
                  sx={{
                    bgcolor: '${primaryColor}',
                    '&:hover': { bgcolor: '${primaryColor}', filter: 'brightness(0.9)' },
                  }}
                >
                  {initializing ? 'Initializing...' : 'Initialize Database'}
                </Button>
              </Box>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Welcome to ${options.projectName}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Let's get your application set up
          </Typography>
        </Box>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((step, index) => (
            <Step key={step.label} completed={index < activeStep}>
              <StepLabel
                StepIconProps={{
                  icon: index < activeStep ? <CheckCircle color="success" /> : step.icon,
                }}
              >
                {step.label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStepContent()}
      </Paper>
    </Container>
  );
}
`;
}

function generateNetPadBadge(): string {
  return `'use client';

import { Box, Typography, Link } from '@mui/material';
import Image from 'next/image';

interface NetPadBadgeProps {
  variant?: 'default' | 'compact';
}

/**
 * "Made with NetPad" branding badge
 * Links to https://netpad.io
 */
export function NetPadBadge({ variant = 'default' }: NetPadBadgeProps) {
  if (variant === 'compact') {
    return (
      <Link
        href="https://netpad.io"
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          textDecoration: 'none',
          color: 'text.secondary',
          opacity: 0.7,
          transition: 'opacity 0.2s',
          '&:hover': {
            opacity: 1,
          },
        }}
      >
        <Image
          src="/netpad-logo.svg"
          alt="NetPad"
          width={16}
          height={16}
          style={{ opacity: 0.8 }}
        />
        <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
          NetPad
        </Typography>
      </Link>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        py: 3,
        mt: 4,
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Link
        href="https://netpad.io"
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1,
          borderRadius: 2,
          textDecoration: 'none',
          color: 'text.secondary',
          bgcolor: 'rgba(0, 0, 0, 0.02)',
          border: '1px solid',
          borderColor: 'divider',
          transition: 'all 0.2s',
          '&:hover': {
            bgcolor: 'rgba(0, 237, 100, 0.05)',
            borderColor: 'rgba(0, 237, 100, 0.3)',
            color: 'text.primary',
          },
        }}
      >
        <Image
          src="/netpad-logo.svg"
          alt="NetPad"
          width={20}
          height={20}
        />
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          Made with <span style={{ color: '#e91e63' }}>♥</span> using NetPad
        </Typography>
      </Link>
    </Box>
  );
}
`;
}
