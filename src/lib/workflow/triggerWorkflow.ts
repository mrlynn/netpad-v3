/**
 * Workflow Trigger Utility
 *
 * Provides functions to trigger workflows from various sources (forms, webhooks, schedules)
 */

import { TriggerType, WorkflowDocument } from '@/types/workflow';
import {
  getWorkflowsCollection,
  getWorkflowById,
  createExecution,
  enqueueJob,
  canEnqueueJob,
} from './db';
import { incrementWorkflowExecutionAtQueue } from '@/lib/platform/billing';

interface TriggerPayload {
  type: TriggerType;
  formId?: string;
  formName?: string;
  submissionId?: string;
  data: Record<string, unknown>;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
    deviceType?: string;
    userId?: string;
    email?: string;
  };
}

interface TriggerResult {
  triggered: boolean;
  executionIds: string[];
  errors: string[];
}

/**
 * Find workflows that should be triggered by a form submission
 * Uses direct database access (not API) for server-side calls
 */
export async function findWorkflowsForForm(
  orgId: string,
  formId: string
): Promise<WorkflowDocument[]> {
  try {
    // Direct database query instead of API call to avoid authentication issues
    const collection = await getWorkflowsCollection(orgId);

    console.log(`[Workflow Trigger] Searching for workflows in org ${orgId} for form ${formId}`);

    // First, let's see all workflows with form-trigger nodes for debugging
    const allFormTriggerWorkflows = await collection.find({
      'canvas.nodes': {
        $elemMatch: {
          type: 'form-trigger',
        },
      },
    }).toArray();

    console.log(`[Workflow Trigger] Found ${allFormTriggerWorkflows.length} workflow(s) with form-trigger nodes`);

    for (const wf of allFormTriggerWorkflows) {
      const triggerNode = wf.canvas?.nodes?.find((n: any) => n.type === 'form-trigger');
      console.log(`[Workflow Trigger] - Workflow "${wf.name}" (${wf.id}): status=${wf.status}, triggerFormId=${triggerNode?.config?.formId}, looking for formId=${formId}`);
    }

    // Find active workflows with a form-trigger for this form
    const workflows = await collection.find({
      status: 'active',
      'canvas.nodes': {
        $elemMatch: {
          type: 'form-trigger',
          'config.formId': formId,
          enabled: { $ne: false },
        },
      },
    }).toArray();

    console.log(`[Workflow Trigger] Found ${workflows.length} active workflow(s) matching form ${formId}`);
    return workflows;
  } catch (error) {
    console.error('Error finding workflows for form:', error);
    return [];
  }
}

/**
 * Trigger a workflow execution
 * Uses direct database access (not API) for server-side calls
 */
export async function executeWorkflow(
  orgId: string,
  workflowId: string,
  trigger: TriggerPayload
): Promise<{ success: boolean; executionId?: string; error?: string }> {
  try {
    // Get workflow directly from database
    const workflow = await getWorkflowById(orgId, workflowId);
    if (!workflow) {
      return { success: false, error: 'Workflow not found' };
    }

    // Check workflow is active
    if (workflow.status !== 'active' && workflow.status !== 'draft') {
      return {
        success: false,
        error: `Cannot execute workflow with status '${workflow.status}'`,
      };
    }

    // Check pending job queue limits (prevents queue overload)
    const canEnqueue = await canEnqueueJob(orgId, 100);
    if (!canEnqueue) {
      return {
        success: false,
        error: 'Too many pending executions. Please wait for some to complete.',
      };
    }

    // Increment usage at queue time to enforce limits immediately
    // This prevents race conditions where multiple requests pass limit checks
    const usageLimit = await incrementWorkflowExecutionAtQueue(orgId, workflowId);
    if (!usageLimit.allowed) {
      return {
        success: false,
        error: usageLimit.reason || 'Monthly workflow execution limit reached. Please upgrade your plan.',
      };
    }

    // Build the trigger payload for execution
    const executionTrigger = {
      type: trigger.type,
      payload: {
        formId: trigger.formId,
        formName: trigger.formName,
        submissionId: trigger.submissionId,
        data: trigger.data,
        submittedAt: new Date().toISOString(),
        respondent: trigger.metadata?.userId
          ? {
              userId: trigger.metadata.userId,
              email: trigger.metadata.email,
            }
          : undefined,
      },
      source: trigger.metadata
        ? {
            ip: trigger.metadata.ipAddress,
            userAgent: trigger.metadata.userAgent,
            userId: trigger.metadata.userId,
          }
        : undefined,
    };

    // Create execution record
    const execution = await createExecution(
      workflowId,
      orgId,
      executionTrigger,
      workflow.version
    );

    const executionId = execution._id!.toString();

    // Queue the job for processing
    await enqueueJob({
      workflowId,
      executionId,
      orgId,
      priority: 1,
      trigger: executionTrigger,
      runAt: new Date(),
      maxAttempts: workflow.settings.retryPolicy.maxRetries + 1,
    });

    console.log(`[Workflow Trigger] Queued workflow ${workflowId} execution ${executionId}`);

    return {
      success: true,
      executionId,
    };
  } catch (error) {
    console.error('Error executing workflow:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Trigger all workflows configured for a form submission
 * This is called asynchronously after form submission
 */
export async function triggerFormWorkflows(
  orgId: string,
  formId: string,
  formName: string,
  submissionId: string,
  data: Record<string, unknown>,
  metadata?: TriggerPayload['metadata']
): Promise<TriggerResult> {
  const result: TriggerResult = {
    triggered: false,
    executionIds: [],
    errors: [],
  };

  try {
    // Find all workflows configured for this form
    const workflows = await findWorkflowsForForm(orgId, formId);

    if (workflows.length === 0) {
      return result;
    }

    // Trigger each workflow
    const triggerPayload: TriggerPayload = {
      type: 'form_submission',
      formId,
      formName,
      submissionId,
      data,
      metadata,
    };

    const executions = await Promise.allSettled(
      workflows.map(workflow =>
        executeWorkflow(orgId, workflow.id, triggerPayload)
      )
    );

    // Collect results
    for (const execution of executions) {
      if (execution.status === 'fulfilled') {
        if (execution.value.success && execution.value.executionId) {
          result.executionIds.push(execution.value.executionId);
          result.triggered = true;
        } else if (execution.value.error) {
          result.errors.push(execution.value.error);
        }
      } else {
        result.errors.push(execution.reason?.message || 'Execution failed');
      }
    }

    if (result.executionIds.length > 0) {
      console.log(
        `Triggered ${result.executionIds.length} workflow(s) for form ${formId}:`,
        result.executionIds
      );
    }
  } catch (error) {
    console.error('Error triggering form workflows:', error);
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return result;
}

/**
 * Async wrapper to trigger workflows without blocking
 * Use this in form submission handlers
 */
export function triggerFormWorkflowsAsync(
  orgId: string,
  formId: string,
  formName: string,
  submissionId: string,
  data: Record<string, unknown>,
  metadata?: TriggerPayload['metadata']
): void {
  // Fire and forget - don't await
  triggerFormWorkflows(orgId, formId, formName, submissionId, data, metadata).catch(
    error => console.error('Async workflow trigger error:', error)
  );
}
