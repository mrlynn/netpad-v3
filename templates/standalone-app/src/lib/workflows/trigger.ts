/**
 * Workflow Trigger
 *
 * Triggers workflows based on events (form submissions, schedules, etc.)
 */

import { getAllWorkflows } from '../bundle';
import { executeWorkflow } from './executor';
import { COLLECTIONS, getCollection, WorkflowDocument } from '../database/schema';

interface FormSubmissionTriggerPayload {
  formSlug: string;
  submissionId: string;
  submissionData: Record<string, any>;
}

/**
 * Trigger workflows that are connected to a form submission
 */
export async function triggerWorkflowsForFormSubmission(
  payload: FormSubmissionTriggerPayload
): Promise<void> {
  const { formSlug, submissionId, submissionData } = payload;

  try {
    // Get all active workflows
    const workflows = await getAllWorkflows();

    // Find workflows triggered by form submissions
    for (const workflow of workflows) {
      const shouldTrigger = checkFormTrigger(workflow, formSlug);

      if (shouldTrigger) {
        console.log(`[Workflow Trigger] Triggering workflow "${workflow.name}" for form "${formSlug}"`);

        // Execute workflow asynchronously (don't block the submission)
        executeWorkflow({
          workflowId: workflow.id,
          workflowSlug: workflow.slug,
          trigger: {
            type: 'form_submission',
            formSlug,
            submissionId,
          },
          input: {
            submission: submissionData,
            formSlug,
            submissionId,
            submittedAt: new Date().toISOString(),
          },
        }).catch((error) => {
          console.error(`[Workflow Trigger] Failed to execute workflow "${workflow.name}":`, error);
        });
      }
    }
  } catch (error) {
    console.error('[Workflow Trigger] Error triggering workflows:', error);
    throw error;
  }
}

/**
 * Check if a workflow should be triggered by a form submission
 */
function checkFormTrigger(workflow: any, formSlug: string): boolean {
  if (!workflow.canvas?.nodes) {
    return false;
  }

  // Find trigger nodes in the workflow
  const triggerNodes = workflow.canvas.nodes.filter(
    (node: any) =>
      node.type === 'trigger' ||
      node.type === 'form_trigger' ||
      node.type === 'formSubmissionTrigger' ||
      node.data?.type === 'trigger'
  );

  for (const triggerNode of triggerNodes) {
    const nodeData = triggerNode.data || {};

    // Check if this trigger is for form submissions
    if (
      nodeData.triggerType === 'form_submission' ||
      nodeData.type === 'form_submission' ||
      nodeData.eventType === 'form_submission'
    ) {
      // Check if it matches the specific form
      if (nodeData.formSlug === formSlug || nodeData.formId === formSlug) {
        return true;
      }

      // Check if it's configured to trigger on any form
      if (nodeData.formSlug === '*' || !nodeData.formSlug) {
        return true;
      }
    }

    // Legacy trigger format
    if (triggerNode.type === 'form_trigger') {
      if (!nodeData.formSlug || nodeData.formSlug === formSlug) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Schedule a workflow to run at a specific time
 */
export async function scheduleWorkflow(options: {
  workflowId: string;
  workflowSlug: string;
  scheduledFor: Date;
  input: Record<string, any>;
}): Promise<string> {
  const { workflowId, workflowSlug, scheduledFor, input } = options;

  const jobId = generateJobId();
  const jobsCollection = await getCollection(COLLECTIONS.WORKFLOW_JOBS);

  await jobsCollection.insertOne({
    jobId,
    workflowId,
    workflowSlug,
    status: 'pending',
    scheduledFor,
    input,
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date(),
  });

  return jobId;
}

/**
 * Process pending scheduled jobs
 * Should be called periodically (e.g., via cron)
 */
export async function processPendingJobs(): Promise<number> {
  const jobsCollection = await getCollection(COLLECTIONS.WORKFLOW_JOBS);

  // Find jobs that are ready to run
  const pendingJobs = await jobsCollection
    .find({
      status: 'pending',
      scheduledFor: { $lte: new Date() },
    })
    .sort({ scheduledFor: 1 })
    .limit(10)
    .toArray();

  let processedCount = 0;

  for (const job of pendingJobs) {
    try {
      // Mark job as running
      await jobsCollection.updateOne(
        { jobId: job.jobId },
        {
          $set: {
            status: 'running',
            startedAt: new Date(),
          },
        }
      );

      // Execute the workflow
      await executeWorkflow({
        workflowId: job.workflowId,
        workflowSlug: job.workflowSlug,
        trigger: {
          type: 'scheduled',
          jobId: job.jobId,
        },
        input: job.input,
      });

      // Mark job as completed
      await jobsCollection.updateOne(
        { jobId: job.jobId },
        {
          $set: {
            status: 'completed',
            completedAt: new Date(),
          },
        }
      );

      processedCount++;
    } catch (error) {
      // Handle job failure
      const retryCount = (job.retryCount || 0) + 1;
      const maxRetries = job.maxRetries || 3;

      if (retryCount >= maxRetries) {
        // Max retries reached, mark as failed
        await jobsCollection.updateOne(
          { jobId: job.jobId },
          {
            $set: {
              status: 'failed',
              completedAt: new Date(),
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          }
        );
      } else {
        // Schedule retry
        await jobsCollection.updateOne(
          { jobId: job.jobId },
          {
            $set: {
              status: 'pending',
              retryCount,
              scheduledFor: new Date(Date.now() + retryCount * 60000), // Exponential backoff
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          }
        );
      }
    }
  }

  return processedCount;
}

function generateJobId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `job_${timestamp}${randomPart}`;
}
