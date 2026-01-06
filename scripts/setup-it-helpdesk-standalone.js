#!/usr/bin/env node

/**
 * Setup Script for IT Help Desk Standalone Application
 * 
 * This script creates a standalone, deployable version of the IT Help Desk example
 * from the examples/it-helpdesk directory. It prepares the application for testing
 * and deployment by:
 * 
 * 1. Copying the example to a new directory
 * 2. Updating dependencies to use published packages
 * 3. Creating environment configuration files
 * 4. Setting up deployment configuration
 * 5. Installing dependencies
 * 
 * Usage:
 *   node scripts/setup-it-helpdesk-standalone.js [app-name]
 * 
 * Example:
 *   node scripts/setup-it-helpdesk-standalone.js my-it-helpdesk
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const SOURCE_DIR = path.join(__dirname, '../examples/it-helpdesk');
const TARGET_BASE_DIR = '/Users/michael.lynn/code';
const DEFAULT_APP_NAME = 'it-helpdesk-standalone';

// Get app name from command line or use default
const appName = process.argv[2] || DEFAULT_APP_NAME;
const targetDir = path.join(TARGET_BASE_DIR, appName);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ Error: ${message}`, 'red');
  process.exit(1);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function step(message) {
  log(`\n📦 ${message}`, 'cyan');
}

// Check if source directory exists
if (!fs.existsSync(SOURCE_DIR)) {
  error(`Source directory not found: ${SOURCE_DIR}`);
}

// Check if target directory already exists
if (fs.existsSync(targetDir)) {
  error(`Target directory already exists: ${targetDir}\nPlease choose a different name or remove the existing directory.`);
}

// Check if target base directory exists
if (!fs.existsSync(TARGET_BASE_DIR)) {
  error(`Target base directory does not exist: ${TARGET_BASE_DIR}`);
}

step('Setting up IT Help Desk standalone application...');

// Step 1: Copy files
step('Copying files...');
try {
  execSync(`cp -r "${SOURCE_DIR}" "${targetDir}"`, { stdio: 'inherit' });
  success('Files copied');
} catch (err) {
  error(`Failed to copy files: ${err.message}`);
}

// Step 2: Remove unnecessary files
step('Cleaning up...');
const filesToRemove = [
  'node_modules',
  'package-lock.json',
  'tsconfig.tsbuildinfo',
  '.next',
  'NETPAD_REVIEW_REPORT.md',
];

filesToRemove.forEach(file => {
  const filePath = path.join(targetDir, file);
  if (fs.existsSync(filePath)) {
    try {
      fs.rmSync(filePath, { recursive: true, force: true });
      info(`Removed ${file}`);
    } catch (err) {
      // Ignore errors for files that don't exist
    }
  }
});

// Step 3: Update package.json
step('Updating package.json...');
const packageJsonPath = path.join(targetDir, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Update package name
packageJson.name = appName;
packageJson.version = '1.0.0';

// Update @netpad/forms to use published version instead of local file
if (packageJson.dependencies['@netpad/forms']) {
  packageJson.dependencies['@netpad/forms'] = '^0.2.0';
  success('Updated @netpad/forms to use published version');
}

// Add repository info if not present
if (!packageJson.repository) {
  packageJson.repository = {
    type: 'git',
    url: `https://github.com/mrlynn/netpad-v3`,
  };
}

// Add scripts for deployment
if (!packageJson.scripts.postinstall) {
  packageJson.scripts.postinstall = 'echo "Setup complete!"';
}

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
success('package.json updated');

// Step 4: Create .env.local template
step('Creating environment configuration...');
const envTemplate = `# NetPad Forms Configuration
# Copy this file to .env.local and update with your values

# Optional: NetPad API Configuration (if using NetPad API for submissions)
# NEXT_PUBLIC_NETPAD_URL=https://your-netpad-instance.com
# NETPAD_API_KEY=your-api-key-here

# Optional: MongoDB Connection (if storing submissions directly)
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# Optional: Custom API endpoint for form submissions
# NEXT_PUBLIC_API_URL=http://localhost:3000/api
`;

const envPath = path.join(targetDir, '.env.example');
fs.writeFileSync(envPath, envTemplate);
success('Created .env.example');

// Step 5: Create .gitignore
step('Creating .gitignore...');
const gitignore = `# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Next.js
.next/
out/
build

# Production
dist

# Misc
.DS_Store
*.pem
Thumbs.db

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
*.log

# Local env files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts

# IDE
.idea/
.vscode/
*.swp
*.swo
*~
`;

const gitignorePath = path.join(targetDir, '.gitignore');
fs.writeFileSync(gitignorePath, gitignore);
success('Created .gitignore');

// Step 6: Create Vercel configuration
step('Creating Vercel configuration...');
const vercelJson = {
  buildCommand: 'npm run build',
  devCommand: 'npm run dev',
  installCommand: 'npm install',
  framework: 'nextjs',
  outputDirectory: '.next',
};

const vercelJsonPath = path.join(targetDir, 'vercel.json');
fs.writeFileSync(vercelJsonPath, JSON.stringify(vercelJson, null, 2) + '\n');
success('Created vercel.json');

// Step 7: Verify search page exists
step('Verifying search functionality...');
const searchPagePath = path.join(targetDir, 'src/app/search-tickets/page.tsx');
if (!fs.existsSync(searchPagePath)) {
  info('Search page not found - this is expected if search functionality was added after script creation');
} else {
  success('Search page found');
}

// Step 8: Update README for standalone use
step('Updating README...');
const readmePath = path.join(targetDir, 'README.md');
let readme = fs.readFileSync(readmePath, 'utf8');

// Add standalone setup section at the beginning
const standaloneSection = `## Standalone Setup

This is a standalone, deployable version of the IT Help Desk example.

### Quick Start

\`\`\`bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your configuration (optional)

# Run development server
npm run dev
\`\`\`

Open [http://localhost:3003](http://localhost:3003) to see the application.

### Deployment

#### Deploy to Vercel

1. Push this directory to a Git repository
2. Import the repository in [Vercel](https://vercel.com)
3. Vercel will automatically detect Next.js and deploy

#### Deploy to Other Platforms

This is a standard Next.js application and can be deployed to any platform that supports Next.js:
- Vercel (recommended)
- Netlify
- AWS Amplify
- Railway
- Render
- Self-hosted with Node.js

### Configuration

Edit \`.env.local\` to configure:
- NetPad API connection (optional)
- MongoDB connection (optional)
- Custom API endpoints (optional)

---

`;

readme = standaloneSection + readme;
fs.writeFileSync(readmePath, readme);
success('README updated');

// Step 9: Create setup instructions file
step('Creating setup instructions...');
const setupInstructions = `# Setup Instructions

## Initial Setup

1. **Install Dependencies**
   \`\`\`bash
   npm install
   \`\`\`

2. **Configure Environment** (Optional)
   \`\`\`bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   \`\`\`

3. **Run Development Server**
   \`\`\`bash
   npm run dev
   \`\`\`

4. **Open in Browser**
   Navigate to http://localhost:3003

## Customization

### Update Form Configuration

Edit \`templates/form.ts\` to customize the form fields, validation, and styling.

### Update Workflow Configuration

Edit \`templates/workflow.ts\` to customize the workflow logic (if using NetPad workflows).

### Customize Styling

Edit \`src/app/layout.tsx\` to customize the Material-UI theme.

### Add Custom Submission Handler

Edit \`src/app/submit-ticket/page.tsx\` to add custom submission logic:

\`\`\`typescript
const handleSubmit = async (data: Record<string, unknown>) => {
  // Your custom submission logic here
  // e.g., send to your API, save to database, etc.
  
  console.log('Form submitted:', data);
  
  // Redirect to success page
  router.push('/success');
};
\`\`\`

## Deployment

### Vercel (Recommended)

1. Push to Git repository
2. Import in Vercel dashboard
3. Deploy automatically

### Other Platforms

This is a standard Next.js app. Follow your platform's Next.js deployment guide.

## Troubleshooting

### Port Already in Use

If port 3003 is in use, change it in \`package.json\`:
\`\`\`json
"dev": "next dev -p 3004"
\`\`\`

### Build Errors

Make sure all dependencies are installed:
\`\`\`bash
rm -rf node_modules package-lock.json
npm install
\`\`\`

### Form Not Rendering

Check that \`@netpad/forms\` is installed:
\`\`\`bash
npm list @netpad/forms
\`\`\`

If missing, install it:
\`\`\`bash
npm install @netpad/forms
\`\`\`
`;

const setupPath = path.join(targetDir, 'SETUP.md');
fs.writeFileSync(setupPath, setupInstructions);
success('Created SETUP.md');

// Step 10: Install dependencies
step('Installing dependencies...');
try {
  process.chdir(targetDir);
  info('Running npm install (this may take a minute)...');
  execSync('npm install', { stdio: 'inherit' });
  success('Dependencies installed');
} catch (err) {
  error(`Failed to install dependencies: ${err.message}\nYou can run 'npm install' manually in the target directory.`);
}

// Summary
log('\n' + '='.repeat(60), 'cyan');
log('✨ Setup Complete!', 'green');
log('='.repeat(60), 'cyan');
log(`\n📁 Application created at: ${targetDir}`, 'blue');
log('\n📋 Next Steps:', 'yellow');
log('  1. cd ' + targetDir, 'reset');
log('  2. cp .env.example .env.local (optional)', 'reset');
log('  3. npm run dev', 'reset');
log('  4. Open http://localhost:3003', 'reset');
log('\n📚 Documentation:', 'yellow');
log('  - README.md - Overview and features', 'reset');
log('  - SETUP.md - Detailed setup instructions', 'reset');
log('\n🚀 Ready for deployment!', 'green');
log('='.repeat(60) + '\n', 'cyan');
