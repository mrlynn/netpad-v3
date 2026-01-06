# Scripts Directory

Utility scripts for NetPad development and deployment.

## Available Scripts

### `setup-it-helpdesk-standalone.js`

Creates a standalone, deployable version of the IT Help Desk example application.

**Usage:**
```bash
node scripts/setup-it-helpdesk-standalone.js [app-name]
```

**Example:**
```bash
# Create with default name (it-helpdesk-standalone)
node scripts/setup-it-helpdesk-standalone.js

# Create with custom name
node scripts/setup-it-helpdesk-standalone.js my-it-helpdesk
```

**What it does:**
1. Copies the IT Help Desk example from `examples/it-helpdesk/` to `/Users/michael.lynn/code/[app-name]`
2. Updates `package.json` to use published `@netpad/forms` package (instead of local file reference)
3. Creates `.env.example` template for configuration
4. Creates `.gitignore` for version control
5. Creates `vercel.json` for Vercel deployment
6. Updates README with standalone setup instructions
7. Creates `SETUP.md` with detailed instructions
8. Installs dependencies automatically

**Output:**
- Creates a fully functional Next.js application ready for testing and deployment
- All files are copied and configured
- Dependencies are installed
- Ready to run with `npm run dev`

### `verify-article-links.js`

Verifies all external links in the IT Help Desk article.

**Usage:**
```bash
node scripts/verify-article-links.js
```

**What it does:**
- Tests all GitHub repository links
- Tests external links (netpad.io, docs.netpad.io)
- Tests NPM package links
- Reports broken links and redirects
- Provides summary statistics

## Other Scripts

- `generate-favicon-simple.js` - Generate favicon files
- `generate-favicon.ts` - TypeScript version of favicon generator
- `setup-stripe-products.ts` - Setup Stripe products for billing
- `import-example-forms.ts` - Import example forms into NetPad
- `seed-test-database.ts` - Seed test database with sample data
