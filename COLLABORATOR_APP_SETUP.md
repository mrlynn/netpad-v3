# Collaborator Application - Complete Setup Guide

I've created a comprehensive setup script that will get your collaborator application working end-to-end. This script handles all the complexity of setting up the organization, project, application, connection vault, and form.

## Quick Start

```bash
# 1. Make sure your form definition is accessible
# The script will look for it in:
#   - Project root: collaborator-interest-form-definition.json
#   - Downloads folder: ~/Downloads/collaborator-interest-form-definition.json
#   - Or it will use a default definition

# 2. Run the setup script
npx tsx scripts/setup-collaborator-app.ts
```

## What the Script Does

The script automatically:

1. ✅ **Creates Organization** - Sets up `collaborator-app` organization
2. ✅ **Creates Project** - Sets up `collaborator-project` within the org
3. ✅ **Creates Application** - Sets up `collaborator-recruitment` application
4. ✅ **Sets up Connection Vault** - Encrypts and stores MongoDB connection
5. ✅ **Creates Form** - Uses your form definition with conversational config
6. ✅ **Configures DataSource** - Links form to MongoDB connection vault
7. ✅ **Publishes Form** - Makes it publicly accessible
8. ✅ **Verifies Setup** - Tests connections and confirms everything works

## Environment Variables Required

Your `.env.local` should have:

```bash
MONGODB_URI=mongodb+srv://...          # Platform database (you have this)
PLATFORM_DB_NAME=form_builder_platform # Default database name
TARGET_MONGODB_URI=mongodb+srv://...   # Where submissions go (can be same)
TARGET_DATABASE=netpad_platform        # Target database name
VAULT_ENCRYPTION_KEY=...                # You have this set ✅
```

## After Running the Script

The script will output:
- Organization ID
- Project ID  
- Application ID
- Connection Vault ID
- Form ID and Slug
- **Form URL** (e.g., `/forms/collaborator-interest-form`)

## Testing the Application

1. **Start your dev server** (if not running):
   ```bash
   npm run dev
   ```

2. **Visit the form**:
   ```
   http://localhost:3000/forms/collaborator-interest-form
   ```

3. **Test conversational mode**:
   - The form should load with conversational AI
   - Try having a conversation
   - Submit the form
   - Check that submission is saved to MongoDB

## Viewing Submissions

Submissions are saved to:
- **Database**: `{TARGET_DATABASE}` (default: `netpad_platform`)
- **Collection**: `collaborator_submissions`

Each submission includes:
- All form field data
- Full conversation transcript
- Topic coverage
- Confidence scores
- Metadata (timestamps, turn count, etc.)

## Common Issues & Fixes

### Issue: "VAULT_ENCRYPTION_KEY not set"
**Fix**: You already have this set, so this shouldn't happen. If it does, check `.env.local` is being loaded.

### Issue: "Form not found" when accessing URL
**Fix**: 
1. Check the form slug matches: `collaborator-interest-form`
2. Verify form is published: `isPublished: true`
3. Check form is in org database: `org_{orgId}.forms` collection

### Issue: Submissions not saving
**Fix**:
1. Verify `TARGET_MONGODB_URI` is correct
2. Check connection vault has collection in `allowedCollections`
3. Verify target database/collection exists

### Issue: Conversational form not working
**Fix**:
1. Check `conversationalConfig` is set on the form
2. Verify AI service is configured (OPENAI_API_KEY or other provider)
3. Check browser console for errors
4. Verify `/api/demo/conversational-stream` endpoint works

## Manual Verification

If you want to verify everything manually:

```javascript
// In MongoDB shell or Compass
use form_builder_platform

// Check organization
db.organizations.findOne({ slug: 'collaborator-app' })

// Check form (replace orgId with actual org ID)
use org_<orgId>
db.forms.findOne({ slug: 'collaborator-interest-form' })

// Check connection vault
db.connection_vault.findOne({ organizationId: '<orgId>' })

// Check submissions
use netpad_platform  // or your TARGET_DATABASE
db.collaborator_submissions.find().limit(5)
```

## Next Steps

Once the application is working:

1. **Customize the form** - Edit field configs, validation, etc.
2. **Add workflows** - Set up email notifications, data transformations
3. **Style the form** - Customize theme, branding
4. **Add more forms** - Create additional forms in the same application

## Files Created

- `scripts/setup-collaborator-app.ts` - Main setup script
- `scripts/SETUP_COLLABORATOR_APP.md` - Detailed documentation
- `COLLABORATOR_APP_SETUP.md` - This file

## Support

If you encounter issues:

1. Check the script output for error messages
2. Verify all environment variables are set
3. Check MongoDB connection strings are valid
4. Review the troubleshooting section above

The script is designed to be idempotent - you can run it multiple times safely. It will update existing resources rather than creating duplicates.
