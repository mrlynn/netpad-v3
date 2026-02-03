# NetPad

Build and publish MongoDB-connected applications with forms, workflows, data management, and AI-powered conversational experiences.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmrlynn%2Fnetpad-v3&env=MONGODB_URI,SESSION_SECRET,VAULT_ENCRYPTION_KEY&envDescription=Required%20environment%20variables%20for%20NetPad&envLink=https%3A%2F%2Fgithub.com%2Fmrlynn%2Fnetpad-v3%2Fblob%2Fmain%2Fdocs%2FDEPLOY.md&project-name=my-netpad&repository-name=my-netpad&demo-title=NetPad&demo-description=MongoDB-connected%20forms%2C%20workflows%2C%20and%20data%20explorer&demo-url=https%3A%2F%2Fnetpad.io)

## Overview

**NetPad** is an open-source, enterprise-grade platform that transforms how organizations build MongoDB-connected applications. The platform combines four core pillars—**Forms**, **Workflows**, **Data Management**, and **AI/Conversational Experiences**—to deliver a complete solution from database to production in minutes.

Visit [https://netpad.io](https://netpad.io) to get started.

## Core Capabilities

### 🔷 Forms
- **Visual Form Builder** - Drag-and-drop WYSIWYG editor with 30+ field types
- **Multi-Page Wizards** - Step-based forms with progress indicators
- **Template Gallery** - 25+ pre-built templates across 10 categories (business, events, feedback, healthcare, etc.)
- **Search Forms** - Query MongoDB collections with configurable operators (equals, contains, between, in, regex, etc.)
- **Conditional Logic** - Show/hide fields based on other field values
- **Computed Fields** - Formula-based calculations with expression engine
- **Field Encryption** - MongoDB Queryable Encryption for sensitive data
- **Form Analytics** - Response trends, completion funnels, and field-level statistics
- **Publishing** - One-click publish with custom slugs, embeddable forms, and access control

### ⚙️ Workflows & Automation
- **Visual Workflow Editor** - ReactFlow-powered canvas with 25+ node types
- **Multiple Triggers** - Form submissions, webhooks, schedules (cron), manual execution
- **Node Categories** - Logic (if/else, switch, filter, loop), Data (transform, code), MongoDB (query, write), Integrations (HTTP, email, Slack, Google Sheets)
- **Execution Engine** - Queue-based processing with retry logic, error handling, and timeout management
- **Workflow Templates** - 11 pre-built templates for common automation patterns

### 💾 Data Management
- **Data Browser** - Navigate databases, collections, and documents with visual query builder
- **Connection Vault** - Encrypted credential storage (AES-256-GCM) for MongoDB connections
- **Atlas Integration** - Auto-provisioning, cluster monitoring, connection string management
- **Import/Export** - CSV/JSON import with schema inference, export collections or query results
- **Schema Analysis** - Automatic schema detection and validation

### 🤖 AI & Conversational Experiences
- **Conversational Forms** - AI-powered natural language data collection with configurable personas
- **Knowledge-Guided Forms (RAG)** - Document-grounded conversations using uploaded knowledge bases
- **Vector Search** - MongoDB Atlas Vector Search for semantic document retrieval
- **Source Citations** - Traceable references in AI responses with document links
- **Template Admin** - Built-in templates (IT Helpdesk, Customer Feedback, Patient Intake) + custom template creation
- **15+ AI Agents** - Form generation, optimization, compliance audit, translation, insights, and more

## Platform Features

### 📦 Applications-First Model
- **Applications** - First-class entities grouping related forms, workflows, and connections
- **Versioned Releases** - Semantic versioning (X.Y.Z) with immutable snapshots
- **Application Contracts** - Define public API surface with breaking change detection
- **Component Protection** - Lock forms/workflows to prevent accidental modifications
- **Application Permissions (RBAC)** - Fine-grained access control (Owner, Editor, Analyst, Viewer)

### 🛒 Marketplace & npm Integration
- **Application Marketplace** - Browse, publish, and install applications from the community
- **npm Package Support** - Publish and install applications directly from npm registry
- **Registry Sync** - Automatic discovery and syncing of NetPad packages
- **Official vs Community** - Designation for NetPad-verified vs user-created applications
- **Admin Review Workflow** - Platform admins review and approve/reject submissions

### 🏢 Organization & Multi-Tenancy
- **Organizations** - Team member management with roles (Owner, Admin, Member, Viewer)
- **Projects** - Environment-based organization (dev, staging, prod)
- **Shared Resources** - Connections, templates, and applications shared across teams
- **RBAC** - Three-tier permission system (organization, application, form levels)

### 🔒 Security & Compliance
- **Encryption** - Connection strings (AES-256-GCM), field-level (Queryable Encryption), transport (TLS 1.3)
- **Data Classification** - Sensitivity levels (Public, Internal, Confidential, Restricted, Secret)
- **Compliance** - HIPAA-ready field encryption, PCI-DSS handling, GDPR data retention, SOC2 audit logging
- **Audit Logging** - Comprehensive logging of user actions, resource changes, and access events
- **Bot Protection** - Honeypot fields, timing validation, Turnstile CAPTCHA

### 🚀 Deployment & Infrastructure
- **One-Click Deployment** - Deploy to Vercel with auto-provisioned databases
- **Self-Hosted Mode** - Run NetPad privately with Atlas Local for RAG without M10 upgrade
- **Feature Gates** - Two-tier access control (subscription + infrastructure requirements)
- **Cloud & Self-Hosted** - Flexible deployment options with different feature availability

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

React component library for rendering sophisticated multi-page form wizards with validation, conditional logic, and nested data.

```bash
npm install @netpad/forms
```

**Features:**
- 28+ field types
- Multi-page wizard support
- Conditional logic engine
- TypeScript support

### @netpad/workflows

Workflow API client for triggering and monitoring NetPad workflow executions programmatically.

```bash
npm install @netpad/workflows
```

**Features:**
- Execution management
- Type-safe TypeScript API
- Status polling utilities

### @netpad/mcp-server

MCP (Model Context Protocol) server for AI-assisted NetPad development.

```bash
npm install @netpad/mcp-server
```

**Features:**
- 75+ tools across 7 categories (Forms, Applications, Workflows, Templates, Data, etc.)
- Validated TypeScript output with inline types
- Compatible with Claude Desktop, Cursor, and other MCP clients

### @netpad/cli

Command-line tool for managing NetPad applications and packages.

```bash
npm install -g @netpad/cli
# or
npx @netpad/cli
```

**Features:**
- Install packages from npm registry
- Search for NetPad packages
- Create new application packages
- Authenticate with NetPad API

## API & Integration

NetPad provides **165+ API endpoints** for comprehensive programmatic access:

- **Forms API** - Form CRUD, submissions, analytics (40+ endpoints)
- **Workflows API** - Workflow management, execution (15+ endpoints)
- **Applications API** - Application management, releases, permissions (10+ endpoints)
- **Marketplace API** - Browse, publish, install applications (12+ endpoints)
- **Data API** - MongoDB operations, queries, aggregations (10+ endpoints)
- **AI API** - AI agents and generation (12+ endpoints)
- **RAG API** - Document management, retrieval (5+ endpoints)

See [API Documentation](docs/API.md) for complete reference.

## Documentation

- [Deployment Guide](docs/DEPLOY.md) - Deploy your own instance
- [Architecture](docs/ARCHITECTURE-PRODUCTION.md) - Technical architecture overview
- [API Documentation](docs/API.md) - REST API reference
- [Documentation Guide](DOCUMENTATION_GUIDE.md) - Full documentation structure

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT
