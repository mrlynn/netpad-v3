/**
 * Component Protection Management
 *
 * Provides optional explicit locking of forms and workflows.
 * This is separate from contract enforcement - use for explicit protection
 * of critical components, not general application protection.
 */

import { Collection } from 'mongodb';
import { getOrgFormsCollection } from './db';
import { getWorkflowsCollection } from '../workflow/db';
import { getUserOrgPermissions } from './permissions';
import { WorkflowDocument } from '@/types/workflow';

export type ComponentType = 'form' | 'workflow';

export interface ProtectedComponent {
  componentId: string;
  componentType: ComponentType;
  locked: boolean;
  contractId?: string; // Optional: link to contract
  lockedAt?: Date;
  lockedBy?: string; // userId
  editableFields?: string[]; // Optional: allow editing specific fields even when locked
}

export interface LockComponentInput {
  organizationId: string;
  componentId: string;
  componentType: ComponentType;
  contractId?: string;
  editableFields?: string[];
  lockedBy: string; // userId
}

export interface UnlockComponentInput {
  organizationId: string;
  componentId: string;
  componentType: ComponentType;
  unlockedBy: string; // userId
}

/**
 * Lock a form or workflow
 */
export async function lockComponent(input: LockComponentInput): Promise<void> {
  const { organizationId, componentId, componentType, contractId, editableFields, lockedBy } = input;

  const now = new Date();

  if (componentType === 'form') {
    const formsCollection = await getOrgFormsCollection(organizationId);
    const result = await formsCollection.updateOne(
      { formId: componentId },
      {
        $set: {
          locked: true,
          contractId: contractId ?? undefined,
          lockedAt: now,
          lockedBy,
          editableFields: editableFields || [],
          updatedAt: now,
        },
      }
    );

    if (result.matchedCount === 0) {
      throw new Error(`Form not found: ${componentId}`);
    }
  } else if (componentType === 'workflow') {
    const workflowsCollection = await getWorkflowsCollection(organizationId);
    const result = await workflowsCollection.updateOne(
      { id: componentId },
      {
        $set: {
          locked: true,
          contractId: contractId ?? undefined,
          lockedAt: now,
          lockedBy,
          editableFields: editableFields || [],
          updatedAt: now,
        },
      }
    );

    if (result.matchedCount === 0) {
      throw new Error(`Workflow not found: ${componentId}`);
    }
  } else {
    throw new Error(`Invalid component type: ${componentType}`);
  }
}

/**
 * Unlock a form or workflow
 */
export async function unlockComponent(input: UnlockComponentInput): Promise<void> {
  const { organizationId, componentId, componentType, unlockedBy } = input;

  const now = new Date();

  if (componentType === 'form') {
    const formsCollection = await getOrgFormsCollection(organizationId);
    const result = await formsCollection.updateOne(
      { formId: componentId },
      {
        $set: {
          locked: false,
          updatedAt: now,
        },
        $unset: {
          contractId: '',
          lockedAt: '',
          lockedBy: '',
          editableFields: '',
        },
      }
    );

    if (result.matchedCount === 0) {
      throw new Error(`Form not found: ${componentId}`);
    }
  } else if (componentType === 'workflow') {
    const workflowsCollection = await getWorkflowsCollection(organizationId);
    const result = await workflowsCollection.updateOne(
      { id: componentId },
      {
        $set: {
          locked: false,
          updatedAt: now,
        },
        $unset: {
          contractId: '',
          lockedAt: '',
          lockedBy: '',
          editableFields: '',
        },
      }
    );

    if (result.matchedCount === 0) {
      throw new Error(`Workflow not found: ${componentId}`);
    }
  } else {
    throw new Error(`Invalid component type: ${componentType}`);
  }
}

/**
 * Check if a component is locked
 */
export async function isComponentLocked(
  organizationId: string,
  componentId: string,
  componentType: ComponentType
): Promise<boolean> {
  if (componentType === 'form') {
    const formsCollection = await getOrgFormsCollection(organizationId);
    const form = await formsCollection.findOne(
      { formId: componentId },
      { projection: { locked: 1 } }
    );
    return form?.locked === true;
  } else if (componentType === 'workflow') {
    const workflowsCollection = await getWorkflowsCollection(organizationId);
    const workflow = await workflowsCollection.findOne<WorkflowDocument>(
      { id: componentId },
      { projection: { locked: 1 } }
    );
    return workflow?.locked === true;
  } else {
    throw new Error(`Invalid component type: ${componentType}`);
  }
}

