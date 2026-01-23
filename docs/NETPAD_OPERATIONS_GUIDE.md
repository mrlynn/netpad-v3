# NetPad Operations Guide

**A comprehensive guide for installing, running, managing, and building NetPad instances across all deployment modes.**

---

> **Document Status**: Official Operations Guide
> **Last Updated**: January 23, 2026
> **Version**: 1.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Deployment Modes](#deployment-modes)
4. [Cloud Deployment](#cloud-deployment)
5. [Self-Hosted Deployment](#self-hosted-deployment)
6. [Standalone App Export](#standalone-app-export)
7. [Environment Configuration](#environment-configuration)
8. [Database Setup](#database-setup)
9. [Authentication Configuration](#authentication-configuration)
10. [Extension System](#extension-system)
11. [Monitoring & Observability](#monitoring--observability)
12. [Backup & Recovery](#backup--recovery)
13. [Security Considerations](#security-considerations)
14. [Troubleshooting](#troubleshooting)
15. [Upgrading](#upgrading)

---

## Overview

NetPad is an open-source, enterprise-grade platform for building MongoDB-connected data collection forms, workflow automation, and AI-powered conversational experiences.

### Key Capabilities

- **Form Builder**: 30+ field types, conditional logic, multi-page forms
- **Workflow Engine**: 25+ node types, visual editor, async execution
- **Data Management**: Connection vault, data browser, import/export
- **AI Features**: Conversational forms, RAG (knowledge-guided), 15+ AI agents
- **Applications**: First-class entities grouping forms, workflows, and connections
- **Marketplace**: Discover and share applications

### Open Core Model

NetPad uses an open core architecture:
- **Public Core** (MIT License): Form builder, workflows, data management, conversational forms
- **Private Cloud Features** (`@netpad/cloud-features`): Stripe billing, Atlas provisioning, advanced analytics

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           NetPad Platform                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                        Application Layer                            ││
│  │  Next.js 14+ │ React 18+ │ Material-UI │ TypeScript                ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                              │                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                        Extension System                             ││
│  │  Registry │ Loader │ Hooks │ Conditional Components                 ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                              │                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                         API Layer                                   ││
│  │  165+ Endpoints │ Next.js API Routes │ Authentication              ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                              │                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                        Data Layer                                   ││
│  │  MongoDB Driver 6.5+ │ Atlas Vector Search │ Client Encryption     ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14+ (App Router) |
| UI | React 18+, Material-UI 5 |
| Language | TypeScript (strict) |
| Database | MongoDB 6.5+ (Atlas or self-hosted) |
| Vector Search | MongoDB Atlas Vector Search |
| Authentication | OAuth2, Magic Link, Passkeys |
| File Storage | Vercel Blob |
| Billing | Stripe (cloud mode only) |
| AI | OpenAI API |

---

## Deployment Modes

NetPad supports three deployment modes, each optimized for different use cases:

| Mode | Environment Variable | Use Case | Billing | RAG |
|------|---------------------|----------|---------|-----|
| **Cloud** | `NETPAD_DEPLOYMENT_MODE=cloud` | Production SaaS | Stripe | Team/Enterprise + M10+ |
| **Self-Hosted** | `NETPAD_DEPLOYMENT_MODE=self-hosted` | Private instances | Usage tracking only | All tiers with Atlas Local |
| **Standalone** | `STANDALONE_MODE=true` | Exported apps | N/A | User-provided |

### Mode Selection Flow

```
                    ┌─────────────────────────────┐
                    │   How will you deploy?      │
                    └─────────────────────────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
            ▼                  ▼                  ▼
   ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
   │ Managed SaaS   │  │ Your own       │  │ Single app     │
   │ at netpad.io   │  │ infrastructure │  │ deployment     │
   └────────────────┘  └────────────────┘  └────────────────┘
            │                  │                  │
            ▼                  ▼                  ▼
   ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
   │  Cloud Mode    │  │ Self-Hosted    │  │  Standalone    │
   │                │  │ Mode           │  │  Mode          │
   └────────────────┘  └────────────────┘  └────────────────┘
```

---

## Cloud Deployment

Cloud mode is for running NetPad as a managed SaaS offering with full billing and provisioning capabilities.

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (for user data clusters)
- MongoDB Atlas cluster for platform data (M10+ recommended for production)
- Stripe account
- Vercel account (recommended) or similar hosting
- OpenAI API key

### Quick Start

```bash
# Clone the repository
git clone https://github.com/mongodb/netpad.git
cd netpad

# Install dependencies
npm install

# Install private cloud features package (requires npm auth)
npm login --scope=@netpad
npm install @netpad/cloud-features

# Configure environment
cp .env.example .env.local
# Edit .env.local with your values

# Run development server
NETPAD_DEPLOYMENT_MODE=cloud npm run dev

# Build for production
npm run build
npm start
```

### Cloud Environment Variables

```bash
# Deployment Mode
NETPAD_DEPLOYMENT_MODE=cloud
NEXT_PUBLIC_NETPAD_DEPLOYMENT_MODE=cloud

# MongoDB (Platform Database)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/netpad
MONGODB_DB=netpad

# Authentication
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_ID=your-github-id
GITHUB_SECRET=your-github-secret

# Stripe Billing
STRIPE_SECRET_KEY_LIVE=sk_live_...
STRIPE_SECRET_KEY_TEST=sk_test_...
STRIPE_WEBHOOK_SECRET_LIVE=whsec_...
STRIPE_WEBHOOK_SECRET_TEST=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_TEAM_MONTHLY=price_...
STRIPE_PRICE_TEAM_YEARLY=price_...

# OpenAI
OPENAI_API_KEY=sk-...

# Vercel Blob (File Storage)
BLOB_READ_WRITE_TOKEN=vercel_blob_...

# MongoDB Atlas Admin API (for provisioning)
ATLAS_PUBLIC_KEY=your-public-key
ATLAS_PRIVATE_KEY=your-private-key
ATLAS_ORG_ID=your-org-id

# Encryption
ENCRYPTION_KEY=32-byte-hex-key
```

### Vercel Deployment

1. **Connect Repository**: Link your GitHub repo to Vercel
2. **Configure Environment**: Add all environment variables in Vercel dashboard
3. **Deploy**: Push to main branch triggers deployment
4. **Custom Domain**: Configure DNS for your domain

```bash
# Or use Vercel CLI
npm i -g vercel
vercel --prod
```

### Stripe Configuration

1. **Create Products**: In Stripe Dashboard, create products for Pro, Team tiers
2. **Create Prices**: Monthly and yearly prices for each tier
3. **Configure Webhooks**: Point to `https://your-domain.com/api/billing/webhook`
4. **Enable Events**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`

---

## Self-Hosted Deployment

Self-hosted mode runs NetPad on your own infrastructure without Stripe billing. Ideal for enterprise, development, or privacy-focused deployments.

### Prerequisites

- Node.js 18+
- MongoDB 6.5+ (Atlas, Atlas Local, or self-hosted)
- OpenAI API key (for AI features)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/mongodb/netpad.git
cd netpad

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your values

# Run development server
NETPAD_DEPLOYMENT_MODE=self-hosted npm run dev

# Build for production
npm run build
npm start
```

### Self-Hosted Environment Variables

```bash
# Deployment Mode
NETPAD_DEPLOYMENT_MODE=self-hosted
NEXT_PUBLIC_NETPAD_DEPLOYMENT_MODE=self-hosted

# MongoDB
MONGODB_URI=mongodb://localhost:27017/netpad
# Or for Atlas: mongodb+srv://user:pass@cluster.mongodb.net/netpad
MONGODB_DB=netpad

# Authentication (choose what you need)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# For OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OpenAI (for AI features)
OPENAI_API_KEY=sk-...

# Encryption
ENCRYPTION_KEY=32-byte-hex-key
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NETPAD_DEPLOYMENT_MODE self-hosted

COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  netpad:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NETPAD_DEPLOYMENT_MODE=self-hosted
      - MONGODB_URI=mongodb://mongo:27017/netpad
      - NEXTAUTH_URL=http://localhost:3000
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - mongo

  mongo:
    image: mongodb/mongodb-atlas-local:latest
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

### RAG Features with Atlas Local

Self-hosted deployments can use MongoDB Atlas Local for vector search capabilities:

```bash
# Option 1: Atlas CLI
atlas deployments setup local --type local

# Option 2: Docker
docker run -d -p 27017:27017 mongodb/mongodb-atlas-local

# Configure connection
MONGODB_URI=mongodb://localhost:27017/netpad
```

Atlas Local provides:
- Full MongoDB 7.0 compatibility
- Atlas Vector Search support
- No M10+ cluster required
- Local development and testing

---

## Standalone App Export

Standalone mode exports a single NetPad application as an independent Next.js app.

### Export Process

1. **Build Your App**: Create forms, workflows in NetPad
2. **Create Release**: Tag a version of your application
3. **Export**: Download the standalone package
4. **Deploy**: Deploy to any Next.js-compatible hosting

### Standalone Structure

```
exported-app/
├── src/
│   ├── app/                 # Next.js pages
│   ├── components/          # Form components
│   └── lib/                 # Utilities
├── public/                  # Static assets
├── package.json
├── next.config.js
└── .env.example
```

### Standalone Environment Variables

```bash
# Database
MONGODB_URI=mongodb+srv://user:pass@your-cluster.mongodb.net/db
MONGODB_DB=your-database

# Collection for form responses
MONGODB_COLLECTION=form_responses

# OpenAI (for conversational forms)
OPENAI_API_KEY=sk-...

# Authentication (optional)
NEXTAUTH_SECRET=your-secret
```

### Standalone Limitations

- Single application only
- No platform database (writes directly to user's MongoDB)
- No billing or subscription management
- User responsible for OpenAI API costs
- Conversation transcripts stored at root level (`conversational`)

---

## Environment Configuration

### Required Variables (All Modes)

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://...` |
| `MONGODB_DB` | Database name | `netpad` |
| `NEXTAUTH_SECRET` | Session encryption key | 32+ character string |
| `ENCRYPTION_KEY` | Data encryption key | 32-byte hex string |

### Mode-Specific Variables

| Variable | Cloud | Self-Hosted | Standalone |
|----------|-------|-------------|------------|
| `NETPAD_DEPLOYMENT_MODE` | `cloud` | `self-hosted` | N/A |
| `STANDALONE_MODE` | N/A | N/A | `true` |
| `STRIPE_SECRET_KEY_*` | Required | N/A | N/A |
| `ATLAS_*` | Required | Optional | N/A |
| `OPENAI_API_KEY` | Required | Optional | Optional |

### Generating Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate ENCRYPTION_KEY
openssl rand -hex 32
```

---

## Database Setup

### MongoDB Atlas (Recommended)

1. **Create Cluster**: M0 (free) for development, M10+ for production
2. **Create Database User**: With readWrite permissions
3. **Network Access**: Add IP allowlist or 0.0.0.0/0 for all IPs
4. **Get Connection String**: From Atlas Connect dialog

### Self-Hosted MongoDB

```bash
# Docker
docker run -d -p 27017:27017 --name mongodb \
  -v mongo-data:/data/db \
  mongo:7.0

# Connection string
MONGODB_URI=mongodb://localhost:27017/netpad
```

### Database Collections

NetPad creates the following collections automatically:

| Collection | Description |
|------------|-------------|
| `users` | User accounts |
| `organizations` | Organization data |
| `forms` | Form definitions |
| `form_responses` | Form submissions |
| `workflows` | Workflow definitions |
| `workflow_executions` | Execution history |
| `connections` | Database connections (encrypted) |
| `applications` | Application bundles |
| `documents` | RAG document metadata |
| `document_chunks` | RAG document vectors |

### Indexes

NetPad creates necessary indexes on first run. For production, ensure these exist:

```javascript
// Users
db.users.createIndex({ email: 1 }, { unique: true })

// Forms
db.forms.createIndex({ organizationId: 1, status: 1 })
db.forms.createIndex({ slug: 1 }, { unique: true })

// Responses
db.form_responses.createIndex({ formId: 1, createdAt: -1 })

// RAG Vectors (Atlas Vector Search)
// Create via Atlas UI or API
```

---

## Authentication Configuration

### Google OAuth

1. Create project at [Google Cloud Console](https://console.cloud.google.com)
2. Enable Google+ API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URI: `https://your-domain.com/api/auth/callback/google`

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

### GitHub OAuth

1. Go to GitHub Settings > Developer Settings > OAuth Apps
2. Create new OAuth App
3. Set callback URL: `https://your-domain.com/api/auth/callback/github`

```bash
GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-client-secret
```

### Magic Link (Email)

```bash
# SendGrid
SENDGRID_API_KEY=SG.xxx

# Or Resend
RESEND_API_KEY=re_xxx
```

### Passkeys (WebAuthn)

Passkeys work automatically when HTTPS is configured. For development:

```bash
# Use localhost (passkeys work on localhost)
NEXTAUTH_URL=http://localhost:3000
```

---

## Extension System

The extension system enables dynamic loading of cloud-only features.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Extension System                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐   │
│  │    Registry     │────▶│     Loader      │────▶│    Services     │   │
│  │                 │     │                 │     │                 │   │
│  │ • Extensions    │     │ • Dynamic import│     │ • Billing       │   │
│  │ • Features      │     │ • Error handling│     │ • Provisioning  │   │
│  │ • Events        │     │ • Caching       │     │ • Marketplace   │   │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘   │
│                                                                          │
│  ┌─────────────────┐     ┌─────────────────┐                            │
│  │   React Hooks   │     │   Components    │                            │
│  │                 │     │                 │                            │
│  │ • useExtension  │     │ • <CloudOnly>   │                            │
│  │   Feature       │     │ • <SelfHosted   │                            │
│  │ • useDeployment │     │   Only>         │                            │
│  │   Mode          │     │ • <CloudFeature>│                            │
│  └─────────────────┘     └─────────────────┘                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Checking Extension Status

```bash
# API endpoint
curl https://your-instance/api/extensions/status

# Response
{
  "extensionCount": 1,
  "extensions": [{
    "id": "netpad-cloud",
    "name": "NetPad Cloud",
    "version": "1.1.0",
    "features": ["billing", "stripe_integration", ...]
  }],
  "enabledFeatures": [...],
  "initialized": true,
  "deploymentMode": "cloud"
}
```

### Available Features

| Feature | Description | Mode |
|---------|-------------|------|
| `billing` | Stripe billing service | Cloud |
| `stripe_integration` | Full Stripe SDK | Cloud |
| `subscription_management` | Plan management | Cloud |
| `atlas_provisioning` | Cluster provisioning | Cloud |
| `cluster_management` | Cluster monitoring | Cloud |
| `application_marketplace` | Marketplace services | Cloud |
| `admin_dashboard` | Admin features | Cloud |
| `waitlist_management` | Beta waitlist | Cloud |
| `advanced_analytics` | Usage analytics | Cloud |

---

## Monitoring & Observability

### Health Checks

```bash
# Basic health
curl https://your-instance/api/health

# Detailed status
curl https://your-instance/api/health/detailed
```

### Logging

NetPad uses structured logging:

```javascript
// Log levels: error, warn, info, debug
console.log('[Component] Action:', data);

// Example output
[Billing] Checkout completed for org: org_123
[Workflow] Execution started: exec_456
[RAG] Retrieved 5 chunks with avg score 0.85
```

### Metrics

Key metrics to monitor:

| Metric | Description | Target |
|--------|-------------|--------|
| Response Time | API latency | < 200ms |
| Error Rate | Failed requests | < 1% |
| DB Connections | Active connections | < 80% of max |
| Memory Usage | Node.js heap | < 80% |
| Queue Depth | Pending workflows | < 100 |

### External Monitoring

Integrate with:
- **Vercel Analytics**: Built-in for Vercel deployments
- **Datadog**: APM and infrastructure monitoring
- **New Relic**: Application performance monitoring
- **Sentry**: Error tracking

---

## Backup & Recovery

### Database Backup

#### MongoDB Atlas
- Continuous backup enabled by default on M10+
- Point-in-time recovery available
- Snapshots stored for 24 hours (configurable)

#### Self-Hosted

```bash
# Backup
mongodump --uri="mongodb://localhost:27017/netpad" --out=/backup/$(date +%Y%m%d)

# Restore
mongorestore --uri="mongodb://localhost:27017/netpad" /backup/20260123
```

### Application Backup

```bash
# Export environment
cp .env.local .env.backup

# Export application code
git archive --format=tar.gz HEAD > netpad-backup.tar.gz
```

### Recovery Procedures

1. **Database Recovery**
   ```bash
   # Atlas: Use Atlas UI for point-in-time recovery
   # Self-hosted: mongorestore from backup
   ```

2. **Application Recovery**
   ```bash
   # Restore code
   tar -xzf netpad-backup.tar.gz
   npm install
   npm run build
   npm start
   ```

3. **Configuration Recovery**
   ```bash
   # Restore environment
   cp .env.backup .env.local
   ```

---

## Security Considerations

### Encryption

| Data | Encryption Method |
|------|-------------------|
| Connection strings | AES-256-GCM |
| Sensitive fields | MongoDB Client-Side Encryption |
| Sessions | Iron Session (encrypted cookies) |
| Transport | TLS 1.3 |

### Authentication Security

- OAuth2 with PKCE for web authentication
- Secure session management with httpOnly cookies
- Rate limiting on authentication endpoints
- Passkey support for phishing-resistant auth

### API Security

- API key authentication for external access
- Rate limiting: 100 requests/minute (configurable)
- Request validation and sanitization
- CORS configuration

### Data Protection

- Field-level encryption for sensitive data
- Data classification support (Public, Internal, Confidential, Restricted, Secret)
- Audit logging for all operations
- GDPR/CCPA compliance features (data export, deletion)

### Network Security

```bash
# Firewall rules (example)
# Allow HTTPS
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Allow MongoDB (internal only)
iptables -A INPUT -p tcp --dport 27017 -s 10.0.0.0/8 -j ACCEPT
```

---

## Troubleshooting

### Common Issues

#### Extension Not Loading

```bash
# Check deployment mode
echo $NETPAD_DEPLOYMENT_MODE  # Should be "cloud"

# Verify package installed
npm ls @netpad/cloud-features

# Check extension status
curl localhost:3000/api/extensions/status
```

#### Database Connection Failed

```bash
# Test connection
mongosh "mongodb+srv://cluster.mongodb.net/netpad"

# Check environment variable
echo $MONGODB_URI

# Verify network access in Atlas
```

#### Authentication Issues

```bash
# Check NEXTAUTH_URL matches actual URL
echo $NEXTAUTH_URL

# Verify OAuth callback URLs in provider console
# Ensure NEXTAUTH_SECRET is set
echo $NEXTAUTH_SECRET | wc -c  # Should be 32+
```

#### Build Failures

```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build

# Check Node version
node -v  # Should be 18+
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=* npm run dev

# Next.js verbose mode
NODE_OPTIONS='--inspect' npm run dev
```

### Log Analysis

```bash
# Search for errors
grep -r "error" .next/server/logs/

# Check specific component
grep "[Billing]" application.log

# Tail logs in real-time
tail -f application.log | grep -E "(error|warn)"
```

---

## Upgrading

### Version Compatibility

| From | To | Breaking Changes |
|------|-----|------------------|
| 4.10.x | 4.11.x | Extension system added |
| 4.9.x | 4.10.x | Open core architecture |

### Upgrade Procedure

1. **Backup Current Installation**
   ```bash
   mongodump --uri="$MONGODB_URI" --out=/backup/pre-upgrade
   cp .env.local .env.backup
   ```

2. **Update Code**
   ```bash
   git fetch origin
   git checkout v4.11.0
   npm install
   ```

3. **Run Migrations** (if any)
   ```bash
   npm run migrate
   ```

4. **Update Environment**
   ```bash
   # Check .env.example for new variables
   diff .env.example .env.local
   ```

5. **Build and Deploy**
   ```bash
   npm run build
   npm start
   ```

6. **Verify**
   ```bash
   curl https://your-instance/api/health
   curl https://your-instance/api/extensions/status
   ```

### Rollback

```bash
# Restore previous version
git checkout v4.10.0
npm install
npm run build

# Restore database if needed
mongorestore --uri="$MONGODB_URI" /backup/pre-upgrade
```

---

## Quick Reference

### CLI Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Production build
npm start                      # Start production server
npm run lint                   # Run linting
npm run test                   # Run tests

# Database
npm run migrate               # Run migrations
npm run seed                  # Seed sample data
```

### API Endpoints

```bash
# Health
GET  /api/health
GET  /api/health/detailed

# Extensions
GET  /api/extensions/status
GET  /api/extensions/features

# Forms
GET  /api/forms
POST /api/forms
GET  /api/forms/:id

# Workflows
GET  /api/workflows
POST /api/workflows/:id/execute
```

### Support Resources

- **Documentation**: https://docs.netpad.io
- **GitHub Issues**: https://github.com/mongodb/netpad/issues
- **Community Discord**: https://discord.gg/netpad
- **Enterprise Support**: enterprise@netpad.io

---

*Last Updated: January 23, 2026*
*Version: 1.0.0*
