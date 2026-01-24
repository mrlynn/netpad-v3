/**
 * NetPad Form Configuration - GitHub AI Repository Auditor
 * 
 * This form collects repository information and analysis preferences
 * for the AI code detection audit workflow.
 * 
 * Run with: npx tsx netpad-form-config.ts
 */

// ============================================================================
// Types
// ============================================================================

interface NetPadConfig {
  baseUrl: string;
  apiKey: string;
  organizationId: string;
  projectId: string;
}

interface FormFieldOption {
  label: string;
  value: string;
}

interface FormFieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  errorMessage?: string;
}

interface ConditionalLogicCondition {
  field: string;
  operator: string;
  value?: string | number | boolean;
}

interface ConditionalLogic {
  action: 'show' | 'hide';
  logicType: 'all' | 'any';
  conditions: ConditionalLogicCondition[];
}

interface LayoutConfig {
  type: string;
  title?: string;
  subtitle?: string;
  content?: string;
}

interface FormField {
  path: string;
  label: string;
  type: string;
  included: boolean;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: FormFieldOption[];
  validation?: FormFieldValidation;
  fieldWidth?: 'full' | 'half' | 'third' | 'quarter';
  defaultValue?: unknown;
  conditionalLogic?: ConditionalLogic;
  layout?: LayoutConfig;
}

interface FormTheme {
  primaryColor?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;
  errorColor?: string;
  successColor?: string;
  borderRadius?: number;
  spacing?: 'compact' | 'comfortable' | 'spacious';
  inputStyle?: 'outlined' | 'filled' | 'standard';
  mode?: 'light' | 'dark';
}

interface FormPage {
  id: string;
  title: string;
  description?: string;
  fields: string[];
}

interface MultiPageConfig {
  enabled: boolean;
  pages: FormPage[];
  showProgressBar?: boolean;
  showPageTitles?: boolean;
  allowSkip?: boolean;
  showReview?: boolean;
}

interface FormConfig {
  name: string;
  slug: string;
  description?: string;
  fieldConfigs: FormField[];
  submitButtonText?: string;
  successMessage?: string;
  theme?: FormTheme;
  multiPage?: MultiPageConfig;
}

// ============================================================================
// Configuration
// ============================================================================

const CONFIG: NetPadConfig = {
  baseUrl: process.env.NETPAD_URL ?? 'https://api.netpad.io',
  apiKey: process.env.NETPAD_API_KEY ?? '',
  organizationId: process.env.NETPAD_ORG_ID ?? '',
  projectId: process.env.NETPAD_PROJECT_ID ?? ''
};

// ============================================================================
// Form Configuration
// ============================================================================

