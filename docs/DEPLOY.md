# Deploying NetPad to Vercel

This guide walks you through deploying your own NetPad instance to Vercel.

## One-Click Deploy

The fastest way to get started:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmrlynn%2Fnetpad-v3&env=MONGODB_URI,SESSION_SECRET,VAULT_ENCRYPTION_KEY&envDescription=Required%20environment%20variables%20for%20NetPad&envLink=https%3A%2F%2Fgithub.com%2Fmrlynn%2Fnetpad-v3%2Fblob%2Fmain%2Fdocs%2FDEPLOY.md&project-name=my-netpad&repository-name=my-netpad&demo-title=NetPad&demo-description=MongoDB-connected%20forms%2C%20workflows%2C%20and%20data%20explorer&demo-url=https%3A%2F%2Fnetpad.io)

## Prerequisites

Before deploying, you'll need:

1. **A Vercel Account** - [Sign up for free](https://vercel.com/signup)
2. **A MongoDB Atlas Account** - [Sign up for free](https://www.mongodb.com/cloud/atlas/register)
3. **A GitHub Account** - To fork and manage your NetPad instance

## Required Environment Variables

These environment variables **must** be configured for NetPad to work:

| Variable | Description | How to Generate |
|----------|-------------|-----------------|
| `MONGODB_URI` | MongoDB connection string | [Get from MongoDB Atlas](#setting-up-mongodb-atlas) |
| `SESSION_SECRET` | 32+ character secret for sessions | `openssl rand -hex 32` |
| `VAULT_ENCRYPTION_KEY` | Base64 key for vault encryption | `openssl rand -base64 32` |

## Optional Environment Variables

These variables enable additional features:

| Variable | Description | Required For |
|----------|-------------|--------------|
| `MONGODB_DATABASE` | Database name (default: `forms`) | Custom database name |
| `NEXT_PUBLIC_APP_URL` | Public URL of your app | OAuth callbacks |
| `APP_URL` | Server-side URL | Webhooks, cron jobs |
| `OPENAI_API_KEY` | OpenAI API key | AI form/workflow generation |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token | File uploads |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Google login |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | Google login |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID | GitHub login |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth secret | GitHub login |
| `SMTP_HOST` | SMTP server host | Magic link emails |
| `SMTP_PORT` | SMTP server port | Magic link emails |
| `SMTP_USER` | SMTP username | Magic link emails |
| `SMTP_PASS` | SMTP password | Magic link emails |
| `FROM_EMAIL` | Email sender address | Magic link emails |
| `STRIPE_SECRET_KEY` | Stripe secret key | Billing features |
| `STRIPE_PUBLISHABLE_KEY` | Stripe public key | Billing features |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | Billing features |

## Setting Up MongoDB Atlas

1. **Create a Cluster**
   - Go to [MongoDB Atlas](https://cloud.mongodb.com)
   - Create a new project (or use existing)
   - Click "Build a Database"
   - Choose **M0 (Free)** for testing or **M2/M5** for production
   - Select a cloud provider and region close to your Vercel deployment

2. **Create a Database User**
   - Go to Security → Database Access
   - Click "Add New Database User"
   - Choose password authentication
   - Note the username and password

3. **Configure Network Access**
   - Go to Security → Network Access
   - Click "Add IP Address"
   - For development: "Allow Access from Anywhere" (0.0.0.0/0)
   - For production: Add Vercel's IP ranges or use private networking

4. **Get Connection String**
   - Go to Databases → Connect
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Add your database name: `mongodb+srv://.../<database>?retryWrites=true&w=majority`

## Step-by-Step Deployment

### Step 1: Fork the Repository

1. Go to [github.com/mrlynn/netpad-v3](https://github.com/mrlynn/netpad-v3)
2. Click "Fork" to create your own copy
3. This allows you to customize and update your instance

### Step 2: Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your forked repository
3. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: (leave empty)
   - **Build Command**: `npm run build`
   - **Output Directory**: (leave empty, uses default)

### Step 3: Configure Environment Variables

In Vercel project settings → Environment Variables, add:

```bash
# Required
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/forms?retryWrites=true&w=majority
SESSION_SECRET=<generate with: openssl rand -hex 32>
VAULT_ENCRYPTION_KEY=<generate with: openssl rand -base64 32>

# Recommended
MONGODB_DATABASE=forms
NEXT_PUBLIC_APP_URL=${VERCEL_URL}
APP_URL=${VERCEL_URL}
```

### Step 4: Deploy

1. Click "Deploy"
2. Wait for the build to complete (~2-3 minutes)
3. Visit your deployment URL

### Step 5: Verify Deployment

Check the health endpoint:
```
https://your-app.vercel.app/api/v1/health
```

You should see:
```json
{
  "status": "healthy",
  "api": { "status": "operational", "responseTimeMs": 10 },
  "database": { "status": "connected", "responseTimeMs": 50 }
}
```

## Enabling Features

### OAuth Login (Google/GitHub)

1. **Google OAuth**
   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `https://your-app.vercel.app/api/auth/google/callback`
   - Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to Vercel

2. **GitHub OAuth**
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Create new OAuth App
   - Set callback URL: `https://your-app.vercel.app/api/auth/github/callback`
   - Add `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` to Vercel

### Magic Link Email Login

1. Set up an SMTP provider (SendGrid, Postmark, Gmail, etc.)
2. Add SMTP environment variables:
   ```bash
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASS=your-api-key
   FROM_EMAIL=noreply@yourdomain.com
   ```

### AI Features

1. Get an OpenAI API key from [platform.openai.com](https://platform.openai.com)
2. Add `OPENAI_API_KEY` to Vercel environment variables

### File Uploads

1. In Vercel dashboard, go to Storage → Create Database → Blob
2. Copy the `BLOB_READ_WRITE_TOKEN`
3. Add it to your environment variables

### Billing (Stripe)

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
3. Add to environment variables:
   ```bash
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

## Workflow Processing (Cron)

NetPad uses Vercel Cron to process background workflows. This is automatically configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/workflows/process?count=5",
      "schedule": "* * * * *"
    }
  ]
}
```

Note: Vercel Cron requires a Pro plan or higher for production use.

## Custom Domain

1. Go to your Vercel project → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update environment variables:
   ```bash
   NEXT_PUBLIC_APP_URL=https://your-domain.com
   APP_URL=https://your-domain.com
   ```

## Updating Your Instance

To update to the latest NetPad version:

1. **If you forked the repo:**
   ```bash
   git fetch upstream
   git merge upstream/main
   git push
   ```
   Vercel will automatically redeploy.

2. **Using Vercel CLI:**
   ```bash
   vercel deploy --prod
   ```

## Troubleshooting

### "Database connection failed"

- Verify `MONGODB_URI` is correct
- Check network access rules in MongoDB Atlas
- Ensure database user has correct permissions

### "Session error" or "Authentication failed"

- Ensure `SESSION_SECRET` is at least 32 characters
- Regenerate and redeploy if compromised

### "Vault encryption failed"

- Verify `VAULT_ENCRYPTION_KEY` is valid base64
- Must be exactly 32 bytes when decoded

### "OAuth callback error"

- Check callback URLs match your deployment domain
- Ensure client ID and secret are correct

### Build fails

- Check Node.js version (requires 18+)
- Review build logs for specific errors
- Ensure all required environment variables are set

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel Deployment                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Next.js    │  │ Vercel Cron │  │   Vercel Blob       │ │
│  │  App        │  │ (workflows) │  │   (file storage)    │ │
│  └──────┬──────┘  └──────┬──────┘  └─────────────────────┘ │
└─────────┼────────────────┼──────────────────────────────────┘
          │                │
          ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│              MongoDB Atlas                                   │
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │ Platform DB     │  │ Customer Databases              │  │
│  │ (forms, users)  │  │ (form submissions, workflows)   │  │
│  └─────────────────┘  └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Support

- **Documentation**: [docs.netpad.io](https://docs.netpad.io)
- **GitHub Issues**: [github.com/mrlynn/netpad-v3/issues](https://github.com/mrlynn/netpad-v3/issues)
- **Community**: [Discord](https://discord.gg/netpad)

## Security Considerations

- **Never commit secrets** to your repository
- **Use environment variables** for all sensitive data
- **Enable 2FA** on MongoDB Atlas and Vercel accounts
- **Restrict network access** in production
- **Regularly rotate** session secrets and encryption keys
- **Monitor** your MongoDB Atlas usage and alerts
