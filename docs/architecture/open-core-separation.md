# Open Core Architecture: Separating Cloud Features

This document describes how NetPad separates cloud-only features from the open source core using an extension system.

## Overview

NetPad follows the "open core" model used by companies like GitLab, Supabase, and Cal.com:

- **Core (Public)**: MIT-licensed, available to everyone
- **Cloud Features (Private)**: Proprietary, only available in NetPad Cloud

```
┌─────────────────────────────────────────────────────────────┐
│                    NetPad Cloud (netpad.io)                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              @netpad/cloud-features                  │    │
│  │  • Billing & Subscriptions (Stripe)                  │    │
│  │  • Atlas Cluster Provisioning                        │    │
│  │  • Application Marketplace                           │    │
│  │  • Waitlist Management                               │    │
│  │  • Admin Dashboard                                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│                    Extension System                          │
│                           │                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              netpad-3 (Public Core)                  │    │
│  │  • Form Builder                                      │    │
│  │  • Workflow Engine                                   │    │
│  │  • Template Gallery                                  │    │
│  │  • AI Features (basic)                               │    │
│  │  • Self-hosted Deployment                            │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Self-Hosted Deployment                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              netpad-3 (Public Core)                  │    │
│  │  • Form Builder                                      │    │
│  │  • Workflow Engine                                   │    │
│  │  • Template Gallery                                  │    │
│  │  • AI Features (all tiers)                           │    │
│  │  • No Billing                                        │    │
│  │  • No Marketplace                                    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Repository Structure

### Public Repository (netpad-3)

```
netpad-3/                          # GitHub: mongodb/netpad-3 (MIT)
├── src/
│   ├── app/                       # Next.js App Router
│   ├── components/                # React components
│   ├── lib/
│   │   ├── extensions/            # Extension system ⭐
│   │   │   ├── types.ts           # Extension interfaces
│   │   │   ├── registry.ts        # Extension registry
│   │   │   ├── loader.ts          # Dynamic loading
│   │   │   ├── hooks.ts           # React hooks
│   │   │   ├── CloudFeature.tsx   # Conditional rendering
│   │   │   └── index.ts           # Public API
│   │   ├── runtime/
│   │   │   └── deploymentMode.ts  # Mode detection
│   │   └── ...                    # Core libraries
│   └── types/
├── packages/                      # Public NPM packages
│   ├── templates/                 # @netpad/templates
│   ├── cli/                       # @netpad/cli
│   └── mcp-server/                # @netpad/mcp-server
└── templates/
    └── netpad-cloud/              # Private repo template
```

### Private Repository (netpad-cloud)

```
netpad-cloud/                      # GitHub: mongodb/netpad-cloud (Private)
├── src/
│   ├── index.ts                   # Extension registration
│   ├── billing/                   # Stripe integration
│   ├── atlas/                     # Atlas provisioning
│   ├── marketplace/               # App marketplace
│   ├── waitlist/                  # Waitlist management
│   └── admin/                     # Admin dashboard
├── package.json                   # @netpad/cloud-features
└── README.md
```

## Extension System

### How It Works

1. **Mode Detection**: On startup, NetPad checks `NETPAD_DEPLOYMENT_MODE`
2. **Dynamic Import**: In cloud mode, attempts to import `@netpad/cloud-features`
3. **Registration**: Cloud extension registers its features and services
4. **Feature Access**: Code checks feature availability before using cloud features

### Extension Interface

```typescript
interface NetPadExtension {
  metadata: {
    id: string;
    name: string;
    version: string;
  };

  // Features this extension provides
  features?: ExtensionFeature[];

  // Service implementations
  services?: {
    billing?: BillingService;
    atlasProvisioning?: AtlasProvisioningService;
    marketplace?: MarketplaceService;
    waitlist?: WaitlistService;
  };

  // Lifecycle hooks
  initialize?: () => Promise<void>;
  cleanup?: () => Promise<void>;
}
```

### Using Extensions in Code

#### Server-Side (API Routes)

```typescript
import { getBillingService, isFeatureAvailable } from '@/lib/extensions';

export async function POST(request: Request) {
  // Check if billing is available
  const billing = isFeatureAvailable('billing');
  if (!billing.available) {
    return Response.json(
      { error: 'Billing not available in self-hosted mode' },
      { status: 400 }
    );
  }

  // Get the service
  const billingService = getBillingService();
  if (!billingService) {
    return Response.json({ error: 'Billing service not configured' }, { status: 500 });
  }

  // Use the service
  const session = await billingService.createCheckoutSession({...});
  return Response.json(session);
}
```

#### Client-Side (React Components)

```typescript
import { CloudFeature, useExtensionFeature } from '@/lib/extensions';

// Option 1: Component wrapper
function SettingsPage() {
  return (
    <div>
      <GeneralSettings />

      <CloudFeature
        feature="billing"
        fallback={<SelfHostedBillingInfo />}
      >
        <BillingSettings />
      </CloudFeature>
    </div>
  );
}

// Option 2: Hook
function BillingButton() {
  const { available, loading } = useExtensionFeature('billing');

  if (loading) return <Spinner />;
  if (!available) return null;

  return <Button>Manage Subscription</Button>;
}
```

## Feature Separation

### What Stays in Public Repo

| Feature | Description |
|---------|-------------|
| Form Builder | Core form creation and editing |
| Workflow Engine | Workflow creation and execution |
| Template Gallery | Pre-built form templates |
| AI Features (basic) | Field suggestions, form generation |
| Database Connections | MongoDB vault and connections |
| Standalone Export | Export as Next.js app |
| Self-hosted Deployment | Docker, generic deployment |

### What Goes in Private Repo

| Feature | Description |
|---------|-------------|
| Billing | Stripe integration, subscriptions |
| Atlas Provisioning | Automatic M0 cluster setup |
| Application Marketplace | App submissions, approval workflow |
| Waitlist Management | Signups, approvals |
| Admin Dashboard | User/org management |
| Advanced Analytics | Usage reporting, metrics |
| Premium Support | Priority support tooling |

## Setting Up the Private Repo

### 1. Create the Private Repository

```bash
# Copy the template
cp -r netpad-3/templates/netpad-cloud ~/code/mongodb/netpad-cloud
cd ~/code/mongodb/netpad-cloud

