# NetPad Status Page Setup with Upptime

This guide walks you through setting up a free, open-source status page for NetPad using [Upptime](https://upptime.js.org/).

## What You Get

- **Automated monitoring** every 5 minutes via GitHub Actions
- **Beautiful status page** at status.netpad.io
- **Incident management** via GitHub Issues
- **Historical data** stored in the repository
- **100% free** (uses GitHub Actions minutes)
- **No server required** - runs entirely on GitHub

## Prerequisites

- GitHub account
- Domain access for `status.netpad.io` (or use GitHub Pages URL)
- NetPad deployed and accessible

---

## Step 1: Create the Status Repository

1. Go to [github.com/upptime/upptime/generate](https://github.com/upptime/upptime/generate)
2. Name the repository: `status` (or `status.netpad.io`)
3. **Important:** Check "Include all branches"
4. Set visibility to Public (required for free GitHub Pages)
5. Click **Create repository from template**

---

## Step 2: Create a GitHub Personal Access Token

1. Go to [GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens](https://github.com/settings/tokens?type=beta)
2. Click **Generate new token**
3. Configure:
   - **Token name:** `upptime-status`
   - **Expiration:** Custom (set to 1 year, with calendar reminder to rotate)
   - **Repository access:** Only select repositories → Select your status repo
   - **Permissions:**
     - Actions: Read and write
     - Contents: Read and write
     - Issues: Read and write
     - Workflows: Read and write

4. Click **Generate token**
5. **Copy the token immediately** (you won't see it again)

---

## Step 3: Add the Token as a Repository Secret

1. Go to your status repository on GitHub
2. Navigate to **Settings → Secrets and variables → Actions**
3. Click **New repository secret**
4. Configure:
   - **Name:** `GH_PAT`
   - **Secret:** Paste your token
5. Click **Add secret**

---

## Step 4: Configure Upptime

1. In your status repository, edit `.upptimerc.yml`
2. Replace the contents with the configuration from `docs/upptime-config/.upptimerc.yml`
3. Update the following values:
   - `owner`: Your GitHub username or organization
   - `repo`: Your repository name
   - `assignees`: GitHub usernames for incident assignment
   - `status-website.cname`: Your custom domain (or remove for GitHub Pages URL)
   - URLs in `sites`: Update to match your actual domains

### Key Configuration Sections

```yaml
# Sites to monitor
sites:
  - name: NetPad App
    url: https://app.netpad.io

  - name: NetPad API
    url: https://app.netpad.io/api/v1/health
    expectedStatusCodes:
      - 200

# Status page settings
status-website:
  cname: status.netpad.io
  name: NetPad Status
  theme: dark
```

---

## Step 5: Enable GitHub Actions

1. Go to the **Actions** tab in your status repository
2. You should see a message about workflows being disabled
3. Click **I understand my workflows, go ahead and enable them**
4. Wait a few minutes for the first workflow run to complete

---

## Step 6: Enable GitHub Pages

1. Go to **Settings → Pages** in your repository
2. Under "Build and deployment":
   - **Source:** Deploy from a branch
   - **Branch:** `gh-pages` / `/ (root)`
3. Click **Save**
4. Wait a few minutes for the initial deployment

Your status page will be available at:
- `https://YOUR_USERNAME.github.io/status/` (without custom domain)
- `https://status.netpad.io` (with custom domain configured)

---

## Step 7: Configure Custom Domain (Optional)

To use `status.netpad.io`:

### DNS Configuration

Add a CNAME record with your DNS provider:

| Type | Name | Value |
|------|------|-------|
| CNAME | status | YOUR_USERNAME.github.io |

### GitHub Configuration

1. Go to **Settings → Pages**
2. Under "Custom domain", enter: `status.netpad.io`
3. Click **Save**
4. Check "Enforce HTTPS" (may take a few minutes to be available)

---

## Step 8: Add Notification Integrations (Optional)

### Slack Notifications

1. Create a Slack incoming webhook at [api.slack.com/apps](https://api.slack.com/apps)
2. Add as repository secret:
   - **Name:** `NOTIFICATION_SLACK_WEBHOOK`
   - **Value:** Your webhook URL

### Discord Notifications

1. Create a Discord webhook in your server settings
2. Add as repository secret:
   - **Name:** `NOTIFICATION_DISCORD_WEBHOOK`
   - **Value:** Your webhook URL

### Email Notifications (via SendGrid)

1. Get a SendGrid API key from [sendgrid.com](https://sendgrid.com)
2. Add these repository secrets:
   - `NOTIFICATION_EMAIL`: Recipient email
   - `NOTIFICATION_EMAIL_FROM`: Sender email
   - `NOTIFICATION_EMAIL_SENDGRID`: SendGrid API key

---

## Health Check Endpoint

NetPad includes a health check endpoint specifically for monitoring:

```
GET /api/v1/health
```

### Response Format

```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T12:00:00.000Z",
  "version": "1.0.0",
  "services": {
    "api": {
      "status": "up",
      "responseTime": 5
    },
    "database": {
      "status": "up",
      "responseTime": 15
    }
  }
}
```

### Status Values

| Status | HTTP Code | Meaning |
|--------|-----------|---------|
| healthy | 200 | All services operational |
| degraded | 200 | Slow response times (>1s) |
| unhealthy | 503 | Database or critical service down |

---

## Managing Incidents

Incidents are automatically created as GitHub Issues when:
- A monitored site goes down
- Response time exceeds thresholds
- Expected status code doesn't match

### Creating Manual Incidents

1. Go to the Issues tab in your status repository
2. Create a new issue with the `incident` label
3. Use markdown to describe the incident
4. Close the issue when resolved

### Incident Labels

- `incident` - Active incident
- `resolved` - Incident has been fixed
- `scheduled` - Planned maintenance

---

## Monitoring Dashboard

After setup, your status page includes:

- **Current Status**: All services operational / degraded / down
- **Response Time Graphs**: Historical performance data
- **Uptime Percentage**: Last 7 days, 30 days, 90 days
- **Incident History**: Past incidents with timelines

---

## Troubleshooting

### Actions Not Running

1. Check that GitHub Actions is enabled
2. Verify the GH_PAT secret is set correctly
3. Check the Actions tab for error logs

### Status Page Not Loading

1. Verify the `gh-pages` branch exists
2. Check GitHub Pages settings
3. Wait 5-10 minutes for initial deployment

### Custom Domain Not Working

1. Verify DNS CNAME record is set
2. Check that the domain is configured in GitHub Pages settings
3. DNS propagation can take up to 24 hours

### Health Check Failing

1. Verify the API is accessible at `/api/v1/health`
2. Check database connectivity
3. Review API logs for errors

---

## Maintenance

### Rotating the PAT Token

1. Generate a new token before the old one expires
2. Update the `GH_PAT` secret in repository settings
3. Delete the old token from GitHub

### Updating Upptime

Upptime updates automatically via GitHub Actions. To force an update:

1. Go to Actions → Update Template
2. Click "Run workflow"

---

## Links

- [Upptime Documentation](https://upptime.js.org/docs/)
- [Upptime GitHub](https://github.com/upptime/upptime)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
