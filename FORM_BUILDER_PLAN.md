# NetPad - Product Overview & Capabilities

## What is NetPad?

**NetPad** is a comprehensive, open-source platform for creating MongoDB-connected data entry forms, workflows, search interfaces, and data management applications—all without writing code.

Built for developers, data teams, and organizations that need to collect, manage, and analyze data stored in MongoDB, NetPad bridges the gap between your database and your users with a beautiful, intuitive interface.

---

## Core Value Propositions

### 1. Zero to Production in Minutes
- Import your MongoDB collection schema with one click
- Auto-generate forms based on field types
- Publish to a shareable URL instantly
- No backend development required

### 2. Your Data, Your Control
- Connect to any MongoDB instance (Atlas, self-hosted, or cloud)
- Automatic M0 cluster provisioning for new users
- Export your data anytime (JSON, CSV)
- Full data ownership and portability

### 3. Enterprise-Ready Security
- Field-level encryption with MongoDB Queryable Encryption
- Secure connection vault with encrypted credentials
- Role-based access control
- Bot protection with Turnstile CAPTCHA
- Audit logging and compliance features

### 4. AI-Powered Productivity
- Generate complete forms from natural language descriptions
- Auto-suggest validation rules and conditional logic
- Smart formula assistance for computed fields
- In-app AI assistant for guidance

---

## Feature Matrix

### Form Building

| Feature | Description | Status |
|---------|-------------|--------|
| **Visual Form Designer** | Drag-and-drop WYSIWYG editor with live preview | Complete |
| **30+ Field Types** | Text, email, phone, date, rating, file upload, signature, matrix, and more | Complete |
| **Schema Import** | Auto-generate forms from MongoDB collection schema | Complete |
| **Multi-Page Forms** | Step-based progression with progress tracking | Complete |
| **Conditional Logic** | Show/hide fields based on user input | Complete |
| **Computed Fields** | Formula-based calculations with field references | Complete |
| **Lookup Fields** | Reference data from related collections with autocomplete | Complete |
| **Nested Objects** | Support for complex document structures | Complete |
| **Array Fields** | Dynamic lists with add/remove functionality | Complete |
| **Form Theming** | Customizable colors, backgrounds, and branding | Complete |
| **Keyboard Shortcuts** | Power user productivity features | Complete |
| **Version History** | Track changes and revert to previous versions | Complete |
| **Draft Auto-Save** | Never lose work with automatic saving | Complete |

### Data Collection & Management

| Feature | Description | Status |
|---------|-------------|--------|
| **One-Click Publish** | Share forms with a public URL | Complete |
| **Embeddable Forms** | Generate embed code for websites | Complete |
| **Response Collection** | Collect and store submissions in MongoDB | Complete |
| **Response Analytics** | Charts, trends, and field-level insights | Complete |
| **Data Import Wizard** | Upload CSV/XLSX with smart mapping | Complete |
| **Data Browser** | Query and view MongoDB documents | Complete |
| **Export to CSV/JSON** | Download your data anytime | Complete |
| **Sample Data Loader** | Pre-built datasets for testing | Complete |

### Automation & Integration

| Feature | Description | Status |
|---------|-------------|--------|
| **Webhook Integration** | POST form data to external services | Complete |
| **Pre-fill via URL** | Auto-populate forms with query parameters | Complete |
| **Custom Redirects** | Post-submit redirect with data passthrough | Complete |
| **API Access** | Full REST API for all operations | Complete |
| **Form Lifecycle Hooks** | Pre/post submit customization | Complete |

### Platform & Infrastructure

| Feature | Description | Status |
|---------|-------------|--------|
| **Atlas Cluster Provisioning** | Automatic M0 cluster setup for new users | Complete |
| **Cluster Management** | Monitor and manage provisioned clusters | Complete |
| **Database User Management** | Create and manage database users | Complete |
| **Connection Vault** | Encrypted storage for MongoDB credentials | Complete |
| **Organization Management** | Multi-tenant support with member roles | Complete |
| **Billing Integration** | Stripe-powered subscription management | Complete |

### Authentication

| Feature | Description | Status |
|---------|-------------|--------|
| **Magic Link Auth** | Passwordless email authentication | Complete |
| **Passkey Support** | WebAuthn/FIDO2 biometric login | Complete |
| **OAuth Integration** | Google, GitHub, and more | Complete |
| **Session Management** | Secure session handling | Complete |

---

## Technical Architecture

### Technology Stack

