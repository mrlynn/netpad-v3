/**
 * NetPad Workflow Configuration - GitHub AI Repository Auditor
 *
 * This workflow can be imported into NetPad using:
 * 1. The NetPad MCP tools (create_workflow_from_template)
 * 2. Direct import via the NetPad UI
 * 3. The NetPad CLI
 *
 * The workflow uses NetPad's native node types:
 * - form-trigger: Triggered by form submission
 * - http-request: GitHub API calls
 * - transform: Data processing
 * - ai-prompt: AI pattern detection
 * - mongodb-write: Store results
 * - email-send: Send report
 * - conditional: Branch logic
 * - loop: Iterate over commits/PRs
 */

// ============================================================================
// Workflow Canvas Configuration
// ============================================================================

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
  enabled?: boolean;
  timeout?: number;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  sourcePort: string;
  target: string;
  targetPort: string;
  mapping?: Array<{ sourceField: string; targetField: string }>;
}

export interface WorkflowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  defaultValue?: unknown;
  description?: string;
}

// ============================================================================
// Main Audit Workflow
// ============================================================================

export const mainAuditWorkflow = {
  name: 'GitHub AI Auditor - Main Pipeline',
  slug: 'github-ai-auditor-main',
  description: 'Analyzes a GitHub repository for AI-generated code patterns using commit messages, PR descriptions, and code structure analysis.',

  // Workflow-level variables for configuration
  variables: [
    {
      name: 'github_api_base',
      type: 'string' as const,
      defaultValue: 'https://api.github.com',
      description: 'GitHub API base URL',
    },
    {
      name: 'ai_detection_threshold',
      type: 'number' as const,
      defaultValue: 70,
      description: 'Minimum confidence threshold for AI detection (0-100)',
    },
    {
      name: 'max_items_to_analyze',
      type: 'number' as const,
      defaultValue: 100,
      description: 'Maximum commits/PRs to analyze per run',
    },
  ] as WorkflowVariable[],

  // Input schema (from form trigger)
  inputSchema: {
    type: 'object',
    properties: {
      repository_url: { type: 'string', description: 'GitHub repository URL' },
      github_token: { type: 'string', description: 'Optional GitHub token for private repos' },
      email: { type: 'string', format: 'email', description: 'Email for report delivery' },
      analysis_types: { type: 'array', items: { type: 'string' } },
      target_branch: { type: 'string', default: 'main' },
      max_commits: { type: 'number', default: 500 },
      sensitivity_level: { type: 'number', default: 50 },
      confidence_threshold: { type: 'string', default: '70' },
    },
    required: ['repository_url', 'email'],
  },

  // Workflow nodes
  nodes: [
    // ========================================================================
    // TRIGGER: Form Submission
    // ========================================================================
    {
      id: 'trigger',
      type: 'form-trigger',
      position: { x: 100, y: 50 },
      config: {
        formSlug: 'github-ai-auditor',
        description: 'Triggered when user submits the GitHub AI Auditor form',
      },
    },

    // ========================================================================
    // TRANSFORM: Parse GitHub URL
    // ========================================================================
    {
      id: 'parse_url',
      type: 'transform',
      position: { x: 100, y: 150 },
      config: {
        mode: 'expression',
        expression: `
          (() => {
            const url = input.repository_url;
            const match = url.match(/github\\.com\\/([^\\/]+)\\/([^\\/\\s?#]+)/);
            if (!match) throw new Error('Invalid GitHub URL format');
            return {
              owner: match[1],
              repo: match[2].replace('.git', ''),
              fullName: match[1] + '/' + match[2].replace('.git', ''),
              apiBase: variables.github_api_base + '/repos/' + match[1] + '/' + match[2].replace('.git', ''),
              formData: input
            };
          })()
        `,
      },
    },

    // ========================================================================
    // HTTP: Get Repository Info
    // ========================================================================
    {
      id: 'fetch_repo',
      type: 'http-request',
      position: { x: 100, y: 250 },
      config: {
        method: 'GET',
        url: '{{input.apiBase}}',
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'NetPad-GitHub-Auditor/1.0',
          Authorization: '{{input.formData.github_token ? "Bearer " + input.formData.github_token : ""}}',
        },
        timeout: 30000,
        retryOnError: true,
        maxRetries: 3,
      },
    },

    // ========================================================================
    // CONDITIONAL: Check if repo is accessible
    // ========================================================================
    {
      id: 'check_access',
      type: 'conditional',
      position: { x: 100, y: 350 },
      config: {
        condition: {
          field: 'input.ok',
          operator: 'equals',
          value: true,
        },
        trueLabel: 'Accessible',
        falseLabel: 'Not Accessible',
      },
    },

    // ========================================================================
    // HTTP: Fetch Commits (parallel with PRs)
    // ========================================================================
    {
      id: 'fetch_commits',
      type: 'http-request',
      position: { x: -100, y: 450 },
      config: {
        method: 'GET',
        url: '{{context.apiBase}}/commits',
        queryParams: {
          per_page: '{{Math.min(context.formData.max_commits || 100, 100)}}',
          sha: '{{context.formData.target_branch || "main"}}',
        },
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'NetPad-GitHub-Auditor/1.0',
          Authorization: '{{context.formData.github_token ? "Bearer " + context.formData.github_token : ""}}',
        },
      },
    },

    // ========================================================================
    // HTTP: Fetch Pull Requests (parallel with commits)
    // ========================================================================
    {
      id: 'fetch_prs',
      type: 'http-request',
      position: { x: 300, y: 450 },
      config: {
        method: 'GET',
        url: '{{context.apiBase}}/pulls',
        queryParams: {
          state: 'all',
          per_page: '50',
          sort: 'updated',
          direction: 'desc',
        },
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'NetPad-GitHub-Auditor/1.0',
          Authorization: '{{context.formData.github_token ? "Bearer " + context.formData.github_token : ""}}',
        },
      },
    },

    // ========================================================================
    // TRANSFORM: Prepare data for AI analysis
    // ========================================================================
    {
      id: 'prepare_analysis',
      type: 'transform',
      position: { x: 100, y: 550 },
      config: {
        mode: 'expression',
        expression: `
          (() => {
            const commits = input.commits || [];
            const prs = input.prs || [];

            // Extract commit messages and metadata
            const commitData = commits.slice(0, variables.max_items_to_analyze).map(c => ({
              sha: c.sha.substring(0, 7),
              message: c.commit.message.substring(0, 500),
              author: c.commit.author.name,
              date: c.commit.author.date
            }));

            // Extract PR data
            const prData = prs.slice(0, variables.max_items_to_analyze).map(p => ({
              number: p.number,
              title: p.title.substring(0, 200),
              body: (p.body || '').substring(0, 500),
              author: p.user.login,
              created_at: p.created_at
            }));

            return {
              repoInfo: input.repoInfo,
              commitData,
              prData,
              totalCommits: commits.length,
              totalPRs: prs.length,
              context: input.context
            };
          })()
        `,
      },
    },

    // ========================================================================
    // AI: Analyze Commit Messages
    // ========================================================================
    {
      id: 'ai_analyze_commits',
      type: 'ai-prompt',
      position: { x: -100, y: 650 },
      config: {
        model: 'default', // Uses NetPad's configured default model
        temperature: 0.3,
        maxTokens: 2000,
        systemPrompt: `You are an expert AI code analyst specializing in detecting AI-generated patterns in Git commit messages.

Analyze commit messages for these AI generation signatures:
1. Formulaic structure (type: description format used rigidly)
2. Overly comprehensive explanations for simple changes
3. Generic phrases like "refactor for better maintainability"
4. Perfect grammar with no personality or shortcuts
5. Lack of contextual references human devs typically make

Return a JSON response with:
{
  "overallScore": <0-100 AI likelihood>,
  "confidence": <0-100>,
  "flaggedCount": <number of suspicious commits>,
  "patterns": [
    {"name": "<pattern>", "count": <instances>, "severity": "low|medium|high"}
  ],
  "summary": "<2-3 sentence summary>"
}`,
        prompt: `Analyze these {{input.commitData.length}} commit messages for AI-generation patterns:

{{JSON.stringify(input.commitData, null, 2)}}

Confidence threshold: {{variables.ai_detection_threshold}}%`,
        responseFormat: 'json',
      },
    },

    // ========================================================================
    // AI: Analyze Pull Requests
    // ========================================================================
    {
      id: 'ai_analyze_prs',
      type: 'ai-prompt',
      position: { x: 300, y: 650 },
      config: {
        model: 'default',
        temperature: 0.3,
        maxTokens: 2000,
        systemPrompt: `You are an expert AI code analyst specializing in detecting AI-generated patterns in pull request titles and descriptions.

Look for these patterns:
1. Template-like descriptions with perfect structure
2. Over-explained changes for simple modifications
3. Generic phrases and corporate language
4. "This PR..." opening (common AI pattern)
5. Perfect formatting throughout

Return a JSON response with:
{
  "overallScore": <0-100 AI likelihood>,
  "confidence": <0-100>,
  "flaggedCount": <number of suspicious PRs>,
  "patterns": [
    {"name": "<pattern>", "count": <instances>, "severity": "low|medium|high"}
  ],
  "summary": "<2-3 sentence summary>"
}`,
        prompt: `Analyze these {{input.prData.length}} pull requests for AI-generation patterns:

{{JSON.stringify(input.prData, null, 2)}}

Confidence threshold: {{variables.ai_detection_threshold}}%`,
        responseFormat: 'json',
      },
    },

    // ========================================================================
    // TRANSFORM: Aggregate Results
    // ========================================================================
    {
      id: 'aggregate_results',
      type: 'transform',
      position: { x: 100, y: 750 },
      config: {
        mode: 'expression',
        expression: `
          (() => {
            const commitAnalysis = input.commitAnalysis || {};
            const prAnalysis = input.prAnalysis || {};

            // Calculate overall score (weighted average)
            const commitScore = commitAnalysis.overallScore || 0;
            const prScore = prAnalysis.overallScore || 0;
            const overallScore = Math.round((commitScore * 0.6) + (prScore * 0.4));

            // Determine risk level
            let riskLevel = 'low';
            if (overallScore >= 60) riskLevel = 'high';
            else if (overallScore >= 40) riskLevel = 'medium';

            // Combine patterns
            const allPatterns = [
              ...(commitAnalysis.patterns || []).map(p => ({ ...p, source: 'commits' })),
              ...(prAnalysis.patterns || []).map(p => ({ ...p, source: 'prs' }))
            ];

            return {
              auditId: 'aud_' + Date.now(),
              repository: input.context.fullName,
              repositoryUrl: input.context.formData.repository_url,
              status: 'completed',
              results: {
                overallAIScore: overallScore,
                confidence: Math.round((commitAnalysis.confidence + prAnalysis.confidence) / 2) || 70,
                riskLevel,
                commitScore,
                prScore,
                flaggedCommits: commitAnalysis.flaggedCount || 0,
                flaggedPRs: prAnalysis.flaggedCount || 0,
                patterns: allPatterns,
                summary: commitAnalysis.summary + ' ' + prAnalysis.summary
              },
              stats: {
                totalCommitsAnalyzed: input.totalCommits,
                totalPRsAnalyzed: input.totalPRs
              },
              config: {
                sensitivityLevel: input.context.formData.sensitivity_level,
                confidenceThreshold: input.context.formData.confidence_threshold
              },
              submittedBy: input.context.formData.email,
              completedAt: new Date().toISOString()
            };
          })()
        `,
      },
    },

    // ========================================================================
    // HTML OUTPUT: Generate Visual Report
    // ========================================================================
    {
      id: 'render_report',
      type: 'html-output',
      position: { x: 100, y: 850 },
      config: {
        title: 'GitHub AI Audit Report',
        format: 'html',
        includeWrapper: true,
        defaultStyles: true,
        template: `
          <div class="audit-report">
            <header class="report-header">
              <h1>🔍 GitHub AI Audit Report</h1>
              <p class="repo-name">{{repository}}</p>
              <p class="timestamp">Completed: {{completedAt}}</p>
            </header>

            <section class="score-overview">
              <div class="main-score {{results.riskLevel}}-risk">
                <span class="score-value">{{results.overallAIScore}}</span>
                <span class="score-label">AI Likelihood Score</span>
              </div>
              <div class="score-details">
                <div class="score-item">
                  <span class="label">Risk Level</span>
                  <span class="value risk-{{results.riskLevel}}">{{results.riskLevel}}</span>
                </div>
                <div class="score-item">
                  <span class="label">Confidence</span>
                  <span class="value">{{results.confidence}}%</span>
                </div>
              </div>
            </section>

            <section class="analysis-breakdown">
              <h2>📊 Analysis Breakdown</h2>
              <div class="breakdown-grid">
                <div class="breakdown-card">
                  <h3>Commit Analysis</h3>
                  <div class="stat">
                    <span class="stat-value">{{results.commitScore}}</span>
                    <span class="stat-label">Score</span>
                  </div>
                  <div class="stat">
                    <span class="stat-value">{{results.flaggedCommits}}</span>
                    <span class="stat-label">Flagged Commits</span>
                  </div>
                  <p class="analyzed">{{stats.totalCommitsAnalyzed}} commits analyzed</p>
                </div>
                <div class="breakdown-card">
                  <h3>PR Analysis</h3>
                  <div class="stat">
                    <span class="stat-value">{{results.prScore}}</span>
                    <span class="stat-label">Score</span>
                  </div>
                  <div class="stat">
                    <span class="stat-value">{{results.flaggedPRs}}</span>
                    <span class="stat-label">Flagged PRs</span>
                  </div>
                  <p class="analyzed">{{stats.totalPRsAnalyzed}} PRs analyzed</p>
                </div>
              </div>
            </section>

            <section class="patterns-detected">
              <h2>🎯 Detected Patterns</h2>
              <div class="patterns-list">
                {{#each results.patterns}}
                <div class="pattern-item severity-{{severity}}">
                  <span class="pattern-name">{{name}}</span>
                  <span class="pattern-count">{{count}} instances</span>
                  <span class="pattern-source">from {{source}}</span>
                  <span class="pattern-severity">{{severity}}</span>
                </div>
                {{/each}}
              </div>
            </section>

            <section class="summary">
              <h2>📝 Summary</h2>
              <p>{{results.summary}}</p>
            </section>

            <footer class="report-footer">
              <p>Generated by <strong>NetPad GitHub AI Auditor</strong></p>
              <p class="audit-id">Audit ID: {{auditId}}</p>
            </footer>
          </div>

          <style>
            .audit-report { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
            .report-header { text-align: center; margin-bottom: 2rem; }
            .report-header h1 { color: #1f2937; margin-bottom: 0.5rem; }
            .repo-name { font-size: 1.25rem; color: #6366f1; font-weight: 600; }
            .timestamp { color: #6b7280; font-size: 0.875rem; }

            .score-overview { display: flex; gap: 2rem; align-items: center; justify-content: center; margin-bottom: 2rem; padding: 1.5rem; background: #f9fafb; border-radius: 12px; }
            .main-score { text-align: center; padding: 1.5rem 2rem; border-radius: 12px; }
            .main-score.low-risk { background: linear-gradient(135deg, #10b981, #059669); }
            .main-score.medium-risk { background: linear-gradient(135deg, #f59e0b, #d97706); }
            .main-score.high-risk { background: linear-gradient(135deg, #ef4444, #dc2626); }
            .score-value { display: block; font-size: 3rem; font-weight: 700; color: white; }
            .score-label { display: block; font-size: 0.875rem; color: rgba(255,255,255,0.9); }

            .score-details { display: flex; flex-direction: column; gap: 1rem; }
            .score-item { display: flex; flex-direction: column; }
            .score-item .label { font-size: 0.75rem; color: #6b7280; text-transform: uppercase; }
            .score-item .value { font-size: 1.25rem; font-weight: 600; }
            .risk-low { color: #059669; }
            .risk-medium { color: #d97706; }
            .risk-high { color: #dc2626; }

            .analysis-breakdown, .patterns-detected, .summary { margin-bottom: 2rem; }
            h2 { color: #1f2937; font-size: 1.25rem; margin-bottom: 1rem; }

            .breakdown-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
            .breakdown-card { padding: 1.5rem; background: white; border: 1px solid #e5e7eb; border-radius: 8px; }
            .breakdown-card h3 { margin: 0 0 1rem 0; color: #374151; font-size: 1rem; }
            .stat { display: inline-block; margin-right: 1.5rem; }
            .stat-value { display: block; font-size: 1.5rem; font-weight: 700; color: #6366f1; }
            .stat-label { font-size: 0.75rem; color: #6b7280; }
            .analyzed { margin-top: 0.5rem; font-size: 0.75rem; color: #9ca3af; }

            .patterns-list { display: flex; flex-direction: column; gap: 0.5rem; }
            .pattern-item { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1rem; background: white; border: 1px solid #e5e7eb; border-radius: 6px; }
            .pattern-item.severity-high { border-left: 4px solid #ef4444; }
            .pattern-item.severity-medium { border-left: 4px solid #f59e0b; }
            .pattern-item.severity-low { border-left: 4px solid #10b981; }
            .pattern-name { flex: 1; font-weight: 500; }
            .pattern-count { color: #6b7280; font-size: 0.875rem; }
            .pattern-source { color: #9ca3af; font-size: 0.75rem; }
            .pattern-severity { padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 500; text-transform: uppercase; }
            .severity-high .pattern-severity { background: #fef2f2; color: #dc2626; }
            .severity-medium .pattern-severity { background: #fffbeb; color: #d97706; }
            .severity-low .pattern-severity { background: #f0fdf4; color: #059669; }

            .summary p { color: #4b5563; line-height: 1.6; }

            .report-footer { text-align: center; padding-top: 2rem; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 0.875rem; }
            .audit-id { font-family: monospace; color: #9ca3af; font-size: 0.75rem; }
          </style>
        `,
      },
    },

    // ========================================================================
    // MONGODB: Save Audit Report (with rendered HTML)
    // ========================================================================
    {
      id: 'save_report',
      type: 'mongodb-write',
      position: { x: 100, y: 950 },
      config: {
        operation: 'insertOne',
        collection: 'github_audits',
        // input contains both the original data and rendered HTML from html-output
        document: `{
          ...input.data,
          renderedReport: {
            html: input.html,
            format: input.format,
            size: input.size,
            generatedAt: new Date().toISOString()
          }
        }`,
        // Note: Connection is configured at deployment time via NetPad's vault
      },
    },

    // ========================================================================
    // EMAIL: Send Report with rendered HTML
    // ========================================================================
    {
      id: 'send_email',
      type: 'email-send',
      position: { x: 100, y: 1050 },
      config: {
        to: '{{input.data.submittedBy}}',
        subject: 'GitHub AI Audit Complete: {{input.data.repository}}',
        // Use the rendered HTML from html-output node
        htmlBody: '{{input.html}}',
        // Fallback plain text version
        textBody: `GitHub AI Audit Report for {{input.data.repository}}

Overall AI Score: {{input.data.results.overallAIScore}}
Risk Level: {{input.data.results.riskLevel}}
Confidence: {{input.data.results.confidence}}%

Commit Analysis:
- Score: {{input.data.results.commitScore}}
- Flagged: {{input.data.results.flaggedCommits}} commits

PR Analysis:
- Score: {{input.data.results.prScore}}
- Flagged: {{input.data.results.flaggedPRs}} PRs

Summary: {{input.data.results.summary}}

View full report: https://netpad.io/audit/{{input.data.auditId}}`,
      },
    },

    // ========================================================================
    // ERROR HANDLER: Notify on failure
    // ========================================================================
    {
      id: 'error_handler',
      type: 'email-send',
      position: { x: 500, y: 350 },
      config: {
        to: '{{trigger.formData.email}}',
        subject: 'GitHub AI Audit Failed: {{trigger.formData.repository_url}}',
        body: `Your GitHub repository audit could not be completed.

Repository: {{trigger.formData.repository_url}}
Error: The repository is not accessible. Please check:
1. The URL is correct
2. The repository exists
3. For private repos, a valid GitHub token is provided

You can try again at: https://netpad.io/github-auditor`,
      },
    },
  ] as WorkflowNode[],

  // Edge connections
  edges: [
    // Main flow
    { id: 'e1', source: 'trigger', sourcePort: 'form_data', target: 'parse_url', targetPort: 'input' },
    { id: 'e2', source: 'parse_url', sourcePort: 'output', target: 'fetch_repo', targetPort: 'input' },
    { id: 'e3', source: 'fetch_repo', sourcePort: 'output', target: 'check_access', targetPort: 'input' },

    // Success path - parallel fetch
    {
      id: 'e4',
      source: 'check_access',
      sourcePort: 'true',
      target: 'fetch_commits',
      targetPort: 'input',
      mapping: [
        { sourceField: 'context', targetField: 'context' },
      ],
    },
    {
      id: 'e5',
      source: 'check_access',
      sourcePort: 'true',
      target: 'fetch_prs',
      targetPort: 'input',
      mapping: [
        { sourceField: 'context', targetField: 'context' },
      ],
    },

    // Merge and prepare
    {
      id: 'e6',
      source: 'fetch_commits',
      sourcePort: 'data',
      target: 'prepare_analysis',
      targetPort: 'commits',
    },
    {
      id: 'e7',
      source: 'fetch_prs',
      sourcePort: 'data',
      target: 'prepare_analysis',
      targetPort: 'prs',
    },
    {
      id: 'e8',
      source: 'fetch_repo',
      sourcePort: 'data',
      target: 'prepare_analysis',
      targetPort: 'repoInfo',
    },

    // AI analysis (parallel)
    { id: 'e9', source: 'prepare_analysis', sourcePort: 'output', target: 'ai_analyze_commits', targetPort: 'input' },
    { id: 'e10', source: 'prepare_analysis', sourcePort: 'output', target: 'ai_analyze_prs', targetPort: 'input' },

    // Aggregate
    {
      id: 'e11',
      source: 'ai_analyze_commits',
      sourcePort: 'response',
      target: 'aggregate_results',
      targetPort: 'commitAnalysis',
    },
    {
      id: 'e12',
      source: 'ai_analyze_prs',
      sourcePort: 'response',
      target: 'aggregate_results',
      targetPort: 'prAnalysis',
    },
    {
      id: 'e13',
      source: 'prepare_analysis',
      sourcePort: 'output',
      target: 'aggregate_results',
      targetPort: 'context',
    },

    // Render, save and notify
    { id: 'e14', source: 'aggregate_results', sourcePort: 'output', target: 'render_report', targetPort: 'input' },
    { id: 'e15', source: 'render_report', sourcePort: 'output', target: 'save_report', targetPort: 'input' },
    { id: 'e16', source: 'save_report', sourcePort: 'output', target: 'send_email', targetPort: 'input' },

    // Error path
    { id: 'e17', source: 'check_access', sourcePort: 'false', target: 'error_handler', targetPort: 'input' },
  ] as WorkflowEdge[],

  // Workflow settings
  settings: {
    executionMode: 'auto',
    maxExecutionTime: 300000, // 5 minutes
    retryPolicy: {
      maxRetries: 2,
      backoffMultiplier: 2,
      initialDelayMs: 1000,
    },
    errorHandling: 'continue', // Continue to error_handler node on failure
  },
};