export const gitHubAuditorFormConfig: FormConfig = {
  name: 'GitHub AI Repository Auditor',
  slug: 'github-ai-auditor',
  description: 'Submit a GitHub repository for AI-generated code pattern analysis. Our system will crawl the source code, analyze commit patterns, and produce a comprehensive audit report.',
  
  fieldConfigs: [
    // Section: Repository Information
    {
      path: 'repo_section_header',
      label: 'Repository Information',
      type: 'section-header',
      included: true,
      layout: {
        type: 'section-header',
        title: 'Repository Information',
        subtitle: 'Enter the GitHub repository you want to analyze'
      }
    },
    {
      path: 'repository_url',
      label: 'GitHub Repository URL',
      type: 'url',
      included: true,
      required: true,
      placeholder: 'https://github.com/owner/repository',
      helpText: 'Enter the full URL of the public GitHub repository',
      fieldWidth: 'full',
      validation: {
        pattern: '^https?:\\/\\/(www\\.)?github\\.com\\/[\\w-]+\\/[\\w.-]+\\/?$',
        errorMessage: 'Please enter a valid GitHub repository URL'
      }
    },
    {
      path: 'github_token',
      label: 'GitHub Personal Access Token (Optional)',
      type: 'short_text',
      included: true,
      required: false,
      placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxx',
      helpText: 'Required for private repositories. Token needs repo read access.',
      fieldWidth: 'full'
    },
    {
      path: 'email',
      label: 'Email for Report Delivery',
      type: 'email',
      included: true,
      required: true,
      placeholder: 'your@email.com',
      helpText: 'We\'ll send the completed audit report to this email',
      fieldWidth: 'half'
    },
    {
      path: 'report_format',
      label: 'Report Format',
      type: 'dropdown',
      included: true,
      required: true,
      fieldWidth: 'half',
      defaultValue: 'html',
      options: [
        { label: 'Interactive HTML Dashboard', value: 'html' },
        { label: 'PDF Report', value: 'pdf' },
        { label: 'JSON Data', value: 'json' },
        { label: 'All Formats', value: 'all' }
      ]
    },

    // Section: Analysis Options
    {
      path: 'analysis_section_header',
      label: 'Analysis Options',
      type: 'section-header',
      included: true,
      layout: {
        type: 'section-header',
        title: 'Analysis Configuration',
        subtitle: 'Customize what aspects of the repository to analyze'
      }
    },
    {
      path: 'analysis_types',
      label: 'Analysis Types',
      type: 'checkboxes',
      included: true,
      required: true,
      helpText: 'Select which analysis modules to run',
      options: [
        { label: '📝 Code Pattern Analysis - Detect AI coding signatures', value: 'code_patterns' },
        { label: '🔀 Pull Request Analysis - Examine PR characteristics', value: 'pr_analysis' },
        { label: '📊 Commit Analysis - Review commit message patterns', value: 'commit_analysis' },
        { label: '👥 Contributor Behavior - Analyze contribution patterns', value: 'contributor_analysis' },
        { label: '📈 Timeline Analysis - Track AI usage over time', value: 'timeline_analysis' }
      ],
      defaultValue: ['code_patterns', 'pr_analysis', 'commit_analysis']
    },
    {
      path: 'target_branch',
      label: 'Target Branch',
      type: 'short_text',
      included: true,
      required: false,
      placeholder: 'main',
      helpText: 'Leave empty to analyze the default branch',
      fieldWidth: 'third',
      defaultValue: 'main'
    },
    {
      path: 'max_commits',
      label: 'Maximum Commits to Analyze',
      type: 'number',
      included: true,
      required: false,
      fieldWidth: 'third',
      defaultValue: 500,
      validation: {
        min: 10,
        max: 10000,
        errorMessage: 'Enter a number between 10 and 10,000'
      }
    },
    {
      path: 'history_depth',
      label: 'History Depth',
      type: 'dropdown',
      included: true,
      required: true,
      fieldWidth: 'third',
      defaultValue: '6months',
      options: [
        { label: 'Last 30 days', value: '30days' },
        { label: 'Last 3 months', value: '3months' },
        { label: 'Last 6 months', value: '6months' },
        { label: 'Last year', value: '1year' },
        { label: 'All time', value: 'all' }
      ]
    },

    // Section: Language Preferences
    {
      path: 'languages_section_header',
      label: 'Language Preferences',
      type: 'section-header',
      included: true,
      layout: {
        type: 'section-header',
        title: 'Programming Languages',
        subtitle: 'Select languages to prioritize in the analysis'
      }
    },
    {
      path: 'target_languages',
      label: 'Target Programming Languages',
      type: 'checkboxes',
      included: true,
      required: false,
      helpText: 'Leave empty to analyze all detected languages',
      options: [
        { label: 'JavaScript / TypeScript', value: 'javascript' },
        { label: 'Python', value: 'python' },
        { label: 'Java', value: 'java' },
        { label: 'C# / .NET', value: 'csharp' },
        { label: 'Go', value: 'go' },
        { label: 'Rust', value: 'rust' },
        { label: 'Ruby', value: 'ruby' },
        { label: 'PHP', value: 'php' },
        { label: 'Swift', value: 'swift' },
        { label: 'Kotlin', value: 'kotlin' }
      ]
    },

    // Section: Detection Sensitivity
    {
      path: 'sensitivity_section_header',
      label: 'Detection Sensitivity',
      type: 'section-header',
      included: true,
      layout: {
        type: 'section-header',
        title: 'Detection Sensitivity',
        subtitle: 'Adjust how sensitive the AI detection should be'
      }
    },
    {
      path: 'sensitivity_level',
      label: 'Detection Sensitivity',
      type: 'slider',
      included: true,
      required: true,
      helpText: 'Higher sensitivity may produce more false positives',
      defaultValue: 50,
      validation: {
        min: 1,
        max: 100
      }
    },
    {
      path: 'confidence_threshold',
      label: 'Minimum Confidence Threshold',
      type: 'dropdown',
      included: true,
      required: true,
      fieldWidth: 'half',
      defaultValue: '70',
      helpText: 'Only flag items above this confidence level',
      options: [
        { label: '50% - Show all potential matches', value: '50' },
        { label: '60% - Moderate filtering', value: '60' },
        { label: '70% - Balanced (Recommended)', value: '70' },
        { label: '80% - High confidence only', value: '80' },
        { label: '90% - Very high confidence only', value: '90' }
      ]
    },
    {
      path: 'false_positive_tolerance',
      label: 'False Positive Tolerance',
      type: 'multiple_choice',
      included: true,
      required: true,
      fieldWidth: 'half',
      defaultValue: 'balanced',
      options: [
        { label: 'Low - Minimize false positives', value: 'low' },
        { label: 'Balanced - Default setting', value: 'balanced' },
        { label: 'High - Catch more potential AI code', value: 'high' }
      ]
    },

    // Section: Additional Options
    {
      path: 'additional_section_header',
      label: 'Additional Options',
      type: 'section-header',
      included: true,
      layout: {
        type: 'section-header',
        title: 'Additional Options',
        subtitle: 'Configure extra features and notifications'
      }
    },
    {
      path: 'include_recommendations',
      label: 'Include remediation recommendations',
      type: 'checkbox',
      included: true,
      defaultValue: true,
      helpText: 'Add suggestions for addressing AI-generated code in the report'
    },
    {
      path: 'compare_to_baseline',
      label: 'Compare to industry baseline',
      type: 'checkbox',
      included: true,
      defaultValue: true,
      helpText: 'Compare results against typical open-source projects'
    },
    {
      path: 'schedule_recurring',
      label: 'Schedule recurring audits',
      type: 'checkbox',
      included: true,
      defaultValue: false,
      helpText: 'Automatically re-run this audit on a schedule'
    },
    {
      path: 'recurring_frequency',
      label: 'Audit Frequency',
      type: 'dropdown',
      included: true,
      required: false,
      fieldWidth: 'half',
      options: [
        { label: 'Weekly', value: 'weekly' },
        { label: 'Bi-weekly', value: 'biweekly' },
        { label: 'Monthly', value: 'monthly' },
        { label: 'Quarterly', value: 'quarterly' }
      ],
      conditionalLogic: {
        action: 'show',
        logicType: 'all',
        conditions: [
          { field: 'schedule_recurring', operator: 'equals', value: true }
        ]
      }
    },
    {
      path: 'additional_notes',
      label: 'Additional Notes',
      type: 'long_text',
      included: true,
      required: false,
      placeholder: 'Any specific areas of concern or context about the repository...',
      helpText: 'Optional: Add any context that might help with the analysis'
    }
  ],

  submitButtonText: '🚀 Start AI Analysis',
  successMessage: 'Your audit request has been submitted! You will receive an email when the analysis is complete.',

  theme: {
    primaryColor: '#6366f1',
    backgroundColor: '#0f0f23',
    surfaceColor: '#1e1e3c',
    textColor: '#e2e8f0',
    errorColor: '#ef4444',
    successColor: '#22c55e',
    borderRadius: 12,
    spacing: 'comfortable',
    inputStyle: 'outlined',
    mode: 'dark'
  },

  multiPage: {
    enabled: true,
    showProgressBar: true,
    showPageTitles: true,
    allowSkip: false,
    showReview: true,
    pages: [
      {
        id: 'repository',
        title: 'Repository',
        description: 'Enter repository details',
        fields: ['repo_section_header', 'repository_url', 'github_token', 'email', 'report_format']
      },
      {
        id: 'analysis',
        title: 'Analysis Options',
        description: 'Configure analysis settings',
        fields: ['analysis_section_header', 'analysis_types', 'target_branch', 'max_commits', 'history_depth']
      },
      {
        id: 'languages',
        title: 'Languages',
        description: 'Select target languages',
        fields: ['languages_section_header', 'target_languages']
      },
      {
        id: 'sensitivity',
        title: 'Sensitivity',
        description: 'Adjust detection parameters',
        fields: ['sensitivity_section_header', 'sensitivity_level', 'confidence_threshold', 'false_positive_tolerance']
      },
      {
        id: 'additional',
        title: 'Additional',
        description: 'Extra options and notes',
        fields: ['additional_section_header', 'include_recommendations', 'compare_to_baseline', 'schedule_recurring', 'recurring_frequency', 'additional_notes']
      }
    ]
  }
};

