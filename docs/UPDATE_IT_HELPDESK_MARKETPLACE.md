# How to Update the IT Helpdesk Marketplace Entry

This guide explains how to update the IT Helpdesk Application entry in the NetPad marketplace.

## Overview

There are **four ways** to update a marketplace entry:

1. **Via UI** - Use "My Applications" view (easiest for metadata updates)
2. **Via API** - Use the PUT endpoint (for programmatic updates)
3. **Via Publishing New Release** - Publish a new version from your Application (updates bundle content)
4. **Via Seed Script** - Use the marketplace seed script (for initial setup or major updates)

---

## Option 1: Update via UI (Recommended for Metadata)

### Steps

1. **Navigate to My Applications**
   - Go to **Marketplace** → **My Applications** (or directly to `/marketplace/my-applications`)
   - Or visit: `https://netpad.io/marketplace/my-applications`

2. **Find IT Helpdesk Application**
   - Locate the "IT Help Desk" application in your list
   - Click the **⋮** (three dots) menu in the top-right corner of the card

3. **Edit Application**
   - Click **Edit** from the menu
   - This opens the `ApplicationPublishDialog` where you can update:
     - **Summary** - Short description
     - **Tags** - Searchable tags (e.g., `helpdesk`, `it-support`, `ticketing`)
     - **Category** - Application category (e.g., `helpdesk`)
     - **Publish Status** - Toggle published/unpublished

4. **Save Changes**
   - Click **Update** to save your changes
   - The PUT API endpoint (`/api/marketplace/applications/[id]`) will be called

### What Gets Updated

- ✅ `manifest.summary` - Short description
- ✅ `manifest.tags` - Array of tags
- ✅ `manifest.category` - Category
- ✅ `published` - Published status (visible in marketplace)

### Limitations

- ❌ Does NOT update the bundle (forms/workflows content)
- ❌ Does NOT update the version number
- ❌ Does NOT update screenshots or detailed documentation

**For bundle updates, use Option 3 (Publish New Release).**

---

## Option 2: Update via API (Programmatic Updates)

### API Endpoint

```http
PUT /api/marketplace/applications/[id]
Authorization: Bearer <your-session-cookie>
Content-Type: application/json
```

### Example Request

```bash
curl -X PUT https://netpad.io/api/marketplace/applications/app_it-helpdesk \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "published": true,
    "marketplace": {
      "summary": "Complete IT support ticketing system with ticket submission, search, automated routing, and Slack notifications",
      "tags": ["helpdesk", "it-support", "ticketing", "automation", "workflow"],
      "category": "helpdesk"
    }
  }'
```

### JavaScript/TypeScript Example

```typescript
const response = await fetch(`/api/marketplace/applications/${applicationId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Include session cookie
  body: JSON.stringify({
    published: true,
    marketplace: {
      summary: 'Updated summary text',
      tags: ['helpdesk', 'it-support', 'ticketing', 'automation'],
      category: 'helpdesk',
    },
  }),
});

const result = await response.json();
```

### Request Body

```typescript
{
  published?: boolean;              // Toggle published/unpublished
  marketplace?: {
    summary?: string;               // Short description
    tags?: string[];                // Array of tags
    category?: string;              // Category
  };
}
```

### Response

```typescript
{
  success: true,
  application: {
    id: string;
    name: string;
    published: boolean;
    publishedAt?: string;
    manifest: {
      summary: string;
      tags: string[];
      category: string;
    };
  };
}
```

---

## Option 3: Update via Publishing New Release (Bundle Updates)

This is the **recommended way** to update the actual Application content (forms, workflows, connections).

### Steps

1. **Update Your Application**
   - Make changes to forms/workflows in your IT Helpdesk Application
   - Test thoroughly

2. **Create a New Release**
   - Open your IT Helpdesk Application
   - Go to **Releases** tab
   - Click **Create Release**
   - NetPad will suggest the next version (e.g., `2.0.0` → `2.1.0` for minor updates)
   - Add a changelog describing the updates

3. **Publish to Marketplace**
   - Click **Publish to Marketplace** (or use the publish button on the release)
   - Fill in marketplace metadata:
     - Summary
     - Tags
     - Category
   - Click **Publish**

### What Gets Updated

- ✅ **Bundle Content** - Forms, workflows, connections (from the release)
- ✅ **Version** - New version number (e.g., `2.0.0` → `2.1.0`)
- ✅ **Version History** - Previous versions are preserved
- ✅ **Manifest** - Can update summary, tags, category during publish
- ✅ **Changelog** - Documented in version history

### API Endpoint Used

```http
POST /api/marketplace/applications
```

### Request Body

```typescript
{
  orgId: string;
  projectId: string;
  applicationId: string;
  releaseId: string;              // The release to publish
  manifest?: {                    // Optional metadata overrides
    summary?: string;
    tags?: string[];
    category?: string;
  };
}
```

---

## Option 4: Update via Seed Script (Initial Setup / Major Overhauls)

For initial marketplace seeding or major updates, you can use the seed script.

### Prerequisites

1. Ensure your IT Helpdesk Application bundle is up to date:
   - `examples/it-helpdesk/templates/manifest.json`
   - `examples/it-helpdesk/templates/form.json`
   - `examples/it-helpdesk/templates/search-form.json`
   - `examples/it-helpdesk/templates/workflow.json`

2. Set environment variables:
   ```bash
   export MONGODB_URI="mongodb+srv://..."
   export PLATFORM_DB_NAME="form_builder_platform"  # Optional
   ```

### Run the Script

```bash
# From project root
npm run seed:marketplace

