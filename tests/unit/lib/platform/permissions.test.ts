/**
 * Permission Service Tests
 *
 * Tests for the RBAC permission system including platform, organization,
 * connection vault, and form permissions.
 */

import {
  checkPlatformPermission,
  checkOrganizationPermission,
  checkConnectionPermission,
  checkFormPermission,
  checkPermission,
  getEffectiveOrgRole,
  getEffectiveFormRole,
  assertPermission,
  assertOrgPermission,
  assertConnectionPermission,
  assertFormPermission,
  getUserOrgPermissions,
  PermissionError,
  PermissionContext,
  PermissionResult,
  ResourceType,
} from '@/lib/platform/permissions';
import {
  OrgRole,
  ConnectionRole,
  FormRole,
  FormPermission,
  PlatformUser,
} from '@/types/platform';

// Mock dependencies
jest.mock('@/lib/platform/users', () => ({
  findUserById: jest.fn(),
  isPlatformAdmin: jest.fn(),
}));

jest.mock('@/lib/platform/organizations', () => ({
  getUserOrgRole: jest.fn(),
  getOrganization: jest.fn(),
}));

jest.mock('@/lib/platform/connectionVault', () => ({
  getVaultRole: jest.fn(),
}));

jest.mock('@/lib/platform/db', () => ({
  getOrgFormsCollection: jest.fn(),
}));

// Mock constants
jest.mock('@/types/platform', () => ({
  ...jest.requireActual('@/types/platform'),
  ORG_ROLE_CAPABILITIES: {
    owner: ['manage_org', 'invite_users', 'manage_forms', 'manage_connections', 'view_analytics'],
    admin: ['invite_users', 'manage_forms', 'manage_connections', 'view_analytics'],
    member: ['create_forms', 'edit_own_forms', 'view_forms'],
    viewer: ['view_forms'],
  },
  CONNECTION_ROLE_CAPABILITIES: {
    owner: ['read', 'write', 'delete', 'share'],
    editor: ['read', 'write', 'share'],
    viewer: ['read'],
    use: ['use'],
  },
  FORM_ROLE_CAPABILITIES: {
    owner: ['read', 'write', 'delete', 'share'],
    editor: ['read', 'write'],
    viewer: ['read'],
  },
}));