// ============================================================================
// API Functions
// ============================================================================

interface SubmitResult {
  success: boolean;
  submissionId?: string;
  error?: string;
}

interface CreateFormResult {
  formId: string;
}

/**
 * Submit form data to the NetPad API.
 */
export async function submitAuditRequest(data: Record<string, unknown>): Promise<SubmitResult> {
  try {
    const response = await fetch(
      `${CONFIG.baseUrl}/api/forms/${gitHubAuditorFormConfig.slug}/submit`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.apiKey}`
        },
        body: JSON.stringify({ data })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const result = await response.json() as { submissionId: string };
    return { success: true, submissionId: result.submissionId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Create the form in NetPad.
 */
export async function createForm(): Promise<CreateFormResult | { error: string }> {
  try {
    const response = await fetch(`${CONFIG.baseUrl}/api/forms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.apiKey}`
      },
      body: JSON.stringify({
        ...gitHubAuditorFormConfig,
        organizationId: CONFIG.organizationId,
        projectId: CONFIG.projectId
      })
    });

    if (!response.ok) {
      return { error: await response.text() };
    }

    const result = await response.json() as { form: { formId: string } };
    return { formId: result.form.formId };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('📋 GitHub AI Auditor - NetPad Form Configuration');
  console.log('================================================\n');
  
  console.log('Form Name:', gitHubAuditorFormConfig.name);
  console.log('Form Slug:', gitHubAuditorFormConfig.slug);
  console.log('Total Fields:', gitHubAuditorFormConfig.fieldConfigs.length);
  console.log('Pages:', gitHubAuditorFormConfig.multiPage?.pages.length);
  console.log('\nConfiguration exported successfully!');
  console.log('\nTo create this form in NetPad:');
  console.log('1. Set environment variables: NETPAD_URL, NETPAD_API_KEY, NETPAD_ORG_ID, NETPAD_PROJECT_ID');
  console.log('2. Run: npx tsx netpad-form-config.ts');
}

// Uncomment to run:
// main().catch(console.error);

export default gitHubAuditorFormConfig;
