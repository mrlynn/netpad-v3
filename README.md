# NetPad

Build and publish MongoDB-connected data forms and workflows.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmrlynn%2Fnetpad-v3&env=MONGODB_URI,SESSION_SECRET,VAULT_ENCRYPTION_KEY&envDescription=Required%20environment%20variables%20for%20NetPad&envLink=https%3A%2F%2Fgithub.com%2Fmrlynn%2Fnetpad-v3%2Fblob%2Fmain%2Fdocs%2FDEPLOY.md&project-name=my-netpad&repository-name=my-netpad&demo-title=NetPad&demo-description=MongoDB-connected%20forms%2C%20workflows%2C%20and%20data%20explorer&demo-url=https%3A%2F%2Fnetpad.io)

## Overview

NetPad is a comprehensive platform for creating MongoDB-connected data entry forms, search interfaces, workflows, and data management applications—all without writing code.

Visit [https://netpad.io](https://netpad.io) to get started.

## Features

- **Form Builder** - Visual drag-and-drop form designer with 30+ field types
- **Workflow Engine** - Automate data processing with visual workflow builder
- **Data Explorer** - Browse, search, and manage your MongoDB collections
- **Multi-Tenant** - Organizations, teams, and role-based access control
- **AI-Powered** - Generate forms and workflows from natural language descriptions
- **Enterprise Security** - Field-level encryption, secure connection vault, bot protection
- **Self-Hostable** - Deploy your own instance to Vercel in minutes

## Quick Start

### Deploy Your Own Instance

The fastest way to get started is to deploy your own NetPad instance:

1. Click the "Deploy with Vercel" button above
2. Connect your MongoDB Atlas database ([get a free cluster](https://www.mongodb.com/cloud/atlas/register))
3. Configure your environment variables
4. Start building forms and workflows

For detailed deployment instructions, see the [Deployment Guide](docs/DEPLOY.md).

### Use the Hosted Service

Visit [netpad.io](https://netpad.io) to use the hosted version with a free MongoDB Atlas cluster included.

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Environment Setup

Copy `.env.example` to `.env.local` and configure your environment variables:

```bash
cp .env.example .env.local
```

Required variables:
- `MONGODB_URI` - MongoDB connection string
- `SESSION_SECRET` - 32+ character secret for sessions
- `VAULT_ENCRYPTION_KEY` - Base64 key for vault encryption

See [docs/DEPLOY.md](docs/DEPLOY.md) for the complete list of environment variables.

## NPM Packages

NetPad includes reusable packages you can use in your own applications:

### @netpad/forms

Render sophisticated multi-page form wizards with validation, conditional logic, and nested data.

```bash
npm install @netpad/forms
```

### @netpad/workflows

Trigger and monitor NetPad workflow executions programmatically.

```bash
npm install @netpad/workflows
```

## Documentation

- [Deployment Guide](docs/DEPLOY.md) - Deploy your own instance
- [Architecture](docs/ARCHITECTURE-PRODUCTION.md) - Technical architecture overview
- [API Documentation](docs/API.md) - REST API reference

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT
