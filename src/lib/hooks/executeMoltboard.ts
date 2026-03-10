/**
 * Moltboard Integration Executor
 *
 * Creates Moltboard tasks when forms are submitted.
 * Runs asynchronously to not block form submission response.
 */

import { MoltboardIntegrationConfig, replaceTemplateVariables } from '@/types/formHooks';
import { MoltboardClient, MoltboardError } from '@/lib/integrations/moltboard';
import { getMoltboardCredentials } from '@/lib/platform/integrationCredentials';

interface MoltboardContext {
  formId: string;
  formName: string;
  responseId: string;
  data: Record<string, unknown>;
  organizationId?: string;
}

/**
 * Execute Moltboard integration asynchronously
 * Fire and forget - doesn't block the response
 */
export function executeMoltboardAsync(
  config: MoltboardIntegrationConfig,
  context: MoltboardContext
): void {
  // Don't await - fire and forget
  executeMoltboard(config, context).catch((error) => {
    console.error('[Moltboard Integration] Async execution failed:', error);
  });
}

/**
 * Execute Moltboard integration and create a task
 */
export async function executeMoltboard(
  config: MoltboardIntegrationConfig,
  context: MoltboardContext
): Promise<{
  success: boolean;
  taskId?: string;
  error?: string;
}> {
  if (!config.enabled) {
    return { success: true }; // Integration disabled, nothing to do
  }

  console.log('[Moltboard Integration] Executing for form submission', {
    formId: context.formId,
    responseId: context.responseId,
    boardId: config.boardId,
    columnId: config.columnId,
  });

  try {
    // Get API credentials
    let apiKey = config.apiKey;
    let baseUrl = config.baseUrl || 'https://kanban.mlynn.org';

    // Try to get credentials from vault if credentialId is provided
    if (!apiKey && config.credentialId && context.organizationId) {
      const creds = await getMoltboardCredentials(context.organizationId, config.credentialId);
      if (creds) {
        apiKey = creds.apiKey;
        baseUrl = creds.baseUrl;
      } else {
        console.error('[Moltboard Integration] Credentials not found:', config.credentialId);
        return {
          success: false,
          error: 'Moltboard credentials not found or expired',
        };
      }
    }

    if (!apiKey) {
      console.error('[Moltboard Integration] No API key available');
      return {
        success: false,
        error: 'Moltboard API key not configured',
      };
    }

    // Build task data with template variable replacement
    const templateData = {
      ...context.data,
      formId: context.formId,
      formName: context.formName,
      responseId: context.responseId,
    };

    const title = replaceTemplateVariables(
      config.titleTemplate,
      templateData as Record<string, unknown>,
      context.responseId
    );

    let description: string | undefined;
    if (config.descriptionTemplate) {
      description = replaceTemplateVariables(
        config.descriptionTemplate,
        templateData as Record<string, unknown>,
        context.responseId
      );
    }

    // Get due date from form field if configured
    let dueDate: string | undefined;
    if (config.dueDateField && context.data[config.dueDateField]) {
      const dueDateValue = context.data[config.dueDateField];
      if (dueDateValue instanceof Date) {
        dueDate = dueDateValue.toISOString();
      } else if (typeof dueDateValue === 'string') {
        // Try to parse as date
        const parsed = new Date(dueDateValue);
        if (!isNaN(parsed.getTime())) {
          dueDate = parsed.toISOString();
        }
      }
    }

    // Get assignee from form field if configured
    let assigneeId: string | undefined;
    if (config.fieldMappings?.assigneeField && context.data[config.fieldMappings.assigneeField]) {
      assigneeId = String(context.data[config.fieldMappings.assigneeField]);
    }

    // Create the Moltboard client and task
    const client = new MoltboardClient({ apiKey, baseUrl });

    const task = await client.createTask({
      boardId: config.boardId,
      columnId: config.columnId,
      title,
      description,
      labels: config.labels || ['form-submission'],
      priority: config.priority,
      dueDate,
      assigneeId,
    });

    console.log('[Moltboard Integration] Task created successfully', {
      taskId: task.id,
      title: task.title,
      boardId: task.boardId,
      columnId: task.columnId,
    });

    return {
      success: true,
      taskId: task.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (error instanceof MoltboardError) {
      console.error('[Moltboard Integration] API error:', {
        message: errorMessage,
        statusCode: error.statusCode,
        retryable: error.isRetryable,
      });
    } else {
      console.error('[Moltboard Integration] Error:', errorMessage);
    }

    return {
      success: false,
      error: `Failed to create Moltboard task: ${errorMessage}`,
    };
  }
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}
