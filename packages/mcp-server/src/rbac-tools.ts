/**
 * RBAC (Role-Based Access Control) Tools for NetPad MCP Server
 *
 * These tools manage users, groups, roles, and permissions via the NetPad API.
 * Requires NETPAD_API_KEY with appropriate admin permissions.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  getApiClient,
  ApiClientError,
  ApiKeyNotSetError,
} from './lib/api-client.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Organization roles (matches platform types)
 */
type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';

/**
 * Permission definitions for each org role
 */
const ORG_ROLE_CAPABILITIES: Record<OrgRole, string[]> = {
  owner: [
    'manage_org',
    'delete_org',
    'manage_billing',
    'manage_members',
    'manage_all_forms',
    'manage_all_connections',
    'create_forms',
    'use_connections',
    'view_forms',
    'view_responses',
  ],
  admin: [
    'manage_members',
    'manage_all_forms',
    'manage_all_connections',
    'create_forms',
    'use_connections',
    'view_forms',
    'view_responses',
  ],
  member: ['create_forms', 'use_connections', 'view_forms', 'view_responses'],
  viewer: ['view_forms', 'view_responses'],
};

/**
 * Form-level roles
 */
type FormRole = 'owner' | 'editor' | 'analyst' | 'viewer';

const FORM_ROLE_CAPABILITIES: Record<FormRole, string[]> = {
  owner: [
    'read',
    'write',
    'delete',
    'publish',
    'manage_permissions',
    'transfer',
    'view_responses',
    'export_responses',
    'delete_responses',
  ],
  editor: [
    'read',
    'write',
    'publish',
    'view_responses',
    'export_responses',
    'delete_responses',
  ],
  analyst: ['read', 'view_responses', 'export_responses'],
  viewer: ['read'],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format an API error for tool output
 */
function formatApiError(error: unknown): string {
  if (error instanceof ApiKeyNotSetError) {
    return `❌ **API Key Not Configured**

${error.message}

**Quick Setup:**
\`\`\`bash
export NETPAD_API_KEY=np_live_your_key_here
\`\`\`

Then restart your MCP client (Claude Desktop, Cursor, etc.)`;
  }

  if (error instanceof ApiClientError) {
    return `❌ **API Error: ${error.code}**

${error.message}

${error.details ? `Details: ${JSON.stringify(error.details, null, 2)}` : ''}`;
  }

  if (error instanceof Error) {
    return `❌ **Error:** ${error.message}`;
  }

  return `❌ **Unknown Error:** ${String(error)}`;
}

/**
 * Create a success response with JSON data
 */
function successResponse(
  message: string,
  data?: unknown
): {
  content: Array<{ type: 'text'; text: string }>;
} {
  let text = `✅ ${message}`;
  if (data !== undefined) {
    text += `\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
  }
  return {
    content: [{ type: 'text', text }],
  };
}

/**
 * Create an error response
 */
function errorResponse(error: unknown): {
  content: Array<{ type: 'text'; text: string }>;
} {
  return {
    content: [{ type: 'text', text: formatApiError(error) }],
  };
}

/**
 * Create a "not implemented" response for planned features
 */
function notImplementedResponse(
  feature: string,
  workaround?: string
): {
  content: Array<{ type: 'text'; text: string }>;
} {
  let text = `⚠️ **Feature Not Yet Implemented**

The **${feature}** feature is planned but not yet available in the NetPad API.`;

  if (workaround) {
    text += `\n\n**Workaround:** ${workaround}`;
  }

  text += `\n\n**Current Status:**
- Organization-level roles (owner, admin, member, viewer) ✅
- User invitations ✅
- Custom groups - Coming soon
- Custom roles - Coming soon`;

  return {
    content: [{ type: 'text', text }],
  };
}

// ============================================================================
// REGISTER RBAC TOOLS
// ============================================================================

/**
 * Register all RBAC tools on the MCP server
 */
export function registerRbacTools(server: McpServer): void {
  // ==========================================================================
  // USER MANAGEMENT TOOLS
  // ==========================================================================

  server.tool(
    'user_list',
    'List all members of an organization. Requires NETPAD_API_KEY with org member permissions.',
    {
      orgId: z
        .string()
        .optional()
        .describe(
          'Organization ID (uses default org from API key if not specified)'
        ),
      includeRoles: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include role information for each member'),
    },
    async ({ orgId, includeRoles }) => {
      try {
        const client = getApiClient();
        const members = await client.request<{
          success: boolean;
          members: Array<{
            userId: string;
            email: string;
            displayName?: string;
            avatarUrl?: string;
            orgRole: OrgRole;
          }>;
        }>(`/api/organizations/${orgId || 'current'}/members`);

        const result = includeRoles
          ? members.members.map((m) => ({
              ...m,
              capabilities: ORG_ROLE_CAPABILITIES[m.orgRole] || [],
            }))
          : members.members;

        return successResponse(
          `Found ${result.length} member(s) in organization`,
          result
        );
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.tool(
    'user_get',
    'Get details of a specific user including their roles and permissions. Requires NETPAD_API_KEY.',
    {
      userId: z.string().describe('User ID to get details for'),
      orgId: z
        .string()
        .optional()
        .describe('Organization ID for org-specific permissions'),
    },
    async ({ userId, orgId }) => {
      try {
        const client = getApiClient();

        // Get user from members list (no direct user endpoint currently)
        const members = await client.request<{
          success: boolean;
          members: Array<{
            userId: string;
            email: string;
            displayName?: string;
            avatarUrl?: string;
            orgRole: OrgRole;
          }>;
        }>(`/api/organizations/${orgId || 'current'}/members`);

        const user = members.members.find((m) => m.userId === userId);

        if (!user) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ **User Not Found**\n\nUser \`${userId}\` is not a member of this organization.`,
              },
            ],
          };
        }

        const userDetails = {
          ...user,
          capabilities: ORG_ROLE_CAPABILITIES[user.orgRole] || [],
          isOrgAdmin: user.orgRole === 'owner' || user.orgRole === 'admin',
        };

        return successResponse(`User: ${user.displayName || user.email}`, userDetails);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.tool(
    'user_invite',
    'Invite a new member to the organization by email. Requires NETPAD_API_KEY with admin permissions.',
    {
      email: z.string().email().describe('Email address to invite'),
      role: z
        .enum(['admin', 'member', 'viewer'])
        .describe('Role to assign (cannot invite as owner)'),
      orgId: z
        .string()
        .optional()
        .describe('Organization ID (uses default org if not specified)'),
    },
    async ({ email, role, orgId }) => {
      try {
        const client = getApiClient();
        const result = await client.request<{
          success: boolean;
          invitation: {
            invitationId: string;
            email: string;
            role: string;
            status: string;
            expiresAt: string;
          };
          message: string;
        }>(`/api/organizations/${orgId || 'current'}/invites`, {
          method: 'POST',
          body: { email, role },
        });

        return successResponse(result.message, result.invitation);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.tool(
    'user_remove',
    'Remove a member from the organization. Requires NETPAD_API_KEY with admin permissions.',
    {
      userId: z.string().describe('User ID to remove'),
      orgId: z
        .string()
        .optional()
        .describe('Organization ID (uses default org if not specified)'),
    },
    async ({ userId, orgId }) => {
      try {
        const client = getApiClient();
        const result = await client.request<{
          success: boolean;
          message: string;
        }>(`/api/organizations/${orgId || 'current'}/members/${userId}`, {
          method: 'DELETE',
        });

        return successResponse(result.message || `Removed user ${userId} from organization`);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  // ==========================================================================
  // GROUP MANAGEMENT TOOLS
  // ==========================================================================

  server.tool(
    'group_list',
    'List all groups/teams in an organization. Requires NETPAD_API_KEY.',
    {
      orgId: z.string().optional().describe('Organization ID'),
    },
    async () => {
      return notImplementedResponse(
        'Group Management',
        'Use organization roles (owner, admin, member, viewer) to manage access. Groups will be available in a future release.'
      );
    }
  );

  server.tool(
    'group_get',
    'Get details of a specific group including its members. Requires NETPAD_API_KEY.',
    {
      groupId: z.string().describe('Group ID'),
      orgId: z.string().optional().describe('Organization ID'),
    },
    async () => {
      return notImplementedResponse(
        'Group Management',
        'Groups will be available in a future release.'
      );
    }
  );

  server.tool(
    'group_create',
    'Create a new group/team in the organization. Requires NETPAD_API_KEY with admin permissions.',
    {
      name: z.string().describe('Group name'),
      description: z.string().optional().describe('Group description'),
      orgId: z.string().optional().describe('Organization ID'),
    },
    async () => {
      return notImplementedResponse(
        'Group Creation',
        'Groups will be available in a future release.'
      );
    }
  );

  server.tool(
    'group_update',
    'Update a group name or description. Requires NETPAD_API_KEY with admin permissions.',
    {
      groupId: z.string().describe('Group ID to update'),
      name: z.string().optional().describe('New group name'),
      description: z.string().optional().describe('New group description'),
      orgId: z.string().optional().describe('Organization ID'),
    },
    async () => {
      return notImplementedResponse(
        'Group Management',
        'Groups will be available in a future release.'
      );
    }
  );

  server.tool(
    'group_delete',
    'Delete a group. Requires NETPAD_API_KEY with admin permissions.',
    {
      groupId: z.string().describe('Group ID to delete'),
      orgId: z.string().optional().describe('Organization ID'),
    },
    async () => {
      return notImplementedResponse(
        'Group Management',
        'Groups will be available in a future release.'
      );
    }
  );

  server.tool(
    'group_add_member',
    'Add a user to a group. Requires NETPAD_API_KEY with admin permissions.',
    {
      groupId: z.string().describe('Group ID'),
      userId: z.string().describe('User ID to add'),
      orgId: z.string().optional().describe('Organization ID'),
    },
    async () => {
      return notImplementedResponse(
        'Group Membership',
        'Groups will be available in a future release.'
      );
    }
  );

  server.tool(
    'group_remove_member',
    'Remove a user from a group. Requires NETPAD_API_KEY with admin permissions.',
    {
      groupId: z.string().describe('Group ID'),
      userId: z.string().describe('User ID to remove'),
      orgId: z.string().optional().describe('Organization ID'),
    },
    async () => {
      return notImplementedResponse(
        'Group Membership',
        'Groups will be available in a future release.'
      );
    }
  );

  // ==========================================================================
  // ROLE MANAGEMENT TOOLS
  // ==========================================================================

  server.tool(
    'role_list',
    'List all available roles (built-in and custom). Requires NETPAD_API_KEY.',
    {
      orgId: z.string().optional().describe('Organization ID'),
      includeCapabilities: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include capability/permission details for each role'),
    },
    async ({ includeCapabilities }) => {
      // Return built-in roles (custom roles not yet implemented)
      const orgRoles = Object.entries(ORG_ROLE_CAPABILITIES).map(
        ([role, capabilities]) => ({
          id: `org:${role}`,
          name: role.charAt(0).toUpperCase() + role.slice(1),
          type: 'organization',
          isBuiltIn: true,
          ...(includeCapabilities ? { capabilities } : {}),
        })
      );

      const formRoles = Object.entries(FORM_ROLE_CAPABILITIES).map(
        ([role, capabilities]) => ({
          id: `form:${role}`,
          name: role.charAt(0).toUpperCase() + role.slice(1),
          type: 'form',
          isBuiltIn: true,
          ...(includeCapabilities ? { capabilities } : {}),
        })
      );

      return successResponse('Available roles', {
        organizationRoles: orgRoles,
        formRoles: formRoles,
        note: 'Custom roles will be available in a future release.',
      });
    }
  );

  server.tool(
    'role_get',
    'Get details of a specific role including its permissions. Requires NETPAD_API_KEY.',
    {
      roleId: z
        .string()
        .describe('Role ID (e.g., "org:admin", "form:editor")'),
    },
    async ({ roleId }) => {
      // Parse role type and name
      const [roleType, roleName] = roleId.split(':');

      if (roleType === 'org' && roleName in ORG_ROLE_CAPABILITIES) {
        const capabilities = ORG_ROLE_CAPABILITIES[roleName as OrgRole];
        return successResponse(`Role: ${roleName}`, {
          id: roleId,
          name: roleName.charAt(0).toUpperCase() + roleName.slice(1),
          type: 'organization',
          isBuiltIn: true,
          capabilities,
          description: getOrgRoleDescription(roleName as OrgRole),
        });
      }

      if (roleType === 'form' && roleName in FORM_ROLE_CAPABILITIES) {
        const capabilities = FORM_ROLE_CAPABILITIES[roleName as FormRole];
        return successResponse(`Role: ${roleName}`, {
          id: roleId,
          name: roleName.charAt(0).toUpperCase() + roleName.slice(1),
          type: 'form',
          isBuiltIn: true,
          capabilities,
          description: getFormRoleDescription(roleName as FormRole),
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: `❌ **Role Not Found**\n\nRole \`${roleId}\` not found. Use \`role_list\` to see available roles.`,
          },
        ],
      };
    }
  );

  server.tool(
    'role_create',
    'Create a custom role with specific permissions. Requires NETPAD_API_KEY with admin permissions.',
    {
      name: z.string().describe('Role name'),
      description: z.string().optional().describe('Role description'),
      capabilities: z
        .array(z.string())
        .describe('List of capability/permission names'),
      orgId: z.string().optional().describe('Organization ID'),
    },
    async () => {
      return notImplementedResponse(
        'Custom Role Creation',
        'Use built-in roles (owner, admin, member, viewer) for now. Custom roles will be available in a future release.'
      );
    }
  );

  server.tool(
    'role_update',
    'Update a custom role permissions. Requires NETPAD_API_KEY with admin permissions.',
    {
      roleId: z.string().describe('Role ID to update'),
      name: z.string().optional().describe('New role name'),
      description: z.string().optional().describe('New role description'),
      capabilities: z
        .array(z.string())
        .optional()
        .describe('New list of capabilities'),
      orgId: z.string().optional().describe('Organization ID'),
    },
    async ({ roleId }) => {
      // Check if trying to modify a built-in role
      const [roleType, roleName] = roleId.split(':');
      if (
        (roleType === 'org' && roleName in ORG_ROLE_CAPABILITIES) ||
        (roleType === 'form' && roleName in FORM_ROLE_CAPABILITIES)
      ) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ **Cannot Modify Built-in Role**\n\nThe role \`${roleId}\` is a built-in role and cannot be modified.`,
            },
          ],
        };
      }

      return notImplementedResponse(
        'Custom Role Updates',
        'Custom roles will be available in a future release.'
      );
    }
  );

  server.tool(
    'role_delete',
    'Delete a custom role. Requires NETPAD_API_KEY with admin permissions.',
    {
      roleId: z.string().describe('Role ID to delete'),
      orgId: z.string().optional().describe('Organization ID'),
    },
    async ({ roleId }) => {
      // Check if trying to delete a built-in role
      const [roleType, roleName] = roleId.split(':');
      if (
        (roleType === 'org' && roleName in ORG_ROLE_CAPABILITIES) ||
        (roleType === 'form' && roleName in FORM_ROLE_CAPABILITIES)
      ) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ **Cannot Delete Built-in Role**\n\nThe role \`${roleId}\` is a built-in role and cannot be deleted.`,
            },
          ],
        };
      }

      return notImplementedResponse(
        'Custom Role Deletion',
        'Custom roles will be available in a future release.'
      );
    }
  );

  // ==========================================================================
  // ROLE ASSIGNMENT TOOLS
  // ==========================================================================

  server.tool(
    'role_assign',
    'Assign a role to a user (or group) for an organization or specific resource. Requires NETPAD_API_KEY with admin permissions.',
    {
      userId: z.string().describe('User ID to assign role to'),
      role: z
        .enum(['admin', 'member', 'viewer'])
        .describe('Role to assign (owner cannot be assigned via API)'),
      orgId: z.string().optional().describe('Organization ID'),
      resourceType: z
        .enum(['organization', 'form', 'connection'])
        .optional()
        .default('organization')
        .describe('Type of resource to assign role for'),
      resourceId: z
        .string()
        .optional()
        .describe('Resource ID (required for form/connection assignments)'),
    },
    async ({ userId, role, orgId, resourceType, resourceId }) => {
      try {
        const client = getApiClient();

        if (resourceType === 'organization') {
          // Update user's org role via the members endpoint
          const result = await client.request<{
            success: boolean;
            message?: string;
          }>(`/api/organizations/${orgId || 'current'}/members/${userId}`, {
            method: 'PATCH',
            body: { role },
          });

          return successResponse(
            result.message || `Assigned role "${role}" to user ${userId}`
          );
        }

        if (resourceType === 'form' && resourceId) {
          // Form permission assignment
          const result = await client.request<{
            success: boolean;
            message?: string;
          }>(`/api/v1/forms/${resourceId}/permissions`, {
            method: 'POST',
            body: { userId, role },
          });

          return successResponse(
            result.message || `Assigned form role "${role}" to user ${userId}`
          );
        }

        return {
          content: [
            {
              type: 'text',
              text: `❌ **Invalid Request**\n\nFor ${resourceType} assignments, a resourceId is required.`,
            },
          ],
        };
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.tool(
    'role_unassign',
    'Remove a role assignment from a user. Requires NETPAD_API_KEY with admin permissions.',
    {
      userId: z.string().describe('User ID to remove role from'),
      orgId: z.string().optional().describe('Organization ID'),
      resourceType: z
        .enum(['organization', 'form', 'connection'])
        .optional()
        .default('organization')
        .describe('Type of resource to unassign role from'),
      resourceId: z
        .string()
        .optional()
        .describe('Resource ID (required for form/connection)'),
    },
    async ({ userId, orgId: _orgId, resourceType, resourceId }) => {
      // Note: orgId is accepted for API consistency but currently only used for
      // form/connection operations. Organization role removal uses user_remove.
      void _orgId;
      
      try {
        const client = getApiClient();

        if (resourceType === 'organization') {
          // Remove user from org = remove their org role
          return {
            content: [
              {
                type: 'text',
                text: `⚠️ **Use user_remove Instead**\n\nTo remove a user's organization role, use the \`user_remove\` tool. This will remove them from the organization entirely.\n\nTo change their role, use \`role_assign\` with the new role.`,
              },
            ],
          };
        }

        if (resourceType === 'form' && resourceId) {
          // Remove form permission
          const result = await client.request<{
            success: boolean;
            message?: string;
          }>(`/api/v1/forms/${resourceId}/permissions/${userId}`, {
            method: 'DELETE',
          });

          return successResponse(
            result.message || `Removed form role from user ${userId}`
          );
        }

        return {
          content: [
            {
              type: 'text',
              text: `❌ **Invalid Request**\n\nFor ${resourceType} unassignments, a resourceId is required.`,
            },
          ],
        };
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  // ==========================================================================
  // PERMISSION TOOLS
  // ==========================================================================

  server.tool(
    'permission_check',
    'Check if a user has a specific permission. Requires NETPAD_API_KEY.',
    {
      userId: z.string().describe('User ID to check permissions for'),
      permission: z
        .string()
        .describe('Permission/capability name to check (e.g., "manage_members")'),
      orgId: z.string().optional().describe('Organization ID'),
      resourceType: z
        .enum(['organization', 'form', 'connection'])
        .optional()
        .default('organization')
        .describe('Type of resource to check permission for'),
      resourceId: z
        .string()
        .optional()
        .describe('Resource ID (for form/connection checks)'),
    },
    async ({ userId, permission, orgId, resourceType }) => {
      try {
        const client = getApiClient();

        // Get user's org role
        const members = await client.request<{
          success: boolean;
          members: Array<{
            userId: string;
            email: string;
            displayName?: string;
            orgRole: OrgRole;
          }>;
        }>(`/api/organizations/${orgId || 'current'}/members`);

        const user = members.members.find((m) => m.userId === userId);

        if (!user) {
          return successResponse('Permission check result', {
            userId,
            permission,
            hasPermission: false,
            reason: 'User is not a member of this organization',
          });
        }

        if (resourceType === 'organization') {
          const capabilities = ORG_ROLE_CAPABILITIES[user.orgRole] || [];
          const hasPermission = capabilities.includes(permission);

          return successResponse('Permission check result', {
            userId,
            userEmail: user.email,
            permission,
            resourceType,
            hasPermission,
            userRole: user.orgRole,
            reason: hasPermission
              ? `User has "${user.orgRole}" role which includes this permission`
              : `User has "${user.orgRole}" role which does not include this permission`,
          });
        }

        // For form/connection checks, we'd need additional API calls
        return successResponse('Permission check result', {
          userId,
          userEmail: user.email,
          permission,
          resourceType,
          orgRole: user.orgRole,
          note: 'Resource-level permission checks require the resourceId. Use the user_get tool with the specific resource for detailed permissions.',
        });
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.tool(
    'permission_list',
    'List all available permissions/capabilities in the system.',
    {
      resourceType: z
        .enum(['organization', 'form', 'connection', 'all'])
        .optional()
        .default('all')
        .describe('Filter by resource type'),
    },
    async ({ resourceType }) => {
      const permissions: Record<string, { description: string; roles: string[] }> = {};

      // Organization permissions
      if (resourceType === 'all' || resourceType === 'organization') {
        const orgPerms = {
          manage_org: {
            description: 'Update organization settings',
            roles: ['owner'],
          },
          delete_org: {
            description: 'Delete the organization',
            roles: ['owner'],
          },
          manage_billing: {
            description: 'Manage billing and subscription',
            roles: ['owner'],
          },
          manage_members: {
            description: 'Invite, remove, and change member roles',
            roles: ['owner', 'admin'],
          },
          manage_all_forms: {
            description: 'Edit and delete any form',
            roles: ['owner', 'admin'],
          },
          manage_all_connections: {
            description: 'Manage all database connections',
            roles: ['owner', 'admin'],
          },
          create_forms: {
            description: 'Create new forms',
            roles: ['owner', 'admin', 'member'],
          },
          use_connections: {
            description: 'Use database connections in forms',
            roles: ['owner', 'admin', 'member'],
          },
          view_forms: {
            description: 'View forms',
            roles: ['owner', 'admin', 'member', 'viewer'],
          },
          view_responses: {
            description: 'View form submissions',
            roles: ['owner', 'admin', 'member', 'viewer'],
          },
        };
        Object.assign(permissions, orgPerms);
      }

      // Form permissions
      if (resourceType === 'all' || resourceType === 'form') {
        const formPerms = {
          'form:read': {
            description: 'View form configuration',
            roles: ['owner', 'editor', 'analyst', 'viewer'],
          },
          'form:write': {
            description: 'Edit form configuration',
            roles: ['owner', 'editor'],
          },
          'form:delete': {
            description: 'Delete the form',
            roles: ['owner'],
          },
          'form:publish': {
            description: 'Publish/unpublish the form',
            roles: ['owner', 'editor'],
          },
          'form:manage_permissions': {
            description: 'Manage form access permissions',
            roles: ['owner'],
          },
          'form:transfer': {
            description: 'Transfer form ownership',
            roles: ['owner'],
          },
          'form:view_responses': {
            description: 'View form submissions',
            roles: ['owner', 'editor', 'analyst'],
          },
          'form:export_responses': {
            description: 'Export form submissions',
            roles: ['owner', 'editor', 'analyst'],
          },
          'form:delete_responses': {
            description: 'Delete form submissions',
            roles: ['owner', 'editor'],
          },
        };
        Object.assign(permissions, formPerms);
      }

      // Connection permissions
      if (resourceType === 'all' || resourceType === 'connection') {
        const connPerms = {
          'connection:read': {
            description: 'View connection details (not credentials)',
            roles: ['owner', 'admin'],
          },
          'connection:write': {
            description: 'Edit connection configuration',
            roles: ['owner', 'admin'],
          },
          'connection:delete': {
            description: 'Delete the connection',
            roles: ['owner'],
          },
          'connection:manage_permissions': {
            description: 'Manage connection access',
            roles: ['owner'],
          },
          'connection:use': {
            description: 'Use connection in forms',
            roles: ['owner', 'admin', 'user'],
          },
          'connection:view_connection_string': {
            description: 'View the actual connection string',
            roles: ['owner'],
          },
        };
        Object.assign(permissions, connPerms);
      }

      return successResponse(
        `Available permissions${resourceType !== 'all' ? ` for ${resourceType}` : ''}`,
        {
          permissions,
          total: Object.keys(permissions).length,
        }
      );
    }
  );
}

// ============================================================================
// HELPER FUNCTIONS FOR ROLE DESCRIPTIONS
// ============================================================================

function getOrgRoleDescription(role: OrgRole): string {
  const descriptions: Record<OrgRole, string> = {
    owner:
      'Full control over the organization including billing, member management, and deletion.',
    admin:
      'Can manage members, forms, and connections but cannot access billing or delete the organization.',
    member:
      'Can create forms and use connections but cannot manage other members or organization settings.',
    viewer:
      'Read-only access to forms and responses. Cannot create or modify anything.',
  };
  return descriptions[role];
}

function getFormRoleDescription(role: FormRole): string {
  const descriptions: Record<FormRole, string> = {
    owner:
      'Full control over the form including deletion, permission management, and ownership transfer.',
    editor: 'Can edit the form and manage submissions but cannot delete it or change permissions.',
    analyst: 'Can view and export submissions but cannot edit the form.',
    viewer: 'Read-only access to the form configuration.',
  };
  return descriptions[role];
}
