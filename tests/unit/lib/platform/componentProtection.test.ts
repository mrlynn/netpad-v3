/**
 * Component Protection Tests
 *
 * Tests for locking/unlocking forms and workflows,
 * checking lock status, and field-level editability.
 */

import {
  lockComponent,
  unlockComponent,
  isComponentLocked,
  getComponentProtection,
  listProtectedComponents,
  canEditField,
} from '@/lib/platform/componentProtection';

const mockUpdateOne = jest.fn();
const mockFindOne = jest.fn();
const mockFind = jest.fn();

const mockFormsCollection = {
  updateOne: mockUpdateOne,
  findOne: mockFindOne,
  find: mockFind,
};

const mockWorkflowUpdateOne = jest.fn();
const mockWorkflowFindOne = jest.fn();
const mockWorkflowFind = jest.fn();

const mockWorkflowsCollection = {
  updateOne: mockWorkflowUpdateOne,
  findOne: mockWorkflowFindOne,
  find: mockWorkflowFind,
};

jest.mock('@/lib/platform/db', () => ({
  getOrgFormsCollection: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/workflow/db', () => ({
  getWorkflowsCollection: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/platform/permissions', () => ({
  getUserOrgPermissions: jest.fn().mockResolvedValue({ isAdmin: true }),
}));

const platformDb = require('@/lib/platform/db');
const workflowDb = require('@/lib/workflow/db');

beforeEach(() => {
  jest.clearAllMocks();
  platformDb.getOrgFormsCollection.mockResolvedValue(mockFormsCollection);
  workflowDb.getWorkflowsCollection.mockResolvedValue(mockWorkflowsCollection);
});

describe('lockComponent', () => {
  test('locks a form successfully', async () => {
    mockUpdateOne.mockResolvedValue({ matchedCount: 1 });

    await lockComponent({
      organizationId: 'org_1',
      componentId: 'form_1',
      componentType: 'form',
      lockedBy: 'user_1',
    });

    expect(mockUpdateOne).toHaveBeenCalledWith(
      { formId: 'form_1' },
      expect.objectContaining({
        $set: expect.objectContaining({
          locked: true,
          lockedBy: 'user_1',
        }),
      })
    );
  });

  test('locks a workflow successfully', async () => {
    mockWorkflowUpdateOne.mockResolvedValue({ matchedCount: 1 });

    await lockComponent({
      organizationId: 'org_1',
      componentId: 'wf_1',
      componentType: 'workflow',
      lockedBy: 'user_1',
    });

    expect(mockWorkflowUpdateOne).toHaveBeenCalledWith(
      { id: 'wf_1' },
      expect.objectContaining({
        $set: expect.objectContaining({
          locked: true,
          lockedBy: 'user_1',
        }),
      })
    );
  });

  test('throws when form not found', async () => {
    mockUpdateOne.mockResolvedValue({ matchedCount: 0 });

    await expect(
      lockComponent({
        organizationId: 'org_1',
        componentId: 'form_nonexistent',
        componentType: 'form',
        lockedBy: 'user_1',
      })
    ).rejects.toThrow('Form not found');
  });

  test('throws when workflow not found', async () => {
    mockWorkflowUpdateOne.mockResolvedValue({ matchedCount: 0 });

    await expect(
      lockComponent({
        organizationId: 'org_1',
        componentId: 'wf_nonexistent',
        componentType: 'workflow',
        lockedBy: 'user_1',
      })
    ).rejects.toThrow('Workflow not found');
  });

  test('throws for invalid component type', async () => {
    await expect(
      lockComponent({
        organizationId: 'org_1',
        componentId: 'x',
        componentType: 'invalid' as any,
        lockedBy: 'user_1',
      })
    ).rejects.toThrow('Invalid component type');
  });

  test('stores contractId and editableFields', async () => {
    mockUpdateOne.mockResolvedValue({ matchedCount: 1 });

    await lockComponent({
      organizationId: 'org_1',
      componentId: 'form_1',
      componentType: 'form',
      lockedBy: 'user_1',
      contractId: 'contract_1',
      editableFields: ['title', 'description'],
    });

    expect(mockUpdateOne).toHaveBeenCalledWith(
      { formId: 'form_1' },
      expect.objectContaining({
        $set: expect.objectContaining({
          contractId: 'contract_1',
          editableFields: ['title', 'description'],
        }),
      })
    );
  });
});

describe('unlockComponent', () => {
  test('unlocks a form and unsets lock fields', async () => {
    mockUpdateOne.mockResolvedValue({ matchedCount: 1 });

    await unlockComponent({
      organizationId: 'org_1',
      componentId: 'form_1',
      componentType: 'form',
      unlockedBy: 'user_1',
    });

    expect(mockUpdateOne).toHaveBeenCalledWith(
      { formId: 'form_1' },
      expect.objectContaining({
        $set: expect.objectContaining({ locked: false }),
        $unset: expect.objectContaining({
          contractId: '',
          lockedAt: '',
          lockedBy: '',
          editableFields: '',
        }),
      })
    );
  });

  test('throws when form not found on unlock', async () => {
    mockUpdateOne.mockResolvedValue({ matchedCount: 0 });

    await expect(
      unlockComponent({
        organizationId: 'org_1',
        componentId: 'form_nonexistent',
        componentType: 'form',
        unlockedBy: 'user_1',
      })
    ).rejects.toThrow('Form not found');
  });

  test('throws for invalid component type on unlock', async () => {
    await expect(
      unlockComponent({
        organizationId: 'org_1',
        componentId: 'x',
        componentType: 'unknown' as any,
        unlockedBy: 'user_1',
      })
    ).rejects.toThrow('Invalid component type');
  });
});