```
Frontend:
├── Next.js 14 (App Router)
├── React 18
├── Material-UI (MUI) 5
├── TypeScript
└── Recharts (analytics)

Backend:
├── Next.js API Routes
├── MongoDB Driver 6.5
├── MongoDB Client Encryption
├── Stripe SDK
└── OpenAI API

Authentication:
├── Iron Session
├── SimpleWebAuthn
└── OAuth providers

Infrastructure:
├── MongoDB Atlas API
├── Digest Authentication
└── AWS S3 (file storage)
```

### API Coverage

The platform exposes **100+ API endpoints** covering:
- Form CRUD operations
- Response management
- MongoDB operations
- Connection management
- User authentication
- Billing operations
- Atlas API integration

---

## Use Cases

### 1. Internal Tools
Build admin interfaces, data entry portals, and internal applications without custom development.

### 2. Customer-Facing Forms
Create registration forms, surveys, feedback forms, and application forms that write directly to MongoDB.

### 3. Data Collection
Import existing data, collect new submissions, and export for analysis—all from one platform.

### 4. Rapid Prototyping
Quickly create database-connected UIs for MVPs and proof-of-concepts.

### 5. Search Interfaces
Build searchable databases with configurable filters and result layouts.

---

## Deployment Options

### 1. Managed (formbuilder.mongodb.com)
- No setup required
- Automatic M0 cluster provisioning
- Free tier available

### 2. Self-Hosted
- Clone the GitHub repository
- Deploy to Vercel, Railway, or any Node.js host
- Connect your own MongoDB instance

---

## Roadmap

### Recently Completed
- [x] Atlas API integration for cluster provisioning
- [x] Cluster management UI in settings
- [x] Database user management
- [x] Data export/transfer functionality
- [x] Sample data loader for demos
- [x] AI-powered form generation
- [x] Passkey authentication

### In Progress
- [ ] Form templates marketplace
- [ ] Team collaboration features
- [ ] Advanced analytics dashboards
- [ ] Mobile-responsive form preview

### Planned
- [ ] Custom branding/white-label
- [ ] Form logic branching (form flows)
- [ ] A/B testing for forms
- [ ] Advanced file handling (images, PDFs)
- [ ] Real-time collaboration

---

## Implementation Patterns Reference

This section documents patterns used throughout the application for consistency.

### Pattern 1: Progressive Disclosure
Always-visible basic settings with advanced options in collapsible accordions.
```tsx
<BasicSettings />
<Accordion>
  <AccordionSummary>Advanced Options</AccordionSummary>
  <AccordionDetails>...</AccordionDetails>
</Accordion>
```

### Pattern 2: Contextual Hover Actions
Actions hidden by default, revealed on hover or selection.
```tsx
<ListItem sx={{ '&:hover .actions': { opacity: 1 } }}>
  <Content />
  <Box className="actions" sx={{ opacity: 0 }}>
    <IconButton />
  </Box>
</ListItem>
```

### Pattern 3: Simple/Advanced Mode Toggle
Global mode state that shows/hides advanced features.

### Pattern 4: Smart Defaults
Each field type has sensible pre-configured defaults.

### Pattern 5: Keyboard Shortcuts with Discovery
| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + S` | Save form |
| `Cmd/Ctrl + N` | Add new field |
| `Cmd/Ctrl + ,` | Open settings |
| `Cmd/Ctrl + Shift + A` | Toggle advanced mode |
| `Escape` | Close panel/dialog |
| `?` | Show keyboard shortcuts |

---

## Design Principles

### Calm UI
- Less color, more whitespace
- Less shadow, more border
- Less text, more icons (with tooltips)
- Less chrome, more content

### Visibility Rules
- **Core** (>80% usage) = Always visible
- **Frequent** (40-80%) = One click away
- **Occasional** (10-40%) = Two clicks
- **Rare** (<10%) = Settings panel

### When in Doubt
- Hide, don't delete
- Default, don't require
- Suggest, don't demand
- Collapse, don't remove

---

## Getting Started

1. **Visit the Builder**: Go to `/builder` to create your first form
2. **Connect MongoDB**: Add your connection string or use auto-provisioning
3. **Import Schema**: Click "Import from Collection" to auto-generate fields
4. **Configure Fields**: Add validation, conditional logic, and styling
5. **Publish**: Click "Publish" to get a shareable URL
6. **Collect Responses**: View submissions in the Responses tab

---

## Resources

- **GitHub**: [github.com/mrlynn/aggregation-builder](https://github.com/mrlynn/aggregation-builder)
- **Documentation**: (Coming soon)
- **Community**: (Coming soon)

---

*Last updated: December 2024*
