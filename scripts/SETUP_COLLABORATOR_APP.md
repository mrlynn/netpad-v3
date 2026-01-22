# Setup Collaborator Application

This script sets up the complete collaborator application end-to-end, including:
- Organization, Project, and Application creation
- MongoDB connection vault setup
- Form creation with conversational AI configuration
- Form publishing

## Prerequisites

1. **Environment Variables** - Make sure `.env.local` has:
   ```bash
   MONGODB_URI=mongodb://...          # Platform database
   PLATFORM_DB_NAME=form_builder_platform
   TARGET_MONGODB_URI=mongodb://...   # Where submissions go (can be same as MONGODB_URI)
   TARGET_DATABASE=netpad_platform    # Target database name
   VAULT_ENCRYPTION_KEY=...            # Required for connection vault encryption
   ```

2. **Generate Encryption Key** (if not set):
   ```bash
   openssl rand -base64 32
   ```
   Add to `.env.local` as `VAULT_ENCRYPTION_KEY`

3. **Form Definition** (optional):
   - Place `collaborator-interest-form-definition.json` in the project root
   - If not found, the script will use a default definition

## Running the Script

```bash
# From the project root
npx tsx scripts/setup-collaborator-app.ts
```

## What It Does

1. **Creates Organization** (`collaborator-app`)
   - If it already exists, uses the existing one

2. **Creates Project** (`collaborator-project`)
   - Linked to the organization

3. **Creates Application** (`collaborator-recruitment`)
   - Linked to the project

4. **Sets up Connection Vault**
   - Encrypts and stores MongoDB connection string
   - Configures allowed collections

5. **Creates/Updates Form**
   - Uses form definition from JSON file or default
   - Configures conversational AI settings
   - Links to connection vault (dataSource)
   - Publishes the form

6. **Verifies Setup**
   - Tests target MongoDB connection
   - Verifies form is published

## Output

The script will print:
- Organization ID
- Project ID
- Application ID
- Connection Vault ID
- Form ID and Slug
- Form URL (e.g., `/forms/collaborator-interest-form`)

## Troubleshooting

### "VAULT_ENCRYPTION_KEY not set"
- Generate a key: `openssl rand -base64 32`
- Add to `.env.local`

### "Form not found" after setup
- Check that the form was created in the org database
- Verify `isPublished: true` in the form document
- Check the form slug matches what you're accessing

### "Connection vault not found"
- The vault is stored in `org_{orgId}_connection_vault` collection
- Verify the organization ID is correct

### Submissions not saving
- Check target MongoDB connection string is correct
- Verify the collection name matches (`collaborator_submissions`)
- Check connection vault has the collection in `allowedCollections`

## Next Steps

After running the script:

1. **Test the Form**:
   - Visit: `http://localhost:3000/forms/collaborator-interest-form`
   - Try submitting via conversational mode

2. **Check Submissions**:
   - Submissions are saved to: `{TARGET_DATABASE}.collaborator_submissions`
   - Each submission includes full conversation transcript

3. **View in Dashboard**:
   - Navigate to your organization → project → application
   - View form responses

## Manual Verification

If you want to verify the setup manually:

```javascript
// Connect to MongoDB
const client = new MongoClient(MONGODB_URI);
await client.connect();

// Check organization
const org = await client.db('form_builder_platform')
  .collection('organizations')
  .findOne({ slug: 'collaborator-app' });

// Check form (in org database)
const form = await client.db(org.orgId)
  .collection('forms')
  .findOne({ slug: 'collaborator-interest-form' });

// Check connection vault
const vault = await client.db(org.orgId)
  .collection('connection_vault')
  .findOne({ organizationId: org.orgId });

console.log({ org, form, vault });
```
