/**
 * Seed QA Workflow - Critical Bug Alert
 *
 * Creates a workflow that triggers when a bug report is submitted with Critical severity.
 * Sends email alerts to the dev lead and optionally posts to Slack.
 *
 * Run with: npx tsx scripts/seed-qa-workflow.ts
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
  process.exit(1);
}

if (!PROJECT_ID) {
  console.error('Error: NETPAD_PROJECT_ID environment variable is not set');
  process.exit(1);
}

async function seedQAWorkflow() {
  const client = new MongoClient(MONGODB_URI!);

  try {
    await client.connect();
    console.log('Connected to MongoDB\n');

    const orgDb = client.db(ORG_ID);
    const formsCollection = orgDb.collection('forms');
    const workflowsCollection = orgDb.collection('workflows');

    // Find the bug report form to get its ID
    const bugReportForm = await formsCollection.findOne({ slug: 'bug-report' });
    if (!bugReportForm) {
      console.error('Bug Report form not found. Run seed-qa-testing.ts first.');
      process.exit(1);
    }

    const bugReportFormId = bugReportForm.id || bugReportForm.formId;
    console.log(`Found Bug Report form: ${bugReportFormId}`);

    // Find the test execution form for the test failure workflow
    const testExecutionForm = await formsCollection.findOne({ slug: 'test-execution' });
    const testExecutionFormId = testExecutionForm?.id || testExecutionForm?.formId;

    const timestamp = Date.now();
    const workflowId = `workflow_qa_${timestamp}`;

    // Critical Bug Alert Workflow
    const criticalBugAlertWorkflow = {
      id: workflowId,
      slug: 'critical-bug-alert',
      name: 'Critical Bug Alert',
      description: 'Sends immediate email alerts when a bug report is submitted with Critical severity',
      organizationId: ORG_ID,
      projectId: PROJECT_ID,
      status: 'draft', // Set to 'active' when ready to enable
      version: 1,

      settings: {
        executionMode: 'parallel',
        maxExecutionTime: 300000, // 5 minutes
        retryPolicy: {
          maxRetries: 3,
          backoffMultiplier: 2,
          initialDelayMs: 1000,
        },
        errorHandling: 'continue',
        timezone: 'UTC',
      },

      variables: [
        {
          id: 'var-dev-lead-email',
          name: 'devLeadEmail',
          type: 'string',
          defaultValue: 'devlead@example.com',
          description: 'Email address for critical bug alerts',
        },
        {
          id: 'var-qa-lead-email',
          name: 'qaLeadEmail',
          type: 'string',
          defaultValue: 'qalead@example.com',
          description: 'QA Lead email for all bug reports',
        },
      ],

      canvas: {
        nodes: [
          // Trigger Node
          {
            id: 'trigger-bug-report',
            type: 'form-trigger',
            position: { x: 100, y: 200 },
            config: {
              formId: bugReportFormId,
              waitForValidation: false,
              includeMetadata: true,
            },
            label: 'Bug Report Submitted',
            enabled: true,
          },

          // Check if Critical
          {
            id: 'check-severity',
            type: 'conditional',
            position: { x: 400, y: 200 },
            config: {
              condition: "trigger.payload.data.severity === 'critical'",
              conditionGroup: {
                id: 'group-critical',
                logic: 'and',
                conditions: [
                  {
                    field: 'trigger.payload.data.severity',
                    operator: 'equals',
                    value: 'critical',
                  },
                ],
              },
            },
            label: 'Is Critical Severity?',
            enabled: true,
          },

          // Send Critical Alert Email
          {
            id: 'email-critical-alert',
            type: 'email-send',
            position: { x: 700, y: 50 },
            config: {
              to: '{{variables.devLeadEmail}}',
              subject: '🚨 CRITICAL BUG: {{trigger.payload.data.title}}',
              body: `# 🚨 CRITICAL Bug Report

A **CRITICAL** bug has been reported and requires immediate attention.

## Bug Details

| Field | Value |
|-------|-------|
| **Title** | {{trigger.payload.data.title}} |
| **Severity** | 🔴 CRITICAL |
| **Module** | {{trigger.payload.data.module}} |
| **Reproducibility** | {{trigger.payload.data.reproducibility}} |

## Environment

- **URL**: {{trigger.payload.data.url}}
- **Browser**: {{trigger.payload.data.browser}}
- **OS**: {{trigger.payload.data.operatingSystem}}

## Steps to Reproduce

1. {{trigger.payload.data.step1}}
2. {{trigger.payload.data.step2}}
3. {{trigger.payload.data.step3}}

## Expected vs Actual

**Expected:** {{trigger.payload.data.expectedResult}}

**Actual:** {{trigger.payload.data.actualResult}}

## Reporter

- **Name**: {{trigger.payload.data.reporterName}}
- **Email**: {{trigger.payload.data.reporterEmail}}
- **Reported At**: {{trigger.payload.data.reportDate}}

---

⚠️ **ACTION REQUIRED**: Please acknowledge and begin investigation immediately.

Report ID: {{trigger.payload.submissionId}}`,
              bodyFormat: 'markdown',
              replyTo: '{{trigger.payload.data.reporterEmail}}',
            },
            label: 'Send Critical Alert',
            enabled: true,
          },

          // Send confirmation to reporter
          {
            id: 'email-reporter-confirm',
            type: 'email-send',
            position: { x: 700, y: 350 },
            config: {
              to: '{{trigger.payload.data.reporterEmail}}',
              subject: 'Bug Report Received: {{trigger.payload.data.title}}',
              body: `# Thank You for Your Bug Report

Your bug report has been received and logged in our system.

## Report Summary

| Field | Value |
|-------|-------|
| **Title** | {{trigger.payload.data.title}} |
| **Severity** | {{trigger.payload.data.severity}} |
| **Module** | {{trigger.payload.data.module}} |

## What Happens Next?

{{#if trigger.payload.data.severity === 'critical'}}
🚨 **Critical bugs are escalated immediately.** Our development team has been notified and will investigate as a priority.
{{else}}
Our QA and development teams will review your report and prioritize it accordingly.
{{/if}}

You'll receive updates as we make progress on this issue.

---

Report ID: \`{{trigger.payload.submissionId}}\`
Submitted: {{trigger.payload.data.reportDate}}

Thank you for helping us improve NetPad!`,
              bodyFormat: 'markdown',
            },
            label: 'Confirm to Reporter',
            enabled: true,
          },

          // Transform node to prepare data for logging
          {
            id: 'transform-log-data',
            type: 'transform',
            position: { x: 400, y: 400 },
            config: {
              expression: `{
  bugId: "BUG-" + Date.now(),
  title: trigger.payload.data.title,
  severity: trigger.payload.data.severity,
  module: trigger.payload.data.module,
  url: trigger.payload.data.url,
  reporterEmail: trigger.payload.data.reporterEmail,
  reportedAt: trigger.payload.data.reportDate,
  submissionId: trigger.payload.submissionId,
  isCritical: trigger.payload.data.severity === 'critical',
  status: 'new'
}`,
              outputVariable: 'bugRecord',
            },
            label: 'Prepare Bug Record',
            enabled: true,
          },
        ],

        edges: [
          // Trigger -> Check Severity
          {
            id: 'edge-trigger-to-check',
            source: 'trigger-bug-report',
            sourceHandle: 'output',
            target: 'check-severity',
            targetHandle: 'input',
          },
          // Check Severity (Critical) -> Send Alert
          {
            id: 'edge-critical-yes',
            source: 'check-severity',
            sourceHandle: 'yes',
            target: 'email-critical-alert',
            targetHandle: 'input',
            condition: {
              expression: "trigger.payload.data.severity === 'critical'",
              label: 'Critical',
            },
          },
          // Trigger -> Confirm to Reporter (always)
          {
            id: 'edge-trigger-to-confirm',
            source: 'trigger-bug-report',
            sourceHandle: 'output',
            target: 'email-reporter-confirm',
            targetHandle: 'input',
          },
          // Trigger -> Transform (always)
          {
            id: 'edge-trigger-to-transform',
            source: 'trigger-bug-report',
            sourceHandle: 'output',
            target: 'transform-log-data',
            targetHandle: 'input',
          },
        ],

        viewport: {
          x: 0,
          y: 0,
          zoom: 0.8,
        },
      },

      tags: ['qa', 'bug-tracking', 'critical-alerts', 'notifications'],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'seed-script',
      lastModifiedBy: 'seed-script',

      stats: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        lastExecutedAt: null,
        averageExecutionTime: 0,
      },
    };

    // Check if workflow exists
    const existingWorkflow = await workflowsCollection.findOne({ slug: 'critical-bug-alert' });

    if (existingWorkflow) {
      console.log('⚠️  Critical Bug Alert workflow already exists. Updating...');
      await workflowsCollection.updateOne(
        { slug: 'critical-bug-alert' },
        {
          $set: {
            ...criticalBugAlertWorkflow,
            id: existingWorkflow.id,
            updatedAt: new Date(),
          },
        }
      );
      console.log('   Updated workflow');
    } else {
      console.log('✅ Creating Critical Bug Alert workflow...');
      await workflowsCollection.insertOne(criticalBugAlertWorkflow);
      console.log(`   Created with ID: ${workflowId}`);
    }

    // Create Test Failure Alert workflow (if test execution form exists)
    if (testExecutionFormId) {
      const testFailureWorkflowId = `workflow_qa_test_${timestamp}`;
      const testFailureWorkflow = {
        id: testFailureWorkflowId,
        slug: 'test-failure-alert',
        name: 'Test Failure Alert',
        description: 'Sends notifications when a test execution is marked as Failed',
        organizationId: ORG_ID,
        projectId: PROJECT_ID,
        status: 'draft',
        version: 1,

        settings: {
          executionMode: 'parallel',
          maxExecutionTime: 300000,
          retryPolicy: {
            maxRetries: 3,
            backoffMultiplier: 2,
            initialDelayMs: 1000,
          },
          errorHandling: 'continue',
          timezone: 'UTC',
        },

        variables: [
          {
            id: 'var-qa-lead-email',
            name: 'qaLeadEmail',
            type: 'string',
            defaultValue: 'qalead@example.com',
            description: 'QA Lead email for test failure alerts',
          },
        ],

        canvas: {
          nodes: [
            {
              id: 'trigger-test-execution',
              type: 'form-trigger',
              position: { x: 100, y: 200 },
              config: {
                formId: testExecutionFormId,
                waitForValidation: false,
                includeMetadata: true,
              },
              label: 'Test Execution Submitted',
              enabled: true,
            },
            {
              id: 'check-failed',
              type: 'conditional',
              position: { x: 400, y: 200 },
              config: {
                condition: "trigger.payload.data.status === 'fail'",
                conditionGroup: {
                  id: 'group-failed',
                  logic: 'and',
                  conditions: [
                    {
                      field: 'trigger.payload.data.status',
                      operator: 'equals',
                      value: 'fail',
                    },
                  ],
                },
              },
              label: 'Did Test Fail?',
              enabled: true,
            },
            {
              id: 'email-test-failure',
              type: 'email-send',
              position: { x: 700, y: 100 },
              config: {
                to: '{{variables.qaLeadEmail}}',
                subject: '❌ Test Failed: {{trigger.payload.data.testCaseId}}',
                body: `# ❌ Test Failure Report

A test case has **FAILED** during execution.

## Test Details

| Field | Value |
|-------|-------|
| **Test Case ID** | {{trigger.payload.data.testCaseId}} |
| **Title** | {{trigger.payload.data.testCaseTitle}} |
| **Module** | {{trigger.payload.data.module}} |
| **Priority** | {{trigger.payload.data.priority}} |

## Environment

- **Environment**: {{trigger.payload.data.environment}}
- **Browser**: {{trigger.payload.data.browser}}
- **OS**: {{trigger.payload.data.operatingSystem}}

## Failure Details

**Failed at Step**: {{trigger.payload.data.failedStep}}

**Expected Result:**
{{trigger.payload.data.expectedResult}}

**Actual Result:**
{{trigger.payload.data.actualResult}}

## Tester

- **Name**: {{trigger.payload.data.testerName}}
- **Email**: {{trigger.payload.data.testerEmail}}
- **Date**: {{trigger.payload.data.executionDate}}

---

Submission ID: {{trigger.payload.submissionId}}`,
                bodyFormat: 'markdown',
                replyTo: '{{trigger.payload.data.testerEmail}}',
              },
              label: 'Send Failure Alert',
              enabled: true,
            },
          ],

          edges: [
            {
              id: 'edge-trigger-to-check',
              source: 'trigger-test-execution',
              sourceHandle: 'output',
              target: 'check-failed',
              targetHandle: 'input',
            },
            {
              id: 'edge-failed-yes',
              source: 'check-failed',
              sourceHandle: 'yes',
              target: 'email-test-failure',
              targetHandle: 'input',
              condition: {
                expression: "trigger.payload.data.status === 'fail'",
                label: 'Failed',
              },
            },
          ],

          viewport: {
            x: 0,
            y: 0,
            zoom: 0.8,
          },
        },

        tags: ['qa', 'test-execution', 'failure-alerts'],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'seed-script',
        lastModifiedBy: 'seed-script',

        stats: {
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0,
          lastExecutedAt: null,
          averageExecutionTime: 0,
        },
      };

      const existingTestWorkflow = await workflowsCollection.findOne({ slug: 'test-failure-alert' });

      if (existingTestWorkflow) {
        console.log('⚠️  Test Failure Alert workflow already exists. Updating...');
        await workflowsCollection.updateOne(
          { slug: 'test-failure-alert' },
          {
            $set: {
              ...testFailureWorkflow,
              id: existingTestWorkflow.id,
              updatedAt: new Date(),
            },
          }
        );
      } else {
        console.log('✅ Creating Test Failure Alert workflow...');
        await workflowsCollection.insertOne(testFailureWorkflow);
        console.log(`   Created with ID: ${testFailureWorkflowId}`);
      }
    }

    // Create indexes
    console.log('\nCreating indexes...');
    try {
      await workflowsCollection.createIndex({ slug: 1 }, { unique: true });
      await workflowsCollection.createIndex({ projectId: 1 });
      await workflowsCollection.createIndex({ organizationId: 1 });
      await workflowsCollection.createIndex({ status: 1 });
      await workflowsCollection.createIndex({ 'canvas.nodes.type': 1 });
      await workflowsCollection.createIndex({ 'canvas.nodes.config.formId': 1 });
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
    console.log('QA WORKFLOWS CREATED SUCCESSFULLY');
    console.log('='.repeat(60));
    console.log('\nWorkflows created:');
    console.log('  1. Critical Bug Alert     - Triggers on Critical severity bugs');
    console.log('  2. Test Failure Alert     - Triggers on failed test executions');
    console.log('\n⚠️  IMPORTANT: Workflows are created in DRAFT status.');
    console.log('   To activate them:');
    console.log('   1. Open NetPad and navigate to Workflows');
    console.log('   2. Configure email credentials (SMTP settings)');
    console.log('   3. Update variable values (devLeadEmail, qaLeadEmail)');
    console.log('   4. Change status from "draft" to "active"');
    console.log('\nDone!');
  } catch (error) {
    console.error('Error seeding QA workflows:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedQAWorkflow();
