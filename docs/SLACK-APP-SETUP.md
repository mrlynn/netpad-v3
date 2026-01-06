# Creating a Distributable Slack App for NetPad

This guide walks you through creating a Slack app that can be installed by other users/workspaces.

## Overview

A distributable Slack app uses OAuth 2.0 to allow multiple Slack workspaces to install your app. Each workspace gets its own access token that you store securely.

## Step 1: Create Your Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"**
3. Choose **"From scratch"**
4. Enter:
   - **App Name**: NetPad (or your app name)
   - **Pick a workspace**: Your development workspace
   - Click **"Create App"**

## Step 2: Configure OAuth & Permissions

### Basic Information
1. In your app settings, go to **"Basic Information"**
2. Add:
   - **App Icon**: Upload a logo (512x512px recommended)
   - **Short Description**: "MongoDB forms and workflows"
   - **Long Description**: Detailed description of what your app does

### OAuth & Permissions
1. Go to **"OAuth & Permissions"** in the sidebar
2. Scroll to **"Redirect URLs"**
3. Add your redirect URL:
   ```
   https://yourdomain.com/api/integrations/slack/oauth/callback
   ```
   (Replace with your actual domain)

4. Scroll to **"Scopes"** → **"Bot Token Scopes"** and add:
   - `chat:write` - Send messages to channels
   - `chat:write.public` - Send messages without joining channel
   - `channels:read` - View basic channel info
   - `channels:history` - View messages in public channels
   - `users:read` - View people in workspace
   - `files:write` - Upload files
   - (Add more as needed for your use case)

5. **User Token Scopes** (if needed):
   - `channels:read` - View channels user is in
   - `chat:write` - Send messages as user

### App Distribution
1. Go to **"Manage Distribution"** in the sidebar
2. Click **"Add to Slack"** button (for testing)
3. For public distribution:
   - Fill out **"App Directory Listing"**
   - Submit for review (if making public)

## Step 3: Get Your Credentials

1. Go to **"Basic Information"** → **"App Credentials"**
2. Note down:
   - **Client ID** (starts with `123456789.`)
   - **Client Secret**
   - **Signing Secret** (for verifying requests from Slack)

3. Add these to your environment variables:
   ```bash
   SLACK_CLIENT_ID=your_client_id
   SLACK_CLIENT_SECRET=your_client_secret
   SLACK_SIGNING_SECRET=your_signing_secret
   ```

## Step 4: Implement OAuth Flow

The OAuth flow has 3 steps:

1. **Initiate OAuth** - Redirect user to Slack authorization
2. **Handle Callback** - Exchange code for access token
3. **Store Credentials** - Save token securely per workspace

## Step 5: Install App in Workspaces

Users install your app by:
1. Visiting your installation URL: `https://yourdomain.com/integrations/slack/install`
2. Clicking "Add to Slack"
3. Authorizing permissions
4. Being redirected back with the workspace connected

## Security Considerations

- **Never expose Client Secret** in client-side code
- **Store tokens encrypted** (use existing integration credentials system)
- **Verify requests** from Slack using Signing Secret
- **Handle token refresh** when tokens expire
- **Respect workspace permissions** - only access what's authorized

## Testing

1. Install app in your development workspace
2. Test all scopes you requested
3. Verify token storage and retrieval
4. Test token refresh flow
5. Test uninstall/revocation handling

## Distribution Options

### Option 1: Direct Installation Link
Share: `https://yourdomain.com/integrations/slack/install`

### Option 2: Slack App Directory
Submit for public listing (requires review)

### Option 3: Shareable Install Button
Embed install button on your website

## Next Steps

See the implementation files:
- `/src/app/api/integrations/slack/oauth/route.ts` - OAuth endpoints
- `/src/app/api/integrations/slack/install/route.ts` - Installation page
- `/src/lib/integrations/slack/client.ts` - Slack API client