describe('Permission Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Platform Permissions', () => {
    describe('checkPlatformPermission', () => {
      it('should allow platform admin full access', async () => {
        const { findUserById } = require('@/lib/platform/users');
        findUserById.mockResolvedValue({
          userId: 'user123',
          platformRole: 'admin',
        });

        const result = await checkPlatformPermission('user123', 'manage_users');

        expect(result.allowed).toBe(true);
        expect(result.role).toBe('platform:admin');
      });

      it('should allow platform support limited access', async () => {
        const { findUserById } = require('@/lib/platform/users');
        findUserById.mockResolvedValue({
          userId: 'user456',
          platformRole: 'support',
        });

        const result = await checkPlatformPermission('user456', 'view_users');

        expect(result.allowed).toBe(true);
        expect(result.role).toBe('platform:support');
      });

      it('should deny platform support write access', async () => {
        const { findUserById } = require('@/lib/platform/users');
        findUserById.mockResolvedValue({
          userId: 'user456',
          platformRole: 'support',
        });

        const result = await checkPlatformPermission('user456', 'delete_users');

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('Insufficient platform permissions');
      });

      it('should deny regular users platform access', async () => {
        const { findUserById } = require('@/lib/platform/users');
        findUserById.mockResolvedValue({
          userId: 'user789',
          platformRole: null,
        });

        const result = await checkPlatformPermission('user789', 'view_users');

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('Insufficient platform permissions');
      });

      it('should handle user not found', async () => {
        const { findUserById } = require('@/lib/platform/users');
        findUserById.mockResolvedValue(null);

        const result = await checkPlatformPermission('nonexistent', 'view_users');

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('User not found');
      });

      it('should handle multiple support capabilities', async () => {
        const { findUserById } = require('@/lib/platform/users');
        findUserById.mockResolvedValue({
          userId: 'support1',
          platformRole: 'support',
        });

        const viewUsers = await checkPlatformPermission('support1', 'view_users');
        const viewOrgs = await checkPlatformPermission('support1', 'view_orgs');
        const viewAudit = await checkPlatformPermission('support1', 'view_audit');

        expect(viewUsers.allowed).toBe(true);
        expect(viewOrgs.allowed).toBe(true);
        expect(viewAudit.allowed).toBe(true);
      });
    });
  });

  describe('Organization Permissions', () => {
    describe('checkOrganizationPermission', () => {
      it('should allow platform admin full org access', async () => {
        const { isPlatformAdmin } = require('@/lib/platform/users');
        isPlatformAdmin.mockResolvedValue(true);

        const result = await checkOrganizationPermission('admin1', 'org123', 'manage_org');

        expect(result.allowed).toBe(true);
        expect(result.role).toBe('platform:admin');
      });

      it('should allow org owner all capabilities', async () => {
        const { isPlatformAdmin } = require('@/lib/platform/users');
        const { getUserOrgRole } = require('@/lib/platform/organizations');
        
        isPlatformAdmin.mockResolvedValue(false);
        getUserOrgRole.mockResolvedValue('owner');

        const result = await checkOrganizationPermission('owner1', 'org123', 'manage_org');

        expect(result.allowed).toBe(true);
        expect(result.role).toBe('org:owner');
      });

      it('should allow org admin appropriate capabilities', async () => {
        const { isPlatformAdmin } = require('@/lib/platform/users');
        const { getUserOrgRole } = require('@/lib/platform/organizations');
        
        isPlatformAdmin.mockResolvedValue(false);
        getUserOrgRole.mockResolvedValue('admin');

        const result = await checkOrganizationPermission('admin1', 'org123', 'manage_forms');

        expect(result.allowed).toBe(true);
        expect(result.role).toBe('org:admin');
      });

      it('should deny org admin owner-only capabilities', async () => {
        const { isPlatformAdmin } = require('@/lib/platform/users');
        const { getUserOrgRole } = require('@/lib/platform/organizations');
        
        isPlatformAdmin.mockResolvedValue(false);
        getUserOrgRole.mockResolvedValue('admin');

        const result = await checkOrganizationPermission('admin1', 'org123', 'manage_org');

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe("Role 'admin' does not have 'manage_org' permission");
      });

      it('should allow member basic capabilities', async () => {
        const { isPlatformAdmin } = require('@/lib/platform/users');
        const { getUserOrgRole } = require('@/lib/platform/organizations');
        
        isPlatformAdmin.mockResolvedValue(false);
        getUserOrgRole.mockResolvedValue('member');

        const result = await checkOrganizationPermission('member1', 'org123', 'create_forms');

        expect(result.allowed).toBe(true);
        expect(result.role).toBe('org:member');
      });

      it('should allow viewer read-only access', async () => {
        const { isPlatformAdmin } = require('@/lib/platform/users');
        const { getUserOrgRole } = require('@/lib/platform/organizations');
        
        isPlatformAdmin.mockResolvedValue(false);
        getUserOrgRole.mockResolvedValue('viewer');

        const result = await checkOrganizationPermission('viewer1', 'org123', 'view_forms');

        expect(result.allowed).toBe(true);
        expect(result.role).toBe('org:viewer');
      });

      it('should deny viewer write capabilities', async () => {
        const { isPlatformAdmin } = require('@/lib/platform/users');
        const { getUserOrgRole } = require('@/lib/platform/organizations');
        
        isPlatformAdmin.mockResolvedValue(false);
        getUserOrgRole.mockResolvedValue('viewer');

        const result = await checkOrganizationPermission('viewer1', 'org123', 'create_forms');

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe("Role 'viewer' does not have 'create_forms' permission");
      });

      it('should deny non-members access', async () => {
        const { isPlatformAdmin } = require('@/lib/platform/users');
        const { getUserOrgRole } = require('@/lib/platform/organizations');
        
        isPlatformAdmin.mockResolvedValue(false);
        getUserOrgRole.mockResolvedValue(null);

        const result = await checkOrganizationPermission('outsider', 'org123', 'view_forms');

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('Not a member of this organization');
      });
    });

    describe('getEffectiveOrgRole', () => {
      it('should return platform_admin for platform admins', async () => {
        const { isPlatformAdmin } = require('@/lib/platform/users');
        isPlatformAdmin.mockResolvedValue(true);

        const role = await getEffectiveOrgRole('admin1', 'org123');

        expect(role).toBe('platform_admin');
      });

      it('should return actual org role for non-platform admins', async () => {
        const { isPlatformAdmin } = require('@/lib/platform/users');
        const { getUserOrgRole } = require('@/lib/platform/organizations');
        
        isPlatformAdmin.mockResolvedValue(false);
        getUserOrgRole.mockResolvedValue('admin');

        const role = await getEffectiveOrgRole('user1', 'org123');

        expect(role).toBe('admin');
      });
    });
  });

  describe('Connection Permissions', () => {
    describe('checkConnectionPermission', () => {
      it('should allow platform admin full connection access', async () => {
        const { isPlatformAdmin } = require('@/lib/platform/users');
        isPlatformAdmin.mockResolvedValue(true);

        const result = await checkConnectionPermission('admin1', 'org123', 'vault456', 'delete');

        expect(result.allowed).toBe(true);
        expect(result.role).toBe('platform:admin');
      });

      it('should allow org admin full connection access', async () => {
        const { isPlatformAdmin } = require('@/lib/platform/users');
        const { getUserOrgRole } = require('@/lib/platform/organizations');
        
        isPlatformAdmin.mockResolvedValue(false);
        getUserOrgRole.mockResolvedValue('admin');

        const result = await checkConnectionPermission('admin1', 'org123', 'vault456', 'delete');

        expect(result.allowed).toBe(true);
        expect(result.role).toBe('org:admin');
      });

      it('should allow connection owner full access', async () => {
        const { isPlatformAdmin } = require('@/lib/platform/users');
        const { getUserOrgRole } = require('@/lib/platform/organizations');
        const { getVaultRole } = require('@/lib/platform/connectionVault');
        
        isPlatformAdmin.mockResolvedValue(false);
        getUserOrgRole.mockResolvedValue('member');
        getVaultRole.mockResolvedValue('owner');

        const result = await checkConnectionPermission('owner1', 'org123', 'vault456', 'delete');

        expect(result.allowed).toBe(true);
        expect(result.role).toBe('connection:owner');
      });

      it('should allow connection editor write access', async () => {
        const { isPlatformAdmin } = require('@/lib/platform/users');
        const { getUserOrgRole } = require('@/lib/platform/organizations');
        const { getVaultRole } = require('@/lib/platform/connectionVault');
        
        isPlatformAdmin.mockResolvedValue(false);
        getUserOrgRole.mockResolvedValue('member');
        getVaultRole.mockResolvedValue('editor');

        const result = await checkConnectionPermission('editor1', 'org123', 'vault456', 'write');

        expect(result.allowed).toBe(true);
        expect(result.role).toBe('connection:editor');
      });

      it('should deny connection editor delete access', async () => {
        const { isPlatformAdmin } = require('@/lib/platform/users');
        const { getUserOrgRole } = require('@/lib/platform/organizations');
        const { getVaultRole } = require('@/lib/platform/connectionVault');
        
        isPlatformAdmin.mockResolvedValue(false);
        getUserOrgRole.mockResolvedValue('member');
        getVaultRole.mockResolvedValue('editor');

        const result = await checkConnectionPermission('editor1', 'org123', 'vault456', 'delete');

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe("Role 'editor' does not have 'delete' permission");
      });

      it('should allow org member to use connections', async () => {
        const { isPlatformAdmin } = require('@/lib/platform/users');
        const { getUserOrgRole } = require('@/lib/platform/organizations');
        const { getVaultRole } = require('@/lib/platform/connectionVault');
        
        isPlatformAdmin.mockResolvedValue(false);
        getUserOrgRole.mockResolvedValue('member');
        getVaultRole.mockResolvedValue(null);

        const result = await checkConnectionPermission('member1', 'org123', 'vault456', 'use');

        expect(result.allowed).toBe(true);
        expect(result.role).toBe('org:member');
      });

      it('should deny non-member connection access', async () => {
        const { isPlatformAdmin } = require('@/lib/platform/users');
        const { getUserOrgRole } = require('@/lib/platform/organizations');
        const { getVaultRole } = require('@/lib/platform/connectionVault');
        
        isPlatformAdmin.mockResolvedValue(false);
        getUserOrgRole.mockResolvedValue(null);
        getVaultRole.mockResolvedValue(null);

        const result = await checkConnectionPermission('outsider', 'org123', 'vault456', 'use');

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('No access to this connection');
      });
    });
  });

  describe('Form Permissions', () => {
    describe('checkFormPermission', () => {
      beforeEach(() => {
        const mockCollection = {
          findOne: jest.fn(),
        };
        const { getOrgFormsCollection } = require('@/lib/platform/db');
        getOrgFormsCollection.mockResolvedValue(mockCollection);
      });

      it('should allow platform admin full form access', async () => {
        const { isPlatformAdmin } = require('@/lib/platform/users');
        isPlatformAdmin.mockResolvedValue(true);

        const result = await checkFormPermission('admin1', 'org123', 'form456', 'delete');

        expect(result.allowed).toBe(true);
        expect(result.role).toBe('platform:admin');
      });

      it('should allow org admin full form access', async () => {
        const { isPlatformAdmin } = require('@/lib/platform/users');
        const { getUserOrgRole } = require('@/lib/platform/organizations');
        
        isPlatformAdmin.mockResolvedValue(false);
        getUserOrgRole.mockResolvedValue('admin');

        const result = await checkFormPermission('admin1', 'org123', 'form456', 'delete');

        expect(result.allowed).toBe(true);
        expect(result.role).toBe('org:admin');
      });

      it('should allow form creator full access', async () => {
        const { isPlatformAdmin } = require('@/lib/platform/users');
        const { getUserOrgRole } = require('@/lib/platform/organizations');
        const { getOrgFormsCollection } = require('@/lib/platform/db');
        
        isPlatformAdmin.mockResolvedValue(false);
        getUserOrgRole.mockResolvedValue('member');
        
        const mockCollection = await getOrgFormsCollection();
        mockCollection.findOne.mockResolvedValue({
          formId: 'form456',
          createdBy: 'creator1',
          permissions: [],
        });

        const result = await checkFormPermission('creator1', 'org123', 'form456', 'delete');

        expect(result.allowed).toBe(true);
        expect(result.role).toBe('form:owner');
      });

      it('should allow form editor write access', async () => {
        const { isPlatformAdmin } = require('@/lib/platform/users');
        const { getUserOrgRole } = require('@/lib/platform/organizations');
        const { getOrgFormsCollection } = require('@/lib/platform/db');
        
        isPlatformAdmin.mockResolvedValue(false);
        getUserOrgRole.mockResolvedValue('member');
        
        const mockCollection = await getOrgFormsCollection();
        mockCollection.findOne.mockResolvedValue({
          formId: 'form456',
          createdBy: 'creator1',
          permissions: [
            { userId: 'editor1', role: 'editor' as FormRole },
          ],
        });

        const result = await checkFormPermission('editor1', 'org123', 'form456', 'write');

        expect(result.allowed).toBe(true);
        expect(result.role).toBe('form:editor');
      });

      it('should deny form editor delete access', async () => {
        const { isPlatformAdmin } = require('@/lib/platform/users');
        const { getUserOrgRole } = require('@/lib/platform/organizations');
        const { getOrgFormsCollection } = require('@/lib/platform/db');
        
        isPlatformAdmin.mockResolvedValue(false);
        getUserOrgRole.mockResolvedValue('member');
        
        const mockCollection = await getOrgFormsCollection();
        mockCollection.findOne.mockResolvedValue({
          formId: 'form456',
          createdBy: 'creator1',
          permissions: [
            { userId: 'editor1', role: 'editor' as FormRole },
          ],
        });

        const result = await checkFormPermission('editor1', 'org123', 'form456', 'delete');

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe("Role 'editor' does not have 'delete' permission");
      });

      it('should allow org member to read forms', async () => {
        const { isPlatformAdmin } = require('@/lib/platform/users');
        const { getUserOrgRole } = require('@/lib/platform/organizations');
        const { getOrgFormsCollection } = require('@/lib/platform/db');
        
        isPlatformAdmin.mockResolvedValue(false);
        getUserOrgRole.mockResolvedValue('member');
        
        const mockCollection = await getOrgFormsCollection();
        mockCollection.findOne.mockResolvedValue({
          formId: 'form456',
          createdBy: 'creator1',
          permissions: [],
        });

        const result = await checkFormPermission('member1', 'org123', 'form456', 'read');

        expect(result.allowed).toBe(true);
        expect(result.role).toBe('org:member');
      });

      it('should deny org member write access to non-owned forms', async () => {
        const { isPlatformAdmin } = require('@/lib/platform/users');
        const { getUserOrgRole } = require('@/lib/platform/organizations');
        const { getOrgFormsCollection } = require('@/lib/platform/db');
        
        isPlatformAdmin.mockResolvedValue(false);
        getUserOrgRole.mockResolvedValue('member');
        
        const mockCollection = await getOrgFormsCollection();
        mockCollection.findOne.mockResolvedValue({
          formId: 'form456',
          createdBy: 'creator1',
          permissions: [],
        });

        const result = await checkFormPermission('member1', 'org123', 'form456', 'write');

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('No access to this form');
      });

      it('should handle form not found', async () => {
        const { isPlatformAdmin } = require('@/lib/platform/users');
        const { getUserOrgRole } = require('@/lib/platform/organizations');
        const { getOrgFormsCollection } = require('@/lib/platform/db');
        
        isPlatformAdmin.mockResolvedValue(false);
        getUserOrgRole.mockResolvedValue('member');
        
        const mockCollection = await getOrgFormsCollection();
        mockCollection.findOne.mockResolvedValue(null);

        const result = await checkFormPermission('member1', 'org123', 'nonexistent', 'read');

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('Form not found');
      });
    });

    describe('getEffectiveFormRole', () => {
      beforeEach(() => {
        const mockCollection = {
          findOne: jest.fn(),
        };
        const { getOrgFormsCollection } = require('@/lib/platform/db');
        getOrgFormsCollection.mockResolvedValue(mockCollection);
      });

      it('should return platform_admin for platform admins', async () => {
        const { isPlatformAdmin } = require('@/lib/platform/users');
        isPlatformAdmin.mockResolvedValue(true);

        const role = await getEffectiveFormRole('admin1', 'org123', 'form456');

        expect(role).toBe('platform_admin');
      });

      it('should return org_admin for org admins', async () => {
        const { isPlatformAdmin } = require('@/lib/platform/users');
        const { getUserOrgRole } = require('@/lib/platform/organizations');
        
        isPlatformAdmin.mockResolvedValue(false);
        getUserOrgRole.mockResolvedValue('admin');

        const role = await getEffectiveFormRole('admin1', 'org123', 'form456');

        expect(role).toBe('org_admin');
      });

      it('should return owner for form creators', async () => {
        const { isPlatformAdmin } = require('@/lib/platform/users');
        const { getUserOrgRole } = require('@/lib/platform/organizations');
        const { getOrgFormsCollection } = require('@/lib/platform/db');
        
        isPlatformAdmin.mockResolvedValue(false);
        getUserOrgRole.mockResolvedValue('member');
        
        const mockCollection = await getOrgFormsCollection();
        mockCollection.findOne.mockResolvedValue({
          formId: 'form456',
          createdBy: 'creator1',
          permissions: [],
        });

        const role = await getEffectiveFormRole('creator1', 'org123', 'form456');

        expect(role).toBe('owner');
      });
    });
  });

  describe('Unified Permission Check', () => {
    describe('checkPermission', () => {
      it('should route platform permissions correctly', async () => {
        const { findUserById } = require('@/lib/platform/users');
        findUserById.mockResolvedValue({ platformRole: 'admin' });

        const context: PermissionContext = {
          userId: 'admin1',
          resourceType: 'platform',
        };

        const result = await checkPermission(context, 'manage_users');

        expect(result.allowed).toBe(true);
        expect(result.role).toBe('platform:admin');
      });

      it('should route organization permissions correctly', async () => {
        const { isPlatformAdmin } = require('@/lib/platform/users');
        const { getUserOrgRole } = require('@/lib/platform/organizations');
        
        isPlatformAdmin.mockResolvedValue(false);
        getUserOrgRole.mockResolvedValue('owner');

        const context: PermissionContext = {
          userId: 'owner1',
          resourceType: 'organization',
          organizationId: 'org123',
        };

        const result = await checkPermission(context, 'manage_org');

        expect(result.allowed).toBe(true);
        expect(result.role).toBe('org:owner');
      });

      it('should require organization ID for org permissions', async () => {
        const context: PermissionContext = {
          userId: 'user1',
          resourceType: 'organization',
        };

        const result = await checkPermission(context, 'manage_org');

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('Organization ID required');
      });

      it('should require resource ID for connection permissions', async () => {
        const context: PermissionContext = {
          userId: 'user1',
          resourceType: 'connection',
          organizationId: 'org123',
        };

        const result = await checkPermission(context, 'read');

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('Organization ID and resource ID required');
      });

      it('should handle unknown resource types', async () => {
        const context: PermissionContext = {
          userId: 'user1',
          resourceType: 'unknown' as ResourceType,
        };

        const result = await checkPermission(context, 'read');

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('Unknown resource type');
      });
    });
  });

  describe('Permission Assertions', () => {
    describe('assertPermission', () => {
      it('should pass for allowed permissions', async () => {
        const { findUserById } = require('@/lib/platform/users');
        findUserById.mockResolvedValue({ platformRole: 'admin' });

        const context: PermissionContext = {
          userId: 'admin1',
          resourceType: 'platform',
        };

        await expect(
          assertPermission(context, 'manage_users')
        ).resolves.not.toThrow();
      });

      it('should throw PermissionError for denied permissions', async () => {
        const { findUserById } = require('@/lib/platform/users');
        findUserById.mockResolvedValue({ platformRole: null });

        const context: PermissionContext = {
          userId: 'user1',
          resourceType: 'platform',
        };

        await expect(
          assertPermission(context, 'manage_users')
        ).rejects.toThrow(PermissionError);
      });

      it('should include error reason in PermissionError', async () => {
        const { findUserById } = require('@/lib/platform/users');
        findUserById.mockResolvedValue({ platformRole: null });

        const context: PermissionContext = {
          userId: 'user1',
          resourceType: 'platform',
        };

        try {
          await assertPermission(context, 'manage_users');
          fail('Should have thrown PermissionError');
        } catch (error) {
          expect(error).toBeInstanceOf(PermissionError);
          expect(error.message).toBe('Insufficient platform permissions');
          expect(error.code).toBe('FORBIDDEN');
        }
      });
    });

    describe('assertOrgPermission', () => {
      it('should pass for allowed org permissions', async () => {
        const { isPlatformAdmin } = require('@/lib/platform/users');
        const { getUserOrgRole } = require('@/lib/platform/organizations');
        
        isPlatformAdmin.mockResolvedValue(false);
        getUserOrgRole.mockResolvedValue('owner');

        await expect(
          assertOrgPermission('owner1', 'org123', 'manage_org')
        ).resolves.not.toThrow();
      });

      it('should throw for denied org permissions', async () => {
        const { isPlatformAdmin } = require('@/lib/platform/users');
        const { getUserOrgRole } = require('@/lib/platform/organizations');
        
        isPlatformAdmin.mockResolvedValue(false);
        getUserOrgRole.mockResolvedValue(null);

        await expect(
          assertOrgPermission('outsider', 'org123', 'manage_org')
        ).rejects.toThrow(PermissionError);
      });
    });

    describe('assertFormPermission', () => {
      beforeEach(() => {
        const mockCollection = {
          findOne: jest.fn(),
        };
        const { getOrgFormsCollection } = require('@/lib/platform/db');
        getOrgFormsCollection.mockResolvedValue(mockCollection);
      });

      it('should pass for form owner', async () => {
        const { isPlatformAdmin } = require('@/lib/platform/users');
        const { getUserOrgRole } = require('@/lib/platform/organizations');
        const { getOrgFormsCollection } = require('@/lib/platform/db');
        
        isPlatformAdmin.mockResolvedValue(false);
        getUserOrgRole.mockResolvedValue('member');
        
        const mockCollection = await getOrgFormsCollection();
        mockCollection.findOne.mockResolvedValue({
          formId: 'form456',
          createdBy: 'creator1',
          permissions: [],
        });

        await expect(
          assertFormPermission('creator1', 'org123', 'form456', 'delete')
        ).resolves.not.toThrow();
      });
    });
  });

  describe('getUserOrgPermissions', () => {
    it('should return full permissions for platform admin', async () => {
      const { isPlatformAdmin } = require('@/lib/platform/users');
      isPlatformAdmin.mockResolvedValue(true);

      const result = await getUserOrgPermissions('admin1', 'org123');

      expect(result.isPlatformAdmin).toBe(true);
      expect(result.isOrgAdmin).toBe(true);
      expect(result.capabilities).toEqual(['*']);
      expect(result.orgRole).toBe('owner');
    });

    it('should return org role capabilities for org members', async () => {
      const { isPlatformAdmin } = require('@/lib/platform/users');
      const { getUserOrgRole } = require('@/lib/platform/organizations');
      
      isPlatformAdmin.mockResolvedValue(false);
      getUserOrgRole.mockResolvedValue('admin');

      const result = await getUserOrgPermissions('admin1', 'org123');

      expect(result.isPlatformAdmin).toBe(false);
      expect(result.isOrgAdmin).toBe(true);
      expect(result.orgRole).toBe('admin');
      expect(result.capabilities).toEqual([
        'invite_users',
        'manage_forms',
        'manage_connections',
        'view_analytics',
      ]);
    });

    it('should handle non-org members', async () => {
      const { isPlatformAdmin } = require('@/lib/platform/users');
      const { getUserOrgRole } = require('@/lib/platform/organizations');
      
      isPlatformAdmin.mockResolvedValue(false);
      getUserOrgRole.mockResolvedValue(null);

      const result = await getUserOrgPermissions('outsider', 'org123');

      expect(result.isPlatformAdmin).toBe(false);
      expect(result.isOrgAdmin).toBe(false);
      expect(result.orgRole).toBe(null);
      expect(result.capabilities).toEqual([]);
    });

    it('should recognize org owners as admins', async () => {
      const { isPlatformAdmin } = require('@/lib/platform/users');
      const { getUserOrgRole } = require('@/lib/platform/organizations');
      
      isPlatformAdmin.mockResolvedValue(false);
      getUserOrgRole.mockResolvedValue('owner');

      const result = await getUserOrgPermissions('owner1', 'org123');

      expect(result.isOrgAdmin).toBe(true);
      expect(result.orgRole).toBe('owner');
    });
  });

  describe('PermissionError', () => {
    it('should create error with message and code', () => {
      const error = new PermissionError('Access denied', 'FORBIDDEN');

      expect(error.message).toBe('Access denied');
      expect(error.code).toBe('FORBIDDEN');
      expect(error.name).toBe('PermissionError');
    });

    it('should use default code when not specified', () => {
      const error = new PermissionError('Access denied');

      expect(error.code).toBe('FORBIDDEN');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors in form permission check', async () => {
      const { isPlatformAdmin } = require('@/lib/platform/users');
      const { getUserOrgRole } = require('@/lib/platform/organizations');
      const { getOrgFormsCollection } = require('@/lib/platform/db');
      
      isPlatformAdmin.mockResolvedValue(false);
      getUserOrgRole.mockResolvedValue('member');
      getOrgFormsCollection.mockRejectedValue(new Error('Database error'));

      await expect(
        checkFormPermission('user1', 'org123', 'form456', 'read')
      ).rejects.toThrow('Database error');
    });

    it('should handle errors in user lookup', async () => {
      const { findUserById } = require('@/lib/platform/users');
      findUserById.mockRejectedValue(new Error('User service error'));

      await expect(
        checkPlatformPermission('user1', 'manage_users')
      ).rejects.toThrow('User service error');
    });

    it('should handle errors in org role lookup', async () => {
      const { isPlatformAdmin } = require('@/lib/platform/users');
      const { getUserOrgRole } = require('@/lib/platform/organizations');
      
      isPlatformAdmin.mockResolvedValue(false);
      getUserOrgRole.mockRejectedValue(new Error('Org service error'));

      await expect(
        checkOrganizationPermission('user1', 'org123', 'manage_org')
      ).rejects.toThrow('Org service error');
    });
  });
});