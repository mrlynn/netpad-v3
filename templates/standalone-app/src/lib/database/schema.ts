/**
 * Standalone Database Schema
 *
 * Defines collections, indexes, and schema for standalone mode.
 * This is a simplified schema (no multi-tenancy) for single-tenant deployments.
 */

import { Db } from 'mongodb';
import { getDatabase } from '../db';

/**
 * Collection names
 */
export const COLLECTIONS = {
  FORMS: 'forms',
  FORM_SUBMISSIONS: 'form_submissions',
  WORKFLOWS: 'workflows',
  WORKFLOW_EXECUTIONS: 'workflow_executions',
  WORKFLOW_JOBS: 'workflow_jobs',
  APP_CONFIG: 'app_config',
  APP_STATE: 'app_state',
} as const;

/**
 * Initialize database schema
 * Creates collections and indexes if they don't exist
 */
export async function initializeSchema(): Promise<void> {
  const db = await getDatabase();

  // Forms collection
  const formsCollection = db.collection(COLLECTIONS.FORMS);
  await formsCollection.createIndex({ slug: 1 }, { unique: true, sparse: true });
  await formsCollection.createIndex({ isPublished: 1 });
  await formsCollection.createIndex({ createdAt: -1 });
  await formsCollection.createIndex({ updatedAt: -1 });

  // Form submissions collection
  const submissionsCollection = db.collection(COLLECTIONS.FORM_SUBMISSIONS);
  await submissionsCollection.createIndex({ formId: 1, submittedAt: -1 });
  await submissionsCollection.createIndex({ formSlug: 1, submittedAt: -1 });
  await submissionsCollection.createIndex({ status: 1 });
  await submissionsCollection.createIndex({ submittedAt: -1 });

  // Workflows collection
  const workflowsCollection = db.collection(COLLECTIONS.WORKFLOWS);
  await workflowsCollection.createIndex({ slug: 1 }, { unique: true, sparse: true });
  await workflowsCollection.createIndex({ status: 1 });
  await workflowsCollection.createIndex({ createdAt: -1 });
  await workflowsCollection.createIndex({ updatedAt: -1 });

  // Workflow executions collection
  const executionsCollection = db.collection(COLLECTIONS.WORKFLOW_EXECUTIONS);
  await executionsCollection.createIndex({ workflowId: 1, startedAt: -1 });
  await executionsCollection.createIndex({ workflowSlug: 1, startedAt: -1 });
  await executionsCollection.createIndex({ status: 1 });
  await executionsCollection.createIndex({ startedAt: -1 });

  // Workflow jobs collection (for background processing)
  const jobsCollection = db.collection(COLLECTIONS.WORKFLOW_JOBS);
  await jobsCollection.createIndex({ status: 1, scheduledFor: 1 });
  await jobsCollection.createIndex({ workflowId: 1 });
  await jobsCollection.createIndex({ scheduledFor: 1 });
  await jobsCollection.createIndex({ createdAt: -1 });

  // App config collection
  const configCollection = db.collection(COLLECTIONS.APP_CONFIG);
  await configCollection.createIndex({ key: 1 }, { unique: true });

  // App state collection (for initialization tracking)
  const stateCollection = db.collection(COLLECTIONS.APP_STATE);
  await stateCollection.createIndex({ _id: 1 }, { unique: true });

  console.log('[Schema] Database schema initialized');
}

/**
 * Get collection reference
 */
export async function getCollection<T = any>(name: string) {
  const db = await getDatabase();
  return db.collection<T>(name);
}

/**
 * Form document schema
 */
export interface FormDocument {
  _id?: any;
  formId: string;
  name: string;
  slug: string;
  description?: string;
  fieldConfigs: any[];
  theme?: any;
  settings?: any;
  isPublished: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Form submission document schema
 */
export interface FormSubmissionDocument {
  _id?: any;
  submissionId: string;
  formId: string;
  formSlug: string;
  data: Record<string, any>;
  status: 'pending' | 'processed' | 'failed';
  submittedAt: Date;
  processedAt?: Date;
  error?: string;
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    referrer?: string;
  };
}

/**
 * Workflow document schema
 */
export interface WorkflowDocument {
  _id?: any;
  id: string;
  name: string;
  slug: string;
  description?: string;
  canvas: {
    nodes: any[];
    edges: any[];
  };
  settings: any;
  status: 'active' | 'inactive' | 'paused';
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Workflow execution document schema
 */
export interface WorkflowExecutionDocument {
  _id?: any;
  executionId: string;
  workflowId: string;
  workflowSlug: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  logs?: Array<{
    timestamp: Date;
    level: 'info' | 'warn' | 'error';
    message: string;
    data?: any;
  }>;
}

/**
 * Workflow job document schema
 */
export interface WorkflowJobDocument {
  _id?: any;
  jobId: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  scheduledFor: Date;
  startedAt?: Date;
  completedAt?: Date;
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
}

/**
 * App config document schema
 */
export interface AppConfigDocument {
  _id?: any;
  key: string;
  value: any;
  description?: string;
  updatedAt: Date;
  updatedBy?: string;
}

/**
 * App state document schema
 */
export interface AppStateDocument {
  _id: string;
  initialized: boolean;
  initializedAt?: string;
  formsCount: number;
  workflowsCount: number;
  bundleVersion?: string;
  bundleName?: string;
  lastSubmissionAt?: Date;
  lastWorkflowExecutionAt?: Date;
}