# Initialize git
git init
git remote add origin git@github.com:mongodb/netpad-cloud.git

# Install dependencies
npm install

# Build
npm run build
```

### 2. Configure Private NPM Registry

Option A: GitHub Packages
```bash
# .npmrc in netpad-3
@netpad:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Option B: Private npm
```bash
npm login --registry=https://your-private-registry.com
npm publish
```

### 3. Configure Cloud Deployment

```bash
# Environment variables for cloud deployment
NETPAD_DEPLOYMENT_MODE=cloud

# Stripe
STRIPE_SECRET_KEY_LIVE=sk_live_...
STRIPE_WEBHOOK_SECRET_LIVE=whsec_...
STRIPE_PRICE_PRO_MONTHLY_LIVE=price_...

# Atlas
ATLAS_ORG_ID=...
ATLAS_PUBLIC_KEY=...
ATLAS_PRIVATE_KEY=...
```

### 4. Install in Cloud Deployment

```bash
# Install the private package
npm install @netpad/cloud-features

# The extension system will automatically load it
```

## Migration Guide

### Moving Existing Code to Private Repo

1. **Identify cloud-only code**:
   - `src/lib/platform/billing.ts` → `netpad-cloud/src/billing/`
   - `src/lib/atlas/` → `netpad-cloud/src/atlas/`
   - `src/lib/platform/waitlist.ts` → `netpad-cloud/src/waitlist/`

2. **Create service implementations**:
   - Implement the interfaces defined in `src/lib/extensions/types.ts`
   - Move the actual implementation code

3. **Update imports in public repo**:
   - Replace direct imports with extension service calls
   - Add feature availability checks

4. **Test both modes**:
   - Test with `NETPAD_DEPLOYMENT_MODE=cloud`
   - Test with `NETPAD_DEPLOYMENT_MODE=self-hosted`

### Example Migration: Billing

Before:
```typescript
// src/app/api/billing/checkout/route.ts
import { createCheckoutSession } from '@/lib/platform/billing';

export async function POST(request: Request) {
  const session = await createCheckoutSession({...});
  return Response.json(session);
}
```

After:
```typescript
// src/app/api/billing/checkout/route.ts
import { getBillingService, isFeatureAvailable } from '@/lib/extensions';

export async function POST(request: Request) {
  if (!isFeatureAvailable('billing').available) {
    return Response.json(
      { error: 'Billing not available' },
      { status: 400 }
    );
  }

  const billing = getBillingService();
  if (!billing) {
    return Response.json(
      { error: 'Billing service not configured' },
      { status: 500 }
    );
  }

  const session = await billing.createCheckoutSession({...});
  return Response.json(session);
}
```

## API Reference

### Extension Registry

```typescript
// Register an extension
registerExtension(extension: NetPadExtension): void

// Check feature availability
isFeatureAvailable(feature: ExtensionFeature): FeatureAvailability

// Get services
getBillingService(): BillingService | null
getAtlasProvisioningService(): AtlasProvisioningService | null
getMarketplaceService(): MarketplaceService | null
getWaitlistService(): WaitlistService | null

// Registry status
getRegistryStatus(): {
  extensionCount: number;
  extensions: ExtensionMetadata[];
  enabledFeatures: ExtensionFeature[];
  deploymentMode: string;
}
```

### React Hooks

```typescript
// Check single feature
useExtensionFeature(feature: ExtensionFeature): {
  available: boolean;
  loading: boolean;
  error: Error | null;
}

// Check multiple features
useExtensionFeatures(features: ExtensionFeature[]): {
  features: Record<ExtensionFeature, boolean>;
  loading: boolean;
  error: Error | null;
}

// Get service availability
useExtensionService(): {
  billing: FeatureAvailability;
  marketplace: FeatureAvailability;
  atlasProvisioning: FeatureAvailability;
  waitlist: FeatureAvailability;
  loading: boolean;
}

// Get deployment mode
useDeploymentMode(): {
  isCloud: boolean;
  isSelfHosted: boolean;
  loading: boolean;
}
```

### Components

```typescript
// Conditional rendering
<CloudFeature feature="billing" fallback={<Fallback />}>
  <BillingUI />
</CloudFeature>

// Cloud-only content
<CloudOnly>
  <CloudBanner />
</CloudOnly>

// Self-hosted only content
<SelfHostedOnly>
  <SetupGuide />
</SelfHostedOnly>

// Require feature with upgrade prompt
<RequireFeature
  feature="advanced_analytics"
  title="Analytics"
  description="Upgrade for analytics"
>
  <AnalyticsDashboard />
</RequireFeature>
```

## Troubleshooting

### Extension Not Loading

1. Check deployment mode:
   ```bash
   curl http://localhost:3000/api/extensions/status
   ```

2. Verify package is installed:
   ```bash
   npm ls @netpad/cloud-features
   ```

3. Check for import errors in console

### Feature Shows as Unavailable

1. Verify extension registered the feature
2. Check feature name matches exactly
3. Ensure extension initialized successfully

### Service Returns Null

1. Extension may not provide that service
2. Check extension is registered before accessing service
3. Verify initialization completed