describe('isComponentLocked', () => {
  test('returns true for locked form', async () => {
    mockFindOne.mockResolvedValue({ locked: true });
    const result = await isComponentLocked('org_1', 'form_1', 'form');
    expect(result).toBe(true);
  });

  test('returns false for unlocked form', async () => {
    mockFindOne.mockResolvedValue({ locked: false });
    const result = await isComponentLocked('org_1', 'form_1', 'form');
    expect(result).toBe(false);
  });

  test('returns false when form has no locked field', async () => {
    mockFindOne.mockResolvedValue({});
    const result = await isComponentLocked('org_1', 'form_1', 'form');
    expect(result).toBe(false);
  });

  test('returns false when form not found', async () => {
    mockFindOne.mockResolvedValue(null);
    const result = await isComponentLocked('org_1', 'form_1', 'form');
    expect(result).toBe(false);
  });

  test('checks workflow lock status', async () => {
    mockWorkflowFindOne.mockResolvedValue({ locked: true });
    const result = await isComponentLocked('org_1', 'wf_1', 'workflow');
    expect(result).toBe(true);
  });

  test('throws for invalid component type', async () => {
    await expect(
      isComponentLocked('org_1', 'x', 'bad' as any)
    ).rejects.toThrow('Invalid component type');
  });
});

describe('getComponentProtection', () => {
  test('returns protection details for locked form', async () => {
    mockFindOne.mockResolvedValue({
      formId: 'form_1',
      locked: true,
      contractId: 'contract_1',
      lockedAt: new Date('2026-01-01'),
      lockedBy: 'user_1',
      editableFields: ['title'],
    });

    const result = await getComponentProtection('org_1', 'form_1', 'form');
    expect(result).toEqual({
      componentId: 'form_1',
      componentType: 'form',
      locked: true,
      contractId: 'contract_1',
      lockedAt: new Date('2026-01-01'),
      lockedBy: 'user_1',
      editableFields: ['title'],
    });
  });

  test('returns null when form not found', async () => {
    mockFindOne.mockResolvedValue(null);
    const result = await getComponentProtection('org_1', 'form_1', 'form');
    expect(result).toBeNull();
  });

  test('returns protection details for workflow', async () => {
    mockWorkflowFindOne.mockResolvedValue({
      id: 'wf_1',
      locked: true,
      lockedBy: 'user_1',
    });

    const result = await getComponentProtection('org_1', 'wf_1', 'workflow');
    expect(result!.componentType).toBe('workflow');
    expect(result!.locked).toBe(true);
  });
});

describe('listProtectedComponents', () => {
  test('returns locked forms and workflows', async () => {
    mockFind.mockReturnValue({
      project: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([
          { formId: 'form_1', locked: true, lockedBy: 'user_1' },
        ]),
      }),
    });
    mockWorkflowFind.mockReturnValue({
      project: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([
          { id: 'wf_1', locked: true, lockedBy: 'user_2' },
        ]),
      }),
    });

    const result = await listProtectedComponents('org_1', 'app_1');
    expect(result).toHaveLength(2);
    expect(result[0].componentType).toBe('form');
    expect(result[1].componentType).toBe('workflow');
  });

  test('returns empty when nothing locked', async () => {
    mockFind.mockReturnValue({
      project: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      }),
    });
    mockWorkflowFind.mockReturnValue({
      project: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      }),
    });

    const result = await listProtectedComponents('org_1', 'app_1');
    expect(result).toHaveLength(0);
  });
});

describe('canEditField', () => {
  test('returns true when component is not locked', async () => {
    mockFindOne.mockResolvedValue({ formId: 'form_1', locked: false });
    const result = await canEditField('org_1', 'form_1', 'form', 'title');
    expect(result).toBe(true);
  });

  test('returns true when component not found', async () => {
    mockFindOne.mockResolvedValue(null);
    const result = await canEditField('org_1', 'form_1', 'form', 'title');
    expect(result).toBe(true);
  });

  test('returns false when locked with no editable fields', async () => {
    mockFindOne.mockResolvedValue({
      formId: 'form_1',
      locked: true,
      editableFields: [],
    });
    const result = await canEditField('org_1', 'form_1', 'form', 'title');
    expect(result).toBe(false);
  });

  test('returns true when field is in editable list', async () => {
    mockFindOne.mockResolvedValue({
      formId: 'form_1',
      locked: true,
      editableFields: ['title', 'description'],
    });
    const result = await canEditField('org_1', 'form_1', 'form', 'title');
    expect(result).toBe(true);
  });

  test('returns false when field is NOT in editable list', async () => {
    mockFindOne.mockResolvedValue({
      formId: 'form_1',
      locked: true,
      editableFields: ['description'],
    });
    const result = await canEditField('org_1', 'form_1', 'form', 'title');
    expect(result).toBe(false);
  });

  test('returns false when locked with undefined editableFields', async () => {
    mockFindOne.mockResolvedValue({
      formId: 'form_1',
      locked: true,
    });
    const result = await canEditField('org_1', 'form_1', 'form', 'title');
    expect(result).toBe(false);
  });
});
