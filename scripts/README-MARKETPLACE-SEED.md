# Marketplace Seed Script

## Overview

The marketplace seed script populates the marketplace with example applications that users can discover and import.

## Usage

```bash
# Run the seed script
npm run seed:marketplace

# Or directly with tsx
npx tsx scripts/seed-marketplace.ts
```

## What It Does

1. **Loads Example Applications**: Reads application bundles from the `examples/` directory
2. **Creates Marketplace Entries**: Publishes applications to the `marketplace_applications` collection
3. **Detects Connections**: Automatically detects and creates form-workflow connections
4. **Updates References**: Resolves form references in workflow nodes

## Example Applications Included

### IT Help Desk (Currently Implemented)
- **Forms**: 2 (ticket submission, ticket search)
- **Workflows**: 1 (automated routing)
- **Connections**: 1 (form submission → workflow routing)
- **Category**: helpdesk
- **Tags**: helpdesk, it-support, ticketing, automation

## Adding More Applications

To add more example applications:

1. **Create Application Bundle** in `examples/[app-name]/templates/`:
   - `manifest.json` - Application metadata
   - `form.json` - Form definitions (can have multiple)
   - `workflow.json` - Workflow definitions (can have multiple)

2. **Update Seed Script** (`scripts/seed-marketplace.ts`):
   - Add a function like `load[AppName]Bundle()` that:
     - Loads the manifest and assets
     - Creates `FormDefinition[]` and `WorkflowDefinition[]`
     - Detects and creates `FormWorkflowConnection[]`
     - Returns a complete `BundleExport`

3. **Call in Seed Function**:
   ```typescript
   const appBundle = await load[AppName]Bundle();
   await publishApplication(collection, appBundle);
   ```

## Database Structure

Applications are stored in the `marketplace_applications` collection:

```typescript
{
  id: string;                    // Unique app ID (e.g., "it-helpdesk-v1")
  manifest: ApplicationManifest; // Full manifest with metadata
  bundle: BundleExport;          // Complete bundle (forms, workflows, connections)
  published: boolean;            // Published status
  publishedAt?: string;          // Publication date
  publishedBy?: string;          // User ID who published
  stats: {
    downloads: number;           // Download count
    rating?: number;             // Average rating
    reviews: number;             // Review count
  };
  createdAt: string;
  updatedAt: string;
}
```

## Environment Variables Required

- `MONGODB_URI` - MongoDB connection string
- `PLATFORM_DB_NAME` - Platform database name (optional, defaults to `form_builder_platform`)

## Notes

- The script is idempotent - running it multiple times will update existing applications
- Applications are published immediately (no moderation queue)
- Form IDs in workflows are automatically resolved during seeding
- The script uses the platform database (shared across all organizations)