// ============================================================================
// Search Form Workflow (for viewing audit results)
// ============================================================================

export const searchWorkflow = {
  name: 'GitHub Auditor - Search Results',
  slug: 'github-auditor-search',
  description: 'Query and display GitHub audit results from MongoDB',

  nodes: [
    {
      id: 'trigger',
      type: 'manual-trigger',
      position: { x: 100, y: 50 },
      config: {
        inputSchema: {
          type: 'object',
          properties: {
            repository: { type: 'string' },
            minScore: { type: 'number' },
            maxScore: { type: 'number' },
            riskLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
            limit: { type: 'number', default: 20 },
          },
        },
      },
    },
    {
      id: 'query_audits',
      type: 'mongodb-query',
      position: { x: 100, y: 150 },
      config: {
        operation: 'find',
        collection: 'github_audits',
        query: `
          {
            $and: [
              {{input.repository ? '{"repository": {"$regex": "' + input.repository + '", "$options": "i"}}' : '{}'}},
              {{input.minScore ? '{"results.overallAIScore": {"$gte": ' + input.minScore + '}}' : '{}'}},
              {{input.maxScore ? '{"results.overallAIScore": {"$lte": ' + input.maxScore + '}}' : '{}'}},
              {{input.riskLevel ? '{"results.riskLevel": "' + input.riskLevel + '"}' : '{}'}}
            ]
          }
        `,
        sort: { completedAt: -1 },
        limit: '{{input.limit || 20}}',
      },
    },
    {
      id: 'format_results',
      type: 'transform',
      position: { x: 100, y: 250 },
      config: {
        mode: 'expression',
        expression: `
          ({
            results: input.map(audit => ({
              auditId: audit.auditId,
              repository: audit.repository,
              overallScore: audit.results.overallAIScore,
              riskLevel: audit.results.riskLevel,
              flaggedCommits: audit.results.flaggedCommits,
              flaggedPRs: audit.results.flaggedPRs,
              completedAt: audit.completedAt
            })),
            total: input.length
          })
        `,
      },
    },
  ],

  edges: [
    { id: 'e1', source: 'trigger', sourcePort: 'output', target: 'query_audits', targetPort: 'input' },
    { id: 'e2', source: 'query_audits', sourcePort: 'documents', target: 'format_results', targetPort: 'input' },
  ],
};

// ============================================================================
// Export Configuration
// ============================================================================

export default {
  mainAuditWorkflow,
  searchWorkflow,

  // Metadata for NetPad import
  metadata: {
    name: 'GitHub AI Auditor',
    version: '1.0.0',
    description: 'Analyze GitHub repositories for AI-generated code patterns',
    author: 'NetPad Examples',
    category: 'developer-tools',
    tags: ['github', 'ai-detection', 'code-analysis', 'audit'],
    icon: 'security',
    color: '#6366f1',
  },
};
