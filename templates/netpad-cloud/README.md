# @netpad/cloud-features

Private package containing cloud-only features for NetPad.

## Overview

This package provides proprietary features that are only available in the NetPad Cloud offering (netpad.io). Self-hosted deployments do not include this package.

## Features

### Billing & Subscription Management
- Stripe integration for payment processing
- Subscription tier management (free, pro, team, enterprise)
- Usage tracking and limits enforcement
- Invoice management
- Customer portal

### Atlas Cluster Provisioning
- Automatic M0 cluster provisioning for free tier users
- Cluster health monitoring
- Connection string management
- Network access configuration

### Application Marketplace
- Application submission and review workflow
- "Official App" badges
- Marketplace listings and discovery
- Analytics and download tracking

### Waitlist Management
- User signup to waitlist
- Approval/rejection workflow
- Auto-approval rules
- Status notifications

### Admin Dashboard
- User management
- Organization management
- Platform statistics
- Extended audit logs

## Installation

This package is installed automatically in cloud deployments via npm:

```bash
npm install @netpad/cloud-features
```

**Note:** This package is private and requires authentication to the private npm registry.

## Integration

The package integrates with the public NetPad codebase through the extension system:

```typescript
// In netpad-3 public repo
import { loadExtensions } from '@/lib/extensions';

// During app initialization
await loadExtensions();

// The extension system will automatically:
// 1. Detect cloud mode (NETPAD_DEPLOYMENT_MODE=cloud)
// 2. Attempt to import @netpad/cloud-features
// 3. Register the cloud extension and its features
// 4. Make cloud services available via registry
```

## Development

### Setup

1. Clone this repository:
   ```bash
   git clone git@github.com:mongodb/netpad-cloud.git
   cd netpad-cloud
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Link to local netpad-3 for development:
   ```bash
   npm link
   cd ../netpad-3
   npm link @netpad/cloud-features
   ```

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

## Environment Variables

Required environment variables for cloud features:

### Stripe (Billing)
```
STRIPE_SECRET_KEY_TEST=sk_test_...
STRIPE_SECRET_KEY_LIVE=sk_live_...
STRIPE_WEBHOOK_SECRET_TEST=whsec_...
STRIPE_WEBHOOK_SECRET_LIVE=whsec_...
STRIPE_PRICE_PRO_MONTHLY_TEST=price_...
STRIPE_PRICE_PRO_MONTHLY_LIVE=price_...
STRIPE_PRICE_PRO_YEARLY_TEST=price_...
STRIPE_PRICE_PRO_YEARLY_LIVE=price_...
STRIPE_PRICE_TEAM_MONTHLY_TEST=price_...
STRIPE_PRICE_TEAM_MONTHLY_LIVE=price_...
STRIPE_PRICE_TEAM_YEARLY_TEST=price_...
STRIPE_PRICE_TEAM_YEARLY_LIVE=price_...
STRIPE_MODE=test  # or 'live' for production
```

### Atlas (Cluster Provisioning)
```
ATLAS_ORG_ID=...
ATLAS_PUBLIC_KEY=...
ATLAS_PRIVATE_KEY=...
ATLAS_DEFAULT_PROVIDER=AWS
ATLAS_DEFAULT_REGION=US_EAST_1
ATLAS_SERVER_IPS=1.2.3.4,5.6.7.8  # NetPad server IPs for allowlist
```

## Architecture

```
@netpad/cloud-features/
├── src/
│   ├── index.ts           # Extension registration
│   ├── billing/           # Stripe integration
│   ├── atlas/             # Atlas provisioning
│   ├── marketplace/       # App marketplace
│   ├── waitlist/          # Waitlist management
│   └── admin/             # Admin dashboard
└── dist/                  # Compiled output
```

## License

UNLICENSED - Proprietary. Not for redistribution.

Copyright (c) MongoDB NetPad Team
