# @netpad/collaborate

Community collaboration and contribution features for NetPad.

## Overview

The `@netpad/collaborate` extension provides:

- **Collaborator Intake**: Form and API for collecting collaboration applications
- **Community Gallery**: Showcase of community-built templates and workflows
- **Contributor Leaderboard**: Recognition for community contributors
- **Notification System**: Email notifications for new submissions

## Installation

```bash
npm install @netpad/collaborate
```

## Configuration

Enable the extension by adding it to your `NETPAD_EXTENSIONS` environment variable:

```env
NETPAD_EXTENSIONS=@netpad/collaborate
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `COLLABORATE_NOTIFICATION_EMAIL` | Email address for notifications | No |
| `RESEND_API_KEY` | Resend API key for sending emails | No |

## API Routes

All routes are prefixed with `/api/ext/collaborate/`:

### GET /api/ext/collaborate/gallery

Get community gallery items.

**Query Parameters:**
- `category` - Filter by category: `template`, `workflow`, `integration`, `app`
- `featured` - Filter featured items: `true` or `false`
- `limit` - Number of items (default: 20)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "items": [...],
  "total": 100
}
```

### GET /api/ext/collaborate/contributors

Get contributor leaderboard.

**Query Parameters:**
- `limit` - Number of contributors (default: 10)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "contributors": [...],
  "total": 50
}
```

### POST /api/ext/collaborate/notify

Send notification for new collaborator submission.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "lane": "engineering",
  "shipped": "Built a SaaS product...",
  "whyNetpad": "I love the MongoDB-native approach..."
}
```

### POST /api/ext/collaborate/submit

Submit a collaboration application.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "lane": "engineering",
  "shipped": "...",
  "whyNetpad": "...",
  "availability": "5-10 hrs/week",
  "location": "EST timezone",
  "workLinks": "https://github.com/johndoe"
}
```

## Usage in Code

### Checking Feature Availability

```typescript
import { isFeatureAvailable } from '@/lib/extensions';

const collaborateAvailable = isFeatureAvailable('custom:collaborate');
if (collaborateAvailable.available) {
  // Collaborate features are available
}
```

### Using React Hooks

```typescript
import { useExtensionFeature } from '@/lib/extensions/hooks';

function MyComponent() {
  const { available, loading } = useExtensionFeature('custom:collaborate');

  if (loading) return <Spinner />;
  if (!available) return <UpgradePrompt />;

  return <CollaborateFeatures />;
}
```

## Creating Your Own Extension

Use this package as a template for creating your own NetPad extensions:

1. **Create package structure:**
   ```
   packages/my-extension/
   ├── package.json
   ├── tsconfig.json
   ├── tsup.config.ts
   └── src/
       ├── index.ts
       ├── types/
       │   └── index.ts
       └── components/
           └── index.ts
   ```

2. **Implement the extension interface:**
   ```typescript
   import type { NetPadExtension } from '@netpad/core/extensions';

   export const myExtension: NetPadExtension = {
     metadata: {
       id: 'my-extension',
       name: 'My Extension',
       version: '1.0.0',
     },
     features: ['custom:my_feature'],
     routes: [
       {
         path: '/api/ext/my-extension/endpoint',
         method: 'GET',
         handler: async (request) => {
           return NextResponse.json({ hello: 'world' });
         },
       },
     ],
     initialize: async () => {
       console.log('Extension initialized');
     },
   };

   export default myExtension;
   ```

3. **Register your extension:**
   ```env
   NETPAD_EXTENSIONS=@netpad/my-extension
   ```

## Development

```bash
# Build the package
npm run build

# Watch mode
npm run dev

# Type check
npm run typecheck
```

## License

MIT
