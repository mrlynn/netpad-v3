/**
 * useWorkflowTest Hook
 *
 * Provides functionality for testing workflows with form or webhook triggers
 * directly from the workflow editor.
 */

'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { WorkflowDocument, WorkflowNode } from '@/types/workflow';
import { FormConfiguration, FieldConfig } from '@/types/form';
import { nanoid } from 'nanoid';

// Trigger types that can be tested
export type TestableTriggerType = 'form-trigger' | 'webhook-trigger' | 'manual-trigger';

export interface FormSubmissionPayload {
  type: 'form_submission';
  formId: string;
  formName: string;
  submissionId: string;
  data: Record<string, any>;
  submittedAt: string;
  respondent?: {
    userId?: string;
    email?: string;
  };
}

export interface WebhookPayload {
  type: 'webhook';
  method: string;
  headers: Record<string, string>;
  body: Record<string, any>;
  receivedAt: string;
}

export interface ManualPayload {
  type: 'manual';
  data: Record<string, any>;
  triggeredAt: string;
}

export type TestPayload = FormSubmissionPayload | WebhookPayload | ManualPayload;

interface UseWorkflowTestOptions {
  workflow: WorkflowDocument | null;
  orgId: string;
}

interface UseWorkflowTestReturn {
  // Trigger detection
  triggerNode: WorkflowNode | null;
  triggerType: TestableTriggerType | null;
  canTest: boolean;

  // Form testing
  form: FormConfiguration | null;
  formLoading: boolean;
  formError: string | null;
  formData: Record<string, any>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  handleFormDataChange: (path: string, value: any) => void;
  resetFormData: () => void;
  loadForm: (formId: string) => Promise<void>;

  // Webhook testing
  webhookPayload: string;
  setWebhookPayload: React.Dispatch<React.SetStateAction<string>>;
  webhookPayloadError: string | null;
  resetWebhookPayload: () => void;

  // Execution
  isExecuting: boolean;
  executeTest: () => Promise<{ success: boolean; executionId?: string; error?: string }>;
  generatePayload: () => TestPayload | null;
}

const DEFAULT_WEBHOOK_PAYLOAD = JSON.stringify(
  {
    example: 'data',
    timestamp: new Date().toISOString(),
  },
  null,
  2
);

/**
 * Hook for testing workflows with different trigger types
 */
