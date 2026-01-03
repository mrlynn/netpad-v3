# NetPad: Capabilities & Strategy

**A comprehensive platform for MongoDB-connected data collection, automation, and management—all without code.**

---

## Executive Summary

**NetPad** is an open-source platform that empowers developers, data teams, and organizations to build MongoDB-connected applications without writing backend code. Built around three core pillars—**Forms**, **Workflows**, and **Data Management**—NetPad bridges the gap between your MongoDB database and your users with intuitive, visual interfaces.

### Core Value Proposition

**From database to production in minutes, not weeks.**

NetPad eliminates the need to build custom backend APIs, form handling logic, workflow orchestration, and data management UIs. Instead, you get:

- **Visual builders** for forms and workflows
- **Direct MongoDB integration** with no backend code required
- **Enterprise-ready features** including security, billing, and multi-tenancy
- **Developer-friendly APIs** and packages for programmatic access
- **Open-source foundation** with full data ownership

---

## Three Core Pillars

NetPad's architecture is built around three interconnected capabilities:

```
┌─────────────────────────────────────────────────────────────┐
│                         NetPad Platform                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │    Forms     │  │  Workflows   │  │ Data Mgmt    │     │
│  │              │  │              │  │              │     │
│  │ • Builder    │  │ • Automation │  │ • Browser    │     │
│  │ • Collection │  │ • Orchestrat │  │ • Connections│     │
│  │ • Analytics  │  │ • Integration│  │ • Storage    │     │
│  │              │  │              │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            │                                │
│                    MongoDB Integration                      │
│                  (Atlas, Self-hosted, Cloud)                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Pillar 1: Forms

**Purpose**: Collect, validate, and store data through beautiful, customizable forms.

### Core Capabilities

#### Visual Form Builder
- **WYSIWYG Editor**: Drag-and-drop interface with live preview
- **30+ Field Types**: Text, email, phone, date, rating, file upload, signature, matrix, and more
- **Multi-Page Wizards**: Step-based progression with progress tracking
- **Conditional Logic**: Show/hide fields based on user input
- **Computed Fields**: Formula-based calculations with field references
- **Validation Rules**: Required fields, min/max length, pattern matching, custom expressions
- **Form Theming**: Customizable colors, backgrounds, and branding
- **Keyboard Shortcuts**: Power user productivity features
- **Version History**: Track changes and revert to previous versions
- **Draft Auto-Save**: Never lose work with automatic saving

#### Schema Integration
- **One-Click Import**: Auto-generate forms from MongoDB collection schemas
- **Nested Objects**: Support for complex document structures using dot notation
- **Array Fields**: Dynamic lists with add/remove functionality
- **Lookup Fields**: Reference data from related collections with autocomplete

#### Data Collection & Distribution
- **One-Click Publish**: Share forms with public URLs instantly
- **Embeddable Forms**: Generate embed code for websites
- **Response Collection**: Store submissions directly in MongoDB collections
- **URL Pre-fill**: Auto-populate forms with query parameters
- **Custom Redirects**: Post-submit redirect with data passthrough

#### Analytics & Insights
- **Response Analytics**: Charts, trends, and field-level insights
- **Completion Rates**: Track form performance and user behavior
- **Export Options**: Download data as CSV or JSON

#### Enterprise Features
- **Field-Level Encryption**: MongoDB Queryable Encryption for sensitive data
- **Access Control**: Public, authenticated, or restricted forms
- **Bot Protection**: Turnstile CAPTCHA integration
- **Webhooks**: POST form data to external services on submission
- **API Access**: Full REST API for programmatic form management

### Developer Package: @netpad/forms

For developers who want to embed forms in their applications:

```bash
npm install @netpad/forms
```

**Features**:
- React component library (`FormRenderer`)
- Type-safe TypeScript API
- Standalone or NetPad Platform integration
- 28+ field types out of the box
- Multi-page wizard support
- Conditional logic and computed fields

**Example Projects**:
- Employee Onboarding Demo (complete 3-page wizard in <300 lines)

### Strategy: Forms Pillar

**Positioning**: The fastest way to build MongoDB-connected data collection interfaces.

**Target Use Cases**:
1. Customer-facing forms (registration, surveys, feedback)
2. Internal data entry portals (admin interfaces, data collection)
3. Rapid prototyping (MVPs and proof-of-concepts)
4. Data migration (CSV/Excel import with validation)

**Key Differentiators**:
- Direct MongoDB integration (no backend code)
- Schema-aware form generation
- Enterprise security features (encryption, access control)
- Developer-friendly (npm package + API)

---

## Pillar 2: Workflows & Automation

**Purpose**: Automate business processes with visual workflow orchestration.

### Core Capabilities

#### Visual Workflow Builder
- **Drag-and-Drop Canvas**: ReactFlow-based visual editor
- **Node Library**: Pre-built nodes for common operations
- **Connection Mapping**: Visual data flow between nodes
- **Variable Substitution**: Dynamic values throughout workflow execution
- **Error Handling**: Configurable retry policies and failure modes
- **Execution Monitoring**: Real-time status tracking
- **Execution History**: View past workflow runs with detailed logs

#### Trigger Types
- **Form Trigger**: Start workflow when a form is submitted
- **Webhook Trigger**: Start workflow via HTTP POST
- **Schedule Trigger**: Run workflow on cron schedule
- **Manual Trigger**: Start workflow manually from UI or API
- **API Trigger**: Start workflow programmatically

#### Node Categories

**Logic Nodes**:
- Conditional (If/Else): Route workflow based on conditions
- Switch: Multi-branch routing
- Loop: Iterate over arrays
- Delay: Wait for specified duration
- Merge: Combine multiple branches

**Data Nodes**:
- Transform: Modify data structure using expressions
- Filter: Filter items in arrays based on conditions
- MongoDB Query: Query documents from collections
- MongoDB Write: Insert or update documents

**Integration Nodes**:
- HTTP Request: Make API calls to external services
- Email Send: Send email messages
- Google Sheets: Read/write to Google Sheets
- Custom Code: Execute JavaScript code blocks

**AI Nodes** (Planned):
- AI Prompt: Send prompts to AI models
- AI Classify: Classify text into categories
- AI Extract: Extract structured data from unstructured text

#### Execution Engine
- **Async Processing**: Queue-based execution system
- **Retry Logic**: Configurable retry policies with exponential backoff
- **Error Handling**: Stop, continue, or rollback on errors
- **Timeout Management**: Configurable timeouts per node
- **Execution Modes**: Sequential, parallel, or auto-detected

#### Billing & Limits
- **Tier-Based Limits**: Enforced by Stripe subscription tier
  - Free: 50 executions/month, 1 active workflow
  - Pro: 500 executions/month, 5 active workflows
  - Team: 5,000 executions/month, 25 active workflows
  - Enterprise: Unlimited
- **Usage Tracking**: Real-time execution count and analytics
- **Limit Enforcement**: Prevents execution queuing when limits exceeded

### Developer Package: @netpad/workflows

For developers who want to programmatically manage workflows:

```bash
npm install @netpad/workflows
```

**Features**:
- Type-safe TypeScript API client
- Workflow management (create, update, delete, activate)
- Execution control (trigger, monitor, retry, cancel)
- Execution status polling and wait utilities
- Full TypeScript type definitions

**Use Cases**:
- Server-side workflow automation
- CI/CD pipeline integrations
- External system triggers
- Programmatic workflow management

### Strategy: Workflows Pillar

**Positioning**: Visual workflow automation for MongoDB-connected processes.

**Target Use Cases**:
1. Form submission automation (email notifications, data processing)
2. Data synchronization (sync between systems, data transformation)
3. Scheduled tasks (daily reports, data cleanup, scheduled processing)
4. Integration workflows (connect to external APIs, services)

**Key Differentiators**:
- Visual builder (no code required)
- Direct MongoDB integration
- Flexible trigger options (forms, webhooks, schedules, API)
- Developer-friendly (npm package + API)
- Enterprise-ready (billing, limits, monitoring)

**Workflow Examples**:
- Employee onboarding: Form submission → Email notification → Database update → Slack notification
- Lead processing: Webhook trigger → Data validation → CRM update → Email assignment
- Daily reports: Schedule trigger → Query database → Generate report → Email distribution

---

## Pillar 3: Data Management

**Purpose**: Browse, query, and manage MongoDB data with visual tools.

### Core Capabilities

#### Data Browser
- **Collection Navigation**: Browse databases and collections visually
- **Document Viewer**: View and edit MongoDB documents
- **Query Builder**: Visual query construction with filters
- **Sort & Pagination**: Navigate large datasets efficiently
- **Export Options**: Download query results as JSON or CSV

#### Connection Management
- **Connection Vault**: Encrypted storage for MongoDB credentials
- **Multiple Connections**: Manage connections to multiple MongoDB instances
- **Connection Testing**: Verify connectivity before saving
- **Connection Types**: Atlas, self-hosted, or cloud MongoDB instances
- **Auto-Provisioning**: Automatic M0 cluster setup for new users (Free tier)

#### Infrastructure Management
- **Atlas Integration**: Provision and manage MongoDB Atlas clusters
- **Cluster Monitoring**: View cluster status, metrics, and health
- **Database User Management**: Create and manage database users
- **Connection String Management**: Secure generation and storage

#### Data Operations
- **Data Import**: Upload CSV/XLSX files with smart mapping
- **Schema Analysis**: Analyze collection schemas automatically
- **Sample Data**: Load pre-built datasets for testing
- **Data Export**: Export collections or query results

#### Security Features
- **Encrypted Connections**: AES-256-GCM encryption for credentials
- **Field-Level Encryption**: MongoDB Queryable Encryption support
- **Access Control**: Organization-based multi-tenancy
- **Audit Logging**: Track data access and modifications

### Strategy: Data Management Pillar

**Positioning**: Visual MongoDB data management without command-line tools.

**Target Use Cases**:
1. Data exploration (browse collections, query documents)
2. Data administration (manage connections, users, infrastructure)
3. Data migration (import/export data, schema analysis)
4. Development workflows (sample data, testing, prototyping)

**Key Differentiators**:
- Visual interface (no MongoDB shell required)
- Integrated with Forms and Workflows
- Secure credential management
- Atlas integration (provision clusters, manage infrastructure)
- Developer-friendly (works with any MongoDB instance)

---

## Integration: How The Pillars Work Together

The three pillars are designed to work seamlessly together:

### Example 1: Complete Data Collection Workflow

```
1. Data Management: Create/connect to MongoDB collection
2. Forms: Build form from collection schema
3. Forms: Publish form and collect responses
4. Workflows: Automate post-submission processing
   - Validate data
   - Send notification emails
   - Update related collections
   - Trigger external integrations
