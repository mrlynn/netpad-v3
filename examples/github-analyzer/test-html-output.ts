/**
 * Test the HTML Output node handler directly
 *
 * Run with: npx tsx examples/github-analyzer/test-html-output.ts
 */

// Mock data that would come from the workflow
const mockAuditResult = {
  auditId: 'aud_1706097600000',
  repository: 'anthropics/claude-code',
  completedAt: new Date().toISOString(),
  results: {
    overallAIScore: 45,
    confidence: 78,
    riskLevel: 'medium',
    commitScore: 52,
    prScore: 35,
    flaggedCommits: 12,
    flaggedPRs: 3,
    patterns: [
      { name: 'Formulaic Commit Messages', count: 8, severity: 'medium', source: 'commits' },
      { name: 'Template PR Descriptions', count: 3, severity: 'low', source: 'prs' },
      { name: 'Perfect Grammar', count: 15, severity: 'low', source: 'commits' },
    ],
    summary: 'This repository shows moderate signs of AI-assisted code contributions. ' +
      'Commit messages follow a consistent formulaic pattern, and PR descriptions ' +
      'exhibit template-like structure. However, code quality and iterative refinement ' +
      'patterns suggest human oversight.',
  },
  stats: {
    totalCommitsAnalyzed: 100,
    totalPRsAnalyzed: 25,
  },
};

// Simple template rendering (mimics what the html-output handler does)
function renderTemplate(template: string, data: Record<string, unknown>): string {
  let result = template;

  // Replace simple variables {{variable}}
  result = result.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = path.split('.').reduce((obj: unknown, key: string) => {
      if (obj && typeof obj === 'object') {
        return (obj as Record<string, unknown>)[key];
      }
      return undefined;
    }, data);
    return value !== undefined ? String(value) : match;
  });

  // Handle {{#each}} blocks (simplified)
  result = result.replace(/\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, arrayPath, itemTemplate) => {
    const array = arrayPath.split('.').reduce((obj: unknown, key: string) => {
      if (obj && typeof obj === 'object') {
        return (obj as Record<string, unknown>)[key];
      }
      return undefined;
    }, data);

    if (!Array.isArray(array)) return '';

    return array.map((item: Record<string, unknown>) => {
      let itemResult = itemTemplate;
      // Replace item properties
      itemResult = itemResult.replace(/\{\{(\w+)\}\}/g, (m, key) => {
        return item[key] !== undefined ? String(item[key]) : m;
      });
      return itemResult;
    }).join('\n');
  });

  return result;
}

// Template from the workflow config (simplified for testing)
const template = `
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
        <span class="value">{{results.riskLevel}}</span>
      </div>
      <div class="score-item">
        <span class="label">Confidence</span>
        <span class="value">{{results.confidence}}%</span>
      </div>
    </div>
  </section>

  <section class="analysis-breakdown">
    <h2>📊 Analysis Breakdown</h2>
    <p>Commits: {{results.commitScore}} | PRs: {{results.prScore}}</p>
    <p>Flagged: {{results.flaggedCommits}} commits, {{results.flaggedPRs}} PRs</p>
    <p>Analyzed: {{stats.totalCommitsAnalyzed}} commits, {{stats.totalPRsAnalyzed}} PRs</p>
  </section>

  <section class="patterns-detected">
    <h2>🎯 Detected Patterns</h2>
    {{#each results.patterns}}
    <div class="pattern-item severity-{{severity}}">
      <span>{{name}}: {{count}} instances ({{severity}}) from {{source}}</span>
    </div>
    {{/each}}
  </section>

  <section class="summary">
    <h2>📝 Summary</h2>
    <p>{{results.summary}}</p>
  </section>

  <footer class="report-footer">
    <p>Audit ID: {{auditId}}</p>
  </footer>
</div>
`;

console.log('='.repeat(60));
console.log('HTML Output Node - Test Render');
console.log('='.repeat(60));
console.log('');

const html = renderTemplate(template, mockAuditResult);

console.log('📄 Rendered HTML Output:');
console.log('-'.repeat(60));
console.log(html);
console.log('-'.repeat(60));
console.log('');
console.log(`✅ Output size: ${html.length} characters`);
console.log('');
console.log('💡 To see this styled, save to a file and open in browser:');
console.log('   npx tsx examples/github-analyzer/test-html-output.ts > /tmp/audit-report.html');
console.log('   open /tmp/audit-report.html');