export function useWorkflowTest({
  workflow,
  orgId,
}: UseWorkflowTestOptions): UseWorkflowTestReturn {
  // Form state
  const [form, setForm] = useState<FormConfiguration | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Webhook state
  const [webhookPayload, setWebhookPayload] = useState(DEFAULT_WEBHOOK_PAYLOAD);
  const [webhookPayloadError, setWebhookPayloadError] = useState<string | null>(null);

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);

  // Find trigger node in workflow
  const triggerNode = useMemo(() => {
    if (!workflow?.canvas?.nodes) return null;
    return workflow.canvas.nodes.find((n) =>
      ['form-trigger', 'webhook-trigger', 'manual-trigger', 'schedule-trigger', 'api-trigger'].includes(n.type)
    ) || null;
  }, [workflow]);

  // Determine trigger type
  const triggerType = useMemo((): TestableTriggerType | null => {
    if (!triggerNode) return null;
    if (['form-trigger', 'webhook-trigger', 'manual-trigger'].includes(triggerNode.type)) {
      return triggerNode.type as TestableTriggerType;
    }
    return null;
  }, [triggerNode]);

  // Check if workflow can be tested
  const canTest = useMemo(() => {
    if (!workflow || !triggerNode || !triggerType) return false;

    switch (triggerType) {
      case 'form-trigger':
        return Boolean(triggerNode.config?.formId);
      case 'webhook-trigger':
      case 'manual-trigger':
        return true;
      default:
        return false;
    }
  }, [workflow, triggerNode, triggerType]);

  // Load form definition
  const loadForm = useCallback(async (formId: string) => {
    if (!formId || !orgId) return;

    setFormLoading(true);
    setFormError(null);

    try {
      const response = await fetch(`/api/forms/${formId}?orgId=${orgId}`);
      if (!response.ok) {
        throw new Error('Form not found');
      }

      const data = await response.json();

      // API returns { success: true, form: {...} }
      if (!data.success || !data.form) {
        throw new Error(data.error || 'Form not found');
      }

      const formData = data.form;
      setForm(formData);

      // Initialize form data with default values
      const initialData: Record<string, any> = {};
      if (formData.fieldConfigs) {
        formData.fieldConfigs.forEach((field: FieldConfig) => {
          if (field.defaultValue !== undefined) {
            setNestedValue(initialData, field.path, field.defaultValue);
          }
        });
      }
      setFormData(initialData);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to load form');
      setForm(null);
    } finally {
      setFormLoading(false);
    }
  }, [orgId]);

  // Auto-load form when trigger node has formId
  useEffect(() => {
    if (triggerType === 'form-trigger' && triggerNode?.config?.formId) {
      loadForm(triggerNode.config.formId as string);
    }
  }, [triggerType, triggerNode?.config?.formId, loadForm]);

  // Handle form data change
  const handleFormDataChange = useCallback((path: string, value: any) => {
    setFormData((prev) => {
      const newData = { ...prev };
      setNestedValue(newData, path, value);
      return newData;
    });
  }, []);

  // Reset form data
  const resetFormData = useCallback(() => {
    const initialData: Record<string, any> = {};
    if (form?.fieldConfigs) {
      form.fieldConfigs.forEach((field: FieldConfig) => {
        if (field.defaultValue !== undefined) {
          setNestedValue(initialData, field.path, field.defaultValue);
        }
      });
    }
    setFormData(initialData);
  }, [form]);

  // Reset webhook payload
  const resetWebhookPayload = useCallback(() => {
    setWebhookPayload(DEFAULT_WEBHOOK_PAYLOAD);
    setWebhookPayloadError(null);
  }, []);

  // Validate webhook payload JSON
  useEffect(() => {
    if (triggerType === 'webhook-trigger') {
      try {
        JSON.parse(webhookPayload);
        setWebhookPayloadError(null);
      } catch (e) {
        setWebhookPayloadError('Invalid JSON');
      }
    }
  }, [webhookPayload, triggerType]);

  // Generate test payload based on trigger type
  const generatePayload = useCallback((): TestPayload | null => {
    if (!triggerType || !triggerNode) return null;

    switch (triggerType) {
      case 'form-trigger':
        return {
          type: 'form_submission',
          formId: (triggerNode.config?.formId as string) || '',
          formName: form?.name || 'Test Form',
          submissionId: `test_${nanoid()}`,
          data: formData,
          submittedAt: new Date().toISOString(),
        };

      case 'webhook-trigger':
        try {
          const body = JSON.parse(webhookPayload);
          return {
            type: 'webhook',
            method: (triggerNode.config?.method as string) || 'POST',
            headers: {},
            body,
            receivedAt: new Date().toISOString(),
          };
        } catch {
          return null;
        }

      case 'manual-trigger':
        return {
          type: 'manual',
          data: {},
          triggeredAt: new Date().toISOString(),
        };

      default:
        return null;
    }
  }, [triggerType, triggerNode, form, formData, webhookPayload]);

  // Execute test
  const executeTest = useCallback(async (): Promise<{
    success: boolean;
    executionId?: string;
    error?: string;
  }> => {
    if (!workflow || !canTest) {
      return { success: false, error: 'Cannot test this workflow' };
    }

    const payload = generatePayload();
    if (!payload) {
      return { success: false, error: 'Failed to generate test payload' };
    }

    setIsExecuting(true);

    try {
      const response = await fetch(`/api/workflows/${workflow.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          payload,
          // Process immediately so we don't have to wait for cron
          // This is especially important in development where cron doesn't run
          processImmediately: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || 'Execution failed',
        };
      }

      return {
        success: true,
        executionId: data.executionId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    } finally {
      setIsExecuting(false);
    }
  }, [workflow, canTest, orgId, generatePayload]);

  return {
    // Trigger detection
    triggerNode,
    triggerType,
    canTest,

    // Form testing
    form,
    formLoading,
    formError,
    formData,
    setFormData,
    handleFormDataChange,
    resetFormData,
    loadForm,

    // Webhook testing
    webhookPayload,
    setWebhookPayload,
    webhookPayloadError,
    resetWebhookPayload,

    // Execution
    isExecuting,
    executeTest,
    generatePayload,
  };
}

// Helper to set nested value in object
function setNestedValue(obj: Record<string, any>, path: string, value: any): void {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
}

export default useWorkflowTest;
