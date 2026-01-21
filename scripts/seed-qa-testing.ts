/**
 * Seed QA Testing Forms
 *
 * Creates the QA Testing project with forms for:
 * - Test Execution tracking
 * - Bug Report submission
 * - Daily QA Checklist
 *
 * Run with: npx tsx scripts/seed-qa-testing.ts
 *
 * Environment variables:
 * - MONGODB_URI: MongoDB connection string
 * - NETPAD_ORG_ID: Organization ID (e.g., org_abc123)
 * - NETPAD_PROJECT_ID: Project ID (e.g., proj_abc123)
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || process.env.PLATFORM_MONGODB_URI;
const ORG_ID = process.env.NETPAD_ORG_ID;
const PROJECT_ID = process.env.NETPAD_PROJECT_ID;

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is not set');
  process.exit(1);
}

if (!ORG_ID) {
  console.error('Error: NETPAD_ORG_ID environment variable is not set');
  console.error('Example: NETPAD_ORG_ID=org_abc123 npx tsx scripts/seed-qa-testing.ts');
  process.exit(1);
}

if (!PROJECT_ID) {
  console.error('Error: NETPAD_PROJECT_ID environment variable is not set');
  console.error('Example: NETPAD_PROJECT_ID=proj_abc123 npx tsx scripts/seed-qa-testing.ts');
  process.exit(1);
}

// Generate unique IDs
const timestamp = Date.now();
const generateId = (prefix: string, index: number) => `${prefix}_qa_${timestamp}_${index}`;

// ============================================
// Test Case Data (from QA Framework)
// ============================================
const testCases = [
  { id: 'TC-ONB-001', title: 'Email Signup Flow', module: 'Authentication', priority: 'P0-Critical' },
  { id: 'TC-ONB-002', title: 'Organization Creation', module: 'Organizations', priority: 'P0-Critical' },
  { id: 'TC-ONB-003', title: 'First Project Creation', module: 'Projects', priority: 'P1-High' },
  { id: 'TC-FRM-001', title: 'Create New Form (Blank)', module: 'Forms', priority: 'P0-Critical' },
  { id: 'TC-FRM-002', title: 'Add Basic Field Types', module: 'Forms', priority: 'P0-Critical' },
  { id: 'TC-FRM-003', title: 'Add Selection Field Types', module: 'Forms', priority: 'P1-High' },
  { id: 'TC-FRM-004', title: 'Configure Conditional Logic', module: 'Forms', priority: 'P1-High' },
  { id: 'TC-FRM-005', title: 'Configure Field Validation', module: 'Forms', priority: 'P1-High' },
  { id: 'TC-FRM-006', title: 'Create Form from Template', module: 'Forms', priority: 'P1-High' },
  { id: 'TC-FRM-007', title: 'Multi-Page Form Configuration', module: 'Forms', priority: 'P2-Medium' },
  { id: 'TC-PUB-001', title: 'Publish Form', module: 'Publishing', priority: 'P0-Critical' },
  { id: 'TC-PUB-002', title: 'Form Submission (End User)', module: 'Submission', priority: 'P0-Critical' },
  { id: 'TC-PUB-003', title: 'View Submissions (Admin)', module: 'Data Management', priority: 'P0-Critical' },
  { id: 'TC-WFL-001', title: 'Create Form-to-Email Workflow', module: 'Workflows', priority: 'P0-Critical' },
  { id: 'TC-WFL-002', title: 'Test Workflow Execution', module: 'Workflows', priority: 'P0-Critical' },
  { id: 'TC-WFL-003', title: 'Conditional Workflow Logic', module: 'Workflows', priority: 'P1-High' },
  { id: 'TC-DAT-001', title: 'Add MongoDB Connection', module: 'Data Management', priority: 'P1-High' },
  { id: 'TC-DAT-002', title: 'Browse MongoDB Data', module: 'Data Management', priority: 'P1-High' },
  { id: 'TC-AI-001', title: 'Generate Form with AI', module: 'AI', priority: 'P2-Medium' },
  { id: 'TC-AI-002', title: 'Conversational Form Experience', module: 'Conversational Forms', priority: 'P2-Medium' },
  { id: 'TC-TEAM-001', title: 'Invite Team Member', module: 'Team Management', priority: 'P1-High' },
  { id: 'TC-TEAM-002', title: 'Role-Based Access Control', module: 'Permissions', priority: 'P1-High' },
];

// ============================================
// Form 1: Test Execution Form
// ============================================
const testExecutionForm = {
  id: generateId('form', 1),
  formId: generateId('form', 1),
  slug: 'test-execution',
  name: 'Test Execution',
  description: 'Record test case execution results, capture evidence, and track pass/fail status',
  organizationId: ORG_ID,
  projectId: PROJECT_ID,
  isPublished: false,
  fieldConfigs: [
    // Section: Test Case Selection
    {
      path: '_section_test_case',
      label: 'Test Case Information',
      type: 'section-header',
      included: true,
      required: false,
    },
    {
      path: 'testCaseId',
      label: 'Test Case',
      type: 'select',
      included: true,
      required: true,
      placeholder: 'Select the test case being executed',
      validation: {
        options: testCases.map(tc => ({
          value: tc.id,
          label: `${tc.id}: ${tc.title}`,
        })),
      },
    },
    {
      path: 'testCaseTitle',
      label: 'Test Case Title',
      type: 'string',
      included: true,
      required: false,
      placeholder: 'Auto-populated or enter custom title',
    },
    {
      path: 'module',
      label: 'Module',
      type: 'select',
      included: true,
      required: true,
      validation: {
        options: [
          'Authentication',
          'Organizations',
          'Projects',
          'Forms',
          'Publishing',
          'Submission',
          'Data Management',
          'Workflows',
          'AI',
          'Conversational Forms',
          'Team Management',
          'Permissions',
          'Other',
        ],
      },
    },
    {
      path: 'priority',
      label: 'Priority',
      type: 'select',
      included: true,
      required: true,
      validation: {
        options: ['P0-Critical', 'P1-High', 'P2-Medium', 'P3-Low'],
      },
    },

    // Section: Execution Environment
    {
      path: '_section_environment',
      label: 'Execution Environment',
      type: 'section-header',
      included: true,
      required: false,
    },
    {
      path: 'environment',
      label: 'Environment',
      type: 'select',
      included: true,
      required: true,
      validation: {
        options: [
          { value: 'local', label: 'Local (localhost:3000)' },
          { value: 'development', label: 'Development (dev.netpad.io)' },
          { value: 'staging', label: 'Staging (staging.netpad.io)' },
          { value: 'production', label: 'Production (app.netpad.io)' },
        ],
      },
    },
    {
      path: 'browser',
      label: 'Browser',
      type: 'select',
      included: true,
      required: true,
      validation: {
        options: [
          'Chrome (Latest)',
          'Chrome (Latest-1)',
          'Firefox (Latest)',
          'Safari (Latest)',
          'Edge (Latest)',
          'Mobile Safari (iOS)',
          'Mobile Chrome (Android)',
        ],
      },
    },
    {
      path: 'operatingSystem',
      label: 'Operating System',
      type: 'select',
      included: true,
      required: true,
      validation: {
        options: [
          'macOS 14 (Sonoma)',
          'macOS 15 (Sequoia)',
          'Windows 11',
          'Windows 10',
          'iOS 17',
          'iOS 18',
          'Android 14',
          'Linux (Ubuntu)',
          'Other',
        ],
      },
    },
    {
      path: 'screenResolution',
      label: 'Screen Resolution',
      type: 'select',
      included: true,
      required: false,
      validation: {
        options: [
          '1920x1080 (Desktop)',
          '1440x900 (Laptop)',
          '2560x1440 (QHD)',
          '3840x2160 (4K)',
          '375x812 (iPhone)',
          '390x844 (iPhone Pro)',
          '768x1024 (iPad)',
          'Other',
        ],
      },
    },
    {
      path: 'testAccount',
      label: 'Test Account Used',
      type: 'select',
      included: true,
      required: false,
      validation: {
        options: [
          'Owner (owner@test.netpad.io)',
          'Admin (admin@test.netpad.io)',
          'Member (member@test.netpad.io)',
          'Viewer (viewer@test.netpad.io)',
          'New Account (fresh signup)',
          'Other',
        ],
      },
    },

    // Section: Test Results
    {
      path: '_section_results',
      label: 'Test Results',
      type: 'section-header',
      included: true,
      required: false,
    },
    {
      path: 'status',
      label: 'Overall Status',
      type: 'radio',
      included: true,
      required: true,
      validation: {
        options: [
          { value: 'pass', label: '✅ Pass - All steps completed successfully' },
          { value: 'fail', label: '❌ Fail - One or more steps failed' },
          { value: 'blocked', label: '⏸️ Blocked - Cannot proceed due to dependency' },
          { value: 'skipped', label: '⏭️ Skipped - Intentionally not tested' },
        ],
      },
    },
    {
      path: 'executionDate',
      label: 'Execution Date',
      type: 'date',
      included: true,
      required: true,
      defaultValue: 'today',
    },
    {
      path: 'executionTime',
      label: 'Time Spent (minutes)',
      type: 'number',
      included: true,
      required: false,
      placeholder: 'How long did this test take?',
      validation: {
        min: 1,
        max: 480,
      },
    },
    {
      path: 'testerName',
      label: 'Tester Name',
      type: 'string',
      included: true,
      required: true,
      placeholder: 'Your name',
    },
    {
      path: 'testerEmail',
      label: 'Tester Email',
      type: 'email',
      included: true,
      required: true,
      placeholder: 'your.email@example.com',
    },

    // Section: Step Results (conditional on fail)
    {
      path: '_section_steps',
      label: 'Step-by-Step Results',
      type: 'section-header',
      included: true,
      required: false,
      conditionalLogic: {
        action: 'show',
        logicType: 'any',
        conditions: [
          { field: 'status', operator: 'equals', value: 'fail' },
          { field: 'status', operator: 'equals', value: 'blocked' },
        ],
      },
    },
    {
      path: 'failedStep',
      label: 'Which step failed?',
      type: 'number',
      included: true,
      required: false,
      placeholder: 'Step number (e.g., 3)',
      validation: {
        min: 1,
        max: 20,
      },
      conditionalLogic: {
        action: 'show',
        logicType: 'all',
        conditions: [{ field: 'status', operator: 'equals', value: 'fail' }],
      },
    },
    {
      path: 'expectedResult',
      label: 'Expected Result',
      type: 'textarea',
      included: true,
      required: false,
      placeholder: 'What should have happened?',
      conditionalLogic: {
        action: 'show',
        logicType: 'any',
        conditions: [
          { field: 'status', operator: 'equals', value: 'fail' },
          { field: 'status', operator: 'equals', value: 'blocked' },
        ],
      },
    },
    {
      path: 'actualResult',
      label: 'Actual Result',
      type: 'textarea',
      included: true,
      required: false,
      placeholder: 'What actually happened?',
      conditionalLogic: {
        action: 'show',
        logicType: 'any',
        conditions: [
          { field: 'status', operator: 'equals', value: 'fail' },
          { field: 'status', operator: 'equals', value: 'blocked' },
        ],
      },
    },
    {
      path: 'blockerReason',
      label: 'Blocker Reason',
      type: 'textarea',
      included: true,
      required: false,
      placeholder: 'What is blocking the test? (environment issue, dependency, etc.)',
      conditionalLogic: {
        action: 'show',
        logicType: 'all',
        conditions: [{ field: 'status', operator: 'equals', value: 'blocked' }],
      },
    },

    // Section: Evidence
    {
      path: '_section_evidence',
      label: 'Evidence & Attachments',
      type: 'section-header',
      included: true,
      required: false,
    },
    {
      path: 'screenshots',
      label: 'Screenshots',
      type: 'file',
      included: true,
      required: false,
      placeholder: 'Upload screenshots of the test execution',
      validation: {
        allowedTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
        maxSize: 10,
        multiple: true,
        maxFiles: 10,
      },
    },
    {
      path: 'screenRecording',
      label: 'Screen Recording',
      type: 'file',
      included: true,
      required: false,
      placeholder: 'Upload a video recording of the test',
      validation: {
        allowedTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
        maxSize: 100,
        multiple: false,
      },
    },
    {
      path: 'consoleErrors',
      label: 'Console Errors',
      type: 'textarea',
      included: true,
      required: false,
      placeholder: 'Paste any browser console errors (F12 → Console)',
    },
    {
      path: 'networkErrors',
      label: 'Network Errors',
      type: 'textarea',
      included: true,
      required: false,
      placeholder: 'Paste any failed API requests (F12 → Network)',
    },

    // Section: Bug Reference
    {
      path: '_section_bug',
      label: 'Bug Reference',
      type: 'section-header',
      included: true,
      required: false,
      conditionalLogic: {
        action: 'show',
        logicType: 'all',
        conditions: [{ field: 'status', operator: 'equals', value: 'fail' }],
      },
    },
    {
      path: 'bugFiled',
      label: 'Bug report filed?',
      type: 'boolean',
      included: true,
      required: false,
      conditionalLogic: {
        action: 'show',
        logicType: 'all',
        conditions: [{ field: 'status', operator: 'equals', value: 'fail' }],
      },
    },
    {
      path: 'bugId',
      label: 'Bug ID / Reference',
      type: 'string',
      included: true,
      required: false,
      placeholder: 'BUG-001 or GitHub issue URL',
      conditionalLogic: {
        action: 'show',
        logicType: 'all',
        conditions: [{ field: 'bugFiled', operator: 'equals', value: true }],
      },
    },

    // Section: Notes
    {
      path: '_section_notes',
      label: 'Additional Notes',
      type: 'section-header',
      included: true,
      required: false,
    },
    {
      path: 'notes',
      label: 'Notes & Observations',
      type: 'textarea',
      included: true,
      required: false,
      placeholder: 'Any additional observations, suggestions, or context',
    },
  ],
  theme: {
    preset: 'professional',
    primaryColor: '#00684A',
    mode: 'light',
  },
  formType: 'data-entry',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ============================================
// Form 2: Bug Report Form
// ============================================
const bugReportForm = {
  id: generateId('form', 2),
  formId: generateId('form', 2),
  slug: 'bug-report',
  name: 'Bug Report',
  description: 'Report bugs with severity classification, reproduction steps, and evidence',
  organizationId: ORG_ID,
  projectId: PROJECT_ID,
  isPublished: false,
  fieldConfigs: [
    // Section: Bug Classification
    {
      path: '_section_classification',
      label: 'Bug Classification',
      type: 'section-header',
      included: true,
      required: false,
    },
    {
      path: 'title',
      label: 'Bug Title',
      type: 'string',
      included: true,
      required: true,
      placeholder: 'Short, descriptive summary (e.g., "Form submission fails with 500 error when file exceeds 5MB")',
      validation: {
        minLength: 10,
        maxLength: 200,
      },
    },
    {
      path: 'severity',
      label: 'Severity',
      type: 'radio',
      included: true,
      required: true,
      validation: {
        options: [
          { value: 'critical', label: '🔴 Critical - System unusable, data loss, security issue' },
          { value: 'major', label: '🟠 Major - Feature broken, no workaround, blocks workflow' },
          { value: 'minor', label: '🟡 Minor - Feature impaired but workaround exists' },
          { value: 'trivial', label: '🟢 Trivial - Cosmetic issue, typo, minor UI glitch' },
        ],
      },
    },
    {
      path: 'module',
      label: 'Module',
      type: 'select',
      included: true,
      required: true,
      validation: {
        options: [
          'Forms',
          'Workflows',
          'Data Management',
          'AI',
          'Authentication',
          'Organizations',
          'Projects',
          'Team Management',
          'Billing',
          'Other',
        ],
      },
    },
    {
      path: 'foundInTestCase',
      label: 'Found in Test Case (if applicable)',
      type: 'select',
      included: true,
      required: false,
      placeholder: 'Select test case if bug was found during testing',
      validation: {
        options: [
          { value: '', label: 'Not from a test case' },
          ...testCases.map(tc => ({
            value: tc.id,
            label: `${tc.id}: ${tc.title}`,
          })),
        ],
      },
    },
    {
      path: 'reproducibility',
      label: 'Reproducibility',
      type: 'radio',
      included: true,
      required: true,
      validation: {
        options: [
          { value: 'always', label: 'Always - Happens every time' },
          { value: 'sometimes', label: 'Sometimes - Happens frequently but not always' },
          { value: 'rarely', label: 'Rarely - Hard to reproduce' },
          { value: 'once', label: 'Once - Only seen it happen once' },
        ],
      },
    },

    // Section: Environment
    {
      path: '_section_environment',
      label: 'Environment',
      type: 'section-header',
      included: true,
      required: false,
    },
    {
      path: 'url',
      label: 'URL where bug occurred',
      type: 'url',
      included: true,
      required: true,
      placeholder: 'https://staging.netpad.io/...',
    },
    {
      path: 'browser',
      label: 'Browser',
      type: 'select',
      included: true,
      required: true,
      validation: {
        options: [
          'Chrome (Latest)',
          'Chrome (Latest-1)',
          'Firefox (Latest)',
          'Safari (Latest)',
          'Edge (Latest)',
          'Mobile Safari (iOS)',
          'Mobile Chrome (Android)',
          'Other',
        ],
      },
    },
    {
      path: 'browserVersion',
      label: 'Browser Version',
      type: 'string',
      included: true,
      required: false,
      placeholder: 'e.g., 120.0.6099.129',
    },
    {
      path: 'operatingSystem',
      label: 'Operating System',
      type: 'select',
      included: true,
      required: true,
      validation: {
        options: [
          'macOS 14 (Sonoma)',
          'macOS 15 (Sequoia)',
          'Windows 11',
          'Windows 10',
          'iOS 17',
          'iOS 18',
          'Android 14',
          'Linux',
          'Other',
        ],
      },
    },
    {
      path: 'screenSize',
      label: 'Screen Size',
      type: 'string',
      included: true,
      required: false,
      placeholder: 'e.g., 1920x1080, mobile, etc.',
    },
    {
      path: 'testAccount',
      label: 'Account Used',
      type: 'string',
      included: true,
      required: false,
      placeholder: 'Which test account was used?',
    },

    // Section: Reproduction Steps
    {
      path: '_section_steps',
      label: 'Steps to Reproduce',
      type: 'section-header',
      included: true,
      required: false,
    },
    {
      path: 'step1',
      label: 'Step 1',
      type: 'string',
      included: true,
      required: true,
      placeholder: 'First step to reproduce the bug',
    },
    {
      path: 'step2',
      label: 'Step 2',
      type: 'string',
      included: true,
      required: true,
      placeholder: 'Second step',
    },
    {
      path: 'step3',
      label: 'Step 3',
      type: 'string',
      included: true,
      required: false,
      placeholder: 'Third step (if needed)',
    },
    {
      path: 'step4',
      label: 'Step 4',
      type: 'string',
      included: true,
      required: false,
      placeholder: 'Fourth step (if needed)',
    },
    {
      path: 'step5',
      label: 'Step 5',
      type: 'string',
      included: true,
      required: false,
      placeholder: 'Fifth step (if needed)',
    },

    // Section: Expected vs Actual
    {
      path: '_section_results',
      label: 'Results',
      type: 'section-header',
      included: true,
      required: false,
    },
    {
      path: 'expectedResult',
      label: 'Expected Result',
      type: 'textarea',
      included: true,
      required: true,
      placeholder: 'What should have happened?',
    },
    {
      path: 'actualResult',
      label: 'Actual Result',
      type: 'textarea',
      included: true,
      required: true,
      placeholder: 'What actually happened?',
    },

    // Section: Evidence
    {
      path: '_section_evidence',
      label: 'Attachments & Evidence',
      type: 'section-header',
      included: true,
      required: false,
    },
    {
      path: 'screenshots',
      label: 'Screenshots',
      type: 'file',
      included: true,
      required: false,
      placeholder: 'Upload screenshots showing the bug',
      validation: {
        allowedTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
        maxSize: 10,
        multiple: true,
        maxFiles: 5,
      },
    },
    {
      path: 'screenRecording',
      label: 'Screen Recording',
      type: 'file',
      included: true,
      required: false,
      placeholder: 'Upload a video showing the bug reproduction',
      validation: {
        allowedTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
        maxSize: 100,
        multiple: false,
      },
    },
    {
      path: 'consoleErrors',
      label: 'Console Errors',
      type: 'textarea',
      included: true,
      required: false,
      placeholder: 'Paste any browser console errors here (F12 → Console → copy red text)',
    },
    {
      path: 'networkErrors',
      label: 'Network Errors',
      type: 'textarea',
      included: true,
      required: false,
      placeholder: 'Paste any failed API requests here (F12 → Network → failed requests)',
    },

    // Section: Additional Context
    {
      path: '_section_context',
      label: 'Additional Context',
      type: 'section-header',
      included: true,
      required: false,
    },
    {
      path: 'workaround',
      label: 'Is there a workaround?',
      type: 'boolean',
      included: true,
      required: false,
    },
    {
      path: 'workaroundDescription',
      label: 'Workaround Description',
      type: 'textarea',
      included: true,
      required: false,
      placeholder: 'Describe the workaround if one exists',
      conditionalLogic: {
        action: 'show',
        logicType: 'all',
        conditions: [{ field: 'workaround', operator: 'equals', value: true }],
      },
    },
    {
      path: 'relatedBugs',
      label: 'Related Bugs',
      type: 'string',
      included: true,
      required: false,
      placeholder: 'IDs of related bugs (e.g., BUG-001, BUG-002)',
    },
    {
      path: 'additionalNotes',
      label: 'Additional Notes',
      type: 'textarea',
      included: true,
      required: false,
      placeholder: 'Any other relevant information',
    },

    // Section: Reporter Info
    {
      path: '_section_reporter',
      label: 'Reporter Information',
      type: 'section-header',
      included: true,
      required: false,
    },
    {
      path: 'reporterName',
      label: 'Your Name',
      type: 'string',
      included: true,
      required: true,
      placeholder: 'Your name',
    },
    {
      path: 'reporterEmail',
      label: 'Your Email',
      type: 'email',
      included: true,
      required: true,
      placeholder: 'your.email@example.com',
    },
    {
      path: 'reportDate',
      label: 'Report Date',
      type: 'date',
      included: true,
      required: true,
      defaultValue: 'today',
    },
  ],
  theme: {
    preset: 'professional',
    primaryColor: '#dc3545',
    mode: 'light',
  },
  formType: 'data-entry',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ============================================
// Form 3: Daily QA Checklist
// ============================================
const dailyChecklistForm = {
  id: generateId('form', 3),
  formId: generateId('form', 3),
  slug: 'daily-qa-checklist',
  name: 'Daily QA Checklist',
  description: 'Track daily QA activities, environment status, and test progress',
  organizationId: ORG_ID,
  projectId: PROJECT_ID,
  isPublished: false,
  fieldConfigs: [
    // Section: Session Info
    {
      path: '_section_session',
      label: 'Session Information',
      type: 'section-header',
      included: true,
      required: false,
    },
    {
      path: 'testerName',
      label: 'Tester Name',
      type: 'string',
      included: true,
      required: true,
      placeholder: 'Your name',
    },
    {
      path: 'date',
      label: 'Date',
      type: 'date',
      included: true,
      required: true,
      defaultValue: 'today',
    },
    {
      path: 'sessionType',
      label: 'Session Type',
      type: 'radio',
      included: true,
      required: true,
      validation: {
        options: [
          { value: 'start', label: '🌅 Start of Day' },
          { value: 'end', label: '🌆 End of Day' },
          { value: 'adhoc', label: '📋 Ad-hoc Check' },
        ],
      },
    },

    // Section: Pre-Testing Checks (start of day)
    {
      path: '_section_pre_testing',
      label: 'Pre-Testing Checks',
      type: 'section-header',
      included: true,
      required: false,
      conditionalLogic: {
        action: 'show',
        logicType: 'all',
        conditions: [{ field: 'sessionType', operator: 'equals', value: 'start' }],
      },
    },
    {
      path: 'slackChecked',
      label: 'Checked Slack for announcements',
      type: 'boolean',
      included: true,
      required: false,
      conditionalLogic: {
        action: 'show',
        logicType: 'all',
        conditions: [{ field: 'sessionType', operator: 'equals', value: 'start' }],
      },
    },
    {
      path: 'environmentsUp',
      label: 'Test environments are accessible',
      type: 'boolean',
      included: true,
      required: false,
      conditionalLogic: {
        action: 'show',
        logicType: 'all',
        conditions: [{ field: 'sessionType', operator: 'equals', value: 'start' }],
      },
    },
    {
      path: 'testCasesReviewed',
      label: 'Reviewed assigned test cases',
      type: 'boolean',
      included: true,
      required: false,
      conditionalLogic: {
        action: 'show',
        logicType: 'all',
        conditions: [{ field: 'sessionType', operator: 'equals', value: 'start' }],
      },
    },
    {
      path: 'newBuildsChecked',
      label: 'Checked for new builds/deployments',
      type: 'boolean',
      included: true,
      required: false,
      conditionalLogic: {
        action: 'show',
        logicType: 'all',
        conditions: [{ field: 'sessionType', operator: 'equals', value: 'start' }],
      },
    },

    // Section: Environment Status
    {
      path: '_section_environment',
      label: 'Environment Status',
      type: 'section-header',
      included: true,
      required: false,
    },
    {
      path: 'stagingStatus',
      label: 'Staging Environment',
      type: 'radio',
      included: true,
      required: true,
      validation: {
        options: [
          { value: 'up', label: '✅ Up and running' },
          { value: 'degraded', label: '⚠️ Degraded performance' },
          { value: 'down', label: '❌ Down or inaccessible' },
          { value: 'not_checked', label: '⏭️ Not checked' },
        ],
      },
    },
    {
      path: 'developmentStatus',
      label: 'Development Environment',
      type: 'radio',
      included: true,
      required: false,
      validation: {
        options: [
          { value: 'up', label: '✅ Up and running' },
          { value: 'degraded', label: '⚠️ Degraded performance' },
          { value: 'down', label: '❌ Down or inaccessible' },
          { value: 'not_checked', label: '⏭️ Not checked' },
        ],
      },
    },
    {
      path: 'environmentNotes',
      label: 'Environment Notes',
      type: 'textarea',
      included: true,
      required: false,
      placeholder: 'Any issues or observations about the test environments',
    },

    // Section: Test Progress (end of day)
    {
      path: '_section_progress',
      label: 'Test Progress',
      type: 'section-header',
      included: true,
      required: false,
      conditionalLogic: {
        action: 'show',
        logicType: 'all',
        conditions: [{ field: 'sessionType', operator: 'equals', value: 'end' }],
      },
    },
    {
      path: 'testsPlanned',
      label: 'Tests Planned Today',
      type: 'number',
      included: true,
      required: false,
      placeholder: 'Number of tests you planned to run',
      conditionalLogic: {
        action: 'show',
        logicType: 'all',
        conditions: [{ field: 'sessionType', operator: 'equals', value: 'end' }],
      },
    },
    {
      path: 'testsExecuted',
      label: 'Tests Executed',
      type: 'number',
      included: true,
      required: false,
      placeholder: 'Number of tests actually run',
      conditionalLogic: {
        action: 'show',
        logicType: 'all',
        conditions: [{ field: 'sessionType', operator: 'equals', value: 'end' }],
      },
    },
    {
      path: 'testsPassed',
      label: 'Tests Passed',
      type: 'number',
      included: true,
      required: false,
      conditionalLogic: {
        action: 'show',
        logicType: 'all',
        conditions: [{ field: 'sessionType', operator: 'equals', value: 'end' }],
      },
    },
    {
      path: 'testsFailed',
      label: 'Tests Failed',
      type: 'number',
      included: true,
      required: false,
      conditionalLogic: {
        action: 'show',
        logicType: 'all',
        conditions: [{ field: 'sessionType', operator: 'equals', value: 'end' }],
      },
    },
    {
      path: 'testsBlocked',
      label: 'Tests Blocked',
      type: 'number',
      included: true,
      required: false,
      conditionalLogic: {
        action: 'show',
        logicType: 'all',
        conditions: [{ field: 'sessionType', operator: 'equals', value: 'end' }],
      },
    },
    {
      path: 'bugsFiledToday',
      label: 'Bugs Filed Today',
      type: 'number',
      included: true,
      required: false,
      conditionalLogic: {
        action: 'show',
        logicType: 'all',
        conditions: [{ field: 'sessionType', operator: 'equals', value: 'end' }],
      },
    },

    // Section: Blockers
    {
      path: '_section_blockers',
      label: 'Blockers & Issues',
      type: 'section-header',
      included: true,
      required: false,
    },
    {
      path: 'hasBlockers',
      label: 'Any blockers encountered?',
      type: 'boolean',
      included: true,
      required: false,
    },
    {
      path: 'blockerDescription',
      label: 'Blocker Description',
      type: 'textarea',
      included: true,
      required: false,
      placeholder: 'Describe any blockers or issues preventing testing',
      conditionalLogic: {
        action: 'show',
        logicType: 'all',
        conditions: [{ field: 'hasBlockers', operator: 'equals', value: true }],
      },
    },
    {
      path: 'blockerEscalated',
      label: 'Blocker escalated to QA Lead?',
      type: 'boolean',
      included: true,
      required: false,
      conditionalLogic: {
        action: 'show',
        logicType: 'all',
        conditions: [{ field: 'hasBlockers', operator: 'equals', value: true }],
      },
    },

    // Section: End of Day Tasks
    {
      path: '_section_eod',
      label: 'End of Day Tasks',
      type: 'section-header',
      included: true,
      required: false,
      conditionalLogic: {
        action: 'show',
        logicType: 'all',
        conditions: [{ field: 'sessionType', operator: 'equals', value: 'end' }],
      },
    },
    {
      path: 'trackerUpdated',
      label: 'Updated test tracker',
      type: 'boolean',
      included: true,
      required: false,
      conditionalLogic: {
        action: 'show',
        logicType: 'all',
        conditions: [{ field: 'sessionType', operator: 'equals', value: 'end' }],
      },
    },
    {
      path: 'blockersReported',
      label: 'Reported all blockers to QA Lead',
      type: 'boolean',
      included: true,
      required: false,
      conditionalLogic: {
        action: 'show',
        logicType: 'all',
        conditions: [{ field: 'sessionType', operator: 'equals', value: 'end' }],
      },
    },
    {
      path: 'testDataCleaned',
      label: 'Cleaned up test data (if needed)',
      type: 'boolean',
      included: true,
      required: false,
      conditionalLogic: {
        action: 'show',
        logicType: 'all',
        conditions: [{ field: 'sessionType', operator: 'equals', value: 'end' }],
      },
    },
    {
      path: 'stopPointNoted',
      label: 'Noted where you stopped',
      type: 'boolean',
      included: true,
      required: false,
      conditionalLogic: {
        action: 'show',
        logicType: 'all',
        conditions: [{ field: 'sessionType', operator: 'equals', value: 'end' }],
      },
    },

    // Section: Notes
    {
      path: '_section_notes',
      label: 'Notes & Observations',
      type: 'section-header',
      included: true,
      required: false,
    },
    {
      path: 'tomorrowPlan',
      label: "Tomorrow's Plan",
      type: 'textarea',
      included: true,
      required: false,
      placeholder: 'What do you plan to test tomorrow?',
      conditionalLogic: {
        action: 'show',
        logicType: 'all',
        conditions: [{ field: 'sessionType', operator: 'equals', value: 'end' }],
      },
    },
    {
      path: 'generalNotes',
      label: 'General Notes',
      type: 'textarea',
      included: true,
      required: false,
      placeholder: 'Any other notes, observations, or feedback',
    },
  ],
  theme: {
    preset: 'professional',
    primaryColor: '#0066cc',
    mode: 'light',
  },
  formType: 'data-entry',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ============================================
// Form 4: Smoke Test Form (quick validation)
// ============================================
const smokeTestForm = {
  id: generateId('form', 4),
  formId: generateId('form', 4),
  slug: 'smoke-test',
  name: 'Smoke Test',
  description: 'Quick 5-minute smoke test to verify core functionality is working',
  organizationId: ORG_ID,
  projectId: PROJECT_ID,
  isPublished: false,
  fieldConfigs: [
    {
      path: '_section_info',
      label: 'Smoke Test - Quick Validation',
      type: 'section-header',
      included: true,
      required: false,
    },
    {
      path: 'description',
      label: '',
      type: 'description',
      included: true,
      required: false,
      layout: {
        type: 'description',
        content: 'Complete this quick test to verify core NetPad functionality. Should take about 5 minutes.',
      },
    },
    {
      path: 'testerName',
      label: 'Tester',
      type: 'string',
      included: true,
      required: true,
    },
    {
      path: 'environment',
      label: 'Environment',
      type: 'select',
      included: true,
      required: true,
      validation: {
        options: ['Local', 'Development', 'Staging', 'Production'],
      },
    },
    {
      path: 'testDate',
      label: 'Date',
      type: 'date',
      included: true,
      required: true,
      defaultValue: 'today',
    },

    // Core Checks
    {
      path: '_section_checks',
      label: 'Core Functionality Checks',
      type: 'section-header',
      included: true,
      required: false,
    },
    {
      path: 'loginWorks',
      label: '1. Login → Dashboard loads',
      type: 'radio',
      included: true,
      required: true,
      validation: {
        options: [
          { value: 'pass', label: '✅ Pass' },
          { value: 'fail', label: '❌ Fail' },
          { value: 'skip', label: '⏭️ Skip' },
        ],
      },
    },
    {
      path: 'createFormWorks',
      label: '2. Create form → Add 1 field → Save',
      type: 'radio',
      included: true,
      required: true,
      validation: {
        options: [
          { value: 'pass', label: '✅ Pass' },
          { value: 'fail', label: '❌ Fail' },
          { value: 'skip', label: '⏭️ Skip' },
        ],
      },
    },
    {
      path: 'previewWorks',
      label: '3. Preview → Submit test data',
      type: 'radio',
      included: true,
      required: true,
      validation: {
        options: [
          { value: 'pass', label: '✅ Pass' },
          { value: 'fail', label: '❌ Fail' },
          { value: 'skip', label: '⏭️ Skip' },
        ],
      },
    },
    {
      path: 'submissionsWork',
      label: '4. View submissions → Data appears',
      type: 'radio',
      included: true,
      required: true,
      validation: {
        options: [
          { value: 'pass', label: '✅ Pass' },
          { value: 'fail', label: '❌ Fail' },
          { value: 'skip', label: '⏭️ Skip' },
        ],
      },
    },

    // Overall Result
    {
      path: '_section_result',
      label: 'Result',
      type: 'section-header',
      included: true,
      required: false,
    },
    {
      path: 'overallResult',
      label: 'Overall Smoke Test Result',
      type: 'radio',
      included: true,
      required: true,
      validation: {
        options: [
          { value: 'pass', label: '✅ All checks passed - System is GO' },
          { value: 'fail', label: '❌ One or more checks failed - Issues found' },
        ],
      },
    },
    {
      path: 'notes',
      label: 'Notes',
      type: 'textarea',
      included: true,
      required: false,
      placeholder: 'Any issues or observations',
    },
  ],
  theme: {
    preset: 'professional',
    primaryColor: '#28a745',
    mode: 'light',
  },
  formType: 'data-entry',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ============================================
// Main Seed Function
// ============================================
async function seedQATesting() {
  const client = new MongoClient(MONGODB_URI!);

  try {
    await client.connect();
    console.log('Connected to MongoDB\n');

    // Use organization-specific database
    const orgDb = client.db(ORG_ID);
    const formsCollection = orgDb.collection('forms');

    console.log(`Using organization database: ${ORG_ID}`);
    console.log(`Project ID: ${PROJECT_ID}\n`);

    const forms = [
      { form: testExecutionForm, name: 'Test Execution' },
      { form: bugReportForm, name: 'Bug Report' },
      { form: dailyChecklistForm, name: 'Daily QA Checklist' },
      { form: smokeTestForm, name: 'Smoke Test' },
    ];

    for (const { form, name } of forms) {
      // Check if form already exists by slug
      const existingForm = await formsCollection.findOne({ slug: form.slug });

      if (existingForm) {
        console.log(`⚠️  Form "${name}" already exists (slug: ${form.slug}). Updating...`);
        await formsCollection.updateOne(
          { slug: form.slug },
          {
            $set: {
              ...form,
              id: existingForm.id,
              formId: existingForm.formId,
              updatedAt: new Date(),
            },
          }
        );
        console.log(`   Updated form: ${name}`);
      } else {
        console.log(`✅ Creating form: ${name}`);
        await formsCollection.insertOne(form);
        console.log(`   Created with ID: ${form.id}`);
      }
    }

    // Create indexes
    console.log('\nCreating indexes...');
    try {
      await formsCollection.createIndex({ slug: 1 }, { unique: true });
      await formsCollection.createIndex({ projectId: 1 });
      await formsCollection.createIndex({ organizationId: 1 });
      console.log('✅ Indexes created');
    } catch (indexErr: unknown) {
      const error = indexErr as { code?: number };
      if (error.code === 86 || error.code === 85) {
        console.log('   Indexes already exist (skipping)');
      } else {
        throw indexErr;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('QA TESTING FORMS CREATED SUCCESSFULLY');
    console.log('='.repeat(60));
    console.log('\nForms created:');
    console.log('  1. Test Execution     - Record test results with pass/fail tracking');
    console.log('  2. Bug Report         - Report bugs with severity and evidence');
    console.log('  3. Daily QA Checklist - Track daily QA activities');
    console.log('  4. Smoke Test         - Quick 5-minute validation');
    console.log('\nNext steps:');
    console.log('  1. Open NetPad and navigate to your project');
    console.log('  2. Go to Forms to see the new QA forms');
    console.log('  3. Customize themes, add additional fields as needed');
    console.log('  4. Publish forms when ready for testers to use');
    console.log('  5. Create workflows for notifications (e.g., Critical bug alerts)');
    console.log('\nDone!');
  } catch (error) {
    console.error('Error seeding QA forms:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedQATesting();
