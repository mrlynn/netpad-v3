/**
 * Workflow Templates Index
 * 
 * This file imports all workflow template JSON files and exports them as a single array.
 * In Next.js, JSON imports are bundled at build time, making this efficient.
 * 
 * For client-side usage, this provides all templates without runtime file system access.
 * 
 * Categories:
 * - forms: Form processing workflows (submissions, notifications, routing)
 * - data: Data pipelines, ETL, sync, export
 * - integrations: Webhooks, external APIs, monitoring
 * - ai: AI-powered workflows (sentiment, extraction, classification)
 * - logic: Conditional routing, validation, error handling
 */

// === FORMS CATEGORY ===
import formToEmail from './data/workflows/forms/form-to-email.json';
import formToMongodb from './data/workflows/forms/form-to-mongodb.json';
import formNotification from './data/workflows/forms/form-notification.json';
import leadQualification from './data/workflows/forms/lead-qualification.json';
import supportTicketRouter from './data/workflows/forms/support-ticket-router.json';
import approvalWorkflow from './data/workflows/forms/approval-workflow.json';

// === DATA CATEGORY ===
import scheduledSync from './data/workflows/data/scheduled-sync.json';
import dataPipeline from './data/workflows/data/data-pipeline.json';
import mongodbBackupExport from './data/workflows/data/mongodb-backup-export.json';
import googleSheetsSync from './data/workflows/data/google-sheets-sync.json';

// === INTEGRATIONS CATEGORY ===
import webhookProcessor from './data/workflows/integrations/webhook-processor.json';
import apiMonitoring from './data/workflows/integrations/api-monitoring.json';
import webhookToSlack from './data/workflows/integrations/webhook-to-slack.json';
import apiHealthMonitor from './data/workflows/integrations/api-health-monitor.json';

// === AI CATEGORY ===
import aiClassification from './data/workflows/ai/ai-classification.json';
import aiExtraction from './data/workflows/ai/ai-extraction.json';
import sentimentAnalysis from './data/workflows/ai/sentiment-analysis.json';
import documentProcessor from './data/workflows/ai/document-processor.json';

// === LOGIC CATEGORY ===
import conditionalRouting from './data/workflows/logic/conditional-routing.json';
import batchProcessing from './data/workflows/logic/batch-processing.json';
import dataValidationPipeline from './data/workflows/logic/data-validation-pipeline.json';
import retryWithBackoff from './data/workflows/logic/retry-with-backoff.json';

import type { WorkflowTemplate } from './loader';

/**
 * All workflow templates organized by category
 */
export const workflowTemplates: WorkflowTemplate[] = [
  // Forms
  formToEmail as WorkflowTemplate,
  formToMongodb as WorkflowTemplate,
  formNotification as WorkflowTemplate,
  leadQualification as WorkflowTemplate,
  supportTicketRouter as WorkflowTemplate,
  approvalWorkflow as WorkflowTemplate,
  
  // Data
  scheduledSync as WorkflowTemplate,
  dataPipeline as WorkflowTemplate,
  mongodbBackupExport as WorkflowTemplate,
  googleSheetsSync as WorkflowTemplate,
  
  // Integrations
  webhookProcessor as WorkflowTemplate,
  apiMonitoring as WorkflowTemplate,
  webhookToSlack as WorkflowTemplate,
  apiHealthMonitor as WorkflowTemplate,
  
  // AI
  aiClassification as WorkflowTemplate,
  aiExtraction as WorkflowTemplate,
  sentimentAnalysis as WorkflowTemplate,
  documentProcessor as WorkflowTemplate,
  
  // Logic
  conditionalRouting as WorkflowTemplate,
  batchProcessing as WorkflowTemplate,
  dataValidationPipeline as WorkflowTemplate,
  retryWithBackoff as WorkflowTemplate,
];

/**
 * Workflow template categories for the gallery filter
 */
export const workflowTemplateCategories = [
  { id: 'all', label: 'All Templates', icon: '📋', count: workflowTemplates.length },
  { id: 'forms', label: 'Form Processing', icon: '📝', description: 'Handle form submissions, notifications, and routing' },
  { id: 'data', label: 'Data Pipelines', icon: '💾', description: 'ETL, sync, export, and data transformation' },
  { id: 'integrations', label: 'Integrations', icon: '🔗', description: 'Connect to external APIs and services' },
  { id: 'ai', label: 'AI Workflows', icon: '🤖', description: 'AI-powered analysis, extraction, and classification' },
  { id: 'logic', label: 'Logic & Control', icon: '🔀', description: 'Conditional routing, validation, and error handling' },
];

/**
 * Get templates by category
 */
export function getWorkflowTemplatesByCategory(category: string): WorkflowTemplate[] {
  if (category === 'all') return workflowTemplates;
  return workflowTemplates.filter(t => t.category === category);
}

/**
 * Get a specific template by ID
 */
export function getWorkflowTemplateById(id: string): WorkflowTemplate | undefined {
  return workflowTemplates.find(t => t.id === id);
}

/**
 * Search templates by name, description, or tags
 */
export function searchWorkflowTemplates(query: string): WorkflowTemplate[] {
  const q = query.toLowerCase();
  return workflowTemplates.filter(t => 
    t.name.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q) ||
    (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)))
  );
}