# Or directly
npx tsx scripts/seed-marketplace.ts
```

### What the Script Does

1. **Loads Application Bundle**
   - Reads `manifest.json` from `examples/it-helpdesk/templates/`
   - Loads all forms and workflows
   - Detects and creates connections

2. **Publishes to Marketplace**
   - Creates or updates entry in `marketplace_applications` collection
   - Sets status to `approved` and `published: true` (for seed scripts)
   - Uses the `publishedBy` user ID from environment or defaults

3. **Idempotent**
   - Running multiple times will update existing entries
   - Uses application ID to find existing entries

### Update the Seed Script

To modify how the IT Helpdesk is seeded, edit `scripts/seed-marketplace.ts`:

```typescript
// Find the IT Helpdesk loading function
async function loadITHelpdeskBundle(): Promise<BundleExport> {
  // Modify manifest, forms, workflows here
  // ...
}

// Then call it in the seed function
const itHelpdeskBundle = await loadITHelpdeskBundle();
await publishApplication(collection, itHelpdeskBundle, {
  publishedBy: 'seed-script-user-id',
  status: 'approved',
  published: true,
});
```

---

## Which Method Should I Use?

| Use Case | Recommended Method |
|----------|-------------------|
| **Update description/tags/category** | Option 1 (UI) or Option 2 (API) |
| **Update forms/workflows content** | Option 3 (Publish New Release) |
| **Initial marketplace setup** | Option 4 (Seed Script) |
| **Major overhaul / reset** | Option 4 (Seed Script) |
| **Automated updates** | Option 2 (API) |
| **Version new features** | Option 3 (Publish New Release) |

---

## Common Tasks

### Update Description and Tags

**Via UI:**
1. Marketplace → My Applications
2. Click ⋮ → Edit
3. Update Summary and Tags
4. Save

**Via API:**
```bash
curl -X PUT /api/marketplace/applications/app_it-helpdesk \
  -d '{"marketplace": {"summary": "New description", "tags": ["tag1", "tag2"]}}'
```

### Unpublish Application

**Via UI:**
1. Marketplace → My Applications
2. Click ⋮ → Unpublish

**Via API:**
```bash
curl -X PUT /api/marketplace/applications/app_it-helpdesk \
  -d '{"published": false}'
```

### Publish New Version

1. Update your Application (forms/workflows)
2. Create a new Release (e.g., `2.1.0`)
3. Click "Publish to Marketplace" on the release
4. Update metadata if needed
5. Publish

### Delete Application

**Via UI:**
1. Marketplace → My Applications
2. Click ⋮ → Delete
3. Confirm deletion

**Via API:**
```bash
curl -X DELETE /api/marketplace/applications/app_it-helpdesk
```

**Note:** Only the publisher can delete their applications.

---

## Troubleshooting

### "Only the publisher can update this application"

- **Cause:** You're not the user who originally published the application
- **Solution:** Log in as the original publisher, or have them update it

### Changes Not Showing in Marketplace

- **Cause:** Application might be unpublished or pending review
- **Solution:** Check `published: true` and `status: 'approved'` in the database

### Bundle Not Updating

- **Cause:** Using Option 1/2 only updates metadata, not bundle content
- **Solution:** Use Option 3 (Publish New Release) to update bundle

### Version Not Incrementing

- **Cause:** Publishing same release twice
- **Solution:** Create a new Release first, then publish that release

---

## API Reference Summary

### PUT `/api/marketplace/applications/[id]`
Update metadata (summary, tags, category, published status)

### POST `/api/marketplace/applications`
Publish from a release (updates bundle + version)

### DELETE `/api/marketplace/applications/[id]`
Delete application listing

### GET `/api/marketplace/applications?publishedBy=[userId]`
List user's published applications

---

## Database Structure

Marketplace applications are stored in the `marketplace_applications` collection:

```typescript
{
  id: string;                      // "app_it-helpdesk" or generated ID
  manifest: {
    name: string;
    version: string;
    description: string;
    summary?: string;
    tags: string[];
    category: string;
    // ... other manifest fields
  };
  bundle: {
    forms: FormDefinition[];
    workflows: WorkflowDefinition[];
    connections: ConnectionDefinition[];
  };
  published: boolean;
  status: 'pending' | 'approved' | 'rejected';
  publishedAt?: string;
  publishedBy: string;
  versions?: Array<{
    version: string;
    releaseId?: string;
    publishedAt: Date;
    changelog?: string[];
  }>;
  latestVersion: string;
  stats: {
    downloads: number;
    rating?: number;
    reviews: number;
  };
}
```

---

## Related Documentation

- [Marketplace Publishing Spec](../PHASE5_SPEC.md)
- [Application Portability Spec](../APPLICATION_PORTABILITY_SPEC.md)
- [IT Helpdesk Article](./internal/it-helpdesk-article.md)
- [Marketplace Seed Script README](../../scripts/README-MARKETPLACE-SEED.md)