/**
 * Get protection details for a component
 */
export async function getComponentProtection(
  organizationId: string,
  componentId: string,
  componentType: ComponentType
): Promise<ProtectedComponent | null> {
  if (componentType === 'form') {
    const formsCollection = await getOrgFormsCollection(organizationId);
    const form = await formsCollection.findOne(
      { formId: componentId },
      {
        projection: {
          formId: 1,
          locked: 1,
          contractId: 1,
          lockedAt: 1,
          lockedBy: 1,
          editableFields: 1,
        },
      }
    );

    if (!form) {
      return null;
    }

    return {
      componentId: form.formId,
      componentType: 'form',
      locked: form.locked === true,
      contractId: form.contractId,
      lockedAt: form.lockedAt,
      lockedBy: form.lockedBy,
      editableFields: form.editableFields,
    };
  } else if (componentType === 'workflow') {
    const workflowsCollection = await getWorkflowsCollection(organizationId);
    const workflow = await workflowsCollection.findOne<WorkflowDocument>(
      { id: componentId },
      {
        projection: {
          id: 1,
          locked: 1,
          contractId: 1,
          lockedAt: 1,
          lockedBy: 1,
          editableFields: 1,
        },
      }
    );

    if (!workflow) {
      return null;
    }

    return {
      componentId: workflow.id,
      componentType: 'workflow',
      locked: workflow.locked === true,
      contractId: workflow.contractId,
      lockedAt: workflow.lockedAt,
      lockedBy: workflow.lockedBy,
      editableFields: workflow.editableFields,
    };
  } else {
    throw new Error(`Invalid component type: ${componentType}`);
  }
}

/**
 * List all protected components for an application
 */
export async function listProtectedComponents(
  organizationId: string,
  applicationId: string
): Promise<ProtectedComponent[]> {
  const protectedComponents: ProtectedComponent[] = [];

  // Get locked forms
  const formsCollection = await getOrgFormsCollection(organizationId);
  const lockedForms = await formsCollection
    .find({
      applicationId,
      locked: true,
    })
    .project({
      formId: 1,
      locked: 1,
      contractId: 1,
      lockedAt: 1,
      lockedBy: 1,
      editableFields: 1,
    })
    .toArray();

  for (const form of lockedForms) {
    protectedComponents.push({
      componentId: form.formId,
      componentType: 'form',
      locked: true,
      contractId: form.contractId,
      lockedAt: form.lockedAt,
      lockedBy: form.lockedBy,
      editableFields: form.editableFields,
    });
  }

  // Get locked workflows
  const workflowsCollection = await getWorkflowsCollection(organizationId);
  const lockedWorkflows = await workflowsCollection
    .find({
      applicationId,
      locked: true,
    })
    .project({
      id: 1,
      locked: 1,
      contractId: 1,
      lockedAt: 1,
      lockedBy: 1,
      editableFields: 1,
    })
    .toArray();

  for (const workflow of lockedWorkflows) {
    protectedComponents.push({
      componentId: workflow.id,
      componentType: 'workflow',
      locked: true,
      contractId: workflow.contractId,
      lockedAt: workflow.lockedAt,
      lockedBy: workflow.lockedBy,
      editableFields: workflow.editableFields,
    });
  }

  return protectedComponents;
}

/**
 * Check if a field can be edited (even if component is locked)
 */
export async function canEditField(
  organizationId: string,
  componentId: string,
  componentType: ComponentType,
  fieldPath: string
): Promise<boolean> {
  const protection = await getComponentProtection(organizationId, componentId, componentType);

  // If not locked, all fields are editable
  if (!protection || !protection.locked) {
    return true;
  }

  // If locked but no editableFields specified, nothing is editable
  if (!protection.editableFields || protection.editableFields.length === 0) {
    return false;
  }

  // Check if field is in editableFields list
  return protection.editableFields.includes(fieldPath);
}
