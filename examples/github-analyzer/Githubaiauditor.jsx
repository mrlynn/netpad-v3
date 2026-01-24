import { useState, useEffect, useCallback } from 'react';

// GitHub AI Repository Auditor - Complete Dashboard Application
// Analyzes repositories for AI-generated code patterns and produces comprehensive reports

const GitHubAIAuditor = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [analysisOptions, setAnalysisOptions] = useState({
    analyzeCode: true,
    analyzePRs: true,
    analyzeCommits: true,
    maxCommits: 100,
    targetBranch: 'main',
    languages: ['javascript', 'typescript', 'python']
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ stage: '', percent: 0, detail: '' });
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // AI Pattern Detection Signatures
  const AI_PATTERNS = {
    codeStructure: [
      { name: 'Formulaic Comments', weight: 0.15, description: 'Overly consistent comment patterns' },
      { name: 'Generic Error Handling', weight: 0.12, description: 'Template-like try-catch blocks' },
      { name: 'Verbose Naming', weight: 0.10, description: 'Suspiciously descriptive variable names' },
      { name: 'Boilerplate Heavy', weight: 0.13, description: 'Excessive template-like code' },
      { name: 'Perfect Documentation', weight: 0.15, description: 'Unusually comprehensive docstrings' }
    ],
    prPatterns: [
      { name: 'Generic Messages', weight: 0.18, description: 'Formulaic commit/PR messages' },
      { name: 'Large Single Commits', weight: 0.14, description: 'Suspiciously complete first attempts' },
      { name: 'Rapid Fixes', weight: 0.11, description: 'Instant comprehensive review responses' },
      { name: 'Template Descriptions', weight: 0.12, description: 'Over-explained PR descriptions' }
    ],
    behaviorPatterns: [
      { name: 'Burst Activity', weight: 0.16, description: 'Unusual submission timing patterns' },
      { name: 'Style Inconsistency', weight: 0.14, description: 'Varying code styles per commit' },
      { name: 'No Iterative Refinement', weight: 0.13, description: 'Lack of gradual improvements' }
    ]
  };

  // Parse GitHub URL to extract owner and repo
  const parseGitHubUrl = (url) => {
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/]+)/,
      /^([^\/]+)\/([^\/]+)$/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
      }
    }
    return null;
  };

  // Simulated analysis function (in production, this would call actual APIs)
  const analyzeRepository = async () => {
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      setError('Invalid GitHub URL. Please enter a valid repository URL.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setProgress({ stage: 'Initializing', percent: 0, detail: 'Connecting to GitHub...' });

    try {
      // Stage 1: Fetch repository info
      await simulateDelay(800);
      setProgress({ stage: 'Fetching Repository', percent: 15, detail: `Analyzing ${parsed.owner}/${parsed.repo}` });

      // Stage 2: Clone/fetch code
      await simulateDelay(1200);
      setProgress({ stage: 'Scanning Code', percent: 35, detail: 'Analyzing file structures...' });

      // Stage 3: Analyze code patterns
      await simulateDelay(1500);
      setProgress({ stage: 'Pattern Detection', percent: 55, detail: 'Detecting AI signatures...' });

      // Stage 4: Analyze PR history
      await simulateDelay(1000);
      setProgress({ stage: 'PR Analysis', percent: 75, detail: 'Examining pull request patterns...' });

      // Stage 5: Generate report
      await simulateDelay(800);
      setProgress({ stage: 'Generating Report', percent: 90, detail: 'Compiling findings...' });

      // Generate mock report data
      const generatedReport = generateMockReport(parsed);
      
      await simulateDelay(500);
      setProgress({ stage: 'Complete', percent: 100, detail: 'Analysis complete!' });
      
      setReport(generatedReport);
    } catch (err) {
      setError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const simulateDelay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Generate comprehensive mock report for demonstration
  const generateMockReport = (parsed) => {
    const overallScore = Math.random() * 40 + 30; // 30-70 range
    const fileCount = Math.floor(Math.random() * 150) + 50;
    const commitCount = Math.floor(Math.random() * 500) + 100;
    const prCount = Math.floor(Math.random() * 80) + 20;
    const contributorCount = Math.floor(Math.random() * 15) + 3;

    return {
      repository: {
        owner: parsed.owner,
        name: parsed.repo,
        url: `https://github.com/${parsed.owner}/${parsed.repo}`,
        analyzedAt: new Date().toISOString(),
        stats: { fileCount, commitCount, prCount, contributorCount }
      },
      summary: {
        overallAIScore: overallScore,
        confidence: Math.random() * 20 + 75,
        riskLevel: overallScore > 60 ? 'high' : overallScore > 40 ? 'medium' : 'low',
        recommendation: overallScore > 60 
          ? 'High likelihood of AI-assisted code generation detected. Manual review recommended.'
          : overallScore > 40 
          ? 'Moderate AI patterns detected. Some files warrant closer inspection.'
          : 'Low AI signature detected. Code appears primarily human-authored.'
      },
      codeAnalysis: {
        score: Math.random() * 30 + 25,
        filesAnalyzed: fileCount,
        patterns: AI_PATTERNS.codeStructure.map(p => ({
          ...p,
          detected: Math.random() > 0.4,
          severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
          instances: Math.floor(Math.random() * 20) + 1
        })),
        flaggedFiles: generateFlaggedFiles(5)
      },
      prAnalysis: {
        score: Math.random() * 35 + 30,
        prsAnalyzed: prCount,
        patterns: AI_PATTERNS.prPatterns.map(p => ({
          ...p,
          detected: Math.random() > 0.5,
          severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
          instances: Math.floor(Math.random() * 15) + 1
        })),
        flaggedPRs: generateFlaggedPRs(4)
      },
      contributorAnalysis: {
        score: Math.random() * 25 + 20,
        contributors: generateContributors(contributorCount),
        patterns: AI_PATTERNS.behaviorPatterns.map(p => ({
          ...p,
          detected: Math.random() > 0.6,
          severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
        }))
      },
      timeline: generateTimeline(30)
    };
  };

  const generateFlaggedFiles = (count) => {
    const files = [
      'src/components/Dashboard.tsx', 'lib/utils/helpers.js', 'api/handlers/auth.py',
      'services/DataProcessor.java', 'models/User.rb', 'controllers/MainController.cs',
      'src/hooks/useData.ts', 'utils/formatting.js', 'core/engine.py'
    ];
    return Array(count).fill(null).map((_, i) => ({
      path: files[i % files.length],
      aiScore: Math.random() * 40 + 40,
      patterns: ['Formulaic Comments', 'Verbose Naming', 'Generic Error Handling']
        .filter(() => Math.random() > 0.5),
      lineCount: Math.floor(Math.random() * 300) + 50
    }));
  };

  const generateFlaggedPRs = (count) => {
    const titles = [
      'Add user authentication system', 'Refactor database layer',
      'Implement caching mechanism', 'Fix performance issues',
      'Add comprehensive test suite', 'Update documentation'
    ];
    return Array(count).fill(null).map((_, i) => ({
      number: Math.floor(Math.random() * 200) + 1,
      title: titles[i % titles.length],
      aiScore: Math.random() * 35 + 45,
      author: `contributor${Math.floor(Math.random() * 5) + 1}`,
      flags: ['Large single commit', 'Generic description', 'Rapid review response']
        .filter(() => Math.random() > 0.5),
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    }));
  };

  const generateContributors = (count) => {
    return Array(count).fill(null).map((_, i) => ({
      username: `contributor${i + 1}`,
      commits: Math.floor(Math.random() * 100) + 10,
      aiScore: Math.random() * 50 + 20,
      riskLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      patterns: ['Burst activity', 'Style inconsistency'].filter(() => Math.random() > 0.6)
    }));
  };

  const generateTimeline = (days) => {
    return Array(days).fill(null).map((_, i) => ({
      date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      commits: Math.floor(Math.random() * 10),
      aiScore: Math.random() * 30 + 30
    }));
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#22c55e';
      default: return '#6b7280';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 60) return '#ef4444';
    if (score >= 40) return '#f59e0b';
    return '#22c55e';
  };

  // Styles
  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      color: '#e2e8f0',
      padding: '0'
    },
    header: {
      background: 'rgba(15, 15, 35, 0.95)',
      borderBottom: '1px solid rgba(99, 102, 241, 0.3)',
      padding: '24px 48px',
      backdropFilter: 'blur(12px)'
    },
    headerContent: {
      maxWidth: '1400px',
      margin: '0 auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    logo: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    logoIcon: {
      width: '48px',
      height: '48px',
      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
      boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)'
    },
    logoText: {
      fontSize: '24px',
      fontWeight: '700',
      background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      letterSpacing: '-0.5px'
    },
    main: {
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '40px 48px'
    },
    inputSection: {
      background: 'rgba(30, 30, 60, 0.6)',
      borderRadius: '20px',
      padding: '32px',
      marginBottom: '32px',
      border: '1px solid rgba(99, 102, 241, 0.2)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
    },
    inputGroup: {
      marginBottom: '24px'
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontSize: '14px',
      fontWeight: '600',
      color: '#a5b4fc',
      textTransform: 'uppercase',
      letterSpacing: '1px'
    },
    input: {
      width: '100%',
      padding: '16px 20px',
      background: 'rgba(15, 15, 35, 0.8)',
      border: '2px solid rgba(99, 102, 241, 0.3)',
      borderRadius: '12px',
      color: '#e2e8f0',
      fontSize: '16px',
      fontFamily: "'JetBrains Mono', monospace",
      outline: 'none',
      transition: 'all 0.3s ease',
      boxSizing: 'border-box'
    },
    inputFocus: {
      borderColor: '#6366f1',
      boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)'
    },
    optionsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginTop: '24px'
    },
    checkbox: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      background: 'rgba(99, 102, 241, 0.1)',
      borderRadius: '10px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      border: '1px solid transparent'
    },
    checkboxActive: {
      background: 'rgba(99, 102, 241, 0.2)',
      borderColor: 'rgba(99, 102, 241, 0.5)'
    },
    button: {
      padding: '18px 40px',
      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      border: 'none',
      borderRadius: '12px',
      color: 'white',
      fontSize: '16px',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      textTransform: 'uppercase',
      letterSpacing: '2px',
      boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)'
    },
    buttonDisabled: {
      opacity: 0.6,
      cursor: 'not-allowed'
    },
    progressSection: {
      background: 'rgba(30, 30, 60, 0.6)',
      borderRadius: '20px',
      padding: '32px',
      marginBottom: '32px',
      border: '1px solid rgba(99, 102, 241, 0.2)'
    },
    progressBar: {
      height: '8px',
      background: 'rgba(99, 102, 241, 0.2)',
      borderRadius: '4px',
      overflow: 'hidden',
      marginTop: '16px'
    },
    progressFill: {
      height: '100%',
      background: 'linear-gradient(90deg, #6366f1, #a855f7)',
      borderRadius: '4px',
      transition: 'width 0.5s ease'
    },
    tabs: {
      display: 'flex',
      gap: '8px',
      marginBottom: '24px',
      borderBottom: '2px solid rgba(99, 102, 241, 0.2)',
      paddingBottom: '16px'
    },
    tab: {
      padding: '12px 24px',
      background: 'transparent',
      border: 'none',
      color: '#94a3b8',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      borderRadius: '8px',
      transition: 'all 0.2s ease',
      textTransform: 'uppercase',
      letterSpacing: '1px'
    },
    tabActive: {
      background: 'rgba(99, 102, 241, 0.2)',
      color: '#a5b4fc'
    },
    card: {
      background: 'rgba(30, 30, 60, 0.6)',
      borderRadius: '16px',
      padding: '24px',
      border: '1px solid rgba(99, 102, 241, 0.2)',
      marginBottom: '20px'
    },
    cardTitle: {
      fontSize: '18px',
      fontWeight: '700',
      color: '#a5b4fc',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    scoreCircle: {
      width: '120px',
      height: '120px',
      borderRadius: '50%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      border: '4px solid',
      position: 'relative'
    },
    scoreValue: {
      fontSize: '36px',
      fontWeight: '800'
    },
    scoreLabel: {
      fontSize: '11px',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      opacity: 0.8
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '20px'
    },
    statBox: {
      background: 'rgba(99, 102, 241, 0.1)',
      borderRadius: '12px',
      padding: '20px',
      textAlign: 'center'
    },
    statValue: {
      fontSize: '32px',
      fontWeight: '800',
      color: '#a5b4fc'
    },
    statLabel: {
      fontSize: '12px',
      color: '#94a3b8',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      marginTop: '4px'
    },
    badge: {
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    th: {
      textAlign: 'left',
      padding: '12px 16px',
      borderBottom: '2px solid rgba(99, 102, 241, 0.2)',
      color: '#a5b4fc',
      fontSize: '12px',
      textTransform: 'uppercase',
      letterSpacing: '1px'
    },
    td: {
      padding: '16px',
      borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
      fontSize: '14px'
    },
    patternItem: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      background: 'rgba(99, 102, 241, 0.05)',
      borderRadius: '8px',
      marginBottom: '8px'
    },
    timeline: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: '4px',
      height: '100px',
      padding: '20px 0'
    },
    timelineBar: {
      flex: 1,
      background: 'linear-gradient(180deg, #6366f1 0%, rgba(99, 102, 241, 0.3) 100%)',
      borderRadius: '4px 4px 0 0',
      minWidth: '8px',
      transition: 'all 0.3s ease'
    },
    error: {
      background: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      borderRadius: '12px',
      padding: '16px 24px',
      color: '#fca5a5',
      marginBottom: '24px'
    }
  };

  // Render functions
  const renderInputSection = () => (
    <div style={styles.inputSection}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Repository URL</label>
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/owner/repository"
            style={styles.input}
          />
        </div>
        <div style={styles.inputGroup}>
          <label style={styles.label}>GitHub Token (Optional)</label>
          <input
            type="password"
            value={githubToken}
            onChange={(e) => setGithubToken(e.target.value)}
            placeholder="ghp_xxxxxxxxxxxx"
            style={styles.input}
          />
        </div>
      </div>

      <div style={styles.optionsGrid}>
        {[
          { key: 'analyzeCode', label: '📝 Analyze Code' },
          { key: 'analyzePRs', label: '🔀 Analyze PRs' },
          { key: 'analyzeCommits', label: '📊 Analyze Commits' }
        ].map(opt => (
          <div
            key={opt.key}
            style={{
              ...styles.checkbox,
              ...(analysisOptions[opt.key] ? styles.checkboxActive : {})
            }}
            onClick={() => setAnalysisOptions(prev => ({ ...prev, [opt.key]: !prev[opt.key] }))}
          >
            <span style={{ fontSize: '20px' }}>{analysisOptions[opt.key] ? '✅' : '⬜'}</span>
            <span>{opt.label}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '32px', textAlign: 'center' }}>
        <button
          onClick={analyzeRepository}
          disabled={isAnalyzing || !repoUrl}
          style={{
            ...styles.button,
            ...(isAnalyzing || !repoUrl ? styles.buttonDisabled : {})
          }}
        >
          {isAnalyzing ? '🔍 Analyzing...' : '🚀 Start Analysis'}
        </button>
      </div>
    </div>
  );

  const renderProgress = () => (
    <div style={styles.progressSection}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#a5b4fc' }}>
            {progress.stage}
          </div>
          <div style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>
            {progress.detail}
          </div>
        </div>
        <div style={{ fontSize: '24px', fontWeight: '800', color: '#6366f1' }}>
          {progress.percent}%
        </div>
      </div>
      <div style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: `${progress.percent}%` }} />
      </div>
    </div>
  );

  const renderOverview = () => (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px', marginBottom: '24px' }}>
        <div style={{ ...styles.card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            ...styles.scoreCircle,
            borderColor: getScoreColor(report.summary.overallAIScore)
          }}>
            <div style={{ ...styles.scoreValue, color: getScoreColor(report.summary.overallAIScore) }}>
              {report.summary.overallAIScore.toFixed(0)}
            </div>
            <div style={styles.scoreLabel}>AI Score</div>
          </div>
          <div style={{
            ...styles.badge,
            marginTop: '16px',
            background: `${getRiskColor(report.summary.riskLevel)}20`,
            color: getRiskColor(report.summary.riskLevel)
          }}>
            {report.summary.riskLevel} risk
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '12px', textAlign: 'center' }}>
            Confidence: {report.summary.confidence.toFixed(1)}%
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <span>📋</span> Summary
          </div>
          <p style={{ color: '#cbd5e1', lineHeight: '1.6', marginBottom: '20px' }}>
            {report.summary.recommendation}
          </p>
          <div style={styles.grid}>
            {[
              { label: 'Files Analyzed', value: report.repository.stats.fileCount, icon: '📁' },
              { label: 'Commits Scanned', value: report.repository.stats.commitCount, icon: '📝' },
              { label: 'Pull Requests', value: report.repository.stats.prCount, icon: '🔀' },
              { label: 'Contributors', value: report.repository.stats.contributorCount, icon: '👥' }
            ].map((stat, i) => (
              <div key={i} style={styles.statBox}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{stat.icon}</div>
                <div style={styles.statValue}>{stat.value}</div>
                <div style={styles.statLabel}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <span>📈</span> AI Detection Timeline (Last 30 Days)
        </div>
        <div style={styles.timeline}>
          {report.timeline.map((day, i) => (
            <div
              key={i}
              style={{
                ...styles.timelineBar,
                height: `${Math.max(10, day.aiScore)}%`,
                opacity: 0.5 + (day.commits / 10)
              }}
              title={`${day.date}: Score ${day.aiScore.toFixed(0)}, ${day.commits} commits`}
            />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
          <span>30 days ago</span>
          <span>Today</span>
        </div>
      </div>
    </>
  );

  const renderCodeAnalysis = () => (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <span>🔍</span> Code Pattern Detection
          </div>
          {report.codeAnalysis.patterns.map((pattern, i) => (
            <div key={i} style={styles.patternItem}>
              <div>
                <div style={{ fontWeight: '600', color: pattern.detected ? '#fbbf24' : '#64748b' }}>
                  {pattern.name}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  {pattern.description}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {pattern.detected && (
                  <span style={{
                    ...styles.badge,
                    background: `${getRiskColor(pattern.severity)}20`,
                    color: getRiskColor(pattern.severity)
                  }}>
                    {pattern.instances} found
                  </span>
                )}
                <span style={{ fontSize: '18px' }}>
                  {pattern.detected ? '⚠️' : '✅'}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <span>📊</span> Analysis Score: {report.codeAnalysis.score.toFixed(1)}
          </div>
          <div style={{
            height: '200px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              background: `conic-gradient(
                ${getScoreColor(report.codeAnalysis.score)} ${report.codeAnalysis.score * 3.6}deg,
                rgba(99, 102, 241, 0.1) 0deg
              )`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                width: '140px',
                height: '140px',
                borderRadius: '50%',
                background: 'rgba(30, 30, 60, 0.95)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{ fontSize: '32px', fontWeight: '800', color: getScoreColor(report.codeAnalysis.score) }}>
                  {report.codeAnalysis.score.toFixed(0)}%
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>
                  AI Likelihood
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <span>🚨</span> Flagged Files
        </div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>File Path</th>
              <th style={styles.th}>AI Score</th>
              <th style={styles.th}>Patterns Detected</th>
              <th style={styles.th}>Lines</th>
            </tr>
          </thead>
          <tbody>
            {report.codeAnalysis.flaggedFiles.map((file, i) => (
              <tr key={i}>
                <td style={styles.td}>
                  <code style={{ color: '#a5b4fc' }}>{file.path}</code>
                </td>
                <td style={styles.td}>
                  <span style={{ color: getScoreColor(file.aiScore), fontWeight: '700' }}>
                    {file.aiScore.toFixed(0)}%
                  </span>
                </td>
                <td style={styles.td}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {file.patterns.map((p, j) => (
                      <span key={j} style={{
                        ...styles.badge,
                        background: 'rgba(251, 191, 36, 0.1)',
                        color: '#fbbf24',
                        fontSize: '10px'
                      }}>
                        {p}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={styles.td}>{file.lineCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderPRAnalysis = () => (
    <>
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <span>🔀</span> Pull Request Pattern Analysis
        </div>
        <div style={styles.grid}>
          {report.prAnalysis.patterns.map((pattern, i) => (
            <div key={i} style={{
              ...styles.patternItem,
              background: pattern.detected ? 'rgba(251, 191, 36, 0.1)' : 'rgba(34, 197, 94, 0.05)'
            }}>
              <div>
                <div style={{ fontWeight: '600' }}>{pattern.name}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{pattern.description}</div>
              </div>
              <span style={{ fontSize: '20px' }}>{pattern.detected ? '⚠️' : '✅'}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <span>📋</span> Flagged Pull Requests
        </div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>PR #</th>
              <th style={styles.th}>Title</th>
              <th style={styles.th}>Author</th>
              <th style={styles.th}>AI Score</th>
              <th style={styles.th}>Flags</th>
            </tr>
          </thead>
          <tbody>
            {report.prAnalysis.flaggedPRs.map((pr, i) => (
              <tr key={i}>
                <td style={styles.td}>
                  <span style={{ color: '#6366f1', fontWeight: '600' }}>#{pr.number}</span>
                </td>
                <td style={styles.td}>{pr.title}</td>
                <td style={styles.td}>
                  <code style={{ color: '#94a3b8' }}>@{pr.author}</code>
                </td>
                <td style={styles.td}>
                  <span style={{ color: getScoreColor(pr.aiScore), fontWeight: '700' }}>
                    {pr.aiScore.toFixed(0)}%
                  </span>
                </td>
                <td style={styles.td}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {pr.flags.map((f, j) => (
                      <span key={j} style={{
                        ...styles.badge,
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#f87171',
                        fontSize: '10px'
                      }}>
                        {f}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderContributors = () => (
    <div style={styles.card}>
      <div style={styles.cardTitle}>
        <span>👥</span> Contributor Analysis
      </div>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Contributor</th>
            <th style={styles.th}>Commits</th>
            <th style={styles.th}>AI Score</th>
            <th style={styles.th}>Risk Level</th>
            <th style={styles.th}>Patterns</th>
          </tr>
        </thead>
        <tbody>
          {report.contributorAnalysis.contributors.map((contributor, i) => (
            <tr key={i}>
              <td style={styles.td}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: '700'
                  }}>
                    {contributor.username.charAt(0).toUpperCase()}
                  </div>
                  <code style={{ color: '#a5b4fc' }}>@{contributor.username}</code>
                </div>
              </td>
              <td style={styles.td}>{contributor.commits}</td>
              <td style={styles.td}>
                <span style={{ color: getScoreColor(contributor.aiScore), fontWeight: '700' }}>
                  {contributor.aiScore.toFixed(0)}%
                </span>
              </td>
              <td style={styles.td}>
                <span style={{
                  ...styles.badge,
                  background: `${getRiskColor(contributor.riskLevel)}20`,
                  color: getRiskColor(contributor.riskLevel)
                }}>
                  {contributor.riskLevel}
                </span>
              </td>
              <td style={styles.td}>
                {contributor.patterns.length > 0 ? (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {contributor.patterns.map((p, j) => (
                      <span key={j} style={{
                        ...styles.badge,
                        background: 'rgba(251, 191, 36, 0.1)',
                        color: '#fbbf24',
                        fontSize: '10px'
                      }}>
                        {p}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ color: '#64748b' }}>None detected</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderReport = () => (
    <>
      <div style={{
        background: 'rgba(30, 30, 60, 0.6)',
        borderRadius: '16px',
        padding: '20px 24px',
        marginBottom: '24px',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#a5b4fc' }}>
            {report.repository.owner}/{report.repository.name}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Analyzed at {new Date(report.repository.analyzedAt).toLocaleString()}
          </div>
        </div>
        <a
          href={report.repository.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '10px 20px',
            background: 'rgba(99, 102, 241, 0.2)',
            borderRadius: '8px',
            color: '#a5b4fc',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          View on GitHub →
        </a>
      </div>

      <div style={styles.tabs}>
        {[
          { id: 'overview', label: '📊 Overview' },
          { id: 'code', label: '📝 Code Analysis' },
          { id: 'prs', label: '🔀 PR Analysis' },
          { id: 'contributors', label: '👥 Contributors' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.tabActive : {})
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'code' && renderCodeAnalysis()}
      {activeTab === 'prs' && renderPRAnalysis()}
      {activeTab === 'contributors' && renderContributors()}
    </>
  );

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}>🤖</div>
            <div style={styles.logoText}>GitHub AI Auditor</div>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Detect AI-generated code patterns
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {error && (
          <div style={styles.error}>
            ⚠️ {error}
          </div>
        )}

        {!report && renderInputSection()}
        
        {isAnalyzing && renderProgress()}
        
        {report && !isAnalyzing && renderReport()}

        {report && (
          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <button
              onClick={() => {
                setReport(null);
                setRepoUrl('');
                setActiveTab('overview');
              }}
              style={{
                ...styles.button,
                background: 'rgba(99, 102, 241, 0.2)',
                color: '#a5b4fc'
              }}
            >
              🔄 Analyze Another Repository
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default GitHubAIAuditor;
