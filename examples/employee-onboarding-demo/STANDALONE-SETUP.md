# Setting Up as a Standalone Repository

This guide explains how to publish the Employee Onboarding Demo as a standalone repository that other developers can use as a template.

## Overview

The goal is to:
1. Publish `@netpad/forms` to npm
2. Create a standalone GitHub repository for this example
3. Update dependencies to use the published npm package

## Step 1: Publish @netpad/forms First

Before the example can work standalone, `@netpad/forms` must be published to npm.

```bash
# From the netpad-3 repo root
cd packages/forms

# Build and test
npm run build
npm test

# Publish (requires npm org access)
npm publish --access public
```

See [packages/forms/PUBLISHING.md](../../packages/forms/PUBLISHING.md) for detailed instructions.

## Step 2: Prepare for Standalone Repository

### Update package.json

Change the `@netpad/forms` dependency from local to npm:

```json
{
  "dependencies": {
    "@netpad/forms": "^0.1.0"  // Use published version
  }
}
```

### Files to Include

Copy these files to the new repository:

```
employee-onboarding-demo/
├── src/
│   └── app/
│       ├── layout.tsx
│       ├── page.tsx
│       ├── onboarding/
│       │   └── page.tsx
│       ├── success/
│       │   └── page.tsx
│       └── why-netpad/
│           └── page.tsx
├── public/
│   └── (any static assets)
├── package.json
├── tsconfig.json
├── next.config.js (if exists)
├── README.md
├── LICENSE
└── .gitignore
```

### Create .gitignore

```gitignore
# Dependencies
node_modules/
.pnp/
.pnp.js

# Next.js
.next/
out/

# Build
dist/

# Environment
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
```

## Step 3: Create Standalone Repository

### Option A: GitHub Template Repository

1. Create new repo: `github.com/mongodb/netpad-employee-onboarding-demo`
2. Copy files from this directory
3. Update README with standalone instructions
4. Mark as "Template repository" in Settings

### Option B: Using GitHub CLI

```bash
# Create new directory
mkdir netpad-employee-onboarding-demo
cd netpad-employee-onboarding-demo

# Initialize git
git init

# Copy files (from this directory)
cp -r /path/to/examples/employee-onboarding-demo/* .

# Update package.json
sed -i '' 's/"@netpad\/forms": "file:..\/..\/packages\/forms"/"@netpad\/forms": "^0.1.0"/g' package.json

# Remove private flag
sed -i '' 's/"private": true,//g' package.json

# Create repo on GitHub
gh repo create mongodb/netpad-employee-onboarding-demo --public --source=. --push
```

## Step 4: Update Standalone package.json

Create a production-ready package.json:

```json
{
  "name": "netpad-employee-onboarding-demo",
  "version": "1.0.0",
  "description": "Employee Onboarding Portal demo built with @netpad/forms",
  "repository": {
    "type": "git",
    "url": "https://github.com/mongodb/netpad-employee-onboarding-demo.git"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@emotion/react": "^11.11.0",
    "@emotion/styled": "^11.11.0",
    "@mui/icons-material": "^5.15.0",
    "@mui/material": "^5.15.0",
    "@netpad/forms": "^0.1.0",
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.3.0"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "license": "Apache-2.0"
}
```

## Step 5: Update README for Standalone Repo

Create a standalone-focused README:

```markdown
# Employee Onboarding Portal

> Built with [@netpad/forms](https://npmjs.com/package/@netpad/forms) — A complete onboarding wizard in under 300 lines of code.

## Quick Start

\`\`\`bash
# Clone the repo
git clone https://github.com/mongodb/netpad-employee-onboarding-demo.git
cd netpad-employee-onboarding-demo

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
\`\`\`

## What's Included

- **3-page wizard** with progress indicator
- **Conditional logic** — fields appear based on user input
- **Nested data** — structured JSON output
- **Validation** — required fields, email format, etc.
- **Responsive design** — works on mobile and desktop

## How It Works

The entire form is defined declaratively:

\`\`\`tsx
import { FormRenderer, FormConfiguration } from '@netpad/forms';

const config: FormConfiguration = {
  name: 'Employee Onboarding',
  fieldConfigs: [...],
  multiPage: {
    enabled: true,
    pages: [...]
  }
};

<FormRenderer config={config} onSubmit={handleSubmit} />
\`\`\`

See [src/app/onboarding/page.tsx](src/app/onboarding/page.tsx) for the complete implementation.

## Customization

### Add/Remove Fields

Edit the `fieldConfigs` array in `src/app/onboarding/page.tsx`.

### Add Pages

Add entries to the `multiPage.pages` array.

### Styling

Modify the theme in `src/app/layout.tsx`.

## Learn More

- [@netpad/forms Documentation](https://github.com/mongodb/netpad/tree/main/packages/forms)
- [NetPad Platform](https://netpad.io)
- [Why NetPad?](https://netpad.io/why-netpad)

## License

Apache-2.0
```

## Automation Script

Create a script to automate the standalone extraction:

```bash
#!/bin/bash
# extract-standalone.sh

set -e

DEST_DIR="$1"
VERSION="${2:-0.1.0}"

if [ -z "$DEST_DIR" ]; then
  echo "Usage: ./extract-standalone.sh <destination-directory> [version]"
  exit 1
fi

# Create destination
mkdir -p "$DEST_DIR"

# Copy source files
cp -r src "$DEST_DIR/"
cp -r public "$DEST_DIR/" 2>/dev/null || true
cp tsconfig.json "$DEST_DIR/"
cp next.config.* "$DEST_DIR/" 2>/dev/null || true
cp README.md "$DEST_DIR/"

# Create package.json with npm dependency
cat > "$DEST_DIR/package.json" << EOF
{
  "name": "netpad-employee-onboarding-demo",
  "version": "1.0.0",
  "description": "Employee Onboarding Portal demo built with @netpad/forms",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@emotion/react": "^11.11.0",
    "@emotion/styled": "^11.11.0",
    "@mui/icons-material": "^5.15.0",
    "@mui/material": "^5.15.0",
    "@netpad/forms": "^$VERSION",
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.3.0"
  },
  "license": "Apache-2.0"
}
EOF

# Create .gitignore
cat > "$DEST_DIR/.gitignore" << 'EOF'
node_modules/
.next/
out/
dist/
.env*
.DS_Store
EOF

echo "Standalone demo extracted to $DEST_DIR"
echo "Next steps:"
echo "  cd $DEST_DIR"
echo "  npm install"
echo "  npm run dev"
```

## Deployment

The standalone app can be deployed to:

### Vercel

```bash
npm i -g vercel
vercel
```

### Netlify

```bash
npm run build
# Upload .next folder
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```
