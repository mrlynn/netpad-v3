/**
 * Bundle Loader
 *
 * Utilities for loading and processing the application bundle.
 * The bundle.json file is injected during deployment and contains
 * all forms, workflows, and configuration.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ApplicationBundle, FormDefinition, WorkflowDefinition, AppState } from '@/types/bundle';
import { getFormsCollection, getWorkflowsCollection, getAppStateCollection } from './db';

const BUNDLE_PATH = join(process.cwd(), 'bundle.json');
const APP_STATE_ID = 'app_initialization';

let cachedBundle: ApplicationBundle | null = null;

/**
 * Load the application bundle from bundle.json
 */
export function loadBundle(): ApplicationBundle | null {
  if (cachedBundle) {
    return cachedBundle;
  }

  if (!existsSync(BUNDLE_PATH)) {
    console.warn('bundle.json not found at', BUNDLE_PATH);
    return null;
  }

  try {
    const content = readFileSync(BUNDLE_PATH, 'utf-8');
    cachedBundle = JSON.parse(content) as ApplicationBundle;
    return cachedBundle;
  } catch (error) {
    console.error('Failed to load bundle.json:', error);
    return null;
  }
}

/**
 * Check if the application has been initialized
 */
export async function isInitialized(): Promise<boolean> {
  try {
    const collection = await getAppStateCollection();
    const state = await collection.findOne({ _id: APP_STATE_ID as any });
    return state?.initialized === true;
  } catch (error) {
    console.error('Failed to check initialization status:', error);
    return false;
  }
}

/**
 * Get current application state
 */
export async function getAppState(): Promise<AppState | null> {
  try {
    const collection = await getAppStateCollection();
    const state = await collection.findOne({ _id: APP_STATE_ID as any });
    if (!state) return null;
    return {
      initialized: state.initialized,
      initializedAt: state.initializedAt,
      formsCount: state.formsCount || 0,
      workflowsCount: state.workflowsCount || 0,
      bundleVersion: state.bundleVersion || '1.0.0',
    };
  } catch (error) {
    console.error('Failed to get app state:', error);
    return null;
  }
}

/**
 * Initialize the application from the bundle
 * Seeds forms and workflows into the database
 */
export async function initializeFromBundle(): Promise<{
  success: boolean;
  formsCreated: number;
  workflowsCreated: number;
  error?: string;
}> {
  const bundle = loadBundle();

  if (!bundle) {
    return {
      success: false,
      formsCreated: 0,
      workflowsCreated: 0,
      error: 'Bundle not found',
    };
  }

  // Check if already initialized
  if (await isInitialized()) {
    const state = await getAppState();
    return {
      success: true,
      formsCreated: state?.formsCount || 0,
      workflowsCreated: state?.workflowsCount || 0,
      error: 'Already initialized',
    };
  }

  let formsCreated = 0;
  let workflowsCreated = 0;

  try {
    // Seed forms
    if (bundle.forms && bundle.forms.length > 0) {
      const formsCollection = await getFormsCollection();

      for (const form of bundle.forms) {
        const formDoc = {
          ...form,
          formId: generateId('form'),
          slug: form.slug || generateSlug(form.name),
          createdAt: new Date(),
          updatedAt: new Date(),
          isPublished: true,
          publishedAt: new Date(),
        };

        await formsCollection.insertOne(formDoc as any);
        formsCreated++;
      }
    }

    // Seed workflows
    if (bundle.workflows && bundle.workflows.length > 0) {
      const workflowsCollection = await getWorkflowsCollection();

      for (const workflow of bundle.workflows) {
        const workflowDoc = {
          ...workflow,
          id: generateId('wf'),
          slug: workflow.slug || generateSlug(workflow.name),
          status: 'active',
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await workflowsCollection.insertOne(workflowDoc as any);
        workflowsCreated++;
      }
    }

    // Mark as initialized
    const appStateCollection = await getAppStateCollection();
    await appStateCollection.updateOne(
      { _id: APP_STATE_ID as any },
      {
        $set: {
          initialized: true,
          initializedAt: new Date().toISOString(),
          formsCount: formsCreated,
          workflowsCount: workflowsCreated,
          bundleVersion: bundle.manifest.version,
          bundleName: bundle.manifest.name,
        },
      },
      { upsert: true }
    );

    return {
      success: true,
      formsCreated,
      workflowsCreated,
    };
  } catch (error) {
    console.error('Failed to initialize from bundle:', error);
    return {
      success: false,
      formsCreated,
      workflowsCreated,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate a unique ID with prefix
 */
function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}${randomPart}`;
}

/**
 * Generate a URL-friendly slug from a name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Get a form by slug
 */
export async function getFormBySlug(slug: string): Promise<FormDefinition | null> {
  try {
    const collection = await getFormsCollection();
    const form = await collection.findOne({ slug, isPublished: true });
    return form as FormDefinition | null;
  } catch (error) {
    console.error('Failed to get form by slug:', error);
    return null;
  }
}

/**
 * Get all published forms
 */
export async function getAllForms(): Promise<FormDefinition[]> {
  try {
    const collection = await getFormsCollection();
    const forms = await collection.find({ isPublished: true }).toArray();
    return forms as unknown as FormDefinition[];
  } catch (error) {
    console.error('Failed to get forms:', error);
    return [];
  }
}

/**
 * Get a workflow by slug
 */
export async function getWorkflowBySlug(slug: string): Promise<WorkflowDefinition | null> {
  try {
    const collection = await getWorkflowsCollection();
    const workflow = await collection.findOne({ slug, status: 'active' });
    return workflow as WorkflowDefinition | null;
  } catch (error) {
    console.error('Failed to get workflow by slug:', error);
    return null;
  }
}

/**
 * Get all active workflows
 */
export async function getAllWorkflows(): Promise<WorkflowDefinition[]> {
  try {
    const collection = await getWorkflowsCollection();
    const workflows = await collection.find({ status: 'active' }).toArray();
    return workflows as unknown as WorkflowDefinition[];
  } catch (error) {
    console.error('Failed to get workflows:', error);
    return [];
  }
}
