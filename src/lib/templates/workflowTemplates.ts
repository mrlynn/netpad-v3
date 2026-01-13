/**
 * Workflow Templates Index
 * 
 * This file imports all workflow template JSON files and exports them as a single array.
 * In Next.js, JSON imports are bundled at build time, making this efficient.
 * 
 * For client-side usage, this provides all templates without runtime file system access.
 */

import formToEmail from './data/workflows/forms/form-to-email.json';
import formToMongodb from './data/workflows/forms/form-to-mongodb.json';
import formNotification from './data/workflows/forms/form-notification.json';

import scheduledSync from './data/workflows/data/scheduled-sync.json';
import dataPipeline from './data/workflows/data/data-pipeline.json';

import webhookProcessor from './data/workflows/integrations/webhook-processor.json';
import apiMonitoring from './data/workflows/integrations/api-monitoring.json';

import aiClassification from './data/workflows/ai/ai-classification.json';
import aiExtraction from './data/workflows/ai/ai-extraction.json';

import conditionalRouting from './data/workflows/logic/conditional-routing.json';
import batchProcessing from './data/workflows/logic/batch-processing.json';

import type { WorkflowTemplate } from './loader';

export const workflowTemplates: WorkflowTemplate[] = [
  formToEmail as WorkflowTemplate,
  formToMongodb as WorkflowTemplate,
  formNotification as WorkflowTemplate,
  scheduledSync as WorkflowTemplate,
  dataPipeline as WorkflowTemplate,
  webhookProcessor as WorkflowTemplate,
  apiMonitoring as WorkflowTemplate,
  aiClassification as WorkflowTemplate,
  aiExtraction as WorkflowTemplate,
  conditionalRouting as WorkflowTemplate,
  batchProcessing as WorkflowTemplate,
];

export const workflowTemplateCategories = [
  { id: 'all', label: 'All', icon: '📋' },
  { id: 'forms', label: 'Forms', icon: '📝' },
  { id: 'data', label: 'Data', icon: '💾' },
  { id: 'integrations', label: 'Integrations', icon: '🔗' },
  { id: 'ai', label: 'AI', icon: '🤖' },
  { id: 'logic', label: 'Logic', icon: '🔀' },
];