5. Data Management: Browse collected data, export for analysis
```

### Example 2: Automated Data Pipeline

```
1. Workflows: Schedule trigger (daily at 9 AM)
2. Workflows: MongoDB Query node (fetch new records)
3. Workflows: Transform node (clean and structure data)
4. Workflows: HTTP Request node (send to external API)
5. Workflows: MongoDB Write node (update status)
6. Data Management: Browse updated records
```

### Example 3: Form-to-Workflow Integration

```
1. Forms: User submits employee onboarding form
2. Workflows: Form trigger automatically starts workflow
3. Workflows: Conditional logic routes based on department
4. Workflows: Send welcome emails, create accounts, update systems
5. Data Management: View all onboarding submissions and status
```

---

## Platform Architecture

### Technology Stack

```
Frontend:
├── Next.js 14 (App Router)
├── React 18
├── Material-UI (MUI) 5
├── TypeScript
└── ReactFlow (workflow editor)

Backend:
├── Next.js API Routes
├── MongoDB Driver 6.5
├── MongoDB Client Encryption
├── Stripe SDK (billing)
└── OpenAI API (AI features)

Authentication:
├── Iron Session
├── SimpleWebAuthn (passkeys)
└── OAuth providers (Google, GitHub)

Infrastructure:
├── MongoDB Atlas API
├── AWS S3 (file storage)
└── Vercel (hosting)
```

### Multi-Tenancy Architecture

- **Platform Database**: Shared database for users, organizations, billing
- **Organization Databases**: Isolated databases per organization (forms, submissions, workflows)
- **Connection Vault**: Encrypted credential storage per organization
- **Usage Tracking**: Per-organization usage metrics and billing

### API Coverage

**100+ API endpoints** covering:
- Form CRUD operations
- Workflow management and execution
- Response/submission management
- MongoDB operations
- Connection management
- User authentication
- Billing operations
- Atlas API integration

---

## Business Model & Pricing

### Subscription Tiers

| Tier | Forms | Workflows | Data Management | Price |
|------|-------|-----------|-----------------|-------|
| **Free** | 3 forms, 1,000 submissions/month | 50 executions/month, 1 active workflow | M0 cluster, 1 connection | Free |
| **Pro** | Unlimited forms, 1,000 submissions/month | 500 executions/month, 5 active workflows | 5 connections | $X/month |
| **Team** | Unlimited forms, 10,000 submissions/month | 5,000 executions/month, 25 active workflows | 20 connections | $X/month |
| **Enterprise** | Unlimited everything | Unlimited everything | Unlimited connections | Custom |

### Key Limits

- **Forms**: Number of forms, submissions per month
- **Workflows**: Executions per month, active workflows
- **Connections**: MongoDB connection limit
- **Storage**: File storage limits
- **AI Features**: AI generations per month

### Billing Integration

- Stripe-powered subscription management
- Usage-based limits enforced at API level
- Automatic tier-based feature gating
- Usage tracking and analytics

---

## Developer Ecosystem

### NPM Packages

1. **@netpad/forms** (v0.1.0)
   - React form rendering component
   - Type-safe TypeScript API
   - Standalone or platform integration

2. **@netpad/workflows** (v0.1.0)
   - Workflow API client
   - Type-safe TypeScript API
   - Execution management utilities

### Example Projects

- **Employee Onboarding Demo**: Complete form + workflow integration
- **Workflow Integration Demo**: Programmatic workflow management examples

### API Access

- REST API for all platform operations
- API key authentication
- Organization-scoped access
- Rate limiting and usage tracking

---

## Current Status & Roadmap

### Completed Features

#### Forms Pillar ✅
- Visual form builder with 30+ field types
- Multi-page wizards
- Conditional logic and computed fields
- Schema import from MongoDB
- Form analytics and export
- @netpad/forms npm package

#### Workflows Pillar ✅
- Visual workflow builder
- Multiple trigger types (form, webhook, schedule, manual)
- Node library (logic, data, integrations)
- Execution engine with retry logic
- Execution monitoring and logs
- Billing integration with tier-based limits
- @netpad/workflows npm package

#### Data Management Pillar ✅
- Data browser for MongoDB collections
- Connection vault with encryption
- Atlas cluster provisioning (M0 free tier)
- Database user management
- Data import/export
- Sample data loader

#### Platform Features ✅
- Multi-tenant architecture
- Stripe billing integration
- Usage tracking and limits
- Authentication (magic link, passkeys, OAuth)
- Field-level encryption support
- API coverage (100+ endpoints)

### In Progress

- [ ] Workflow AI nodes (AI prompt, classify, extract)
- [ ] Advanced workflow templates
- [ ] Real-time collaboration
- [ ] Mobile-responsive form preview improvements
- [ ] Enhanced analytics dashboards

### Planned

- [ ] Form templates marketplace
- [ ] Team collaboration features
- [ ] Custom branding/white-label
- [ ] Advanced file handling (images, PDFs)
- [ ] Real-time workflow execution monitoring
- [ ] Workflow versioning and rollback
- [ ] Advanced data visualization
- [ ] Data transformation pipelines

---

## Competitive Positioning

### Key Differentiators

1. **MongoDB-First**: Built specifically for MongoDB, not generic databases
2. **No Backend Code**: Direct MongoDB integration eliminates custom APIs
3. **Three Integrated Pillars**: Forms + Workflows + Data Management work together
4. **Open Source**: Full data ownership, self-hostable
5. **Enterprise-Ready**: Security, billing, multi-tenancy from day one
6. **Developer-Friendly**: NPM packages, APIs, TypeScript support

### Comparison to Alternatives

| Feature | NetPad | Typeform | Zapier | Airtable |
|---------|--------|----------|--------|----------|
| MongoDB Integration | ✅ Direct | ❌ External | ❌ External | ❌ External |
| Visual Workflows | ✅ | ❌ | ✅ | ❌ |
| Forms Builder | ✅ | ✅ | ❌ | ✅ |
| Data Browser | ✅ | ❌ | ❌ | ✅ |
| Open Source | ✅ | ❌ | ❌ | ❌ |
| Self-Hostable | ✅ | ❌ | ❌ | ❌ |
| Pricing | Free tier + tiers | Subscription | Subscription | Subscription |

---

## Use Cases & Examples

### 1. Employee Onboarding

**Problem**: Need to collect employee information and automate onboarding tasks.

**Solution**:
1. **Forms**: Create onboarding form with personal info, employment details, preferences
2. **Workflows**: Auto-trigger on form submission → Send welcome email → Create accounts → Notify HR
3. **Data Management**: Browse all onboarding submissions, export for reporting

**Time to Production**: < 1 hour (vs. weeks of custom development)

### 2. Lead Processing Pipeline

**Problem**: Need to process leads from website, validate, and route to CRM.

**Solution**:
1. **Forms**: Contact form on website
2. **Workflows**: Webhook trigger → Validate data → Check duplicates → Update CRM → Assign to sales rep
3. **Data Management**: View all leads, query by status, export for analysis

### 3. Daily Data Synchronization

**Problem**: Need to sync data between MongoDB and external system daily.

**Solution**:
1. **Workflows**: Schedule trigger (daily 9 AM) → Query MongoDB → Transform data → POST to external API → Update sync status
2. **Data Management**: Monitor sync status, view logs, debug issues

### 4. Customer Feedback Collection

**Problem**: Collect customer feedback and automatically route based on sentiment.

**Solution**:
1. **Forms**: Feedback form with rating, comments, contact info
2. **Workflows**: Form trigger → Analyze sentiment (AI node) → Route to support team → Send acknowledgment
3. **Data Management**: Browse all feedback, filter by sentiment, export for analysis

---

## Getting Started

### For End Users

1. **Visit**: [formbuilder.mongodb.com](https://formbuilder.mongodb.com) (or self-host)
2. **Sign Up**: Create account (free tier includes M0 cluster)
3. **Build Forms**: Create your first form from schema or scratch
4. **Automate**: Build workflows to process form submissions
5. **Manage Data**: Browse collections, manage connections

### For Developers

1. **Install Packages**: 
   ```bash
   npm install @netpad/forms @netpad/workflows
   ```

2. **Use Forms Package**:
   ```tsx
   import { FormRenderer } from '@netpad/forms';
   <FormRenderer config={formConfig} onSubmit={handleSubmit} />
   ```

3. **Use Workflows Package**:
   ```ts
   import { createNetPadWorkflowClient } from '@netpad/workflows';
   const client = createNetPadWorkflowClient({ baseUrl, apiKey, orgId });
   await client.executeWorkflow('workflow-id', { payload: data });
   ```

4. **Integrate with API**: Use REST API for programmatic access

---

## Resources

- **GitHub**: [github.com/mongodb/netpad](https://github.com/mongodb/netpad)
- **NPM**: 
  - [@netpad/forms](https://www.npmjs.com/package/@netpad/forms)
  - [@netpad/workflows](https://www.npmjs.com/package/@netpad/workflows)
- **Documentation**: (Coming soon)
- **Examples**: `/examples/` directory in repository

---

*Last Updated: December 2024*  
*Version: 3.1.0*
