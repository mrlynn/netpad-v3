/**
 * Notify Collaborators Workflow Node
 *
 * This node sends notifications to collaborators when triggered in a workflow.
 * Demonstrates how extensions can provide custom workflow nodes.
 */

/**
 * Node execution result type (matches NetPad core)
 */
interface NodeExecutionResult {
  success: boolean;
  data: Record<string, unknown>;
  error?: { code: string; message: string; retryable: boolean };
  metadata?: { durationMs?: number; bytesProcessed?: number };
}

/**
 * Node execution context type (matches NetPad core)
 */
interface NodeExecutionContext {
  nodeId: string;
  nodeType: string;
  config: Record<string, unknown>;
  resolvedConfig: Record<string, unknown>;
  inputs: Record<string, unknown>;
  trigger: { type: string; payload?: Record<string, unknown> };
  getConnection: (vaultId: string) => Promise<{ connectionString: string; database: string } | null>;
  getEmailCredentials: (credentialId: string) => Promise<unknown>;
}

/**
 * Node handler type (matches NetPad core)
 */
export type NodeHandler = (context: NodeExecutionContext) => Promise<NodeExecutionResult>;

/**
 * Node configuration schema
 */
export interface NotifyCollaboratorsConfig {
  /** Notification subject */
  subject?: string;
  /** Notification message template (supports {{variable}} syntax) */
  message?: string;
  /** Notification channel: 'email' | 'slack' | 'webhook' */
  channel?: 'email' | 'slack' | 'webhook';
  /** Target audience: 'all' | 'contributors' | 'reviewers' */
  audience?: 'all' | 'contributors' | 'reviewers';
  /** Webhook URL (when channel is 'webhook') */
  webhookUrl?: string;
}

/**
 * Handler for the notify-collaborators node
 */
export const notifyCollaboratorsHandler: NodeHandler = async (context): Promise<NodeExecutionResult> => {
  const startTime = Date.now();

  try {
    const config = context.resolvedConfig as NotifyCollaboratorsConfig;

    // Validate configuration
    if (!config.message) {
      return {
        success: false,
        data: {},
        error: {
          code: 'MISSING_CONFIG',
          message: 'Notification message is required',
          retryable: false,
        },
      };
    }

    const channel = config.channel || 'email';
    const audience = config.audience || 'all';
    const subject = config.subject || 'NetPad Notification';

    // Log the notification (in a real implementation, this would send actual notifications)
    console.log(`[NotifyCollaborators] Sending notification via ${channel} to ${audience}`);
    console.log(`[NotifyCollaborators] Subject: ${subject}`);
    console.log(`[NotifyCollaborators] Message: ${config.message}`);

    // Simulate sending notification
    const notificationResult = {
      channel,
      audience,
      subject,
      messagePreview: config.message.substring(0, 100),
      sentAt: new Date().toISOString(),
      recipientCount: audience === 'all' ? 10 : audience === 'contributors' ? 5 : 2,
    };

    // If webhook channel, make the actual call
    if (channel === 'webhook' && config.webhookUrl) {
      try {
        const response = await fetch(config.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subject,
            message: config.message,
            audience,
            timestamp: new Date().toISOString(),
          }),
        });

        if (!response.ok) {
          return {
            success: false,
            data: { notificationResult },
            error: {
              code: 'OPERATION_FAILED',
              message: `Webhook request failed with status ${response.status}`,
              retryable: true,
            },
          };
        }
      } catch (webhookError) {
        return {
          success: false,
          data: { notificationResult },
          error: {
            code: 'CONNECTION_FAILED',
            message: `Failed to send webhook: ${webhookError instanceof Error ? webhookError.message : 'Unknown error'}`,
            retryable: true,
          },
        };
      }
    }

    return {
      success: true,
      data: {
        notification: notificationResult,
        message: `Notification sent to ${notificationResult.recipientCount} recipients`,
      },
      metadata: {
        durationMs: Date.now() - startTime,
      },
    };
  } catch (error) {
    return {
      success: false,
      data: {},
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        retryable: false,
      },
    };
  }
};

/**
 * Node definition for the palette
 */
export const notifyCollaboratorsDefinition = {
  type: 'collaborate:notify-collaborators',
  label: 'Notify Collaborators',
  description: 'Send notifications to collaborators via email, Slack, or webhook',
  category: 'actions' as const,
  color: '#7C4DFF', // Purple color for collaborate nodes
  icon: 'Notifications',
  version: '1.0.0',
  configFields: [
    {
      name: 'subject',
      label: 'Subject',
      type: 'text' as const,
      placeholder: 'Notification subject...',
      helpText: 'Subject line for the notification',
    },
    {
      name: 'message',
      label: 'Message',
      type: 'textarea' as const,
      required: true,
      placeholder: 'Enter your notification message...',
      helpText: 'Use {{variable}} syntax for dynamic values from previous nodes',
    },
    {
      name: 'channel',
      label: 'Channel',
      type: 'select' as const,
      defaultValue: 'email',
      options: [
        { label: 'Email', value: 'email' },
        { label: 'Slack', value: 'slack' },
        { label: 'Webhook', value: 'webhook' },
      ],
      helpText: 'How to deliver the notification',
    },
    {
      name: 'audience',
      label: 'Audience',
      type: 'select' as const,
      defaultValue: 'all',
      options: [
        { label: 'All Collaborators', value: 'all' },
        { label: 'Contributors Only', value: 'contributors' },
        { label: 'Reviewers Only', value: 'reviewers' },
      ],
      helpText: 'Who should receive this notification',
    },
    {
      name: 'webhookUrl',
      label: 'Webhook URL',
      type: 'text' as const,
      placeholder: 'https://...',
      helpText: 'Required when channel is set to Webhook',
    },
  ],
  outputs: [
    { id: 'output', label: 'Success', primary: true },
  ],
};
