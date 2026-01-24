# GitHub AI Auditor - NetPad Example Application

This example demonstrates how to build a complete application using NetPad's form builder, workflow automation, and AI capabilities.

## What This Example Does

The GitHub AI Auditor analyzes GitHub repositories for patterns that indicate AI-generated code contributions. It examines:

- **Commit Messages**: Formulaic patterns, generic descriptions, overly comprehensive explanations
- **Pull Requests**: Template-like descriptions, "This PR..." openings, perfect formatting
- **Contributor Behavior**: Burst activity, style inconsistency, lack of iterative refinement

## NetPad Capabilities Demonstrated

This example showcases the following NetPad features:

### 1. Forms
- Multi-page form wizard with conditional logic
- URL validation with regex patterns
- Slider inputs for sensitivity configuration
- Dropdown and checkbox groups
- Custom theming (dark mode)

### 2. Workflows
- **Form Trigger**: Start workflow on form submission
- **HTTP Request**: Call GitHub API endpoints
- **Transform**: Parse URLs, aggregate data
- **Conditional**: Branch based on API response
- **AI Prompt**: Pattern detection using LLM
- **HTML Output**: Render beautiful HTML reports from data
- **MongoDB Write**: Store audit results
- **Email Send**: Deliver reports with rendered HTML

### 3. Search Forms
- Query MongoDB for past audits
- Filter by score, risk level, repository
- Paginated results display

## Files in This Example

| File | Description |
|------|-------------|
| `netpad-form-config.ts` | Form configuration for the audit submission |
| `netpad-workflow-config.ts` | Workflow definitions using NetPad node types |
| `netpad-application-config.ts` | Complete application bundle configuration |
| `Githubaiauditor.jsx` | Standalone React component (for reference/export) |
| `spec.md` | Original specification document |

## How to Deploy This Example

### Option 1: Using NetPad MCP Tools

```bash
# If using Claude Code or similar AI assistant with MCP
npx @netpad/mcp-server create-application \
  --config ./examples/github-analyzer/netpad-application-config.ts \
  --org-id YOUR_ORG_ID \
  --project-id YOUR_PROJECT_ID
```

### Option 2: Using NetPad CLI

```bash
# Install the CLI
npm install -g @netpad/cli

# Login to NetPad
netpad login

# Import the application
netpad app import ./examples/github-analyzer/ \
  --org YOUR_ORG_ID \
  --project YOUR_PROJECT_ID
```

### Option 3: Manual Import via NetPad UI

1. Go to your NetPad project
2. Navigate to **Applications** → **Import**
3. Upload the configuration files
4. Configure your MongoDB connection
5. Set up email credentials (optional)
6. Publish the application

## Required Connections

Before using this application, configure:

### MongoDB Connection
The workflow saves audit results to a MongoDB collection. Configure via:
- NetPad Connection Vault → Add MongoDB Atlas connection
- Collection: `github_audits`

### Email (Optional)
To send audit reports via email:
- NetPad Settings → Email Credentials
- Supports SMTP or SendGrid

### GitHub Token (Optional)
For private repositories:
- Users enter their token in the form
- Or configure an organization-wide token in workflow variables

## Customization

### Adjusting AI Detection

Edit the `ai-prompt` nodes in `netpad-workflow-config.ts`:

```typescript
{
  id: 'ai_analyze_commits',
  type: 'ai-prompt',
  config: {
    systemPrompt: `Your custom detection criteria here...`,
    temperature: 0.3,  // Lower = more consistent
    maxTokens: 2000,
  }
}
```

### Adding New Analysis Types

1. Add a field to the form config
2. Add an HTTP request node for the new API endpoint
3. Add an AI analysis node
4. Connect to the aggregation transform

### Changing the Scoring Algorithm

Modify the `aggregate_results` transform node:

```typescript
{
  id: 'aggregate_results',
  type: 'transform',
  config: {
    expression: `
      // Your custom scoring logic
      const overallScore = ...;
    `
  }
}
```

## MongoDB Schema

Audits are stored with this structure:

```javascript
{
  auditId: "aud_1234567890",
  repository: "owner/repo",
  repositoryUrl: "https://github.com/owner/repo",
  status: "completed",
  results: {
    overallAIScore: 45,      // 0-100
    confidence: 75,          // 0-100
    riskLevel: "medium",     // low, medium, high
    commitScore: 50,
    prScore: 35,
    flaggedCommits: 12,
    flaggedPRs: 3,
    patterns: [
      { name: "Formulaic Messages", count: 8, severity: "medium", source: "commits" }
    ],
    summary: "..."
  },
  stats: {
    totalCommitsAnalyzed: 100,
    totalPRsAnalyzed: 25
  },
  config: {
    sensitivityLevel: 50,
    confidenceThreshold: "70"
  },
  // Rendered HTML report from html-output node
  renderedReport: {
    html: "<div class='audit-report'>...</div>",
    format: "html",
    size: 15234,
    generatedAt: "2025-01-24T12:00:00Z"
  },
  submittedBy: "user@example.com",
  completedAt: "2025-01-24T12:00:00Z"
}
```

## Workflow Visualization

```
┌─────────────────┐
│  Form Trigger   │
│ (form submit)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Parse GitHub   │
│     URL         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  HTTP: Fetch    │
│   Repo Info     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│   Conditional   │────▶│  Error Handler  │
│  (accessible?)  │ NO  │  (send email)   │
└────────┬────────┘     └─────────────────┘
         │ YES
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│ Fetch  │ │ Fetch  │
│Commits │ │  PRs   │
└───┬────┘ └───┬────┘
    │          │
    └────┬─────┘
         │
         ▼
┌─────────────────┐
│    Prepare      │
│   Analysis      │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│   AI   │ │   AI   │
│Commits │ │  PRs   │
└───┬────┘ └───┬────┘
    │          │
    └────┬─────┘
         │
         ▼
┌─────────────────┐
│   Aggregate     │
│    Results      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  HTML Output    │
│ (render report) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  MongoDB Write  │
│ (save report)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Email Send    │
│ (HTML email)    │
└─────────────────┘
```

## Extending This Example

Ideas for extending this application:

1. **Scheduled Monitoring**: Add a schedule trigger to re-analyze repos periodically
2. **Webhook Integration**: Add GitHub webhook trigger for real-time analysis
3. **Dashboard**: Create a search form to browse and compare audits
4. **Team Features**: Add multi-user support with organization-level settings
5. **Export**: Add PDF generation for formal audit reports

## Support

- NetPad Documentation: https://docs.netpad.io
- GitHub Issues: https://github.com/mongodb/netpad/issues
- Community Forum: https://community.netpad.io
